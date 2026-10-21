"""
Standalone VM Agent Queue Worker CLI.

Supports:
1. PostgreSQL Direct Database Queue (FOR UPDATE SKIP LOCKED) - Enterprise Production Ready
2. Shared Folder Fallback (shared/input/) for testing / legacy compatibility
3. Full SSRF isolation, Brand Impersonation, and MITRE ATT&CK telemetry
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import signal
import sys
import time

from browser_controller import analyze_url
from config import (
    POLL_INTERVAL_SECONDS,
    create_required_directories,
)
from services.db_queue_service import DbQueueService
from services.job_manager import JobManager
from session_manager import SessionManager
from utils.logging_utils import configure_logging

logger = configure_logging("vm_agent.worker")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class StandaloneWorker:
    def __init__(self, poll_interval_seconds: float = POLL_INTERVAL_SECONDS) -> None:
        self.poll_interval_seconds = poll_interval_seconds
        self.job_manager = JobManager()
        self.session_manager = SessionManager()
        self.db_queue = DbQueueService()
        self.running = False

    def start(self) -> None:
        create_required_directories()
        self.running = True
        logger.info("Standalone VM Agent queue worker started with PostgreSQL Queue. Poll interval: %ss", self.poll_interval_seconds)

        try:
            self.job_manager.recover_interrupted_jobs()
        except Exception as exc:
            logger.warning("Interrupted job recovery note: %s", exc)

        while self.running:
            processed_something = False
            try:
                # 1. Primary: Check PostgreSQL Direct Queue (No disk files needed)
                db_job = self.db_queue.claim_next_job()
                if db_job:
                    processed_something = True
                    session_id = db_job["session_id"]
                    target_url = db_job["url"]
                    logger.info("Processing PostgreSQL queue job: %s -> %s", session_id, target_url)

                    session_paths = self.session_manager.create_session(session_id)
                    self.session_manager.save_request_snapshot(
                        paths=session_paths,
                        request_data={
                            "session_id": session_id,
                            "url": target_url,
                            "submitted_at": utc_now_iso(),
                            "source": "postgresql_queue",
                            "metadata": db_job.get("metadata") or {}
                        }
                    )

                    try:
                        result = analyze_url(
                            url=target_url,
                            session_path=session_paths,
                            session_id=session_id
                        )

                        screenshot_path = getattr(session_paths, "screenshot_file", None)
                        if not screenshot_path or not os.path.exists(str(screenshot_path)):
                            candidate = session_paths.screenshots_dir / "final_page.png"
                            if candidate.exists():
                                screenshot_path = candidate

                        har_path = session_paths.network_dir / "traffic.har"
                        dom_path = session_paths.html_dir / "page.html"

                        report_data = result
                        report_file = result.get("report_path")
                        if report_file and os.path.exists(str(report_file)):
                            try:
                                with open(report_file, "r", encoding="utf-8") as rf:
                                    loaded = json.load(rf)
                                    if isinstance(loaded, dict):
                                        report_data = loaded
                            except Exception as exc:
                                logger.warning("Failed to read report.json for job %s: %s", session_id, exc)

                        self.db_queue.complete_job(
                            session_id=session_id,
                            report=report_data,
                            screenshot_path=screenshot_path,
                            har_path=har_path if har_path.exists() else None,
                            dom_path=dom_path if dom_path.exists() else None,
                        )
                        logger.info("PostgreSQL queue job %s completed successfully!", session_id)
                    except Exception as err:
                        logger.exception("Analysis error on job %s: %s", session_id, err)
                        self.db_queue.fail_job(session_id, str(err))

                # 2. Secondary Fallback: Check shared/input/ files
                pending_disk = self.job_manager.get_pending_jobs()
                if pending_disk:
                    processed_something = True
                    job_path = pending_disk[0]
                    logger.info("Processing disk queue job: %s", job_path.name)
                    res = self.job_manager.process_job(job_path)
                    logger.info("Disk job %s completed with status: %s", job_path.name, res.get("status"))

                if not processed_something:
                    time.sleep(self.poll_interval_seconds)

            except Exception as exc:
                logger.exception("Worker loop error: %s", exc)
                time.sleep(self.poll_interval_seconds)

    def stop(self) -> None:
        self.running = False
        logger.info("Standalone worker stopped.")


def main() -> None:
    worker = StandaloneWorker()

    def handle_exit(signum, frame) -> None:
        logger.info("Shutdown signal received.")
        worker.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    worker.start()


if __name__ == "__main__":
    main()
