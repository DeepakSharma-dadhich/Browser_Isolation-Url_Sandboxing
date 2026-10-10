"""
BrowseGuard Interactive Remote Browser Isolation (RBI) Server.

Provides zero-trust real-time browser isolation:
- Headless Chromium runs inside isolated sandbox with NetworkGuard SSRF firewall.
- Streams live visual rendering via Chrome DevTools Protocol (CDP) screencast frames (JPEG).
- Translates client mouse/keyboard inputs via CDP Input dispatching.
- No foreign code, untrusted DOM, or active scripts ever touch the client device.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from typing import Any

from playwright.async_api import async_playwright, Browser, BrowserContext, Page, CDPSession
import websockets

from utils.logging_utils import configure_logging

logger = configure_logging("browseguard.rbi_server")

# Active clients connected to this session
connected_clients: set[Any] = set()


class RBISession:
    def __init__(
        self,
        initial_url: str,
        width: int = 1280,
        height: int = 800,
        browser_channel: str | None = None
    ):
        self.initial_url = initial_url
        self.width = width
        self.height = height
        self.browser_channel = browser_channel or os.getenv("SANDBOX_BROWSER_CHANNEL", "chrome")
        
        self.playwright: Any = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None
        self.cdp: CDPSession | None = None
        self.running = False
        self.latest_url = initial_url
        self.latest_title = "BrowseGuard Isolated Browser"

    async def start(self) -> None:
        self.running = True
        self.playwright = await async_playwright().start()

        launch_args = [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check"
        ]

        logger.info("Launching isolated Chromium for RBI session. Target: %s", self.initial_url)
        try:
            self.browser = await self.playwright.chromium.launch(
                channel=self.browser_channel,
                headless=True,
                args=launch_args
            )
        except Exception as exc:
            logger.warning("Channel launch failed (%s), falling back to bundled Chromium", exc)
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=launch_args
            )

        self.context = await self.browser.new_context(
            viewport={"width": self.width, "height": self.height},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 BrowseGuard-RBI/2.1",
            ignore_https_errors=True
        )

        self.page = await self.context.new_page()

        # Attach SSRF protection route handler
        from services.network_guard import NetworkGuard
        guard = NetworkGuard()

        async def route_interceptor(route):
            req = route.request
            is_allowed, reason = guard.evaluate_url(req.url)
            if not is_allowed:
                logger.warning("RBI SSRF Blocked request to %s: %s", req.url, reason)
                await route.abort("blockedbyclient")
            else:
                await route.continue_()

        await self.page.route("**/*", route_interceptor)

        # Track navigation changes
        async def on_framenavigated(frame):
            if frame == self.page.main_frame:
                self.latest_url = self.page.url
                try:
                    self.latest_title = await self.page.title()
                except Exception:
                    pass
                await self.broadcast_state()

        self.page.on("framenavigated", on_framenavigated)

        # Connect CDP Session for low-latency screencast
        self.cdp = await self.context.new_cdp_session(self.page)
        self.cdp.on("Page.screencastFrame", self._on_screencast_frame)

        # Start Screencast: format=jpeg, quality=75, every frame
        await self.cdp.send(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": 75,
                "maxWidth": self.width,
                "maxHeight": self.height,
                "everyNthFrame": 1
            }
        )

        # Navigate to initial URL
        logger.info("Navigating to initial URL: %s", self.initial_url)
        try:
            await self.page.goto(self.initial_url, timeout=20000, wait_until="domcontentloaded")
            self.latest_url = self.page.url
            self.latest_title = await self.page.title()
        except Exception as exc:
            logger.warning("Initial navigation warning: %s", exc)

    async def _on_screencast_frame(self, params: dict[str, Any]) -> None:
        session_id = params.get("sessionId")
        data = params.get("data")
        metadata = params.get("metadata", {})

        # Acknowledge frame to CDP immediately to receive the next frame
        if self.cdp and session_id is not None:
            try:
                await self.cdp.send("Page.screencastFrameAck", {"sessionId": session_id})
            except Exception:
                pass

        # Broadcast frame to connected frontend clients
        if connected_clients and data:
            message = json.dumps({
                "type": "frame",
                "data": data,
                "metadata": metadata,
                "url": self.latest_url,
                "title": self.latest_title
            })
            await asyncio.gather(
                *[client.send(message) for client in connected_clients],
                return_exceptions=True
            )

    async def broadcast_state(self) -> None:
        if connected_clients:
            msg = json.dumps({
                "type": "state",
                "url": self.latest_url,
                "title": self.latest_title
            })
            await asyncio.gather(
                *[client.send(msg) for client in connected_clients],
                return_exceptions=True
            )

    async def handle_client_message(self, data: dict[str, Any]) -> None:
        if not self.cdp or not self.page:
            return

        msg_type = data.get("type")

        # Mouse Event dispatching
        if msg_type == "mouse":
            event_type = data.get("eventType", "mouseMoved")  # mousePressed, mouseReleased, mouseMoved
            x = int(data.get("x", 0))
            y = int(data.get("y", 0))
            button = data.get("button", "none")  # left, right, middle, none
            click_count = int(data.get("clickCount", 1))

            await self.cdp.send(
                "Input.dispatchMouseEvent",
                {
                    "type": event_type,
                    "x": x,
                    "y": y,
                    "button": button,
                    "clickCount": click_count
                }
            )

        # Wheel Scroll dispatching
        elif msg_type == "wheel":
            x = int(data.get("x", 0))
            y = int(data.get("y", 0))
            delta_x = float(data.get("deltaX", 0))
            delta_y = float(data.get("deltaY", 0))

            await self.cdp.send(
                "Input.dispatchMouseEvent",
                {
                    "type": "mouseWheel",
                    "x": x,
                    "y": y,
                    "deltaX": delta_x,
                    "deltaY": delta_y
                }
            )

        # Keyboard Event dispatching
        elif msg_type == "key":
            event_type = data.get("eventType", "keyDown")  # keyDown, keyUp, char
            key = data.get("key", "")
            code = data.get("code", "")
            text = data.get("text", "")

            await self.cdp.send(
                "Input.dispatchKeyEvent",
                {
                    "type": event_type,
                    "key": key,
                    "code": code,
                    "text": text,
                    "windowsVirtualKeyCode": data.get("keyCode", 0)
                }
            )

        # User Navigation command
        elif msg_type == "navigate":
            target_url = data.get("url")
            if target_url:
                logger.info("User requested navigation in live session: %s", target_url)
                try:
                    await self.page.goto(target_url, timeout=20000, wait_until="domcontentloaded")
                except Exception as exc:
                    logger.warning("Navigation failed: %s", exc)

        # User Reload command
        elif msg_type == "reload":
            try:
                await self.page.reload(timeout=15000)
            except Exception as exc:
                logger.warning("Reload failed: %s", exc)

    async def stop(self) -> None:
        self.running = False
        logger.info("Terminating RBI Session...")
        try:
            if self.cdp:
                await self.cdp.detach()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as exc:
            logger.warning("Cleanup error: %s", exc)


async def main():
    parser = argparse.ArgumentParser(description="BrowseGuard RBI WebSocket Session Server")
    parser.add_argument("--url", default="https://example.com", help="Initial destination URL")
    parser.add_argument("--port", type=int, default=9223, help="WebSocket server port")
    parser.add_argument("--width", type=int, default=1280, help="Viewport width")
    parser.add_argument("--height", type=int, default=800, help="Viewport height")
    args = parser.parse_args()

    session = RBISession(initial_url=args.url, width=args.width, height=args.height)

    async def ws_handler(websocket: Any):
        connected_clients.add(websocket)
        logger.info("Client connected to RBI WebSocket stream. Total: %d", len(connected_clients))

        # Send initial state
        await websocket.send(json.dumps({
            "type": "init",
            "url": session.latest_url,
            "title": session.latest_title,
            "width": session.width,
            "height": session.height
        }))

        try:
            async for message in websocket:
                try:
                    payload = json.loads(message)
                    await session.handle_client_message(payload)
                except Exception as exc:
                    logger.error("Error handling message: %s", exc)
        finally:
            connected_clients.discard(websocket)
            logger.info("Client disconnected from RBI stream. Total: %d", len(connected_clients))

    server = await websockets.serve(ws_handler, "127.0.0.1", args.port)
    logger.info("BrowseGuard RBI Server listening on ws://127.0.0.1:%d (Target: %s)", args.port, args.url)

    # Initialize isolated Chromium session
    await session.start()

    try:
        await asyncio.Future()  # run forever until cancelled
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    finally:
        server.close()
        await server.wait_closed()
        await session.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
