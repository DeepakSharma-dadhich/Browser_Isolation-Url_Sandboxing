"""
URL sandbox decision engine.

The Decision Engine converts the Threat Analyzer result into a final
verdict and recommended enforcement action.
"""

from __future__ import annotations

from typing import Any


def normalize_score(
    risk_score: int | float,
) -> int:
    """
    Normalize risk score to the range 0-100.
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


def make_decision(
    risk_score: int | float,
    *,
    analysis_status: str = "completed",
    critical_finding_count: int = 0,
    high_finding_count: int = 0,
) -> dict[str, Any]:
    """
    Generate the final sandbox decision.

    Verdict thresholds:

        0-19:
            SAFE

        20-39:
            SUSPICIOUS

        40-69:
            HIGH_RISK

        70-100:
            MALICIOUS

    Incomplete browser execution is fail-closed.
    """

    score = normalize_score(
        risk_score
    )

    normalized_status = str(
        analysis_status
    ).strip().lower()

    if normalized_status == "failed":
        return {
            "verdict": "ERROR",
            "recommended_action": "BLOCK",
            "allow_user_access": False,
            "reason": (
                "Browser analysis did not complete successfully. "
                "The URL is blocked using fail-closed handling."
            ),
            "risk_score": score,
            "decision_policy": (
                "analysis_failure_fail_closed"
            ),
        }

    if critical_finding_count > 0:
        return {
            "verdict": "MALICIOUS",
            "recommended_action": "BLOCK",
            "allow_user_access": False,
            "reason": (
                "One or more critical behavioural findings were "
                "detected."
            ),
            "risk_score": score,
            "decision_policy": (
                "critical_finding_override"
            ),
        }

    if score >= 70:
        verdict = "MALICIOUS"
        action = "BLOCK"
        allow_user_access = False
        reason = (
            "The observed behaviour produced a critical risk score."
        )

    elif score >= 40:
        verdict = "HIGH_RISK"
        action = "BLOCK"
        allow_user_access = False
        reason = (
            "The observed behaviour produced a high risk score."
        )

    elif score >= 20:
        verdict = "SUSPICIOUS"
        action = "WARN_OR_QUARANTINE"
        allow_user_access = False
        reason = (
            "Suspicious behaviour was observed and manual review "
            "is recommended."
        )

    else:
        verdict = "SAFE"
        action = "ALLOW"
        allow_user_access = True
        reason = (
            "No significant suspicious browser behaviour was "
            "detected by the current analysis rules."
        )

    if (
        high_finding_count >= 2
        and verdict == "SUSPICIOUS"
    ):
        verdict = "HIGH_RISK"
        action = "BLOCK"
        allow_user_access = False
        reason = (
            "Multiple high-severity findings triggered an elevated "
            "blocking decision."
        )

    return {
        "verdict": verdict,
        "recommended_action": action,
        "allow_user_access": (
            allow_user_access
        ),
        "reason": reason,
        "risk_score": score,
        "decision_policy": (
            "risk_threshold_policy_v1"
        ),
    }