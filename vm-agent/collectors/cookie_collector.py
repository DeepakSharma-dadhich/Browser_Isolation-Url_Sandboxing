"""
Browser cookie collector.

Cookies are collected from the isolated browser context after the page
execution completes.
"""

from datetime import datetime, timezone
from typing import Any

from playwright.sync_api import BrowserContext


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def sanitize_cookie(
    cookie: dict[str, Any],
) -> dict[str, Any]:
    """
    Return a normalized cookie record.
    """

    return {
        "name": cookie.get("name"),
        "value": cookie.get("value"),
        "domain": cookie.get("domain"),
        "path": cookie.get("path"),
        "expires": cookie.get("expires"),
        "http_only": cookie.get("httpOnly"),
        "secure": cookie.get("secure"),
        "same_site": cookie.get("sameSite"),
    }


def collect_cookies(
    context: BrowserContext,
) -> dict[str, Any]:
    """
    Collect all cookies stored in the isolated browser context.

    Returns an empty collection if the context closes unexpectedly.
    """

    try:
        cookies = context.cookies()
        collection_error = None

    except Exception as exc:
        cookies = []
        collection_error = {
            "type": type(exc).__name__,
            "message": str(exc),
        }

    return {
        "collected_at": utc_now_iso(),
        "cookie_count": len(cookies),
        "cookies": [
            sanitize_cookie(cookie)
            for cookie in cookies
        ],
        "collection_error": collection_error,
    }