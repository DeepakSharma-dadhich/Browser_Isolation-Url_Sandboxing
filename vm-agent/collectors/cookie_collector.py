"""
Cookie evidence collector for BrowseGuard.

Collects cookie names, domains, paths, security attributes (Secure, HttpOnly,
SameSite), and expiry from the isolated browser context.

Cookie values are NOT stored directly in plaintext to prevent leaking sensitive
session tokens into stored reports. A SHA-256 hash and length are stored instead.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

from playwright.sync_api import BrowserContext


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_value(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def collect_cookies(
    context: BrowserContext,
    page_url: str | None = None,
) -> dict[str, Any]:
    """
    Extract, sanitize and categorize all cookies in the browser context.
    """
    try:
        raw_cookies = context.cookies()
    except Exception as exc:
        return {
            "collected_at": utc_now_iso(),
            "cookie_count": 0,
            "available": False,
            "error": {
                "type": type(exc).__name__,
                "message": str(exc),
            },
            "summary": {
                "total": 0,
                "secure": 0,
                "httponly": 0,
                "samesite_strict": 0,
                "samesite_lax": 0,
                "samesite_none": 0,
                "insecure_on_https": 0,
                "third_party": 0,
            },
            "cookies": [],
        }

    page_hostname = None
    if page_url:
        try:
            page_hostname = urlsplit(page_url).hostname
            if page_hostname:
                page_hostname = page_hostname.lower()
        except Exception:
            page_hostname = None

    sanitized_cookies = []
    secure_count = 0
    httponly_count = 0
    samesite_strict = 0
    samesite_lax = 0
    samesite_none = 0
    insecure_on_https = 0
    third_party_count = 0

    is_page_https = bool(page_url and page_url.lower().startswith("https://"))

    for cookie in raw_cookies:
        name = str(cookie.get("name", ""))
        raw_val = cookie.get("value", "")
        domain = str(cookie.get("domain", "")).lower()
        path = str(cookie.get("path", "/"))
        expires = cookie.get("expires", -1)
        http_only = bool(cookie.get("httpOnly", False))
        secure = bool(cookie.get("secure", False))
        same_site_raw = str(cookie.get("sameSite", "None")).capitalize()

        if secure:
            secure_count += 1
        elif is_page_https:
            insecure_on_https += 1

        if http_only:
            httponly_count += 1

        if same_site_raw == "Strict":
            samesite_strict += 1
        elif same_site_raw == "Lax":
            samesite_lax += 1
        else:
            samesite_none += 1

        # Check if third-party cookie relative to final page
        is_third_party = False
        if page_hostname and domain:
            cleaned_domain = domain.lstrip(".")
            if not (
                page_hostname == cleaned_domain
                or page_hostname.endswith("." + cleaned_domain)
            ):
                is_third_party = True
                third_party_count += 1

        sanitized_cookies.append({
            "name": name,
            "domain": domain,
            "path": path,
            "secure": secure,
            "httponly": http_only,
            "same_site": same_site_raw,
            "is_session": expires in (-1, None, 0),
            "expires": expires,
            "value_length": len(raw_val) if raw_val else 0,
            "value_fingerprint": hash_value(raw_val),
            "is_third_party": is_third_party,
        })

    return {
        "collected_at": utc_now_iso(),
        "available": True,
        "cookie_count": len(sanitized_cookies),
        "summary": {
            "total": len(sanitized_cookies),
            "secure": secure_count,
            "httponly": httponly_count,
            "samesite_strict": samesite_strict,
            "samesite_lax": samesite_lax,
            "samesite_none": samesite_none,
            "insecure_on_https": insecure_on_https,
            "third_party": third_party_count,
        },
        "cookies": sanitized_cookies,
    }
