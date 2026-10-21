"""
Playwright CDP Screencast Streamer for Live Sandbox Detonation.

Streams real-time JPEG frames and detonation activity logs from the isolated
Chromium browser instance to the Host Backend LiveStreamHub via WebSockets.

Zero-Trust Assurance:
- Remote DOM / untrusted JavaScript is NEVER sent to the SOC client.
- Only pixel frames (JPEG) and sanitized event ticker strings are published.
- Fail-silent design: any stream failure does not interrupt the analysis pipeline.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import queue
import threading
import time
from typing import Any

from playwright.sync_api import CDPSession, Page

try:
    from websockets.sync.client import connect as ws_connect
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False


logger = logging.getLogger("vm_agent.screencast_streamer")


class ScreencastStreamer:
    """
    Coordinates Chrome DevTools Protocol (CDP) screencasting and non-blocking
    frame/log streaming to the host backend LiveStreamHub.
    """

    def __init__(
        self,
        page: Page,
        session_id: str,
        backend_host: str = "127.0.0.1:3000",
        jpeg_quality: int = 65,
        max_width: int = 1280,
        max_height: int = 800,
    ) -> None:
        self.page = page
        self.session_id = session_id
        self.ws_url = f"ws://{backend_host}/ws/ingest/{session_id}"
        self.jpeg_quality = jpeg_quality
        self.max_width = max_width
        self.max_height = max_height

        self.cdp: CDPSession | None = None
        self._queue: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=25)
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._started = False

    def start(self) -> None:
        """
        Start CDP screencasting and spin up the background WebSocket sender thread.
        """
        if self._started or not WEBSOCKETS_AVAILABLE:
            return

        try:
            # Attach CDP session to the Playwright page
            self.cdp = self.page.context.new_cdp_session(self.page)

            def _on_screencast_frame(params: dict[str, Any]) -> None:
                frame_data = params.get("data")
                cdp_session_id = params.get("sessionId")

                # Acknowledge frame to CDP immediately so Chromium continues rendering
                try:
                    if self.cdp and cdp_session_id is not None:
                        self.cdp.send(
                            "Page.screencastFrameAck",
                            {"sessionId": cdp_session_id},
                        )
                except Exception:
                    pass

                if frame_data and not self._stop_event.is_set():
                    try:
                        # Drop oldest frame if queue is backed up
                        if self._queue.full():
                            try:
                                self._queue.get_nowait()
                            except queue.Empty:
                                pass

                        self._queue.put_nowait({
                            "type": "frame",
                            "data": frame_data,
                            "timestamp": time.time(),
                        })
                    except Exception:
                        pass

            self.cdp.on("Page.screencastFrame", _on_screencast_frame)

            # Start Chrome DevTools screencast
            self.cdp.send(
                "Page.startScreencast",
                {
                    "format": "jpeg",
                    "quality": self.jpeg_quality,
                    "maxWidth": self.max_width,
                    "maxHeight": self.max_height,
                    "everyNthFrame": 1,
                },
            )

            # Spawn sender thread
            self._thread = threading.Thread(
                target=self._sender_loop,
                name=f"ScreencastStreamer-{self.session_id}",
                daemon=True,
            )
            self._thread.start()
            self._started = True
            logger.info("CDP screencast streamer started for session %s", self.session_id)

        except Exception as exc:
            logger.debug("Failed to start CDP screencast streamer: %s", exc)
            self.stop()

    def publish_event(self, message: str, level: str = "action") -> None:
        """
        Publish a real-time terminal ticker event (e.g. navigation, anti-evasion, heuristics).
        """
        if not self._started or self._stop_event.is_set():
            return

        try:
            entry = {
                "type": "event",
                "message": message,
                "level": level,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            if self._queue.full():
                try:
                    self._queue.get_nowait()
                except queue.Empty:
                    pass
            self._queue.put_nowait(entry)
        except Exception:
            pass

    def stop(self) -> None:
        """
        Gracefully stop screencasting and signal completion to the host hub.
        """
        if not self._started and not self._thread:
            return

        self._stop_event.set()

        try:
            if self.cdp:
                try:
                    self.cdp.send("Page.stopScreencast")
                except Exception:
                    pass
                try:
                    self.cdp.detach()
                except Exception:
                    pass
                self.cdp = None
        except Exception:
            pass

        try:
            self._queue.put_nowait({"type": "completed"})
        except Exception:
            pass

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.2)

        self._started = False
        logger.info("CDP screencast streamer stopped for session %s", self.session_id)

    def _sender_loop(self) -> None:
        """
        Background worker that pumps frames and ticker events over WebSocket.
        """
        ws = None
        try:
            # Establish WebSocket connection with timeout
            ws = ws_connect(self.ws_url, open_timeout=2.5, close_timeout=1.0)
            
            # Initial handshake
            ws.send(json.dumps({
                "type": "status",
                "status": "streaming",
                "message": "Chromium CDP stream connected."
            }))

            while not self._stop_event.is_set() or not self._queue.empty():
                try:
                    item = self._queue.get(timeout=0.1)
                except queue.Empty:
                    continue

                try:
                    ws.send(json.dumps(item))
                except Exception:
                    break

                if item.get("type") == "completed":
                    break

        except Exception as exc:
            logger.debug("Screencast streamer WS sender loop ended: %s", exc)
        finally:
            if ws is not None:
                try:
                    ws.close()
                except Exception:
                    pass
