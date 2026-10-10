"""
Network Egress Guard and SSRF Protection for Isolated Browser Execution.

Provides strict network perimeter defense inside the sandbox:
- Blocks private, loopback, link-local, cloud-metadata, and reserved IP egress
- Detects DNS rebinding / internal intranet resolution attempts
- Blocks dangerous URI schemes (file://, gopher://, dict://, etc.)
- Collects forensic evidence of blocked egress and SSRF attempts
"""

from __future__ import annotations

from datetime import datetime, timezone
import ipaddress
import socket
from typing import Any
import urllib.parse

from playwright.sync_api import BrowserContext, Page, Route, Request
from utils.logging_utils import configure_logging

logger = configure_logging("vm_agent.network_guard")

# Specific Cloud Metadata & Internal Hostnames
METADATA_AND_INTERNAL_HOSTS: set[str] = {
    "169.254.169.254",       # AWS, GCP, Azure, DigitalOcean metadata
    "169.254.170.2",         # AWS ECS task metadata
    "metadata.google.internal", # GCP metadata
    "metadata.google",       # GCP metadata alternate
    "instance-data",         # AWS EC2 metadata legacy hostname
    "100.100.100.200",       # Alibaba Cloud metadata
    "localhost",
}

INTERNAL_DOMAIN_SUFFIXES: tuple[str, ...] = (
    ".localhost",
    ".local",
    ".internal",
    ".lan",
    ".home",
    ".corp",
    ".intranet",
)

ALLOWED_SCHEMES: set[str] = {
    "http",
    "https",
    "ws",
    "wss",
    "data",
    "blob",
    "about",
}

# Explicit Private & Reserved Subnets
BLOCKED_IP_NETWORKS: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = [
    # IPv4 Loopback & Local
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    # RFC 1918 Private
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    # Link-Local / Cloud Metadata
    ipaddress.ip_network("169.254.0.0/16"),
    # Carrier Grade NAT
    ipaddress.ip_network("100.64.0.0/10"),
    # Test / Documentation
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    # Multicast & Reserved
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4"),
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6 Loopback, Unspecified & Local
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("ff00::/8"),
    ipaddress.ip_network("::ffff:0:0/96"),
    ipaddress.ip_network("64:ff9b::/96"),
    ipaddress.ip_network("2001:db8::/32"),
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_ip_in_blocked_networks(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """
    Check if an IP address belongs to any blocked private or reserved ranges.
    """
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
        return True

    for net in BLOCKED_IP_NETWORKS:
        if ip in net:
            return True

    return False


def evaluate_target(url: str) -> tuple[bool, str | None, list[str]]:
    """
    Evaluate whether a target URL is allowed or constitutes an SSRF / egress violation.

    Returns:
        (is_blocked, block_reason, resolved_ips)
    """
    if not url or not isinstance(url, str):
        return True, "EMPTY_OR_INVALID_URL", []

    try:
        parsed = urllib.parse.urlsplit(url)
    except Exception as exc:
        return True, f"MALFORMED_URL: {exc}", []

    scheme = (parsed.scheme or "").lower()

    # Pass-through safe in-memory browser schemes
    if scheme in {"data", "blob", "about"}:
        return False, None, []

    if scheme not in ALLOWED_SCHEMES:
        return True, f"FORBIDDEN_SCHEME: {scheme}", []

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return True, "MISSING_HOST", []

    # Strip enclosing brackets for IPv6 literals
    clean_host = hostname.strip("[]")

    # 1. Direct Cloud Metadata & Internal Hostnames Check
    if clean_host in METADATA_AND_INTERNAL_HOSTS:
        return True, f"BLOCKED_INTERNAL_HOST: {clean_host}", [clean_host]

    for suffix in INTERNAL_DOMAIN_SUFFIXES:
        if clean_host.endswith(suffix):
            return True, f"BLOCKED_INTERNAL_DOMAIN_SUFFIX: {clean_host}", []

    # 2. Check if hostname is an IP literal
    try:
        ip_obj = ipaddress.ip_address(clean_host)
        if is_ip_in_blocked_networks(ip_obj):
            return True, f"PRIVATE_OR_RESERVED_IP_EGRESS_BLOCKED: {ip_obj}", [str(ip_obj)]
        return False, None, [str(ip_obj)]
    except ValueError:
        # Not an IP literal; proceed to DNS resolution
        pass

    # 3. DNS Resolution to detect Intranet / Private IP resolution (DNS Rebinding)
    resolved_ips: list[str] = []
    try:
        # Quick DNS lookup
        addr_infos = socket.getaddrinfo(clean_host, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for ai in addr_infos:
            ip_str = ai[4][0]
            resolved_ips.append(ip_str)
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                if is_ip_in_blocked_networks(ip_obj):
                    return True, f"DNS_RESOLVED_PRIVATE_OR_RESERVED_IP: {ip_str}", resolved_ips
            except ValueError:
                continue
    except socket.gaierror:
        # Host cannot be resolved; allow Chromium to fail naturally via standard DNS error
        return False, None, []
    except Exception as exc:
        logger.debug("DNS check error for %s: %s", clean_host, exc)
        return False, None, []

    return False, None, resolved_ips


class NetworkGuard:
    """
    Playwright network route interceptor providing SSRF prevention and egress isolation.
    """

    def __init__(self, requested_url: str | None = None) -> None:
        self.requested_url = requested_url
        self.blocked_requests: list[dict[str, Any]] = []
        self._dns_cache: dict[str, tuple[bool, str | None, list[str]]] = {}
        self._attached = False

    def evaluate_url(self, url: str) -> tuple[bool, str | None]:
        """
        Evaluate if URL is allowed for network egress.
        Returns: (is_allowed, block_reason)
        """
        is_blocked, block_reason, _ = evaluate_target(url)
        return (not is_blocked, block_reason)

    def attach_to_context(self, context: BrowserContext) -> "NetworkGuard":
        """
        Intercept all route navigation across all pages and popups within the context.
        """
        if self._attached:
            return self

        context.route("**/*", self._handle_route)
        self._attached = True
        logger.info("NetworkGuard attached to BrowserContext.")
        return self

    def attach_to_page(self, page: Page) -> "NetworkGuard":
        """
        Intercept route navigation on a specific page.
        """
        if self._attached:
            return self

        page.route("**/*", self._handle_route)
        self._attached = True
        logger.info("NetworkGuard attached to Page.")
        return self

    def _handle_route(self, route: Route, request: Request) -> None:
        """
        Evaluate and either route.abort() or route.continue_().
        """
        req_url = request.url

        # Check DNS / Host cache
        parsed = urllib.parse.urlsplit(req_url)
        cache_key = (parsed.scheme or "").lower() + "://" + (parsed.hostname or "").lower()

        if cache_key in self._dns_cache:
            is_blocked, block_reason, resolved_ips = self._dns_cache[cache_key]
        else:
            is_blocked, block_reason, resolved_ips = evaluate_target(req_url)
            self._dns_cache[cache_key] = (is_blocked, block_reason, resolved_ips)

        if is_blocked:
            record: dict[str, Any] = {
                "timestamp": utc_now_iso(),
                "url": req_url,
                "method": request.method,
                "resource_type": request.resource_type,
                "reason": block_reason,
                "resolved_ips": resolved_ips,
                "is_navigation_request": request.is_navigation_request(),
            }
            self.blocked_requests.append(record)
            logger.warning(
                "SSRF/Egress BLOCKED request: url=%s reason=%s method=%s",
                req_url,
                block_reason,
                request.method,
            )
            try:
                route.abort("blockedbyclient")
            except Exception:
                pass
        else:
            try:
                route.continue_()
            except Exception:
                pass

    def get_data(self) -> dict[str, Any]:
        """
        Return structured security telemetry for threat analysis.
        """
        return {
            "guard_active": True,
            "blocked_count": len(self.blocked_requests),
            "blocked_requests": list(self.blocked_requests),
            "has_ssrf_attempt": len(self.blocked_requests) > 0,
        }
