"""
HTTP Response Headers and Security Policy collector for BrowseGuard.

Evaluates response security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
and server fingerprint headers to assess page security posture.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from playwright.sync_api import Response


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def collect_headers(
    navigation_response: Response | None = None,
) -> dict[str, Any]:
    """
    Extract and categorize response headers from navigation response.
    """
    if navigation_response is None:
        return {
            "collected_at": utc_now_iso(),
            "available": False,
            "raw_headers": {},
            "security_headers": {},
            "server_fingerprints": {},
            "missing_security_headers": [],
            "error": "No navigation response available.",
        }

    try:
        raw_headers = navigation_response.headers or {}
    except Exception as exc:
        return {
            "collected_at": utc_now_iso(),
            "available": False,
            "raw_headers": {},
            "security_headers": {},
            "server_fingerprints": {},
            "missing_security_headers": [],
            "error": str(exc),
        }

    # Normalize keys to lowercase
    lower_headers: dict[str, str] = {
        k.lower(): v for k, v in raw_headers.items()
    }

    hsts = lower_headers.get("strict-transport-security")
    csp = lower_headers.get("content-security-policy")
    xfo = lower_headers.get("x-frame-options")
    xcto = lower_headers.get("x-content-type-options")
    referrer_policy = lower_headers.get("referrer-policy")
    permissions_policy = lower_headers.get("permissions-policy")

    security_headers = {
        "hsts": {
            "present": bool(hsts),
            "value": hsts,
            "includes_subdomains": bool(hsts and "includesubdomains" in hsts.lower()),
            "preload": bool(hsts and "preload" in hsts.lower()),
        },
        "csp": {
            "present": bool(csp),
            "value": csp,
        },
        "x_frame_options": {
            "present": bool(xfo),
            "value": xfo,
        },
        "x_content_type_options": {
            "present": bool(xcto),
            "value": xcto,
            "is_nosniff": bool(xcto and "nosniff" in xcto.lower()),
        },
        "referrer_policy": {
            "present": bool(referrer_policy),
            "value": referrer_policy,
        },
        "permissions_policy": {
            "present": bool(permissions_policy),
            "value": permissions_policy,
        },
    }

    missing = []
    if not hsts:
        missing.append("strict-transport-security")
    if not csp:
        missing.append("content-security-policy")
    if not xfo:
        missing.append("x-frame-options")
    if not xcto:
        missing.append("x-content-type-options")

    server_fingerprints = {
        "server": lower_headers.get("server"),
        "x_powered_by": lower_headers.get("x-powered-by"),
        "x_aspnet_version": lower_headers.get("x-aspnet-version"),
    }

    # Strip out potentially sensitive header values before storing raw headers
    sanitized_raw = {}
    for k, v in lower_headers.items():
        if k in ("set-cookie", "authorization", "proxy-authorization"):
            sanitized_raw[k] = "[REDACTED]"
        else:
            sanitized_raw[k] = v

    return {
        "collected_at": utc_now_iso(),
        "available": True,
        "status_code": navigation_response.status,
        "security_headers": security_headers,
        "server_fingerprints": server_fingerprints,
        "missing_security_headers": missing,
        "header_count": len(raw_headers),
        "raw_headers": sanitized_raw,
    }