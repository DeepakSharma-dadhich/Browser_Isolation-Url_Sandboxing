"""
BrowseGuard PostgreSQL-Backed Direct Analysis Queue Service.

Eliminates disk file queues by using PostgreSQL transactional locking:
SELECT ... FOR UPDATE SKIP LOCKED
Persists reports, findings, redirects, and artifacts atomically into PostgreSQL.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any
import psycopg
from psycopg.rows import dict_row

from utils.logging_utils import configure_logging

logger = configure_logging("vm_agent.services.db_queue_service")

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:Daksh123@localhost:5432/Browser_Isolation"
)


def get_db_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


class DbQueueService:
    def __init__(self, db_url: str = DATABASE_URL) -> None:
        self.db_url = db_url

    def recover_stuck_jobs(self, timeout_minutes: int = 5) -> int:
        """
        Reclaim or fail jobs stuck in 'RUNNING' status for longer than timeout_minutes
        due to previous worker crash, segfault, or unhandled exit.
        """
        try:
            with psycopg.connect(self.db_url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE analyses
                        SET status = 'FAILED',
                            error_code = 'WORKER_CRASHED_OR_TIMEOUT',
                            error_message = 'Job execution timed out or worker process was terminated prematurely.',
                            completed_at = NOW(),
                            updated_at = NOW()
                        WHERE status = 'RUNNING'
                          AND started_at < NOW() - (%s * INTERVAL '1 minute')
                        RETURNING id;
                        """,
                        (timeout_minutes,)
                    )
                    recovered = cur.fetchall()
                    conn.commit()
                    if recovered:
                        recovered_ids = [r[0] for r in recovered]
                        logger.warning(
                            "Recovered %d zombie/stuck jobs from previous worker runs: %s",
                            len(recovered_ids),
                            recovered_ids
                        )
                        return len(recovered_ids)
                    return 0
        except Exception as exc:
            logger.error("Error recovering stuck jobs from database: %s", exc)
            return 0

    def claim_next_job(self) -> dict[str, Any] | None:
        """
        Atomically claim the next queued analysis using FOR UPDATE SKIP LOCKED.
        Returns job dict if claimed, else None.
        """
        try:
            with psycopg.connect(self.db_url, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, submitted_url, metadata
                        FROM analyses
                        WHERE status = 'QUEUED'
                        ORDER BY submitted_at ASC
                        LIMIT 1
                        FOR UPDATE SKIP LOCKED;
                        """
                    )
                    row = cur.fetchone()
                    if not row:
                        return None

                    job_id = row["id"]
                    # Mark as RUNNING
                    cur.execute(
                        """
                        UPDATE analyses
                        SET status = 'RUNNING', started_at = NOW(), updated_at = NOW()
                        WHERE id = %s;
                        """,
                        (job_id,)
                    )
                    conn.commit()

                    logger.info("Atomically claimed analysis job from PostgreSQL: %s (url: %s)", job_id, row["submitted_url"])
                    return {
                        "session_id": job_id,
                        "url": row["submitted_url"],
                        "metadata": row.get("metadata") or {}
                    }
        except Exception as exc:
            logger.error("Error claiming job from PostgreSQL: %s", exc)
            return None

    def complete_job(
        self,
        session_id: str,
        report: dict[str, Any],
        screenshot_path: Path | str | None = None,
        har_path: Path | str | None = None,
        dom_path: Path | str | None = None,
    ) -> bool:
        """
        Atomically persist report, findings, redirect events, and artifacts to PostgreSQL.
        """
        try:
            with psycopg.connect(self.db_url, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    target = report.get("target") or {}
                    execution = report.get("execution") or {}
                    decision = report.get("decision") or {}
                    analysis = report.get("analysis") or {}
                    browser_behaviour = report.get("browser_behaviour") or {}

                    verdict = decision.get("verdict") or "UNKNOWN"
                    risk_score = min(100, max(0, int(analysis.get("risk_score") or 0)))
                    risk_level = analysis.get("risk_level") or "unknown"
                    recommended_action = decision.get("recommended_action") or "REVIEW"
                    allow_user_access = bool(decision.get("allow_user_access", False))
                    decision_reason = decision.get("reason") or None

                    final_url = target.get("final_url") or None
                    final_hostname = target.get("final_hostname") or None
                    domain_changed = bool(target.get("domain_changed", False))
                    page_title = target.get("page_title") or None
                    status_code = target.get("status_code") or None
                    server_ip = None
                    if isinstance(target.get("server_address"), dict):
                        server_ip = target["server_address"].get("ipAddress")

                    duration_ms = execution.get("duration_ms") or None
                    execution_status = "COMPLETED" if execution.get("status") == "completed" else "COMPLETED_WITH_ERRORS"

                    # 1. Update analyses table
                    cur.execute(
                        """
                        UPDATE analyses SET
                            status = %s,
                            verdict = %s,
                            recommended_action = %s,
                            allow_user_access = %s,
                            decision_reason = %s,
                            risk_score = %s,
                            risk_level = %s,
                            final_url = %s,
                            final_hostname = %s,
                            domain_changed = %s,
                            page_title = %s,
                            http_status_code = %s,
                            server_ip = %s,
                            duration_ms = %s,
                            completeness = 'complete',
                            completed_at = NOW(),
                            updated_at = NOW()
                        WHERE id = %s;
                        """,
                        (
                            execution_status,
                            verdict,
                            recommended_action,
                            allow_user_access,
                            decision_reason,
                            risk_score,
                            risk_level,
                            final_url,
                            final_hostname,
                            domain_changed,
                            page_title,
                            status_code,
                            server_ip,
                            duration_ms,
                            session_id
                        )
                    )

                    # 2. Insert Findings
                    cur.execute("DELETE FROM findings WHERE analysis_id = %s;", (session_id,))
                    findings = analysis.get("findings") or []
                    for f in findings:
                        sev = (f.get("severity") or "INFORMATIONAL").upper()
                        valid_sevs = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"}
                        severity = sev if sev in valid_sevs else "INFORMATIONAL"

                        cur.execute(
                            """
                            INSERT INTO findings (
                                analysis_id, rule_id, rule_version, title, description,
                                category, severity, confidence, score_contribution,
                                evidence, mitre_attack_id, mitre_attack_name
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                            """,
                            (
                                session_id,
                                f.get("id") or f.get("rule_id") or "GEN-001",
                                f.get("rule_version") or "1.0",
                                f.get("title") or "Observed Finding",
                                f.get("description") or None,
                                f.get("category") or "general",
                                severity,
                                float(f.get("confidence") or 1.0),
                                int(f.get("score") or f.get("score_contribution") or 0),
                                json.dumps(f.get("evidence") or {}),
                                f.get("mitre_attack_id") or None,
                                f.get("mitre_attack_name") or None
                            )
                        )

                    # 3. Insert Redirect Events
                    cur.execute("DELETE FROM redirect_events WHERE analysis_id = %s;", (session_id,))
                    redirect_events = browser_behaviour.get("http_redirects", {}).get("events", [])
                    for seq, hop in enumerate(redirect_events, start=1):
                        cur.execute(
                            """
                            INSERT INTO redirect_events (
                                analysis_id, sequence, redirect_type, source_url, target_url, status_code, timestamp
                            ) VALUES (%s, %s, %s, %s, %s, %s, NOW());
                            """,
                            (
                                session_id,
                                seq,
                                hop.get("type") or "http_redirect",
                                hop.get("source_url") or hop.get("from") or "",
                                hop.get("target_url") or hop.get("to") or "",
                                hop.get("status_code") or None
                            )
                        )

                    # 4. Insert Artifacts (Screenshot, HAR Network Stream, DOM Snapshot)
                    cur.execute("DELETE FROM artifact_records WHERE analysis_id = %s;", (session_id,))
                    if screenshot_path and os.path.exists(str(screenshot_path)):
                        p = Path(screenshot_path)
                        cur.execute(
                            """
                            INSERT INTO artifact_records (
                                analysis_id, artifact_type, file_name, storage_path, mime_type, size_bytes
                            ) VALUES (%s, 'SCREENSHOT', %s, %s, 'image/png', %s);
                            """,
                            (
                                session_id,
                                p.name,
                                str(p),
                                p.stat().st_size
                            )
                        )

                    if har_path and os.path.exists(str(har_path)):
                        hp = Path(har_path)
                        cur.execute(
                            """
                            INSERT INTO artifact_records (
                                analysis_id, artifact_type, file_name, storage_path, mime_type, size_bytes
                            ) VALUES (%s, 'HAR_LOG', %s, %s, 'application/json', %s);
                            """,
                            (
                                session_id,
                                hp.name,
                                str(hp),
                                hp.stat().st_size
                            )
                        )

                    if dom_path and os.path.exists(str(dom_path)):
                        dp = Path(dom_path)
                        cur.execute(
                            """
                            INSERT INTO artifact_records (
                                analysis_id, artifact_type, file_name, storage_path, mime_type, size_bytes
                            ) VALUES (%s, 'DOM_SNAPSHOT', %s, %s, 'text/html', %s);
                            """,
                            (
                                session_id,
                                dp.name,
                                str(dp),
                                dp.stat().st_size
                            )
                        )

                    # 5. Insert Raw Report
                    cur.execute(
                        """
                        INSERT INTO reports (
                            analysis_id, schema_version, evidence_summary, browser_behaviour, raw_report, generated_at
                        ) VALUES (%s, '2.1', %s, %s, %s, NOW())
                        ON CONFLICT (analysis_id) DO UPDATE SET
                            evidence_summary = EXCLUDED.evidence_summary,
                            browser_behaviour = EXCLUDED.browser_behaviour,
                            raw_report = EXCLUDED.raw_report,
                            generated_at = NOW();
                        """,
                        (
                            session_id,
                            json.dumps(report.get("evidence_summary") or {}),
                            json.dumps(browser_behaviour),
                            json.dumps(report)
                        )
                    )

                    conn.commit()
                    logger.info("Analysis %s successfully committed to PostgreSQL!", session_id)
                    return True
        except Exception as exc:
            logger.exception("Failed to commit analysis %s to PostgreSQL: %s", session_id, exc)
            return False

    def fail_job(self, session_id: str, error_message: str, error_code: str = "PIPELINE_ERROR") -> None:
        try:
            with psycopg.connect(self.db_url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE analyses SET
                            status = 'FAILED',
                            error_code = %s,
                            error_message = %s,
                            completed_at = NOW(),
                            updated_at = NOW()
                        WHERE id = %s;
                        """,
                        (error_code, error_message, session_id)
                    )
                    conn.commit()
        except Exception as exc:
            logger.error("Failed to mark job %s as failed: %s", session_id, exc)
