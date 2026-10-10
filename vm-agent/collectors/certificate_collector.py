"""
TLS & Certificate evidence collector for BrowseGuard.

Extracts transport layer security observations from the main navigation response,
including TLS protocol version, certificate issuer, subject name, validity period,
and expiry indicators.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

from playwright.sync_api import Page, Response


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def collect_certificate(
    page: Page,
    navigation_response: Response | None = None,
) -> dict[str, Any]:
    """
    Extract TLS certificate details and security observations.
    """
    current_url = page.url or ""
    is_https = current_url.lower().startswith("https://")
    hostname = None

    try:
        hostname = urlsplit(current_url).hostname
    except Exception:
        hostname = None

    result: dict[str, Any] = {
        "collected_at": utc_now_iso(),
        "is_https": is_https,
        "hostname": hostname,
        "protocol": None,
        "issuer": None,
        "subject_name": None,
        "valid_from": None,
        "valid_to": None,
        "valid_from_iso": None,
        "valid_to_iso": None,
        "is_expired": False,
        "days_remaining": None,
        "has_security_details": False,
        "warnings": [],
    }

    if not is_https:
        result["warnings"].append("Target page was served over unencrypted HTTP.")
        return result

    if navigation_response is None:
        result["warnings"].append("No navigation response available to inspect TLS.")
        return result

    try:
        security_details = navigation_response.security_details()
    except Exception as exc:
        result["warnings"].append(f"Failed to query security details: {exc}")
        return result

    if not security_details:
        # On Playwright, if ignore_https_errors=True was triggered due to an invalid/self-signed cert,
        # security_details might be None or empty.
        result["warnings"].append(
            "No valid TLS security details returned. The certificate may be self-signed, invalid, or bypassed."
        )
        return result

    result["has_security_details"] = True
    result["protocol"] = security_details.get("protocol")
    result["issuer"] = security_details.get("issuer")
    result["subject_name"] = security_details.get("subjectName")

    valid_from = security_details.get("validFrom")
    valid_to = security_details.get("validTo")

    result["valid_from"] = valid_from
    result["valid_to"] = valid_to

    now_ts = time.time()

    if valid_from is not None:
        try:
            result["valid_from_iso"] = datetime.fromtimestamp(
                valid_from, tz=timezone.utc
            ).isoformat()
        except Exception:
            pass

    if valid_to is not None:
        try:
            result["valid_to_iso"] = datetime.fromtimestamp(
                valid_to, tz=timezone.utc
            ).isoformat()
            if valid_to < now_ts:
                result["is_expired"] = True
                result["warnings"].append("TLS certificate is expired.")
            else:
                remaining_seconds = valid_to - now_ts
                result["days_remaining"] = int(remaining_seconds / 86400)
        except Exception:
            pass

    if result["protocol"] in ("TLS 1.0", "TLS 1.1", "SSLv3"):
        result["warnings"].append(
            f"Deprecate/weak TLS protocol version observed: {result['protocol']}."
        )

    return result