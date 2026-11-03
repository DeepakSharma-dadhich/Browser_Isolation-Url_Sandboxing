"""
BrowseGuard Interactive Remote Browser Isolation (RBI) & Live Detonation Server.

Provides real-time interactive browser isolation and on-demand threat forensics:
- Streams live visual rendering via Chrome DevTools Protocol (CDP) screencast frames (JPEG).
- Translates client mouse, wheel, keyboard, and navigation inputs via CDP Input dispatching.
- Applies anti-detection stealth mocks so Cloudflare and anti-bot systems do not lock out the sandbox.
- Captures live network traffic, console logs, redirect chains, and DOM snapshots.
- On user command or session end, runs the full forensic threat engine and saves the authoritative
  report and MITRE ATT&CK verdict directly into PostgreSQL.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import sys
import time
from typing import Any

from playwright.async_api import (
    async_playwright,
    Browser,
    BrowserContext,
    Page,
    CDPSession,
    Request,
    Response,
)
import websockets

from services.db_queue_service import DbQueueService
from services.decision_engine import make_decision
from services.network_guard import NetworkGuard
from services.report_builder import build_report
from services.threat_analyzer import analyze_threats
from session_manager import SessionManager, SessionPaths, utc_now_iso
from utils.logging_utils import configure_logging

logger = configure_logging("browseguard.rbi_server")

# Active clients connected to this session
connected_clients: set[Any] = set()


class RBISession:
    def __init__(
        self,
        initial_url: str,
        session_id: str | None = None,
        width: int = 1280,
        height: int = 800,
        browser_channel: str | None = None,
        save_report: bool = True,
    ):
        self.initial_url = initial_url
        self.session_id = session_id or f"session_{int(time.time())}_{os.urandom(4).hex()}"
        self.width = width
        self.height = height
        self.browser_channel = browser_channel or os.getenv("SANDBOX_BROWSER_CHANNEL", "chrome")
        self.save_report = save_report

        self.session_manager = SessionManager()
        self.session_paths: SessionPaths = self.session_manager.create_session(self.session_id)
        self.db_queue = DbQueueService()

        self.playwright: Any = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None
        self.cdp: CDPSession | None = None
        self.running = False
        self.latest_url = initial_url
        self.latest_title = "BrowseGuard Isolated Browser"

        self.started_at = utc_now_iso()
        self.captured_requests: list[dict[str, Any]] = []
        self.redirect_chain: list[str] = [initial_url]
        self.console_logs: list[dict[str, Any]] = []
        self.dialog_records: list[dict[str, Any]] = []
        self.last_status_code = 200

    async def start(self) -> None:
        self.running = True
        self.playwright = await async_playwright().start()

        launch_args = [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-blink-features=AutomationControlled",
            "--allow-running-insecure-content",
            "--disable-features=BlockInsecurePrivateNetworkRequests",
            "--ignore-certificate-errors",
        ]

        logger.info("Launching isolated Chromium for RBI session %s. Target: %s", self.session_id, self.initial_url)
        try:
            self.browser = await self.playwright.chromium.launch(
                channel=self.browser_channel,
                headless=True,
                args=launch_args,
            )
        except Exception as exc:
            logger.warning("Channel launch failed (%s), falling back to bundled Chromium", exc)
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=launch_args,
            )

        # Realistic Windows 10/11 Chrome User Agent without custom bot tags
        clean_ua = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )

        har_file = self.session_paths.network_dir / "traffic.har"
        self.context = await self.browser.new_context(
            viewport={"width": self.width, "height": self.height},
            user_agent=clean_ua,
            ignore_https_errors=True,
            record_har_path=str(har_file),
            record_har_mode="minimal",
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Anti-detection stealth init script to bypass Cloudflare / Bot detectors
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            window.chrome = {
                runtime: {},
                loadTimes: function() {},
                csi: function() {},
                app: {}
            };
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8
            });
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8
            });
        """)

        self.page = await self.context.new_page()

        # Attach SSRF protection route handler
        guard = NetworkGuard(requested_url=self.initial_url)

        async def route_interceptor(route):
            req = route.request
            is_allowed, reason = guard.evaluate_url(req.url)
            if not is_allowed:
                logger.warning("RBI SSRF Blocked request to %s: %s", req.url, reason)
                if req.is_navigation_request():
                    custom_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BrowseGuard Security Egress Intercept</title>
    <style>
        body {{ background: #070d19; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
        .card {{ background: #0f172a; border: 1px solid #ef4444; border-radius: 12px; padding: 36px; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); text-align: center; }}
        h1 {{ color: #ef4444; font-size: 20px; margin-top: 0; display: flex; align-items: center; justify-content: center; gap: 8px; }}
        p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 16px 0; }}
        .badge {{ background: #450a0a; color: #fca5a5; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; word-break: break-all; display: inline-block; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>🛡️ Restricted Internal Egress Blocked</h1>
        <p>BrowseGuard Zero-Trust Network Guard prevented an egress attempt to an internal host, link-local, or private IP network address.</p>
        <div class="badge">{reason}</div>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Target URL: {req.url}</p>
    </div>
</body>
</html>"""
                    await route.fulfill(status=403, content_type="text/html", body=custom_html)
                else:
                    await route.abort("blockedbyclient")
            else:
                await route.continue_()

        await self.page.route("**/*", route_interceptor)

        # Capture network telemetry
        def on_request(request: Request):
            self.captured_requests.append({
                "url": request.url,
                "method": request.method,
                "resource_type": request.resource_type,
                "headers": dict(request.headers),
                "timestamp": utc_now_iso(),
            })

        def on_response(response: Response):
            if response.url == self.latest_url:
                self.last_status_code = response.status

        self.page.on("request", on_request)
        self.page.on("response", on_response)

        # Capture console messages
        def on_console(msg):
            self.console_logs.append({
                "type": msg.type,
                "text": msg.text,
                "timestamp": utc_now_iso(),
            })

        self.page.on("console", on_console)

        # Track navigation changes
        async def on_framenavigated(frame):
            if frame == self.page.main_frame:
                new_url = self.page.url
                if new_url not in self.redirect_chain:
                    self.redirect_chain.append(new_url)
                self.latest_url = new_url
                try:
                    self.latest_title = await self.page.title()
                except Exception:
                    pass
                await self.broadcast_state()

                # Check if Cloudflare Turnstile appears
                asyncio.create_task(self.check_cloudflare_turnstile())

        self.page.on("framenavigated", on_framenavigated)

        # Connect CDP Session for low-latency screencast
        self.cdp = await self.context.new_cdp_session(self.page)
        self.cdp.on("Page.screencastFrame", self._on_screencast_frame)

        # Start Screencast: format=jpeg, quality=75
        await self.cdp.send(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": 75,
                "maxWidth": self.width,
                "maxHeight": self.height,
                "everyNthFrame": 1,
            },
        )

        # Navigate to initial URL
        logger.info("Navigating to initial URL: %s", self.initial_url)
        try:
            await self.page.goto(self.initial_url, timeout=25000, wait_until="domcontentloaded")
            self.latest_url = self.page.url
            self.latest_title = await self.page.title()
        except Exception as exc:
            logger.warning("Initial navigation warning: %s", exc)

    async def check_cloudflare_turnstile(self) -> bool:
        """
        Inspect the page for Cloudflare Turnstile iframes or challenges.
        Broadcasts notification to client so analyst can click or auto-solves if possible.
        """
        if not self.page:
            return False

        try:
            found_cf = False
            for frame in self.page.frames:
                frame_url = getattr(frame, "url", "")
                if "challenges.cloudflare.com" in frame_url or "turnstile" in frame_url or "cf-chl" in frame_url:
                    found_cf = True
                    logger.info("Detected Cloudflare Turnstile challenge frame: %s", frame_url)
                    # Notify frontend
                    if connected_clients:
                        msg = json.dumps({
                            "type": "event",
                            "message": "🛡️ Cloudflare Turnstile verification active. Click the verification box to proceed.",
                            "level": "action",
                        })
                        await asyncio.gather(*[client.send(msg) for client in connected_clients], return_exceptions=True)
                    
                    # Attempt soft auto-click if user hasn't clicked yet
                    try:
                        checkbox = await frame.query_selector("input[type='checkbox'], #challenge-stage, .ctp-checkbox-label, div[role='checkbox']")
                        if checkbox:
                            await checkbox.hover(timeout=1000)
                            await checkbox.click(timeout=1000)
                            logger.info("Clicked Cloudflare Turnstile checkbox")
                    except Exception:
                        pass
                    return True

            return found_cf
        except Exception:
            return False

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

        if data:
            self.latest_frame = data

        # Broadcast frame to connected frontend clients
        if connected_clients and data:
            message = json.dumps({
                "type": "frame",
                "data": data,
                "metadata": metadata,
                "url": self.latest_url,
                "title": self.latest_title,
                "sessionId": self.session_id,
            })
            await asyncio.gather(
                *[client.send(message) for client in connected_clients],
                return_exceptions=True,
            )

    async def broadcast_state(self) -> None:
        if connected_clients:
            msg = json.dumps({
                "type": "state",
                "url": self.latest_url,
                "title": self.latest_title,
                "sessionId": self.session_id,
            })
            await asyncio.gather(
                *[client.send(msg) for client in connected_clients],
                return_exceptions=True,
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
                    "clickCount": click_count,
                },
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
                    "deltaY": delta_y,
                },
            )

        # Keyboard Event dispatching
        elif msg_type == "key":
            event_type = data.get("eventType", "keyDown")
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
                    "windowsVirtualKeyCode": data.get("keyCode", 0),
                },
            )

        # User Navigation command
        elif msg_type == "navigate":
            target_url = data.get("url")
            if target_url:
                logger.info("User requested navigation in live session: %s", target_url)
                try:
                    await self.page.goto(target_url, timeout=25000, wait_until="domcontentloaded")
                    self.latest_url = self.page.url
                    self.latest_title = await self.page.title()
                except Exception as exc:
                    logger.warning("Navigation failed: %s", exc)

        # Back navigation
        elif msg_type == "back":
            try:
                await self.page.go_back(timeout=15000)
            except Exception as exc:
                logger.warning("Go back error: %s", exc)

        # Forward navigation
        elif msg_type == "forward":
            try:
                await self.page.go_forward(timeout=15000)
            except Exception as exc:
                logger.warning("Go forward error: %s", exc)

        # Reload
        elif msg_type == "reload":
            try:
                await self.page.reload(timeout=15000)
            except Exception as exc:
                logger.warning("Reload failed: %s", exc)

        # Solve Cloudflare Turnstile on demand
        elif msg_type == "solve_turnstile":
            await self.check_cloudflare_turnstile()

        # Finish analysis and generate forensic report
        elif msg_type == "finish_analysis":
            logger.info("Client requested to finalize analysis for session %s", self.session_id)
            await self.finalize_and_save_analysis()

    async def finalize_and_save_analysis(self) -> dict[str, Any]:
        """
        Extract all evidence accumulated during the interactive session,
        run the threat analyzer, generate report.json, and commit to PostgreSQL.
        """
        if not self.save_report or not self.page:
            return {}

        logger.info("Finalizing forensic analysis for interactive session %s...", self.session_id)
        screenshot_path = self.session_paths.screenshots_dir / "final_page.png"
        dom_path = self.session_paths.html_dir / "page.html"
        har_path = self.session_paths.network_dir / "traffic.har"

        try:
            # Capture final screenshot
            await self.page.screenshot(path=str(screenshot_path), full_page=False)
            self.session_paths.screenshot_file.parent.mkdir(parents=True, exist_ok=True)
            with open(screenshot_path, "rb") as sf:
                with open(self.session_paths.screenshot_file, "wb") as df:
                    df.write(sf.read())
        except Exception as exc:
            logger.warning("Failed to save final screenshot: %s", exc)

        try:
            # Capture DOM HTML
            content = await self.page.content()
            dom_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dom_path, "w", encoding="utf-8") as hf:
                hf.write(content)
        except Exception as exc:
            logger.warning("Failed to save DOM HTML: %s", exc)
            content = ""

        completed_at = utc_now_iso()

        # Build evidence dictionary
        evidence = {
            "target": {
                "submitted_url": self.initial_url,
                "final_url": self.latest_url,
                "page_title": self.latest_title,
                "status_code": self.last_status_code,
            },
            "execution": {
                "session_id": self.session_id,
                "status": "completed",
                "started_at": self.started_at,
                "completed_at": completed_at,
                "browser_engine": "chromium",
            },
            "html": {
                "source": content,
                "title": self.latest_title,
            },
            "network": {
                "requests": self.captured_requests,
                "redirect_chain": self.redirect_chain,
            },
            "redirects": {
                "chain": self.redirect_chain,
            },
            "console": {
                "messages": self.console_logs,
            },
            "dialogs": {
                "records": self.dialog_records,
            },
        }

        # Run Threat Analysis & Decision Engine
        analysis = analyze_threats(evidence)
        decision = make_decision(
            risk_score=analysis.get("risk_score", 0),
            analysis_status="completed",
            critical_finding_count=analysis.get("critical_finding_count", 0),
            high_finding_count=analysis.get("high_finding_count", 0),
        )

        report_data = {
            "evidence": evidence,
            "analysis": analysis,
            "decision": decision,
        }

        # Build report.json
        report_path = build_report(
            session_path=self.session_paths,
            session_id=self.session_id,
            report_data=report_data,
        )

        # Commit to PostgreSQL
        try:
            self.db_queue.complete_job(
                session_id=self.session_id,
                report=report_data,
                screenshot_path=screenshot_path if screenshot_path.exists() else None,
                har_path=har_path if har_path.exists() else None,
                dom_path=dom_path if dom_path.exists() else None,
            )
            logger.info("Successfully persisted interactive analysis %s to PostgreSQL", self.session_id)
        except Exception as db_err:
            logger.error("Failed to commit interactive analysis to PostgreSQL: %s", db_err)

        # Broadcast completed status to connected clients
        if connected_clients:
            msg = json.dumps({
                "type": "completed",
                "session_id": self.session_id,
                "status": "completed",
                "verdict": decision.get("verdict"),
                "risk_score": analysis.get("risk_score"),
                "report_path": str(report_path),
            })
            await asyncio.gather(*[client.send(msg) for client in connected_clients], return_exceptions=True)

        return report_data

    async def stop(self) -> None:
        self.running = False
        logger.info("Terminating RBI Session %s...", self.session_id)
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
    parser = argparse.ArgumentParser(description="BrowseGuard Interactive RBI & Live Detonation Server")
    parser.add_argument("--url", default="https://example.com", help="Initial destination URL")
    parser.add_argument("--port", type=int, default=9223, help="WebSocket server port")
    parser.add_argument("--session-id", default=None, help="Analysis session ID")
    parser.add_argument("--width", type=int, default=1280, help="Viewport width")
    parser.add_argument("--height", type=int, default=800, help="Viewport height")
    parser.add_argument("--save-report", action="store_true", default=True, help="Save report and findings on complete")
    args = parser.parse_args()

    session = RBISession(
        initial_url=args.url,
        session_id=args.session_id,
        width=args.width,
        height=args.height,
        save_report=args.save_report,
    )

    async def ws_handler(websocket: Any):
        connected_clients.add(websocket)
        logger.info("Client connected to RBI WebSocket stream %s. Total: %d", session.session_id, len(connected_clients))

        # Send initial state
        await websocket.send(json.dumps({
            "type": "init",
            "url": session.latest_url,
            "title": session.latest_title,
            "width": session.width,
            "height": session.height,
            "sessionId": session.session_id,
        }))

        if getattr(session, "latest_frame", None):
            await websocket.send(json.dumps({
                "type": "frame",
                "data": session.latest_frame,
                "url": session.latest_url,
                "title": session.latest_title,
                "sessionId": session.session_id,
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
            logger.info("Client disconnected from RBI stream %s. Total: %d", session.session_id, len(connected_clients))

    server = await websockets.serve(ws_handler, "127.0.0.1", args.port)
    logger.info("BrowseGuard RBI Server listening on ws://127.0.0.1:%d (Session: %s, Target: %s)", args.port, session.session_id, args.url)

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
