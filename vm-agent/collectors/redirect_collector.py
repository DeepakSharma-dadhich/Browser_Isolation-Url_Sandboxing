"""
Navigation and redirect evidence collector.

This collector gathers raw redirect and navigation evidence only.
It does not calculate threat scores or make security decisions.
"""

from __future__ import annotations

import ipaddress
from datetime import datetime, timezone
from typing import Any
from urllib.parse import (
    parse_qsl,
    urlencode,
    urljoin,
    urlsplit,
    urlunsplit,
)

from playwright.sync_api import (
    Frame,
    Page,
    Request,
    Response,
)


# Only status codes that actually perform an HTTP redirect.
REDIRECT_STATUS_CODES = {
    301,
    302,
    303,
    307,
    308,
}

BROWSER_INTERNAL_SCHEMES = {
    "about",
    "blob",
    "chrome",
    "chrome-error",
    "data",
    "devtools",
    "edge",
    "file",
    "javascript",
}


def utc_now_iso() -> str:
    """Return the current UTC time in ISO-8601 format."""

    return datetime.now(timezone.utc).isoformat()


def normalize_hostname(hostname: str | None) -> str | None:
    """
    Normalize a hostname for comparison.

    Examples:
        Example.COM -> example.com
        www.example.com -> www.example.com
    """

    if not hostname:
        return None

    hostname = hostname.strip().rstrip(".").lower()

    return hostname or None


def normalize_url(url: str | None) -> str | None:
    """
    Normalize a URL for reliable redirect-chain comparison.

    This function:

    - Lowercases scheme and hostname
    - Removes URL fragments
    - Removes default ports
    - Sorts query parameters
    - Ensures HTTP URLs have a path
    """

    if not url:
        return None

    url = url.strip()

    if not url:
        return None

    try:
        parsed = urlsplit(url)
    except Exception:
        return url

    scheme = parsed.scheme.lower()
    hostname = normalize_hostname(parsed.hostname)

    # Internal browser URLs may not contain a normal hostname.
    if not hostname:
        return urlunsplit(
            (
                scheme,
                parsed.netloc,
                parsed.path,
                parsed.query,
                "",
            )
        )

    try:
        port = parsed.port
    except ValueError:
        port = None

    if (
        port is None
        or (scheme == "http" and port == 80)
        or (scheme == "https" and port == 443)
    ):
        netloc = hostname
    else:
        netloc = f"{hostname}:{port}"

    if parsed.username:
        credentials = parsed.username

        if parsed.password:
            credentials += f":{parsed.password}"

        netloc = f"{credentials}@{netloc}"

    path = parsed.path

    if scheme in {"http", "https"} and not path:
        path = "/"

    try:
        query_items = parse_qsl(
            parsed.query,
            keep_blank_values=True,
        )
        query_items.sort()
        query = urlencode(query_items, doseq=True)
    except Exception:
        query = parsed.query

    return urlunsplit(
        (
            scheme,
            netloc,
            path,
            query,
            "",
        )
    )


def get_url_scheme(url: str | None) -> str | None:
    """Return a normalized URL scheme."""

    if not url:
        return None

    try:
        scheme = urlsplit(url).scheme.lower()
    except Exception:
        return None

    return scheme or None


def get_url_hostname(url: str | None) -> str | None:
    """Return a normalized hostname from a URL."""

    if not url:
        return None

    try:
        return normalize_hostname(
            urlsplit(url).hostname
        )
    except Exception:
        return None


def is_browser_internal_url(url: str | None) -> bool:
    """Return True when a URL belongs to the browser itself."""

    scheme = get_url_scheme(url)

    return bool(
        scheme
        and scheme in BROWSER_INTERNAL_SCHEMES
    )


def get_ip_information(
    hostname: str | None,
) -> dict[str, Any]:
    """
    Detect whether a hostname is an IP address.

    No DNS lookup is performed. Only literal IPv4/IPv6 hosts are checked.
    """

    result = {
        "is_ip_address": False,
        "ip_version": None,
        "is_private_ip": False,
        "is_loopback_ip": False,
        "is_link_local_ip": False,
        "is_reserved_ip": False,
    }

    if not hostname:
        return result

    candidate = hostname.strip("[]")

    try:
        ip_value = ipaddress.ip_address(candidate)
    except ValueError:
        return result

    result.update(
        {
            "is_ip_address": True,
            "ip_version": ip_value.version,
            "is_private_ip": ip_value.is_private,
            "is_loopback_ip": ip_value.is_loopback,
            "is_link_local_ip": ip_value.is_link_local,
            "is_reserved_ip": ip_value.is_reserved,
        }
    )

    return result


def contains_punycode(hostname: str | None) -> bool:
    """Return True when a hostname contains an IDNA punycode label."""

    if not hostname:
        return False

    return any(
        label.lower().startswith("xn--")
        for label in hostname.split(".")
    )


def build_url_metadata(
    url: str | None,
) -> dict[str, Any]:
    """Build neutral URL metadata for collected evidence."""

    normalized = normalize_url(url)
    scheme = get_url_scheme(normalized)
    hostname = get_url_hostname(normalized)
    ip_info = get_ip_information(hostname)

    return {
        "url": url,
        "normalized_url": normalized,
        "scheme": scheme,
        "hostname": hostname,
        "is_browser_internal": (
            is_browser_internal_url(normalized)
        ),
        "contains_punycode": contains_punycode(
            hostname
        ),
        **ip_info,
    }


def build_transition_metadata(
    source_url: str | None,
    destination_url: str | None,
) -> dict[str, Any]:
    """
    Describe the transition between two URLs.

    These are factual properties only, not risk decisions.
    """

    source_scheme = get_url_scheme(source_url)
    destination_scheme = get_url_scheme(
        destination_url
    )

    source_hostname = get_url_hostname(source_url)
    destination_hostname = get_url_hostname(
        destination_url
    )

    domain_changed = bool(
        source_hostname
        and destination_hostname
        and source_hostname != destination_hostname
    )

    return {
        "source_hostname": source_hostname,
        "destination_hostname": destination_hostname,
        "domain_changed": domain_changed,
        "scheme_changed": bool(
            source_scheme
            and destination_scheme
            and source_scheme != destination_scheme
        ),
        "https_upgrade": (
            source_scheme == "http"
            and destination_scheme == "https"
        ),
        "https_downgrade": (
            source_scheme == "https"
            and destination_scheme == "http"
        ),
    }


class RedirectCollector:
    """Collect redirect and main-frame navigation evidence."""

    def __init__(
        self,
        maximum_redirects: int = 20,
    ) -> None:
        if maximum_redirects < 1:
            raise ValueError(
                "maximum_redirects must be at least 1"
            )

        self.maximum_redirects = maximum_redirects

        self.redirects: list[dict[str, Any]] = []
        self.subresource_redirects: list[
            dict[str, Any]
        ] = []
        self.frame_navigations: list[
            dict[str, Any]
        ] = []

        self.redirect_limit_reached = False
        self.redirect_limit_exceeded = False

        self._page: Page | None = None
        self._attached = False

        self._seen_main_redirects: set[
            tuple[str | None, str | None, int]
        ] = set()

    def attach(
        self,
        page: Page,
    ) -> "RedirectCollector":
        """Attach Playwright listeners to a page."""

        if self._attached:
            return self

        self._page = page

        page.on(
            "response",
            self._handle_response,
        )

        page.on(
            "framenavigated",
            self._handle_frame_navigation,
        )

        self._attached = True

        return self

    def _is_main_frame_request(
        self,
        request: Request,
    ) -> bool:
        """Return True when a request is a top-level document navigation in the main frame."""

        if self._page is None:
            return False

        try:
            # Must belong to the page's top-level/main frame
            if request.frame != self._page.main_frame:
                return False

            # In Playwright, is_navigation_request() is True ONLY for frame navigations (not subresources)
            if hasattr(request, "is_navigation_request"):
                try:
                    if request.is_navigation_request():
                        return True
                except Exception:
                    pass

            # Explicitly exclude known sub-resource asset types
            resource_type = getattr(request, "resource_type", "")
            if resource_type in {
                "stylesheet",
                "image",
                "media",
                "font",
                "script",
                "texttrack",
                "xhr",
                "fetch",
                "eventsource",
                "websocket",
                "manifest",
            }:
                return False

            return resource_type == "document"
        except Exception:
            return False

    def _get_redirect_destination(
        self,
        response: Response,
        headers: dict[str, str],
    ) -> str | None:
        """
        Resolve redirect destination.

        Prefer Playwright's redirected request relationship and fall
        back to the HTTP Location header.
        """

        try:
            redirected_request = (
                response.request.redirected_to
            )

            if redirected_request is not None:
                return normalize_url(
                    redirected_request.url
                )
        except Exception:
            pass

        location = headers.get("location")

        if not location:
            return None

        try:
            resolved = urljoin(
                response.url,
                location,
            )
        except Exception:
            resolved = location

        return normalize_url(resolved)

    def _handle_response(
        self,
        response: Response,
    ) -> None:
        """Capture HTTP redirect responses."""

        try:
            status = response.status
        except Exception:
            return

        if status not in REDIRECT_STATUS_CODES:
            return

        try:
            request = response.request
        except Exception:
            return

        try:
            headers = response.all_headers()
        except Exception:
            headers = {}

        source_url = normalize_url(response.url)
        destination_url = (
            self._get_redirect_destination(
                response,
                headers,
            )
        )

        is_main_frame = (
            self._is_main_frame_request(request)
        )

        record = {
            "timestamp": utc_now_iso(),
            "hop": None,
            "source_url": source_url,
            "destination_url": destination_url,
            # Kept for backward compatibility.
            "location": destination_url,
            "status": status,
            "request_method": request.method,
            "resource_type": request.resource_type,
            "is_main_frame": is_main_frame,
            "source": build_url_metadata(
                source_url
            ),
            "destination": build_url_metadata(
                destination_url
            ),
            "transition": build_transition_metadata(
                source_url,
                destination_url,
            ),
        }

        if not is_main_frame:
            self.subresource_redirects.append(record)
            return

        duplicate_key = (
            source_url,
            destination_url,
            status,
        )

        if duplicate_key in self._seen_main_redirects:
            return

        self._seen_main_redirects.add(duplicate_key)

        record["hop"] = len(self.redirects) + 1
        self.redirects.append(record)

        redirect_count = len(self.redirects)

        self.redirect_limit_reached = (
            redirect_count
            >= self.maximum_redirects
        )

        self.redirect_limit_exceeded = (
            redirect_count
            > self.maximum_redirects
        )

    def _handle_frame_navigation(
        self,
        frame: Frame,
    ) -> None:
        """Record unique main-frame navigations."""

        if self._page is None:
            return

        try:
            if frame != self._page.main_frame:
                return
        except Exception:
            return

        try:
            frame_url = normalize_url(frame.url)
        except Exception:
            frame_url = None

        if not frame_url:
            return

        previous_url = None

        if self.frame_navigations:
            previous_url = self.frame_navigations[-1].get(
                "url"
            )

        # Ignore consecutive duplicate navigation events.
        if frame_url == previous_url:
            return

        self.frame_navigations.append(
            {
                "timestamp": utc_now_iso(),
                "navigation_number": (
                    len(self.frame_navigations) + 1
                ),
                "url": frame_url,
                "metadata": build_url_metadata(
                    frame_url
                ),
                "transition": (
                    build_transition_metadata(
                        previous_url,
                        frame_url,
                    )
                    if previous_url
                    else None
                ),
            }
        )

    def _build_redirect_chain_urls(
        self,
    ) -> list[str]:
        """Build an ordered list of URLs from main redirects."""

        chain: list[str] = []

        for redirect in self.redirects:
            source_url = redirect.get("source_url")
            destination_url = redirect.get(
                "destination_url"
            )

            if source_url and (
                not chain
                or chain[-1] != source_url
            ):
                chain.append(source_url)

            if destination_url and (
                not chain
                or chain[-1] != destination_url
            ):
                chain.append(destination_url)

        return chain

    def _detect_redirect_loop(
        self,
        redirect_chain_urls: list[str],
    ) -> dict[str, Any]:
        """Detect repeated URLs inside the redirect chain."""

        first_seen: dict[str, int] = {}
        repeated_urls: list[str] = []
        loop_start_index: int | None = None
        loop_end_index: int | None = None

        for index, url in enumerate(
            redirect_chain_urls
        ):
            if url in first_seen:
                repeated_urls.append(url)

                if loop_start_index is None:
                    loop_start_index = first_seen[url]
                    loop_end_index = index
            else:
                first_seen[url] = index

        return {
            "detected": bool(repeated_urls),
            "repeated_urls": list(
                dict.fromkeys(repeated_urls)
            ),
            "loop_start_index": loop_start_index,
            "loop_end_index": loop_end_index,
        }

    def _get_last_successful_url(
        self,
    ) -> str | None:
        """
        Return the last non-browser-internal navigation URL.
        """

        for navigation in reversed(
            self.frame_navigations
        ):
            url = navigation.get("url")

            if (
                url
                and not is_browser_internal_url(url)
            ):
                return url

        return None

    def get_data(self) -> dict[str, Any]:
        """Return collected redirect evidence."""

        browser_final_url: str | None = None

        if self.frame_navigations:
            browser_final_url = (
                self.frame_navigations[-1].get("url")
            )

        last_successful_url = (
            self._get_last_successful_url()
        )

        navigation_failed = bool(
            browser_final_url
            and is_browser_internal_url(
                browser_final_url
            )
        )

        final_url = (
            last_successful_url
            if navigation_failed
            else browser_final_url
        )

        redirect_chain_urls = (
            self._build_redirect_chain_urls()
        )

        redirect_loop = self._detect_redirect_loop(
            redirect_chain_urls
        )

        unique_domains = sorted(
            {
                hostname
                for url in redirect_chain_urls
                if (
                    hostname
                    := get_url_hostname(url)
                )
            }
        )

        domain_change_count = sum(
            1
            for redirect in self.redirects
            if redirect.get(
                "transition",
                {},
            ).get("domain_changed")
        )

        https_upgrade_count = sum(
            1
            for redirect in self.redirects
            if redirect.get(
                "transition",
                {},
            ).get("https_upgrade")
        )

        https_downgrade_count = sum(
            1
            for redirect in self.redirects
            if redirect.get(
                "transition",
                {},
            ).get("https_downgrade")
        )

        ip_destination_count = sum(
            1
            for redirect in self.redirects
            if redirect.get(
                "destination",
                {},
            ).get("is_ip_address")
        )

        private_ip_destination_count = sum(
            1
            for redirect in self.redirects
            if redirect.get(
                "destination",
                {},
            ).get("is_private_ip")
        )

        punycode_destination_count = sum(
            1
            for redirect in self.redirects
            if redirect.get(
                "destination",
                {},
            ).get("contains_punycode")
        )

        return {
            "collected_at": utc_now_iso(),

            # Existing compatible fields
            "redirect_count": len(self.redirects),
            "navigation_count": len(
                self.frame_navigations
            ),
            "maximum_redirects": (
                self.maximum_redirects
            ),
            "redirect_limit_exceeded": (
                self.redirect_limit_exceeded
            ),
            "redirects": list(self.redirects),
            "main_frame_navigations": list(
                self.frame_navigations
            ),
            "final_url": final_url,

            # Improved redirect state
            "redirect_limit_reached": (
                self.redirect_limit_reached
            ),
            "subresource_redirect_count": len(
                self.subresource_redirects
            ),
            "subresource_redirects": list(
                self.subresource_redirects
            ),
            "redirect_chain_urls": (
                redirect_chain_urls
            ),
            "browser_final_url": browser_final_url,
            "last_successful_url": (
                last_successful_url
            ),
            "navigation_failed": navigation_failed,

            # Batch 2 intelligence
            "redirect_loop": redirect_loop,
            "unique_domains": unique_domains,
            "unique_domain_count": len(
                unique_domains
            ),
            "domain_change_count": (
                domain_change_count
            ),
            "https_upgrade_count": (
                https_upgrade_count
            ),
            "https_downgrade_count": (
                https_downgrade_count
            ),
            "ip_destination_count": (
                ip_destination_count
            ),
            "private_ip_destination_count": (
                private_ip_destination_count
            ),
            "punycode_destination_count": (
                punycode_destination_count
            ),
        }


def create_redirect_collector(
    page: Page,
    maximum_redirects: int = 20,
) -> RedirectCollector:
    """Create and attach a redirect collector."""

    return RedirectCollector(
        maximum_redirects=maximum_redirects
    ).attach(page)