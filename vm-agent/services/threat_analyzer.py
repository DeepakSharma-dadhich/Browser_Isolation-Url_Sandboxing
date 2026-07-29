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
    Create one normalized threat finding.
    """

    return {
        "id": finding_id,
        "category": category,
        "title": title,
        "description": description,
        "severity": severity,
        "score": score,
        "evidence": evidence or {},
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


def analyze_threats(
    evidence_or_report: dict[str, Any],
) -> dict[str, Any]:
    """
    Analyze raw browser evidence.

    Supports both:

        analyze_threats(evidence)

    and the older form:

        analyze_threats({
            "evidence": evidence
        })
    """

    if not isinstance(
        evidence_or_report,
        dict,
    ):
        raise TypeError(
            "Threat analysis input must be a dictionary."
        )

    if (
        "evidence" in evidence_or_report
        and isinstance(
            evidence_or_report["evidence"],
            dict,
        )
        and "execution"
        not in evidence_or_report
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