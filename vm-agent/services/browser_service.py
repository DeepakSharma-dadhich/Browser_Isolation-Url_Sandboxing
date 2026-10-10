"""
Browser evidence service.

This service attaches browser collectors, gathers their results and
stores raw evidence for one URL-analysis session.

It does not:

- launch Chromium
- navigate to URLs
- calculate risk
- make a verdict
- generate report.json
"""

from __future__ import annotations

from typing import Any

from playwright.sync_api import (
    BrowserContext,
    Page,
    Response,
)

from config import MAX_REDIRECTS
from session_manager import (
    SessionPaths,
    utc_now_iso,
)
from utils.json_utils import write_json_atomic
from utils.logging_utils import configure_logging

from collectors.console_collector import (
    ConsoleCollector,
    create_console_collector,
)
from collectors.download_collector import (
    DownloadCollector,
    create_download_collector,
)
from collectors.html_collector import save_html_source
from collectors.metadata_collector import collect_metadata
from collectors.network_collector import (
    NetworkCollector,
    create_network_collector,
)
from collectors.redirect_collector import (
    RedirectCollector,
    create_redirect_collector,
)
from collectors.client_redirect_collector import (
    ClientRedirectCollector,
    create_client_redirect_collector,
)
from collectors.certificate_collector import collect_certificate
from collectors.cookie_collector import collect_cookies
from collectors.forms_collector import collect_forms
from collectors.headers_collector import collect_headers
from collectors.javascript_collector import collect_javascript


logger = configure_logging(
    "vm_agent.services.browser_service"
)


class BrowserEvidenceError(Exception):
    """
    Raised when browser evidence cannot be collected or persisted.
    """


class BrowserCollectors:
    """
    Stores all active collector instances for one browser page.
    """

    def __init__(
        self,
        console: ConsoleCollector,
        network: NetworkCollector,
        redirects: RedirectCollector,
        client_redirects: ClientRedirectCollector,
        downloads: DownloadCollector,
    ) -> None:
        self.console = console
        self.network = network
        self.redirects = redirects
        self.client_redirects = client_redirects
        self.downloads = downloads


def attach_collectors(
    page: Page,
    paths: SessionPaths,
) -> BrowserCollectors:
    """
    Attach all event-based collectors before navigation starts.

    Args:
        page:
            Playwright page used for analysis.

        paths:
            Canonical session directories.

    Returns:
        Active collector container.
    """

    console_collector = create_console_collector(
        page
    )

    network_collector = create_network_collector(
        page
    )

    redirect_collector = create_redirect_collector(
        page,
        maximum_redirects=MAX_REDIRECTS,
    )

    client_redirect_collector = (
        create_client_redirect_collector(
            page
        )
    )

    download_collector = create_download_collector(
        page,
        paths.downloads_dir,
    )

    return BrowserCollectors(
        console=console_collector,
        network=network_collector,
        redirects=redirect_collector,
        client_redirects=client_redirect_collector,
        downloads=download_collector,
    )


def capture_screenshot(
    page: Page,
    paths: SessionPaths,
) -> dict[str, Any]:
    """
    Capture the final rendered page screenshot.

    Full-page capture is attempted first. A viewport screenshot is used
    as a fallback.
    """

    screenshot_path = (
        paths.screenshots_dir / "final_page.png"
    )

    screenshot_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    result: dict[str, Any] = {
        "captured": False,
        "path": str(screenshot_path),
        "capture_type": None,
        "size_bytes": None,
        "captured_at": utc_now_iso(),
        "error": None,
    }

    try:
        page.screenshot(
            path=str(screenshot_path),
            full_page=True,
        )

        result["captured"] = True
        result["capture_type"] = "full_page"

    except Exception as full_page_error:
        try:
            page.screenshot(
                path=str(screenshot_path),
                full_page=False,
            )

            result["captured"] = True
            result["capture_type"] = "viewport"

        except Exception as viewport_error:
            result["error"] = {
                "full_page": {
                    "type": type(
                        full_page_error
                    ).__name__,
                    "message": str(
                        full_page_error
                    ),
                },
                "viewport": {
                    "type": type(
                        viewport_error
                    ).__name__,
                    "message": str(
                        viewport_error
                    ),
                },
            }

    if (
        result["captured"]
        and screenshot_path.exists()
    ):
        try:
            result["size_bytes"] = (
                screenshot_path.stat().st_size
            )
        except OSError:
            result["size_bytes"] = None

    return result


def collect_browser_evidence(
    *,
    page: Page,
    context: BrowserContext,
    collectors: BrowserCollectors,
    paths: SessionPaths,
    requested_url: str,
    navigation_response: Response | None,
    started_at: str,
    navigation_error: dict[str, Any] | None,
    popup_records: list[dict[str, Any]],
    dialog_records: list[dict[str, Any]],
    network_guard: Any | None = None,
) -> dict[str, Any]:
    """
    Gather all browser evidence after navigation.

    Collector failures are isolated so one failed collector does not
    destroy the entire analysis session.
    """

    completed_at = utc_now_iso()

    metadata = collect_metadata(
        page=page,
        requested_url=requested_url,
        navigation_response=navigation_response,
        started_at=started_at,
        completed_at=completed_at,
    )

    cookies = collect_cookies(
        context,
        page_url=page.url,
    )

    forms = collect_forms(page)

    headers = collect_headers(navigation_response)

    javascript = collect_javascript(page)

    certificate = collect_certificate(page, navigation_response)

    html = save_html_source(
        page=page,
        html_dir=paths.html_dir,
        filename="page.html",
    )

    screenshot = capture_screenshot(
        page=page,
        paths=paths,
    )

    evidence = {
        "metadata": metadata,
        "cookies": cookies,
        "forms": forms,
        "headers": headers,
        "javascript": javascript,
        "certificate": certificate,
        "console": (
            collectors.console.get_data()
        ),
        "network": (
            collectors.network.get_data()
        ),
        "redirects": (
            collectors.redirects.get_data()
        ),
        "client_redirects": (
            collectors.client_redirects.get_data()
        ),
        "downloads": (
            collectors.downloads.get_data()
        ),
        "html": html,
        "screenshot": screenshot,
        "popups": {
            "popup_count": len(
                popup_records
            ),
            "popups": popup_records,
        },
        "dialogs": {
            "dialog_count": len(
                dialog_records
            ),
            "dialogs": dialog_records,
        },
        "network_guard": (
            network_guard.get_data()
            if network_guard is not None
            else {
                "guard_active": False,
                "blocked_count": 0,
                "blocked_requests": [],
                "has_ssrf_attempt": False,
            }
        ),
        "navigation_error": navigation_error,
        "collected_at": completed_at,
    }

    return evidence


def persist_browser_evidence(
    paths: SessionPaths,
    evidence: dict[str, Any],
) -> dict[str, str]:
    """
    Store raw browser evidence in session-specific files.

    These are supporting artifacts. They are not the final report.
    """

    evidence_destinations = {
        "metadata": (
            paths.metadata_dir / "metadata.json"
        ),
        "cookies": (
            paths.cookies_dir / "cookies.json"
        ),
        "forms": (
            paths.metadata_dir / "forms.json"
        ),
        "headers": (
            paths.metadata_dir / "headers.json"
        ),
        "javascript": (
            paths.metadata_dir / "javascript.json"
        ),
        "certificate": (
            paths.metadata_dir / "certificate.json"
        ),
        "network_guard": (
            paths.metadata_dir / "network_guard.json"
        ),
        "console": (
            paths.console_dir / "console.json"
        ),
        "network": (
            paths.network_dir / "network.json"
        ),
        "redirects": (
            paths.redirects_dir
            / "redirects.json"
        ),
        "client_redirects": (
            paths.redirects_dir
            / "client_redirects.json"
        ),
        "downloads": (
            paths.downloads_dir
            / "downloads.json"
        ),
        "html": (
            paths.metadata_dir
            / "html_artifact.json"
        ),
        "screenshot": (
            paths.metadata_dir
            / "screenshot_artifact.json"
        ),
        "popups": (
            paths.metadata_dir
            / "popups.json"
        ),
        "dialogs": (
            paths.metadata_dir
            / "dialogs.json"
        ),
        "navigation_error": (
            paths.errors_dir
            / "navigation_error.json"
        ),
    }

    saved_files: dict[str, str] = {}

    for evidence_name, destination in (
        evidence_destinations.items()
    ):
        evidence_value = evidence.get(
            evidence_name
        )

        if (
            evidence_name
            == "navigation_error"
            and evidence_value is None
        ):
            continue

        try:
            write_json_atomic(
                destination,
                evidence_value,
            )

            saved_files[evidence_name] = str(
                destination
            )

        except Exception as exc:
            logger.exception(
                "Failed to persist %s evidence "
                "for session %s.",
                evidence_name,
                paths.session_id,
            )

            saved_files[evidence_name] = (
                f"ERROR: {type(exc).__name__}: {exc}"
            )

    evidence_index_path = (
        paths.output_dir
        / "evidence_index.json"
    )

    write_json_atomic(
        evidence_index_path,
        {
            "session_id": paths.session_id,
            "created_at": utc_now_iso(),
            "files": saved_files,
        },
    )

    saved_files["evidence_index"] = str(
        evidence_index_path
    )

    return saved_files