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

from session_manager import (
    SessionManager,
    SessionPaths,
)
from utils.json_utils import write_json_atomic


REPORT_SCHEMA_VERSION = "2.0"


class ReportBuildError(Exception):
    """
    Raised when the final report cannot be built.
    """


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


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

    evidence = report_data.get(
        "evidence",
        {},
    )

    analysis = report_data.get(
        "analysis",
        {},
    )

    decision = report_data.get(
        "decision",
        {},
    )

    execution = evidence.get(
        "execution",
        {},
    )

    metadata = evidence.get(
        "metadata",
        {},
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
            "browser_engine": (
                execution.get(
                    "browser_engine"
                )
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
            ),
            "fatal_error": execution.get(
                "fatal_error"
            ),
        },

        "target": {
            "submitted_url": (
                metadata.get(
                    "requested_url"
                )
                or execution.get(
                    "requested_url"
                )
            ),
            "response_url": metadata.get(
                "response_url"
            ),
            "final_url": metadata.get(
                "final_url"
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
            "server_address": (
                metadata.get(
                    "server_address"
                )
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
            "finding_count": (
                analysis.get(
                    "finding_count",
                    0,
                )
            ),
            "critical_finding_count": (
                analysis.get(
                    "critical_finding_count",
                    0,
                )
            ),
            "high_finding_count": (
                analysis.get(
                    "high_finding_count",
                    0,
                )
            ),
            "severity_counts": (
                analysis.get(
                    "severity_counts",
                    {},
                )
            ),
            "analysis_method": (
                analysis.get(
                    "analysis_method"
                )
            ),
            "findings": analysis.get(
                "findings",
                [],
            ),
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
            "allow_user_access": (
                decision.get(
                    "allow_user_access",
                    False,
                )
            ),
            "reason": decision.get(
                "reason"
            ),
            "decision_policy": (
                decision.get(
                    "decision_policy"
                )
            ),
        },

        "evidence_summary": {
            "redirect_count": (
                evidence.get(
                    "redirects",
                    {},
                ).get(
                    "redirect_count",
                    0,
                )
            ),
            "network_request_count": (
                evidence.get(
                    "network",
                    {},
                ).get(
                    "request_count",
                    0,
                )
            ),
            "failed_request_count": (
                evidence.get(
                    "network",
                    {},
                ).get(
                    "failed_request_count",
                    0,
                )
            ),
            "cookie_count": (
                evidence.get(
                    "cookies",
                    {},
                ).get(
                    "cookie_count",
                    0,
                )
            ),
            "console_message_count": (
                evidence.get(
                    "console",
                    {},
                ).get(
                    "message_count",
                    0,
                )
            ),
            "page_error_count": (
                evidence.get(
                    "console",
                    {},
                ).get(
                    "page_error_count",
                    0,
                )
            ),
            "download_attempt_count": (
                evidence.get(
                    "downloads",
                    {},
                ).get(
                    "download_attempt_count",
                    0,
                )
            ),
            "popup_count": (
                evidence.get(
                    "popups",
                    {},
                ).get(
                    "popup_count",
                    0,
                )
            ),
            "dialog_count": (
                evidence.get(
                    "dialogs",
                    {},
                ).get(
                    "dialog_count",
                    0,
                )
            ),
        },

        "artifacts": {
            "screenshot": evidence.get(
                "screenshot"
            ),
            "html": evidence.get(
                "html"
            ),
            "evidence_files": (
                evidence.get(
                    "evidence_files",
                    {}
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