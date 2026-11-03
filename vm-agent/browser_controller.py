"""
Playwright browser execution controller.

This module must run only inside the isolated analysis VM.

Responsibilities:

- Create a fresh browser context for each URL-analysis session
- Launch Chromium
- Navigate to the submitted URL
- Handle dialogs and popups
- Coordinate browser collectors
- Persist raw browser evidence
- Run threat analysis
- Make the final decision
- Generate the authoritative report.json
- Close browser resources safely

Final report:

    shared/reports/<session_id>/report.json
"""

from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
from typing import Any

from playwright.sync_api import (
    Browser,
    BrowserContext,
    Dialog,
    Page,
    Playwright,
    Response,
    TimeoutError as PlaywrightTimeoutError,
    sync_playwright,
)

from config import (
    BROWSER_ACTION_TIMEOUT_MS,
    BROWSER_HEADLESS,
    BROWSER_NAVIGATION_TIMEOUT_MS,
    MAX_POPUPS,
    PAGE_SETTLE_TIME_MS,
)

from services.browser_service import (
    BrowserCollectors,
    attach_collectors,
    collect_browser_evidence,
    persist_browser_evidence,
)

from services.network_guard import NetworkGuard
from services.auto_interactor import perform_automated_interactivity
from services.decision_engine import make_decision
from services.report_builder import build_report
from services.threat_analyzer import analyze_threats
from services.screencast_streamer import ScreencastStreamer

from session_manager import (
    SessionManager,
    SessionPaths,
    utc_now_iso,
)

from utils.logging_utils import configure_logging


logger = configure_logging(
    "vm_agent.browser_controller"
)


class BrowserControllerError(Exception):
    """
    Raised when isolated browser execution cannot start or complete.
    """


def calculate_duration_ms(
    started_at: datetime,
    completed_at: datetime,
) -> int:
    """
    Calculate elapsed browser execution time in milliseconds.
    """

    return int(
        (
            completed_at - started_at
        ).total_seconds()
        * 1000
    )


def resolve_session_paths(
    session_path: SessionPaths | Path | str | None,
    session_id: str,
) -> SessionPaths:
    """
    Resolve canonical session directories.

    The session_path argument remains supported for compatibility with
    older callers, but SessionManager remains the source of truth.
    """

    manager = SessionManager()

    if isinstance(
        session_path,
        SessionPaths,
    ):
        if (
            session_path.session_id
            != session_id
        ):
            raise BrowserControllerError(
                "SessionPaths session_id does not match "
                "the supplied session_id."
            )

        return session_path

    return manager.create_session(
        session_id
    )


def close_page_safely(
    page: Page | None,
) -> None:
    """
    Close the Playwright page without masking an earlier error.
    """

    if page is None:
        return

    try:
        if not page.is_closed():
            page.close()

    except Exception:
        logger.debug(
            "Page cleanup failed.",
            exc_info=True,
        )


def close_context_safely(
    context: BrowserContext | None,
) -> None:
    """
    Close the isolated browser context safely.
    """

    if context is None:
        return

    try:
        context.close()

    except Exception:
        logger.debug(
            "Browser context cleanup failed.",
            exc_info=True,
        )


def close_browser_safely(
    browser: Browser | None,
) -> None:
    """
    Close Chromium safely.
    """

    if browser is None:
        return

    try:
        browser.close()

    except Exception:
        logger.debug(
            "Browser cleanup failed.",
            exc_info=True,
        )


def stop_playwright_safely(
    playwright_instance: Playwright | None,
) -> None:
    """
    Stop Playwright safely.
    """

    if playwright_instance is None:
        return

    try:
        playwright_instance.stop()

    except Exception:
        logger.debug(
            "Playwright cleanup failed.",
            exc_info=True,
        )


def analyze_url(
    url: str,
    session_path: SessionPaths | Path | str | None,
    session_id: str,
) -> dict[str, Any]:
    """
    Execute one URL inside an isolated Chromium browser context.

    Args:
        url:
            Submitted URL.

        session_path:
            Existing SessionPaths object or a legacy path argument.

        session_id:
            Unique URL-analysis session identifier.

    Returns:
        Dictionary containing:

        - session_id
        - execution status
        - evidence
        - threat analysis
        - final decision
        - report path
    """

    session_manager = SessionManager()

    paths = resolve_session_paths(
        session_path=session_path,
        session_id=session_id,
    )

    execution_started = datetime.now(
        timezone.utc
    )

    started_at = (
        execution_started.isoformat()
    )

    playwright_instance: Playwright | None = None
    browser: Browser | None = None
    context: BrowserContext | None = None
    page: Page | None = None
    navigation_response: Response | None = None
    collectors: BrowserCollectors | None = None
    network_guard: NetworkGuard | None = None
    streamer: ScreencastStreamer | None = None

    popup_records: list[
        dict[str, Any]
    ] = []

    dialog_records: list[
        dict[str, Any]
    ] = []

    navigation_error: (
        dict[str, Any] | None
    ) = None

    fatal_error: (
        dict[str, Any] | None
    ) = None

    evidence: dict[str, Any] = {}
    analysis: dict[str, Any] = {}
    decision: dict[str, Any] = {}
    report_path: str | None = None

    session_manager.write_status(
        paths=paths,
        status="running",
        additional_data={
            "url": url,
            "started_at": started_at,
        },
    )

    logger.info(
        "Starting isolated URL analysis. "
        "session_id=%s url=%s",
        session_id,
        url,
    )

    try:
        playwright_instance = (
            sync_playwright().start()
        )

        browser_channel = os.getenv("SANDBOX_BROWSER_CHANNEL")
        if not browser_channel or not browser_channel.strip():
            browser_channel = None

        launch_args = [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-component-update",
            "--disable-default-apps",
            "--disable-domain-reliability",
            "--disable-features=Translate,BackForwardCache,BlockInsecurePrivateNetworkRequests",
            "--allow-running-insecure-content",
            "--ignore-certificate-errors",
            "--disable-hang-monitor",
            "--disable-renderer-backgrounding",
            "--disable-sync",
            "--metrics-recording-only",
            "--no-first-run",
        ]

        try:
            if browser_channel:
                browser = playwright_instance.chromium.launch(
                    channel=browser_channel,
                    headless=BROWSER_HEADLESS,
                    args=launch_args,
                )
            else:
                browser = playwright_instance.chromium.launch(
                    headless=BROWSER_HEADLESS,
                    args=launch_args,
                )
        except Exception as launch_exc:
            logger.warning("Primary browser launch with channel %s failed (%s), falling back to bundled Chromium", browser_channel, launch_exc)
            browser = playwright_instance.chromium.launch(
                headless=BROWSER_HEADLESS,
                args=launch_args,
            )

        har_file = paths.network_dir / "traffic.har"
        context = browser.new_context(
            record_har_path=str(har_file),
            record_har_mode="minimal",
            accept_downloads=True,
            ignore_https_errors=True,
            java_script_enabled=True,
            viewport={
                "width": 1366,
                "height": 768,
            },
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )

        # Anti-detection stealth mocks to avoid bot detection and Cloudflare lockout
        context.add_init_script("""
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
        """)

        # Perimeter security: intercept egress & block SSRF / private IP access
        network_guard = NetworkGuard(
            requested_url=url
        ).attach_to_context(context)

        context.set_default_timeout(
            BROWSER_ACTION_TIMEOUT_MS
        )

        context.set_default_navigation_timeout(
            BROWSER_NAVIGATION_TIMEOUT_MS
        )

        page = context.new_page()

        def handle_dialog(
            dialog: Dialog,
        ) -> None:
            """
            Record and dismiss JavaScript dialogs.
            """

            record: dict[str, Any] = {
                "timestamp": utc_now_iso(),
                "type": None,
                "message": None,
                "default_value": None,
                "action": "dismiss",
                "error": None,
            }

            try:
                record["type"] = dialog.type
            except Exception:
                record["type"] = "unknown"

            try:
                record["message"] = (
                    dialog.message
                )
            except Exception:
                record["message"] = None

            try:
                record["default_value"] = (
                    dialog.default_value
                )
            except Exception:
                record["default_value"] = None

            try:
                dialog.dismiss()

            except Exception as exc:
                record["error"] = {
                    "type": type(exc).__name__,
                    "message": str(exc),
                }

            dialog_records.append(
                record
            )

        def handle_popup(
            popup: Page,
        ) -> None:
            """
            Record popup/new-tab creation.

            Popups beyond MAX_POPUPS are closed immediately.
            """

            popup_number = (
                len(popup_records) + 1
            )

            record: dict[str, Any] = {
                "popup_number": popup_number,
                "created_at": utc_now_iso(),
                "initial_url": None,
                "final_url": None,
                "closed_due_to_limit": False,
                "error": None,
            }

            try:
                popup.on(
                    "dialog",
                    handle_dialog,
                )

                record["initial_url"] = (
                    popup.url
                )

                if popup_number > MAX_POPUPS:
                    record[
                        "closed_due_to_limit"
                    ] = True

                    popup.close()

                else:
                    try:
                        popup.wait_for_timeout(
                            500
                        )
                    except Exception:
                        pass

                    try:
                        record["final_url"] = (
                            popup.url
                        )
                    except Exception:
                        record["final_url"] = (
                            None
                        )

            except Exception as exc:
                record["error"] = {
                    "type": type(exc).__name__,
                    "message": str(exc),
                }

            popup_records.append(
                record
            )

        page.on(
            "dialog",
            handle_dialog,
        )

        context.on(
            "page",
            handle_popup,
        )

        collectors = attach_collectors(
            page=page,
            paths=paths,
        )

        try:
            streamer = ScreencastStreamer(page=page, session_id=session_id)
            streamer.start()
            streamer.publish_event("Chromium sandbox initialized and CDP screencast stream active", level="info")
        except Exception as streamer_err:
            logger.debug("Failed to initialize screencast streamer: %s", streamer_err)

        if streamer:
            streamer.publish_event(f"Navigating to {url}...", level="action")

        try:
            navigation_response = page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=(
                    BROWSER_NAVIGATION_TIMEOUT_MS
                ),
            )

        except PlaywrightTimeoutError as exc:
            navigation_error = {
                "type": "navigation_timeout",
                "exception": (
                    type(exc).__name__
                ),
                "message": str(exc),
                "timeout_ms": (
                    BROWSER_NAVIGATION_TIMEOUT_MS
                ),
            }

            logger.warning(
                "Navigation timeout. "
                "session_id=%s url=%s",
                session_id,
                url,
            )

        except Exception as exc:
            if network_guard and any(b.get("is_navigation_request") for b in network_guard.blocked_requests):
                navigation_error = {
                    "type": "ssrf_egress_blocked",
                    "exception": type(exc).__name__,
                    "message": "Target navigation blocked by NetworkGuard: forbidden scheme, private/reserved IP, or cloud metadata access.",
                }
            else:
                navigation_error = {
                    "type": "navigation_error",
                    "exception": (
                        type(exc).__name__
                    ),
                    "message": str(exc),
                }

            logger.warning(
                "Navigation error. "
                "session_id=%s url=%s error=%s",
                session_id,
                url,
                exc,
            )

        try:
            page.wait_for_timeout(
                PAGE_SETTLE_TIME_MS
            )

        except Exception:
            logger.debug(
                "Page settle wait failed.",
                exc_info=True,
            )

        # Automated interactivity pass to bypass click-walls and anti-analysis lures
        auto_interaction_data = {
            "attempted": False,
            "interacted": False,
            "actions": [],
        }
        if streamer:
            streamer.publish_event("Simulating human interaction & anti-evasion traversal...", level="action")
        try:
            auto_interaction_data = perform_automated_interactivity(page)
        except Exception as interactor_err:
            logger.debug(
                "Automated interactivity execution failed: %s",
                interactor_err,
            )

        if (
            collectors.redirects
            .redirect_limit_exceeded
        ):
            navigation_error = {
                "type": (
                    "redirect_limit_exceeded"
                ),
                "message": (
                    "The observed redirect chain "
                    "exceeded the configured limit."
                ),
            }

        if streamer:
            streamer.publish_event("Extracting DOM telemetry, network HAR & screenshot...", level="action")

        evidence = collect_browser_evidence(
            page=page,
            context=context,
            collectors=collectors,
            paths=paths,
            requested_url=url,
            navigation_response=(
                navigation_response
            ),
            started_at=started_at,
            navigation_error=(
                navigation_error
            ),
            popup_records=popup_records,
            dialog_records=dialog_records,
            network_guard=network_guard,
        )

        evidence["auto_interaction"] = auto_interaction_data
        evidence["har_path"] = str(paths.network_dir / "traffic.har")

    except Exception as exc:
        fatal_error = {
            "type": type(exc).__name__,
            "message": str(exc),
            "stage": "browser_execution",
        }

        logger.exception(
            "Fatal browser execution error. "
            "session_id=%s",
            session_id,
        )

        try:
            session_manager.record_error(
                paths=paths,
                error_name=(
                    "browser_execution_error"
                ),
                error_data=fatal_error,
            )

        except Exception:
            logger.exception(
                "Unable to persist browser execution error."
            )

    finally:
        execution_completed = datetime.now(
            timezone.utc
        )

        completed_at = (
            execution_completed.isoformat()
        )

        duration_ms = calculate_duration_ms(
            execution_started,
            execution_completed,
        )

        if fatal_error is not None:
            execution_status = "failed"

        elif navigation_error is not None:
            execution_status = (
                "completed_with_errors"
            )

        else:
            execution_status = "completed"

        execution = {
            "session_id": session_id,
            "requested_url": url,
            "status": execution_status,
            "execution_environment": (
                "isolated_vm"
            ),
            "browser_engine": "chromium",
            "headless": BROWSER_HEADLESS,
            "started_at": started_at,
            "completed_at": completed_at,
            "duration_ms": duration_ms,
            "navigation_error": (
                navigation_error
            ),
            "fatal_error": fatal_error,
        }

        evidence["execution"] = execution

        try:
            saved_files = (
                persist_browser_evidence(
                    paths=paths,
                    evidence=evidence,
                )
            )

            evidence["evidence_files"] = (
                saved_files
            )

        except Exception as exc:
            logger.exception(
                "Evidence persistence failed. "
                "session_id=%s",
                session_id,
            )

            evidence[
                "persistence_error"
            ] = {
                "type": (
                    type(exc).__name__
                ),
                "message": str(exc),
            }

            try:
                session_manager.record_error(
                    paths=paths,
                    error_name=(
                        "evidence_persistence_error"
                    ),
                    error_data=(
                        evidence[
                            "persistence_error"
                        ]
                    ),
                )

            except Exception:
                logger.exception(
                    "Unable to record evidence persistence error."
                )

        try:
            if streamer:
                streamer.publish_event("Evaluating threat heuristics, IOCs & MITRE ATT&CK rules...", level="action")

            analysis = analyze_threats(
                evidence
            )

            decision = make_decision(
                analysis.get(
                    "risk_score",
                    0,
                ),
                analysis_status=(
                    execution_status
                ),
                critical_finding_count=(
                    analysis.get(
                        "critical_finding_count",
                        0,
                    )
                ),
                high_finding_count=(
                    analysis.get(
                        "high_finding_count",
                        0,
                    )
                ),
            )

            report_path = build_report(
                session_path=paths,
                session_id=session_id,
                report_data={
                    "evidence": evidence,
                    "analysis": analysis,
                    "decision": decision,
                },
            )

        except Exception as exc:
            logger.exception(
                "Threat analysis or report generation failed. "
                "session_id=%s",
                session_id,
            )

            pipeline_error = {
                "type": type(
                    exc
                ).__name__,
                "message": str(exc),
                "stage": (
                    "analysis_and_reporting"
                ),
            }

            evidence[
                "analysis_pipeline_error"
            ] = pipeline_error

            try:
                session_manager.record_error(
                    paths=paths,
                    error_name=(
                        "analysis_pipeline_error"
                    ),
                    error_data=(
                        pipeline_error
                    ),
                )

            except Exception:
                logger.exception(
                    "Unable to save analysis pipeline error."
                )

        try:
            final_session_status = (
                "completed"
                if report_path is not None
                else "failed"
            )

            session_manager.write_status(
                paths=paths,
                status=final_session_status,
                additional_data={
                    "url": url,
                    "browser_status": (
                        execution_status
                    ),
                    "completed_at": (
                        completed_at
                    ),
                    "duration_ms": (
                        duration_ms
                    ),
                    "report_path": (
                        report_path
                    ),
                    "verdict": (
                        decision.get(
                            "verdict"
                        )
                        if decision
                        else None
                    ),
                },
            )

        except Exception:
            logger.exception(
                "Unable to update final session status."
            )

        if streamer is not None:
            try:
                streamer.publish_event("Detonation complete. Releasing sandbox resources...", level="info")
                streamer.stop()
            except Exception:
                pass

        close_page_safely(
            page
        )

        close_context_safely(
            context
        )

        close_browser_safely(
            browser
        )

        stop_playwright_safely(
            playwright_instance
        )

        logger.info(
            "URL analysis finished. "
            "session_id=%s "
            "browser_status=%s "
            "report_path=%s "
            "duration_ms=%s",
            session_id,
            execution_status,
            report_path,
            duration_ms,
        )

    return {
        "session_id": session_id,

        "status": evidence.get(
            "execution",
            {},
        ).get(
            "status",
            "failed",
        ),

        "evidence": evidence,

        "analysis": analysis,

        "decision": decision,

        "report_path": report_path,
    }


def open_url(
    url: str,
    session_path: SessionPaths | Path | str | None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    Compatibility wrapper for older callers.

    New code should use analyze_url().
    """

    if session_id is None:
        if isinstance(
            session_path,
            SessionPaths,
        ):
            session_id = (
                session_path.session_id
            )

        elif session_path is not None:
            session_id = Path(
                str(session_path)
            ).name

        else:
            raise BrowserControllerError(
                "session_id is required when session_path is None."
            )

    return analyze_url(
        url=url,
        session_path=session_path,
        session_id=session_id,
    )