"""
Page metadata collector.

Collects high-level information about the final page and the main
navigation response.
"""

from datetime import datetime, timezone
from typing import Any

from playwright.sync_api import Page, Response


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_response_headers(
    response: Response | None,
) -> dict[str, str]:
    """
    Safely extract response headers.
    """

    if response is None:
        return {}

    try:
        return response.all_headers()
    except Exception:
        return {}


def safe_page_title(
    page: Page,
) -> str | None:
    """
    Safely return the current page title.
    """

    try:
        return page.title()
    except Exception:
        return None


def safe_dom_text(
    page: Page,
    max_length: int = 50000,
) -> str:
    """
    Safely extract rendered text content from the DOM body for heuristic analysis.
    """

    try:
        text = page.evaluate("() => document.body ? (document.body.innerText || '') : ''")
        if isinstance(text, str):
            return text[:max_length]
        return ""
    except Exception:
        return ""


def collect_metadata(
    page: Page,
    requested_url: str,
    navigation_response: Response | None = None,
    started_at: str | None = None,
    completed_at: str | None = None,
) -> dict[str, Any]:
    """
    Collect high-level navigation and page metadata.
    """

    try:
        final_url = page.url
    except Exception:
        final_url = None

    status_code: int | None = None
    status_text: str | None = None
    response_url: str | None = None
    server_address: dict[str, Any] | None = None

    if navigation_response is not None:
        try:
            status_code = navigation_response.status
        except Exception:
            status_code = None

        try:
            status_text = navigation_response.status_text
        except Exception:
            status_text = None

        try:
            response_url = navigation_response.url
        except Exception:
            response_url = None

        try:
            server_address = navigation_response.server_addr()
        except Exception:
            server_address = None

    return {
        "requested_url": requested_url,
        "response_url": response_url,
        "final_url": final_url,
        "page_title": safe_page_title(page),
        "dom_text": safe_dom_text(page),
        "status_code": status_code,
        "status_text": status_text,
        "response_headers": safe_response_headers(
            navigation_response
        ),
        "server_address": server_address,
        "started_at": started_at,
        "completed_at": completed_at or utc_now_iso(),
    }