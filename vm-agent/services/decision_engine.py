"""
URL sandbox decision engine.

The Decision Engine converts the Threat Analyzer result into a final
verdict and recommended enforcement action.

It intentionally does not inspect raw browser evidence. Redirect,
download, URL-transition and browser-behaviour rules are evaluated by
``threat_analyzer.py`` first. This module applies the final policy to
the resulting score and severity counts.
"""

from __future__ import annotations

from typing import Any


SAFE_MAX_SCORE = 19
SUSPICIOUS_MAX_SCORE = 39
HIGH_RISK_MAX_SCORE = 69


VALID_ANALYSIS_STATUSES = {
    "completed",
    "completed_with_errors",
    "failed",
}


def normalize_score(
    risk_score: int | float,
) -> int:
    """
    Normalize a risk score to the inclusive range 0-100.
    """

    try:
        normalized = int(
            round(
                float(risk_score)
            )
        )
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "risk_score must be numeric."
        ) from exc

    return max(
        0,
        min(
            100,
            normalized,
        ),
    )


def normalize_finding_count(
    value: int | float,
    *,
    field_name: str,
) -> int:
    """
    Normalize a severity finding count to a non-negative integer.
    """

    try:
        normalized = int(
            value
        )
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"{field_name} must be numeric."
        ) from exc

    return max(
        0,
        normalized,
    )


def build_decision(
    *,
    verdict: str,
    recommended_action: str,
    allow_user_access: bool,
    reason: str,
    risk_score: int,
    decision_policy: str,
    analysis_status: str,
    critical_finding_count: int,
    high_finding_count: int,
) -> dict[str, Any]:
    """
    Build one consistent decision response.
    """

    return {
        "verdict": verdict,
        "recommended_action": recommended_action,
        "allow_user_access": allow_user_access,
        "reason": reason,
        "risk_score": risk_score,
        "decision_policy": decision_policy,
        "analysis_status": analysis_status,
        "critical_finding_count": (
            critical_finding_count
        ),
        "high_finding_count": (
            high_finding_count
        ),
    }


def make_decision(
    risk_score: int | float,
    *,
    analysis_status: str = "completed",
    critical_finding_count: int = 0,
    high_finding_count: int = 0,
) -> dict[str, Any]:
    """
    Generate the final sandbox decision.

    Base score thresholds:

        0-19:
            SAFE

        20-39:
            SUSPICIOUS

        40-69:
            HIGH_RISK

        70-100:
            MALICIOUS

    Policy overrides:

    - Failed browser execution is blocked using fail-closed handling.
    - Any critical finding produces a MALICIOUS verdict.
    - Three or more high findings produce a MALICIOUS verdict.
    - Two high findings produce at least a HIGH_RISK verdict.
    - A completed-with-errors session is never automatically marked SAFE.

    Client-side redirect findings are already included in the analyzer's
    score and severity counts, so they automatically influence these
    policy rules without requiring raw evidence in this module.
    """

    score = normalize_score(
        risk_score
    )

    critical_count = normalize_finding_count(
        critical_finding_count,
        field_name="critical_finding_count",
    )

    high_count = normalize_finding_count(
        high_finding_count,
        field_name="high_finding_count",
    )

    normalized_status = str(
        analysis_status
    ).strip().lower()

    if not normalized_status:
        normalized_status = "failed"

    if normalized_status not in VALID_ANALYSIS_STATUSES:
        normalized_status = "failed"

    if normalized_status == "failed":
        return build_decision(
            verdict="ERROR",
            recommended_action="BLOCK",
            allow_user_access=False,
            reason=(
                "Browser analysis did not complete successfully. "
                "The URL is blocked using fail-closed handling."
            ),
            risk_score=score,
            decision_policy=(
                "analysis_failure_fail_closed_v2"
            ),
            analysis_status=normalized_status,
            critical_finding_count=(
                critical_count
            ),
            high_finding_count=high_count,
        )

    if critical_count > 0:
        return build_decision(
            verdict="MALICIOUS",
            recommended_action="BLOCK",
            allow_user_access=False,
            reason=(
                "One or more critical behavioural findings were "
                "detected."
            ),
            risk_score=score,
            decision_policy=(
                "critical_finding_override_v2"
            ),
            analysis_status=normalized_status,
            critical_finding_count=(
                critical_count
            ),
            high_finding_count=high_count,
        )

    if high_count >= 3:
        return build_decision(
            verdict="MALICIOUS",
            recommended_action="BLOCK",
            allow_user_access=False,
            reason=(
                "Three or more high-severity behavioural findings "
                "were detected."
            ),
            risk_score=score,
            decision_policy=(
                "multiple_high_findings_malicious_override_v2"
            ),
            analysis_status=normalized_status,
            critical_finding_count=(
                critical_count
            ),
            high_finding_count=high_count,
        )

    if score >= 70:
        verdict = "MALICIOUS"
        action = "BLOCK"
        allow_user_access = False
        reason = (
            "The observed behaviour produced a critical risk score."
        )
        policy = "risk_threshold_malicious_v2"

    elif score >= 40:
        verdict = "HIGH_RISK"
        action = "BLOCK"
        allow_user_access = False
        reason = (
            "The observed behaviour produced a high risk score."
        )
        policy = "risk_threshold_high_v2"

    elif score >= 20:
        verdict = "SUSPICIOUS"
        action = "WARN_OR_QUARANTINE"
        allow_user_access = False
        reason = (
            "Suspicious behaviour was observed and manual review "
            "is recommended."
        )
        policy = "risk_threshold_suspicious_v2"

    else:
        verdict = "SAFE"
        action = "ALLOW"
        allow_user_access = True
        reason = (
            "No significant suspicious browser behaviour was "
            "detected by the current analysis rules."
        )
        policy = "risk_threshold_safe_v2"

    if high_count >= 2 and verdict in {
        "SAFE",
        "SUSPICIOUS",
    }:
        verdict = "HIGH_RISK"
        action = "BLOCK"
        allow_user_access = False
        reason = (
            "Multiple high-severity findings triggered an elevated "
            "blocking decision."
        )
        policy = (
            "multiple_high_findings_block_override_v2"
        )

    elif high_count == 1 and verdict == "SAFE":
        verdict = "SUSPICIOUS"
        action = "WARN_OR_QUARANTINE"
        allow_user_access = False
        reason = (
            "A high-severity behavioural finding prevents an "
            "automatic safe verdict."
        )
        policy = (
            "single_high_finding_safe_override_v2"
        )

    if (
        normalized_status == "completed_with_errors"
        and verdict == "SAFE"
    ):
        verdict = "SUSPICIOUS"
        action = "WARN_OR_QUARANTINE"
        allow_user_access = False
        reason = (
            "Browser execution completed with errors, so the URL "
            "cannot be automatically classified as safe."
        )
        policy = (
            "incomplete_analysis_safe_override_v2"
        )

    return build_decision(
        verdict=verdict,
        recommended_action=action,
        allow_user_access=allow_user_access,
        reason=reason,
        risk_score=score,
        decision_policy=policy,
        analysis_status=normalized_status,
        critical_finding_count=critical_count,
        high_finding_count=high_count,
    )