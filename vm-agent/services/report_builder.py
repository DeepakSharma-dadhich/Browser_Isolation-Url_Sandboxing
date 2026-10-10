"""
Final report builder.

Creates the single authoritative report:

    shared/reports/<session_id>/report.json

Raw browser evidence remains under:

    shared/output/<session_id>/

No second report.json is created inside the evidence directory.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from session_manager import (
    SessionManager,
    SessionPaths,
)
from utils.json_utils import write_json_atomic


REPORT_SCHEMA_VERSION = "2.1"


class ReportBuildError(Exception):
    """
    Raised when the final report cannot be built.
    """


def utc_now_iso() -> str:
    """
    Return the current UTC timestamp in ISO-8601 format.
    """

    return datetime.now(
        timezone.utc
    ).isoformat()


def as_dict(
    value: Any,
) -> dict[str, Any]:
    """
    Return value when it is a dictionary, otherwise an empty dictionary.
    """

    if isinstance(value, dict):
        return value

    return {}


def as_list(
    value: Any,
) -> list[Any]:
    """
    Return value when it is a list, otherwise an empty list.
    """

    if isinstance(value, list):
        return value

    return []


def as_int(
    value: Any,
    default: int = 0,
) -> int:
    """
    Safely normalize a value to an integer.
    """

    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def first_present(
    source: dict[str, Any],
    *keys: str,
    default: Any = None,
) -> Any:
    """
    Return the first non-None value found under the supplied keys.
    """

    for key in keys:
        value = source.get(key)

        if value is not None:
            return value

    return default


def hostname_from_url(
    url: str | None,
) -> str | None:
    """
    Safely extract the lowercase hostname from a URL.
    """

    if not url or not isinstance(url, str):
        return None

    try:
        hostname = urlsplit(url).hostname
    except Exception:
        return None

    if not hostname:
        return None

    return hostname.lower()


def resolve_report_paths(
    session_path: SessionPaths | Path | str | None,
    session_id: str,
) -> SessionPaths:
    """
    Resolve the canonical report location.

    The supplied session_path remains accepted for compatibility, but
    SessionManager defines the authoritative report path.
    """

    manager = SessionManager()

    if isinstance(
        session_path,
        SessionPaths,
    ):
        if (
            session_path.session_id
            != session_id
        ):
            raise ReportBuildError(
                "SessionPaths session_id does not match session_id."
            )

        return session_path

    return manager.create_session(
        session_id
    )


def extract_http_redirect_events(
    redirects: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Normalize HTTP redirect events from supported collector structures.
    """

    raw_events = first_present(
        redirects,
        "redirects",
        "redirect_chain",
        "chain",
        "events",
        default=[],
    )

    events: list[dict[str, Any]] = []

    for index, raw_event in enumerate(
        as_list(raw_events),
        start=1,
    ):
        if not isinstance(raw_event, dict):
            continue

        source_url = first_present(
            raw_event,
            "source_url",
            "from_url",
            "request_url",
            "url",
        )

        target_url = first_present(
            raw_event,
            "target_url",
            "to_url",
            "location",
            "redirect_url",
        )

        status_code = first_present(
            raw_event,
            "status_code",
            "status",
            "response_status",
        )

        events.append(
            {
                "sequence": index,
                "type": "http_redirect",
                "source_url": source_url,
                "target_url": target_url,
                "status_code": status_code,
                "timestamp": first_present(
                    raw_event,
                    "timestamp",
                    "observed_at",
                    "created_at",
                ),
            }
        )

    return events


def extract_client_redirect_events(
    client_redirects: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Normalize browser-side redirect/navigation events.
    """

    raw_events = first_present(
        client_redirects,
        "events",
        "redirects",
        "client_redirects",
        "navigation_events",
        default=[],
    )

    events: list[dict[str, Any]] = []

    for index, raw_event in enumerate(
        as_list(raw_events),
        start=1,
    ):
        if not isinstance(raw_event, dict):
            continue

        event_type = str(
            first_present(
                raw_event,
                "type",
                "event_type",
                "method",
                "kind",
                default="client_navigation",
            )
        ).strip().lower()

        events.append(
            {
                "sequence": index,
                "type": event_type,
                "source_url": first_present(
                    raw_event,
                    "source_url",
                    "from_url",
                    "previous_url",
                    "old_url",
                ),
                "target_url": first_present(
                    raw_event,
                    "target_url",
                    "to_url",
                    "new_url",
                    "url",
                    "destination",
                ),
                "timestamp": first_present(
                    raw_event,
                    "timestamp",
                    "observed_at",
                    "created_at",
                ),
                "details": raw_event,
            }
        )

    return events


def count_client_event_types(
    client_redirects: dict[str, Any],
    events: list[dict[str, Any]],
) -> dict[str, int]:
    """
    Build normalized counts for supported browser-side navigation types.
    """

    counts = {
        "total": as_int(
            first_present(
                client_redirects,
                "client_redirect_count",
                "event_count",
                "redirect_count",
                "total_count",
                default=len(events),
            ),
            len(events),
        ),
        "javascript": as_int(
            first_present(
                client_redirects,
                "javascript_redirect_count",
                "js_redirect_count",
                default=0,
            )
        ),
        "meta_refresh": as_int(
            first_present(
                client_redirects,
                "meta_refresh_count",
                default=0,
            )
        ),
        "history_api": as_int(
            first_present(
                client_redirects,
                "history_api_count",
                "history_change_count",
                default=0,
            )
        ),
        "hash_change": as_int(
            first_present(
                client_redirects,
                "hash_change_count",
                default=0,
            )
        ),
    }

    for event in events:
        event_type = str(
            event.get(
                "type",
                "",
            )
        ).lower()

        if (
            "meta" in event_type
            and "refresh" in event_type
        ):
            counts["meta_refresh"] += 1

        elif any(
            token in event_type
            for token in (
                "javascript",
                "location",
                "window_open",
                "js_redirect",
            )
        ):
            counts["javascript"] += 1

        elif any(
            token in event_type
            for token in (
                "pushstate",
                "replacestate",
                "popstate",
                "history",
            )
        ):
            counts["history_api"] += 1

        elif "hash" in event_type:
            counts["hash_change"] += 1

    if counts["total"] == 0:
        counts["total"] = len(events)

    return counts


def build_redirect_timeline(
    *,
    submitted_url: str | None,
    final_url: str | None,
    http_events: list[dict[str, Any]],
    client_events: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Build an ordered, human-readable navigation timeline.
    """

    timeline: list[dict[str, Any]] = []

    if submitted_url:
        timeline.append(
            {
                "sequence": 1,
                "type": "submitted_url",
                "url": submitted_url,
            }
        )

    next_sequence = len(timeline) + 1

    for event in http_events:
        timeline.append(
            {
                "sequence": next_sequence,
                "type": "http_redirect",
                "source_url": event.get(
                    "source_url"
                ),
                "target_url": event.get(
                    "target_url"
                ),
                "status_code": event.get(
                    "status_code"
                ),
                "timestamp": event.get(
                    "timestamp"
                ),
            }
        )

        next_sequence += 1

    for event in client_events:
        timeline.append(
            {
                "sequence": next_sequence,
                "type": event.get(
                    "type",
                    "client_navigation",
                ),
                "source_url": event.get(
                    "source_url"
                ),
                "target_url": event.get(
                    "target_url"
                ),
                "timestamp": event.get(
                    "timestamp"
                ),
            }
        )

        next_sequence += 1

    if final_url:
        previous_target = None

        if timeline:
            previous_target = (
                timeline[-1].get(
                    "target_url"
                )
                or timeline[-1].get(
                    "url"
                )
            )

        if final_url != previous_target:
            timeline.append(
                {
                    "sequence": next_sequence,
                    "type": "final_url",
                    "url": final_url,
                }
            )

    return timeline


def build_threat_indicators(
    *,
    submitted_url: str | None,
    final_url: str | None,
    redirects: dict[str, Any],
    client_counts: dict[str, int],
    findings: list[Any],
) -> dict[str, Any]:
    """
    Build a compact indicator summary for report consumers.
    """

    submitted_hostname = hostname_from_url(
        submitted_url
    )
    final_hostname = hostname_from_url(
        final_url
    )

    domain_changed = bool(
        submitted_hostname
        and final_hostname
        and submitted_hostname != final_hostname
    )

    finding_ids: list[str] = []
    finding_categories: list[str] = []

    for finding in findings:
        if not isinstance(finding, dict):
            continue

        finding_id = finding.get(
            "id"
        )

        category = finding.get(
            "category"
        )

        if finding_id:
            finding_ids.append(
                str(finding_id)
            )

        if category:
            finding_categories.append(
                str(category)
            )

    redirect_count = as_int(
        first_present(
            redirects,
            "redirect_count",
            "total_redirects",
            default=0,
        )
    )

    mixed_protocol = bool(
        first_present(
            redirects,
            "protocol_downgrade_detected",
            "https_to_http_detected",
            "mixed_protocol_detected",
            default=False,
        )
    )

    literal_ip = bool(
        first_present(
            redirects,
            "ip_address_detected",
            "literal_ip_detected",
            default=False,
        )
    )

    return {
        "domain_changed": domain_changed,
        "multiple_http_redirects": (
            redirect_count >= 3
        ),
        "client_side_redirect_detected": (
            client_counts["total"] > 0
        ),
        "javascript_redirect_detected": (
            client_counts["javascript"] > 0
        ),
        "meta_refresh_detected": (
            client_counts["meta_refresh"] > 0
        ),
        "history_api_activity_detected": (
            client_counts["history_api"] > 0
        ),
        "hash_navigation_detected": (
            client_counts["hash_change"] > 0
        ),
        "mixed_protocol_detected": mixed_protocol,
        "literal_ip_detected": literal_ip,
        "ssrf_attempt_detected": any("SSRF" in fid for fid in finding_ids),
        "finding_ids": finding_ids,
        "finding_categories": sorted(
            set(
                finding_categories
            )
        ),
    }


def build_report(
    session_path: SessionPaths | Path | str | None,
    session_id: str,
    report_data: dict[str, Any],
) -> str:
    """
    Build and save the final report.json.

    Args:
        session_path:
            SessionPaths or compatibility path.

        session_id:
            Unique session identifier.

        report_data:
            Browser evidence, analysis and decision information.

    Returns:
        String path of the final report.
    """

    if not isinstance(
        report_data,
        dict,
    ):
        raise ReportBuildError(
            "report_data must be a dictionary."
        )

    paths = resolve_report_paths(
        session_path=session_path,
        session_id=session_id,
    )

    evidence = as_dict(
        report_data.get(
            "evidence"
        )
    )

    analysis = as_dict(
        report_data.get(
            "analysis"
        )
    )

    decision = as_dict(
        report_data.get(
            "decision"
        )
    )

    execution = as_dict(
        evidence.get(
            "execution"
        )
    )

    metadata = as_dict(
        evidence.get(
            "metadata"
        )
    )

    redirects = as_dict(
        evidence.get(
            "redirects"
        )
    )

    client_redirects = as_dict(
        evidence.get(
            "client_redirects"
        )
    )

    network = as_dict(
        evidence.get(
            "network"
        )
    )

    cookies = as_dict(
        evidence.get(
            "cookies"
        )
    )

    console = as_dict(
        evidence.get(
            "console"
        )
    )

    downloads = as_dict(
        evidence.get(
            "downloads"
        )
    )

    popups = as_dict(
        evidence.get(
            "popups"
        )
    )

    dialogs = as_dict(
        evidence.get(
            "dialogs"
        )
    )

    forms = as_dict(
        evidence.get(
            "forms"
        )
    )

    headers = as_dict(
        evidence.get(
            "headers"
        )
    )

    javascript = as_dict(
        evidence.get(
            "javascript"
        )
    )

    certificate = as_dict(
        evidence.get(
            "certificate"
        )
    )

    findings = as_list(
        analysis.get(
            "findings"
        )
    )

    submitted_url = (
        metadata.get(
            "requested_url"
        )
        or execution.get(
            "requested_url"
        )
    )

    response_url = metadata.get(
        "response_url"
    )

    final_url = metadata.get(
        "final_url"
    )

    http_events = extract_http_redirect_events(
        redirects
    )

    client_events = extract_client_redirect_events(
        client_redirects
    )

    client_counts = count_client_event_types(
        client_redirects,
        client_events,
    )

    redirect_count = as_int(
        first_present(
            redirects,
            "redirect_count",
            "total_redirects",
            default=len(http_events),
        ),
        len(http_events),
    )

    timeline = build_redirect_timeline(
        submitted_url=submitted_url,
        final_url=final_url,
        http_events=http_events,
        client_events=client_events,
    )

    threat_indicators = build_threat_indicators(
        submitted_url=submitted_url,
        final_url=final_url,
        redirects=redirects,
        client_counts=client_counts,
        findings=findings,
    )

    final_report = {
        "schema_version": (
            REPORT_SCHEMA_VERSION
        ),
        "report_type": (
            "email_url_sandbox_analysis"
        ),
        "session_id": session_id,
        "generated_at": utc_now_iso(),

        "execution": {
            "status": execution.get(
                "status",
                "unknown",
            ),
            "environment": execution.get(
                "execution_environment",
                "isolated_vm",
            ),
            "browser_engine": execution.get(
                "browser_engine"
            ),
            "headless": execution.get(
                "headless"
            ),
            "started_at": execution.get(
                "started_at"
            ),
            "completed_at": execution.get(
                "completed_at"
            ),
            "duration_ms": execution.get(
                "duration_ms"
            ),
            "navigation_error": (
                execution.get(
                    "navigation_error"
                )
                or evidence.get(
                    "navigation_error"
                )
            ),
            "fatal_error": execution.get(
                "fatal_error"
            ),
        },

        "target": {
            "submitted_url": submitted_url,
            "submitted_hostname": (
                hostname_from_url(
                    submitted_url
                )
            ),
            "response_url": response_url,
            "final_url": final_url,
            "final_hostname": (
                hostname_from_url(
                    final_url
                )
            ),
            "page_title": metadata.get(
                "page_title"
            ),
            "status_code": metadata.get(
                "status_code"
            ),
            "status_text": metadata.get(
                "status_text"
            ),
            "server_address": metadata.get(
                "server_address"
            ),
            "domain_changed": (
                threat_indicators[
                    "domain_changed"
                ]
            ),
        },

        "analysis": {
            "risk_score": analysis.get(
                "risk_score",
                0,
            ),
            "risk_level": analysis.get(
                "risk_level",
                "unknown",
            ),
            "finding_count": analysis.get(
                "finding_count",
                len(findings),
            ),
            "critical_finding_count": (
                analysis.get(
                    "critical_finding_count",
                    0,
                )
            ),
            "high_finding_count": analysis.get(
                "high_finding_count",
                0,
            ),
            "severity_counts": as_dict(
                analysis.get(
                    "severity_counts"
                )
            ),
            "analysis_method": analysis.get(
                "analysis_method"
            ),
            "findings": findings,
        },

        "decision": {
            "verdict": decision.get(
                "verdict",
                "ERROR",
            ),
            "recommended_action": (
                decision.get(
                    "recommended_action",
                    "BLOCK",
                )
            ),
            "allow_user_access": decision.get(
                "allow_user_access",
                False,
            ),
            "reason": decision.get(
                "reason"
            ),
            "decision_policy": decision.get(
                "decision_policy"
            ),
            "analysis_status": decision.get(
                "analysis_status"
            ),
            "risk_score": decision.get(
                "risk_score",
                analysis.get(
                    "risk_score",
                    0,
                ),
            ),
            "critical_finding_count": (
                decision.get(
                    "critical_finding_count",
                    analysis.get(
                        "critical_finding_count",
                        0,
                    ),
                )
            ),
            "high_finding_count": (
                decision.get(
                    "high_finding_count",
                    analysis.get(
                        "high_finding_count",
                        0,
                    ),
                )
            ),
        },

        "evidence_summary": {
            "http_redirect_count": (
                redirect_count
            ),
            "client_redirect_count": (
                client_counts["total"]
            ),
            "javascript_redirect_count": (
                client_counts["javascript"]
            ),
            "meta_refresh_count": (
                client_counts["meta_refresh"]
            ),
            "history_api_count": (
                client_counts["history_api"]
            ),
            "hash_change_count": (
                client_counts["hash_change"]
            ),
            "network_request_count": as_int(
                network.get(
                    "request_count",
                    0,
                )
            ),
            "failed_request_count": as_int(
                network.get(
                    "failed_request_count",
                    0,
                )
            ),
            "cookie_count": as_int(
                cookies.get(
                    "cookie_count",
                    0,
                )
            ),
            "cookie_collection_available": (
                cookies.get(
                    "available",
                    True,
                )
            ),
            "console_message_count": as_int(
                console.get(
                    "message_count",
                    0,
                )
            ),
            "page_error_count": as_int(
                console.get(
                    "page_error_count",
                    0,
                )
            ),
            "download_attempt_count": as_int(
                downloads.get(
                    "download_attempt_count",
                    0,
                )
            ),
            "popup_count": as_int(
                popups.get(
                    "popup_count",
                    0,
                )
            ),
            "dialog_count": as_int(
                dialogs.get(
                    "dialog_count",
                    0,
                )
            ),
            "form_count": as_int(
                forms.get(
                    "form_count",
                    0,
                )
            ),
            "password_field_count": as_int(
                forms.get(
                    "total_password_fields",
                    0,
                )
            ),
            "has_login_form": bool(
                forms.get(
                    "has_login_form",
                    False,
                )
            ),
            "is_https": bool(
                certificate.get(
                    "is_https",
                    False,
                )
            ),
            "tls_protocol": certificate.get(
                "protocol"
            ),
            "inline_script_count": as_int(
                javascript.get(
                    "inline_script_count",
                    0,
                )
            ),
            "external_script_count": as_int(
                javascript.get(
                    "external_script_count",
                    0,
                )
            ),
            "ssrf_egress_blocked_count": as_int(
                evidence.get("network_guard", {}).get(
                    "blocked_count",
                    0,
                )
            ),
        },

        "browser_behaviour": {
            "network_egress_guard": evidence.get(
                "network_guard",
                {},
            ),
            "forms": forms,
            "security_headers": headers.get("security_headers", {}),
            "tls": certificate,
            "scripts": {
                "inline_count": javascript.get("inline_script_count", 0),
                "external_count": javascript.get("external_script_count", 0),
                "external_domains": javascript.get("external_domains", []),
                "suspicious_signals": javascript.get("suspicious_signals", []),
            },
            "http_redirects": {
                "count": redirect_count,
                "events": http_events,
                "loop_detected": first_present(
                    redirects,
                    "redirect_loop_detected",
                    "loop_detected",
                    default=False,
                ),
                "limit_exceeded": first_present(
                    redirects,
                    "redirect_limit_exceeded",
                    "limit_exceeded",
                    default=False,
                ),
                "unique_domains": first_present(
                    redirects,
                    "unique_domains",
                    "domains",
                    default=[],
                ),
                "last_successful_url": first_present(
                    redirects,
                    "last_successful_url",
                    default=None,
                ),
            },
            "client_redirects": {
                "count": client_counts["total"],
                "javascript_count": (
                    client_counts["javascript"]
                ),
                "meta_refresh_count": (
                    client_counts["meta_refresh"]
                ),
                "history_api_count": (
                    client_counts["history_api"]
                ),
                "hash_change_count": (
                    client_counts["hash_change"]
                ),
                "events": client_events,
            },
            "navigation_timeline": timeline,
            "domain_transition": {
                "submitted_hostname": (
                    hostname_from_url(
                        submitted_url
                    )
                ),
                "final_hostname": (
                    hostname_from_url(
                        final_url
                    )
                ),
                "domain_changed": (
                    threat_indicators[
                        "domain_changed"
                    ]
                ),
            },
            "popups": popups,
            "dialogs": dialogs,
        },

        "threat_indicators": threat_indicators,

        "artifacts": {
            "screenshot": evidence.get(
                "screenshot"
            ),
            "html": evidence.get(
                "html"
            ),
            "evidence_files": as_dict(
                evidence.get(
                    "evidence_files"
                )
            ),
        },
    }

    try:
        write_json_atomic(
            paths.report_file,
            final_report,
        )

    except Exception as exc:
        raise ReportBuildError(
            f"Unable to write final report for "
            f"{session_id}: {exc}"
        ) from exc

    return str(
        paths.report_file
    )