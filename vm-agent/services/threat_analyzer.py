"""
Rule-based threat analyzer.

This service converts raw browser evidence into structured security
findings and a normalized risk score.

It does not:

- Launch the browser
- Save browser evidence
- Make the final allow/block decision
- Write report.json

The analyzer intentionally uses explainable rules so every score can
be traced to observable browser evidence.
"""

from __future__ import annotations

import ipaddress
from typing import Any
from urllib.parse import urlsplit

try:
    from services.brand_detector import (
        detect_brand_impersonation,
        detect_typosquatting,
        detect_cloud_hosted_phishing,
        detect_exfiltration_endpoints,
        detect_high_abuse_tld,
    )
except ImportError:
    from brand_detector import (
        detect_brand_impersonation,
        detect_typosquatting,
        detect_cloud_hosted_phishing,
        detect_exfiltration_endpoints,
        detect_high_abuse_tld,
    )


MAX_RISK_SCORE = 100


EXECUTABLE_EXTENSIONS = {
    ".exe",
    ".msi",
    ".bat",
    ".cmd",
    ".com",
    ".scr",
    ".ps1",
    ".vbs",
    ".js",
    ".jar",
    ".apk",
    ".dll",
    ".iso",
    ".img",
    ".hta",
}


ARCHIVE_EXTENSIONS = {
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
}


MITRE_ATTACK_MAPPING = {
    "BRAND-001": ("T1566.002", "Spearphishing Link: Brand Impersonation"),
    "BRAND-002": ("T1566.002", "Spearphishing Link: Spoofed Brand Domain"),
    "TYPO-001": ("T1566.002", "Spearphishing Link: Typosquatting / Homoglyph"),
    "PHISH-005": ("T1566.002", "Spearphishing Link: Cloud-Hosted Phishing"),
    "EXFIL-001": ("T1071.001", "Application Layer Protocol: Webhook Exfiltration"),
    "TLD-001": ("T1583.001", "Acquire Domains: High-Abuse TLD"),
    "FORM-001": ("T1056.001", "Input Capture: Credential Phishing Form"),
    "FORM-002": ("T1056.001", "Input Capture: Insecure HTTP Credential Form"),
    "FORM-003": ("T1056.001", "Input Capture: Cross-Domain Action Form"),
    "DL-001": ("T1204.002", "User Execution: Malicious File Download"),
    "DL-002": ("T1204.002", "User Execution: Suspicious Executable Download"),
    "SSRF-001": ("T1046", "Network Service Discovery: Private RFC 1918 Access"),
    "SSRF-002": ("T1552.005", "Unsecured Credentials: Cloud Instance Metadata"),
    "SCRIPT-001": ("T1059.007", "Command and Scripting Interpreter: Obfuscated JavaScript"),
    "SCRIPT-002": ("T1059.007", "Command and Scripting Interpreter: Dynamic Eval"),
    "NAV-001": ("T1204.001", "User Execution: Malicious Link Navigation"),
    "REDIR-001": ("T1566.002", "Spearphishing Link: Evasive Client Redirect"),
    "COOKIE-001": ("T1539", "Steal Web Session Cookie"),
}


def create_finding(
    *,
    finding_id: str,
    category: str,
    title: str,
    description: str,
    severity: str,
    score: int,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Create one normalized threat finding with canonical MITRE ATT&CK mapping.
    """

    mitre = MITRE_ATTACK_MAPPING.get(finding_id, ("T1566", "Phishing"))

    return {
        "id": finding_id,
        "category": category,
        "title": title,
        "description": description,
        "severity": severity,
        "score": score,
        "evidence": evidence or {},
        "mitre_attack_id": mitre[0],
        "mitre_attack_name": mitre[1],
    }


def get_hostname(
    url: str | None,
) -> str | None:
    """
    Safely extract a lowercase hostname from a URL.
    """

    if not url or not isinstance(url, str):
        return None

    try:
        return urlsplit(url).hostname
    except Exception:
        return None


def is_ip_hostname(
    hostname: str | None,
) -> bool:
    """
    Return True when the URL hostname is a literal IP address.
    """

    if not hostname:
        return False

    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


def get_file_extension(
    filename: str | None,
) -> str:
    """
    Return the lowercase filename extension.
    """

    if not filename:
        return ""

    filename = filename.lower().split("?")[0]

    last_part = filename.rsplit("/", 1)[-1]

    if "." not in last_part:
        return ""

    return "." + last_part.rsplit(".", 1)[-1]


def analyze_navigation(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Analyze navigation status and redirect behaviour.
    """

    execution = evidence.get(
        "execution",
        {},
    )

    navigation_error = execution.get(
        "navigation_error"
    ) or evidence.get(
        "navigation_error"
    )

    if navigation_error:
        error_type = navigation_error.get(
            "type",
            "navigation_error",
        )

        if error_type == "redirect_limit_exceeded":
            findings.append(
                create_finding(
                    finding_id="NAV-001",
                    category="redirect",
                    title="Redirect limit exceeded",
                    description=(
                        "The page produced more redirects than the "
                        "configured analysis limit."
                    ),
                    severity="high",
                    score=25,
                    evidence=navigation_error,
                )
            )

        elif error_type == "navigation_timeout":
            findings.append(
                create_finding(
                    finding_id="NAV-002",
                    category="navigation",
                    title="Navigation timeout",
                    description=(
                        "The page did not complete initial navigation "
                        "within the configured timeout."
                    ),
                    severity="medium",
                    score=10,
                    evidence=navigation_error,
                )
            )

        else:
            findings.append(
                create_finding(
                    finding_id="NAV-003",
                    category="navigation",
                    title="Navigation error",
                    description=(
                        "The browser encountered an error while "
                        "opening the submitted URL."
                    ),
                    severity="medium",
                    score=10,
                    evidence=navigation_error,
                )
            )

    redirects = evidence.get(
        "redirects",
        {},
    )

    redirect_count = int(
        redirects.get(
            "redirect_count",
            0,
        )
        or 0
    )

    if redirect_count >= 10:
        findings.append(
            create_finding(
                finding_id="RED-001",
                category="redirect",
                title="Long redirect chain",
                description=(
                    "The URL produced a large redirect chain, which "
                    "can be used to hide the final destination."
                ),
                severity="high",
                score=20,
                evidence={
                    "redirect_count": redirect_count,
                },
            )
        )

    elif redirect_count >= 5:
        findings.append(
            create_finding(
                finding_id="RED-002",
                category="redirect",
                title="Multiple redirects",
                description=(
                    "The URL passed through several redirect targets "
                    "before reaching the final page."
                ),
                severity="medium",
                score=10,
                evidence={
                    "redirect_count": redirect_count,
                },
            )
        )

    elif redirect_count >= 3:
        findings.append(
            create_finding(
                finding_id="RED-003",
                category="redirect",
                title="Redirect chain observed",
                description=(
                    "The submitted URL redirected multiple times."
                ),
                severity="low",
                score=5,
                evidence={
                    "redirect_count": redirect_count,
                },
            )
        )


def analyze_url_transition(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Compare submitted and final destinations.
    """

    metadata = evidence.get(
        "metadata",
        {},
    )

    requested_url = metadata.get(
        "requested_url"
    ) or evidence.get(
        "execution",
        {},
    ).get(
        "requested_url"
    )

    final_url = metadata.get(
        "final_url"
    )

    requested_hostname = get_hostname(
        requested_url
    )

    final_hostname = get_hostname(
        final_url
    )

    if (
        requested_hostname
        and final_hostname
        and requested_hostname
        != final_hostname
    ):
        findings.append(
            create_finding(
                finding_id="URL-001",
                category="destination",
                title="Destination domain changed",
                description=(
                    "The final website hostname differs from the "
                    "hostname submitted for analysis."
                ),
                severity="medium",
                score=10,
                evidence={
                    "submitted_hostname": (
                        requested_hostname
                    ),
                    "final_hostname": final_hostname,
                    "final_url": final_url,
                },
            )
        )

    hostname_to_check = (
        final_hostname
        or requested_hostname
    )

    if is_ip_hostname(hostname_to_check):
        findings.append(
            create_finding(
                finding_id="URL-002",
                category="destination",
                title="Literal IP address used",
                description=(
                    "The page uses a direct IP address instead of a "
                    "normal domain name."
                ),
                severity="medium",
                score=15,
                evidence={
                    "hostname": hostname_to_check,
                },
            )
        )

    if (
        hostname_to_check
        and "xn--" in hostname_to_check
    ):
        findings.append(
            create_finding(
                finding_id="URL-003",
                category="domain",
                title="Punycode hostname detected",
                description=(
                    "The hostname contains Punycode and may require "
                    "additional homograph or impersonation analysis."
                ),
                severity="medium",
                score=10,
                evidence={
                    "hostname": hostname_to_check,
                },
            )
        )

    final_scheme = None

    if final_url:
        try:
            final_scheme = urlsplit(
                final_url
            ).scheme.lower()
        except Exception:
            final_scheme = None

    if final_scheme == "http":
        findings.append(
            create_finding(
                finding_id="URL-004",
                category="transport",
                title="Unencrypted HTTP destination",
                description=(
                    "The final page uses HTTP instead of HTTPS."
                ),
                severity="medium",
                score=10,
                evidence={
                    "final_url": final_url,
                },
            )
        )



def analyze_client_redirects(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Analyze browser-side redirects that do not necessarily appear in
    the HTTP redirect chain.

    The parser intentionally accepts more than one field name so the
    analyzer remains compatible with collector output revisions.
    """

    client_data = evidence.get(
        "client_redirects",
        {},
    )

    if not isinstance(client_data, dict):
        return

    events = client_data.get(
        "events"
    ) or client_data.get(
        "redirects"
    ) or client_data.get(
        "client_redirects"
    ) or []

    if not isinstance(events, list):
        events = []

    def event_type(event: dict[str, Any]) -> str:
        value = (
            event.get("type")
            or event.get("event_type")
            or event.get("redirect_type")
            or event.get("method")
            or ""
        )
        return str(value).strip().lower()

    normalized_types = [
        event_type(event)
        for event in events
        if isinstance(event, dict)
    ]

    total_count = int(
        client_data.get(
            "client_redirect_count",
            client_data.get(
                "redirect_count",
                client_data.get(
                    "event_count",
                    len(events),
                ),
            ),
        )
        or 0
    )

    meta_refresh_count = int(
        client_data.get(
            "meta_refresh_count",
            sum(
                1
                for value in normalized_types
                if "meta" in value
                and "refresh" in value
            ),
        )
        or 0
    )

    javascript_redirect_count = int(
        client_data.get(
            "javascript_redirect_count",
            client_data.get(
                "js_redirect_count",
                sum(
                    1
                    for value in normalized_types
                    if value in {
                        "javascript",
                        "javascript_redirect",
                        "js_redirect",
                        "location",
                        "location_assign",
                        "location_replace",
                    }
                    or "javascript" in value
                    or value.startswith("location")
                ),
            ),
        )
        or 0
    )

    history_api_count = int(
        client_data.get(
            "history_api_count",
            sum(
                1
                for value in normalized_types
                if value in {
                    "pushstate",
                    "replacestate",
                    "popstate",
                    "history.pushstate",
                    "history.replacestate",
                }
                or "pushstate" in value
                or "replacestate" in value
                or "popstate" in value
            ),
        )
        or 0
    )

    hash_change_count = int(
        client_data.get(
            "hash_change_count",
            client_data.get(
                "hashchange_count",
                sum(
                    1
                    for value in normalized_types
                    if "hashchange" in value
                    or value == "hash"
                ),
            ),
        )
        or 0
    )

    suspicious_domain_change_count = int(
        client_data.get(
            "domain_change_count",
            client_data.get(
                "cross_domain_count",
                client_data.get(
                    "external_redirect_count",
                    0,
                ),
            ),
        )
        or 0
    )

    if meta_refresh_count > 0:
        findings.append(
            create_finding(
                finding_id="CRED-001",
                category="client_redirect",
                title="Meta refresh redirect detected",
                description=(
                    "The page used an HTML meta-refresh instruction "
                    "to navigate the browser to another location."
                ),
                severity="medium",
                score=10,
                evidence={
                    "meta_refresh_count": meta_refresh_count,
                    "events": events,
                },
            )
        )

    if javascript_redirect_count > 0:
        findings.append(
            create_finding(
                finding_id="CRED-002",
                category="client_redirect",
                title="JavaScript redirect detected",
                description=(
                    "The page used JavaScript-controlled navigation, "
                    "which can conceal a destination from a basic HTTP "
                    "redirect inspection."
                ),
                severity="medium",
                score=12,
                evidence={
                    "javascript_redirect_count": (
                        javascript_redirect_count
                    ),
                    "events": events,
                },
            )
        )

    if history_api_count >= 3:
        findings.append(
            create_finding(
                finding_id="CRED-003",
                category="client_redirect",
                title="Repeated History API navigation",
                description=(
                    "The page repeatedly changed browser history state. "
                    "This may be legitimate single-page application "
                    "behaviour, but it can also obscure navigation flow."
                ),
                severity="low",
                score=5,
                evidence={
                    "history_api_count": history_api_count,
                },
            )
        )

    if hash_change_count >= 5:
        findings.append(
            create_finding(
                finding_id="CRED-004",
                category="client_redirect",
                title="Excessive hash navigation",
                description=(
                    "The page changed the URL fragment several times "
                    "during analysis."
                ),
                severity="low",
                score=3,
                evidence={
                    "hash_change_count": hash_change_count,
                },
            )
        )

    if suspicious_domain_change_count > 0:
        findings.append(
            create_finding(
                finding_id="CRED-005",
                category="destination",
                title="Client-side domain transition detected",
                description=(
                    "Browser-side navigation moved to a different "
                    "hostname during page execution."
                ),
                severity="high",
                score=18,
                evidence={
                    "domain_change_count": (
                        suspicious_domain_change_count
                    ),
                    "events": events,
                },
            )
        )

    if total_count >= 10:
        findings.append(
            create_finding(
                finding_id="CRED-006",
                category="client_redirect",
                title="Excessive client-side navigation",
                description=(
                    "The page generated a large number of browser-side "
                    "navigation events."
                ),
                severity="high",
                score=15,
                evidence={
                    "client_redirect_count": total_count,
                },
            )
        )

def analyze_downloads(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Analyze browser download behaviour.
    """

    download_data = evidence.get(
        "downloads",
        {},
    )

    downloads = download_data.get(
        "downloads",
        [],
    )

    attempt_count = int(
        download_data.get(
            "download_attempt_count",
            len(downloads),
        )
        or 0
    )

    if attempt_count > 0:
        findings.append(
            create_finding(
                finding_id="DL-001",
                category="download",
                title="Download initiated",
                description=(
                    "The website initiated or offered a browser "
                    "download during analysis."
                ),
                severity="medium",
                score=15,
                evidence={
                    "download_attempt_count": (
                        attempt_count
                    ),
                },
            )
        )

    executable_files: list[str] = []
    archive_files: list[str] = []

    for download in downloads:
        filename = (
            download.get(
                "saved_filename"
            )
            or download.get(
                "suggested_filename"
            )
        )

        extension = get_file_extension(
            filename
        )

        if extension in EXECUTABLE_EXTENSIONS:
            executable_files.append(
                filename or "unknown"
            )

        elif extension in ARCHIVE_EXTENSIONS:
            archive_files.append(
                filename or "unknown"
            )

    if executable_files:
        findings.append(
            create_finding(
                finding_id="DL-002",
                category="download",
                title="Executable download detected",
                description=(
                    "The website attempted to download a potentially "
                    "executable or script-based file."
                ),
                severity="critical",
                score=35,
                evidence={
                    "files": executable_files,
                },
            )
        )

    if archive_files:
        findings.append(
            create_finding(
                finding_id="DL-003",
                category="download",
                title="Archive download detected",
                description=(
                    "The website downloaded an archive that may "
                    "contain additional files requiring analysis."
                ),
                severity="medium",
                score=10,
                evidence={
                    "files": archive_files,
                },
            )
        )


def analyze_browser_behaviour(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Analyze popups, dialogs and JavaScript errors.
    """

    popup_data = evidence.get(
        "popups",
        {},
    )

    popup_count = int(
        popup_data.get(
            "popup_count",
            0,
        )
        or 0
    )

    if popup_count >= 5:
        findings.append(
            create_finding(
                finding_id="BEH-001",
                category="popup",
                title="Excessive popup activity",
                description=(
                    "The website opened several new browser pages "
                    "or tabs."
                ),
                severity="high",
                score=20,
                evidence={
                    "popup_count": popup_count,
                },
            )
        )

    elif popup_count > 0:
        findings.append(
            create_finding(
                finding_id="BEH-002",
                category="popup",
                title="Popup activity detected",
                description=(
                    "The website opened an additional browser page "
                    "or tab."
                ),
                severity="medium",
                score=10,
                evidence={
                    "popup_count": popup_count,
                },
            )
        )

    dialog_data = evidence.get(
        "dialogs",
        {},
    )

    dialog_count = int(
        dialog_data.get(
            "dialog_count",
            0,
        )
        or 0
    )

    if dialog_count > 0:
        findings.append(
            create_finding(
                finding_id="BEH-003",
                category="dialog",
                title="Blocking browser dialog detected",
                description=(
                    "The page displayed one or more JavaScript "
                    "dialogs during automated analysis."
                ),
                severity="low",
                score=5,
                evidence={
                    "dialog_count": dialog_count,
                },
            )
        )

    console_data = evidence.get(
        "console",
        {},
    )

    page_error_count = int(
        console_data.get(
            "page_error_count",
            0,
        )
        or 0
    )

    if page_error_count >= 5:
        findings.append(
            create_finding(
                finding_id="BEH-004",
                category="javascript",
                title="Multiple JavaScript errors",
                description=(
                    "The page produced several uncaught JavaScript "
                    "errors during execution."
                ),
                severity="low",
                score=5,
                evidence={
                    "page_error_count": (
                        page_error_count
                    ),
                },
            )
        )


def analyze_response(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Analyze main HTTP response status.
    """

    metadata = evidence.get(
        "metadata",
        {},
    )

    status_code = metadata.get(
        "status_code"
    )

    if not isinstance(status_code, int):
        return

    if status_code >= 500:
        findings.append(
            create_finding(
                finding_id="HTTP-001",
                category="http",
                title="Server error response",
                description=(
                    "The final server returned a 5xx response."
                ),
                severity="low",
                score=5,
                evidence={
                    "status_code": status_code,
                },
            )
        )

    elif status_code >= 400:
        findings.append(
            create_finding(
                finding_id="HTTP-002",
                category="http",
                title="Client error response",
                description=(
                    "The final server returned a 4xx response."
                ),
                severity="informational",
                score=2,
                evidence={
                    "status_code": status_code,
                },
            )
        )


def analyze_execution_failure(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Record fatal browser execution failures.
    """

    execution = evidence.get(
        "execution",
        {},
    )

    fatal_error = execution.get(
        "fatal_error"
    )

    if fatal_error:
        findings.append(
            create_finding(
                finding_id="EXEC-001",
                category="execution",
                title="Browser analysis incomplete",
                description=(
                    "The isolated browser execution failed before "
                    "analysis could complete."
                ),
                severity="high",
                score=40,
                evidence=fatal_error,
            )
        )


def determine_risk_level(
    risk_score: int,
) -> str:
    """
    Convert numeric score into a risk level.
    """

    if risk_score >= 70:
        return "critical"

    if risk_score >= 40:
        return "high"

    if risk_score >= 20:
        return "medium"

    if risk_score > 0:
        return "low"

    return "none"


def analyze_forms_and_credentials(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    forms_data = evidence.get("forms", {})
    if not isinstance(forms_data, dict):
        return

    forms = forms_data.get("forms", [])
    orphan_passwords = forms_data.get("orphan_password_inputs", [])
    has_card_inputs = forms_data.get("has_credit_card_inputs", False)

    for form in forms:
        f_idx = form.get("index", 1)
        pwd_count = form.get("password_field_count", 0)
        is_cross_domain = form.get("is_cross_domain_action", False)
        is_insecure = form.get("is_insecure_submission", False)
        action_host = form.get("action_hostname")

        if pwd_count > 0 and is_cross_domain:
            findings.append(
                create_finding(
                    finding_id="PHISH-001",
                    category="credential_phishing",
                    title="Cross-domain credential submission",
                    description=(
                        f"Form {f_idx} contains password fields submitting to "
                        f"unrelated third-party destination: {action_host}"
                    ),
                    severity="critical",
                    score=40,
                    evidence={
                        "form_index": f_idx,
                        "action": form.get("resolved_action"),
                        "action_hostname": action_host,
                    },
                )
            )

        if pwd_count > 0 and is_insecure:
            findings.append(
                create_finding(
                    finding_id="PHISH-002",
                    category="credential_phishing",
                    title="Insecure credential transmission over HTTP",
                    description=(
                        f"Form {f_idx} transmits password credentials over unencrypted HTTP."
                    ),
                    severity="high",
                    score=25,
                    evidence={
                        "form_index": f_idx,
                        "action": form.get("resolved_action"),
                    },
                )
            )

    if orphan_passwords:
        findings.append(
            create_finding(
                finding_id="PHISH-003",
                category="credential_phishing",
                title="Orphan password input field detected",
                description=(
                    f"Page renders {len(orphan_passwords)} password input element(s) "
                    "outside standard form tags."
                ),
                severity="medium",
                score=15,
                evidence={"orphan_count": len(orphan_passwords)},
            )
        )

    if has_card_inputs:
        findings.append(
            create_finding(
                finding_id="PHISH-004",
                category="financial_phishing",
                title="Payment / Credit card collection form",
                description="The page requests credit card numbers or CVV security codes.",
                severity="high",
                score=25,
                evidence={"has_credit_card_inputs": True},
            )
        )


def analyze_transport_and_tls(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    cert_data = evidence.get("certificate", {})
    if not isinstance(cert_data, dict):
        return

    is_https = cert_data.get("is_https", False)
    is_expired = cert_data.get("is_expired", False)
    protocol = cert_data.get("protocol")
    has_security_details = cert_data.get("has_security_details", False)

    if is_https and is_expired:
        findings.append(
            create_finding(
                finding_id="TLS-001",
                category="transport_security",
                title="Expired TLS certificate",
                description="The website certificate is expired.",
                severity="high",
                score=20,
                evidence=cert_data,
            )
        )

    if is_https and protocol in ("TLS 1.0", "TLS 1.1", "SSLv3"):
        findings.append(
            create_finding(
                finding_id="TLS-002",
                category="transport_security",
                title="Deprecated or insecure TLS version",
                description=f"The website negotiates deprecated protocol {protocol}.",
                severity="medium",
                score=10,
                evidence={"protocol": protocol},
            )
        )

    if is_https and not has_security_details and cert_data.get("warnings"):
        findings.append(
            create_finding(
                finding_id="TLS-003",
                category="transport_security",
                title="Untrusted or invalid TLS certificate",
                description="TLS security details could not be verified (possible self-signed or invalid cert).",
                severity="high",
                score=25,
                evidence={"warnings": cert_data.get("warnings")},
            )
        )


def analyze_scripts_and_obfuscation(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    js_data = evidence.get("javascript", {})
    if not isinstance(js_data, dict):
        return

    indicators = js_data.get("indicators", {})

    if indicators.get("has_packed_code"):
        findings.append(
            create_finding(
                finding_id="JS-001",
                category="evasion",
                title="Packed / Obfuscated JavaScript detected",
                description="Page includes packer-obfuscated script payloads commonly found in malware.",
                severity="high",
                score=25,
                evidence={"packed_code": True},
            )
        )

    if indicators.get("has_crypto_miner_keywords"):
        findings.append(
            create_finding(
                finding_id="JS-002",
                category="malware",
                title="In-browser cryptocurrency miner signatures",
                description="Signatures matching in-browser web miners were identified.",
                severity="critical",
                score=35,
                evidence={"crypto_miner_keywords": True},
            )
        )

    if indicators.get("has_anti_debug"):
        findings.append(
            create_finding(
                finding_id="JS-003",
                category="evasion",
                title="Anti-analysis & debugger suppression",
                description="Page implements anti-debugging or context-menu suppression to resist analysis.",
                severity="low",
                score=5,
                evidence={"anti_debug": True},
            )
        )


def analyze_cookies_and_sessions(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    cookies_data = evidence.get("cookies", {})
    if not isinstance(cookies_data, dict):
        return

    summary = cookies_data.get("summary", {})
    insecure_on_https = summary.get("insecure_on_https", 0)

    if insecure_on_https >= 3:
        findings.append(
            create_finding(
                finding_id="SESS-001",
                category="session_security",
                title="Insecure cookies set over HTTPS",
                description=f"{insecure_on_https} cookies set without the Secure attribute on an HTTPS website.",
                severity="low",
                score=5,
                evidence={"insecure_cookie_count": insecure_on_https},
            )
        )


def analyze_ssrf_and_network_egress(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Detect SSRF, internal intranet scanning, or cloud metadata access attempts.
    """
    network_guard_data = evidence.get("network_guard", {})
    if not isinstance(network_guard_data, dict):
        return

    blocked_requests = network_guard_data.get("blocked_requests", [])
    if not blocked_requests:
        return

    requested_url = (
        evidence.get("metadata", {}).get("requested_url")
        or evidence.get("execution", {}).get("requested_url")
    )

    primary_blocked = any(
        req.get("url") == requested_url or req.get("is_navigation_request")
        for req in blocked_requests
    )

    sample_blocks = blocked_requests[:5]

    if primary_blocked:
        findings.append(
            create_finding(
                finding_id="SSRF-001",
                category="network_ssrf",
                title="Critical SSRF / Internal Network Target Blocked",
                description="The target URL attempted to access private, loopback, link-local, or cloud-metadata infrastructure. Sandbox egress was blocked fail-closed.",
                severity="critical",
                score=85,
                evidence={
                    "blocked_requests_sample": sample_blocks,
                    "total_blocked": len(blocked_requests),
                    "primary_target_blocked": True,
                },
            )
        )
    else:
        findings.append(
            create_finding(
                finding_id="SSRF-002",
                category="network_ssrf",
                title="Subresource / Redirect SSRF Exfiltration Blocked",
                description=f"The inspected webpage attempted {len(blocked_requests)} unauthorized connection(s) to internal or cloud metadata endpoints which were intercepted and blocked.",
                severity="high",
                score=45,
                evidence={
                    "blocked_requests_sample": sample_blocks,
                    "total_blocked": len(blocked_requests),
                    "primary_target_blocked": False,
                },
            )
        )


def analyze_brand_and_phishing_deception(
    evidence: dict[str, Any],
    findings: list[dict[str, Any]],
) -> None:
    """
    Detect targeted brand impersonation, domain typosquatting, free cloud phishing,
    and credential exfiltration endpoints.
    """
    metadata = evidence.get("metadata", {})
    page_title = metadata.get("page_title")
    final_url = metadata.get("final_url") or evidence.get("execution", {}).get("final_url")
    forms_data = evidence.get("forms", {})

    # 1. Targeted Brand Impersonation
    brand_imp = detect_brand_impersonation(
        page_title=page_title,
        final_url=final_url,
        forms_data=forms_data,
    )
    if brand_imp:
        if brand_imp.get("has_password_field"):
            findings.append(
                create_finding(
                    finding_id="BRAND-001",
                    category="credential_phishing",
                    title=f"Targeted {brand_imp['brand']} Brand Impersonation Phishing",
                    description=(
                        f"Page claims to represent {brand_imp['brand']} with active password login forms, "
                        f"but is hosted on unauthorized domain '{brand_imp['hostname']}'."
                    ),
                    severity="critical",
                    score=50,
                    evidence=brand_imp,
                )
            )
        else:
            findings.append(
                create_finding(
                    finding_id="BRAND-002",
                    category="brand_impersonation",
                    title=f"Deceptive {brand_imp['brand']} Brand Claim",
                    description=(
                        f"Page title or content mimics {brand_imp['brand']}, but is hosted on "
                        f"unauthorized domain '{brand_imp['hostname']}'."
                    ),
                    severity="high",
                    score=30,
                    evidence=brand_imp,
                )
            )

    # 2. Typosquatting / Punycode Lookalike
    hostname = get_hostname(final_url)
    typo = detect_typosquatting(hostname)
    if typo:
        findings.append(
            create_finding(
                finding_id="TYPO-001",
                category="domain_reputation",
                title="Typosquatting / Brand Lookalike Domain",
                description=typo.get("description", "Domain name appears to mimic a legitimate high-profile brand."),
                severity="high",
                score=35,
                evidence=typo,
            )
        )

    # 3. Free Public Cloud / SaaS Hosted Phishing
    cloud_phish = detect_cloud_hosted_phishing(final_url, forms_data)
    if cloud_phish:
        findings.append(
            create_finding(
                finding_id="PHISH-005",
                category="credential_phishing",
                title="Credential Harvesting Form on Free Public Cloud Host",
                description=cloud_phish.get("description", "Login form hosted on public cloud provider."),
                severity="high",
                score=35,
                evidence=cloud_phish,
            )
        )

    # 4. Form Action Credential Exfiltration (Telegram, Discord, Webhooks)
    exfil = detect_exfiltration_endpoints(forms_data)
    if exfil:
        findings.append(
            create_finding(
                finding_id="EXFIL-001",
                category="data_exfiltration",
                title="Form Exfiltration to Third-Party Messaging / Webhook Service",
                description=exfil.get("description", "Form routes data to external third-party webhook."),
                severity="critical",
                score=50,
                evidence=exfil,
            )
        )

    # 5. High-Abuse Phishing TLD
    tld_finding = detect_high_abuse_tld(final_url)
    if tld_finding:
        findings.append(
            create_finding(
                finding_id="TLD-001",
                category="domain_reputation",
                title="Deceptive Domain on High-Abuse TLD",
                description=tld_finding.get("description", "Domain uses high-abuse TLD with authentication lures."),
                severity="medium",
                score=20,
                evidence=tld_finding,
            )
        )


def analyze_threats(
    evidence_or_report: dict[str, Any],
) -> dict[str, Any]:
    """
    Evaluate evidence against security rules and compute the aggregate risk score.
    """

    if (
        isinstance(evidence_or_report, dict)
        and "evidence" in evidence_or_report
        and isinstance(evidence_or_report["evidence"], dict)
    ):
        evidence = evidence_or_report[
            "evidence"
        ]
    else:
        evidence = evidence_or_report

    findings: list[
        dict[str, Any]
    ] = []

    analyze_execution_failure(
        evidence,
        findings,
    )

    analyze_navigation(
        evidence,
        findings,
    )

    analyze_url_transition(
        evidence,
        findings,
    )

    analyze_client_redirects(
        evidence,
        findings,
    )

    analyze_downloads(
        evidence,
        findings,
    )

    analyze_browser_behaviour(
        evidence,
        findings,
    )

    analyze_response(
        evidence,
        findings,
    )

    analyze_forms_and_credentials(
        evidence,
        findings,
    )

    analyze_transport_and_tls(
        evidence,
        findings,
    )

    analyze_scripts_and_obfuscation(
        evidence,
        findings,
    )

    analyze_cookies_and_sessions(
        evidence,
        findings,
    )

    analyze_ssrf_and_network_egress(
        evidence,
        findings,
    )

    analyze_brand_and_phishing_deception(
        evidence,
        findings,
    )

    total_score = sum(
        int(
            finding.get(
                "score",
                0,
            )
            or 0
        )
        for finding in findings
    )

    risk_score = min(
        MAX_RISK_SCORE,
        max(
            0,
            total_score,
        ),
    )

    severity_counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "informational": 0,
    }

    for finding in findings:
        severity = finding.get(
            "severity",
            "informational",
        )

        if severity in severity_counts:
            severity_counts[
                severity
            ] += 1

    return {
        "risk_score": risk_score,
        "risk_level": determine_risk_level(
            risk_score
        ),
        "finding_count": len(
            findings
        ),
        "critical_finding_count": (
            severity_counts["critical"]
        ),
        "high_finding_count": (
            severity_counts["high"]
        ),
        "severity_counts": (
            severity_counts
        ),
        "findings": findings,
        "analysis_method": (
            "explainable_rule_engine"
        ),
    }