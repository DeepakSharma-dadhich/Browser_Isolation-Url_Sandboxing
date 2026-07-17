"""
Email URL Sandbox VM Agent API.

This process runs inside the isolated VirtualBox VM.

Responsibilities:

- Start the continuous request-processing worker
- Monitor shared/input for new URL-analysis requests
- Recover jobs interrupted by a previous shutdown
- Call JobManager for every request
- Expose health and queue-status API endpoints
- Shut down the worker gracefully

Browser execution is not performed directly here.

Execution flow:

    shared/input/
        ↓
    JobManager
        ↓
    Browser Controller
        ↓
    Collectors
        ↓
    Threat Analyzer
        ↓
    Decision Engine
        ↓
    Report Builder
        ↓
    shared/reports/<session_id>/report.json
"""

from __future__ import annotations

import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import (
    FastAPI,
    HTTPException,
    status,
)

from config import (
    COMPLETED_DIR,
    FAILED_DIR,
    INPUT_DIR,
    LOGS_DIR,
    POLL_INTERVAL_SECONDS,
    PROCESSING_DIR,
    REPORTS_DIR,
    SHARED_ROOT,
    create_required_directories,
)

from services.job_manager import JobManager
from utils.logging_utils import configure_logging


logger = configure_logging(
    "vm_agent.agent_api"
)


def utc_now_iso() -> str:
    """
    Return current UTC time in ISO-8601 format.
    """

    return datetime.now(
        timezone.utc
    ).isoformat()


class AgentWorker:
    """
    Long-running VM Agent queue worker.

    The worker monitors shared/input and processes requests one at a
    time through JobManager.
    """

    def __init__(
        self,
        poll_interval_seconds: float,
    ) -> None:
        self.poll_interval_seconds = (
            poll_interval_seconds
        )

        self.job_manager = JobManager()

        self.stop_event = threading.Event()

        self.worker_thread: (
            threading.Thread | None
        ) = None

        self.processing_lock = (
            threading.Lock()
        )

        self.started_at: str | None = None
        self.last_poll_at: str | None = None
        self.last_job_started_at: (
            str | None
        ) = None
        self.last_job_completed_at: (
            str | None
        ) = None

        self.last_result: (
            dict[str, Any] | None
        ) = None

        self.last_error: (
            dict[str, Any] | None
        ) = None

        self.current_job_file: (
            str | None
        ) = None

        self.processed_job_count = 0
        self.failed_job_count = 0

    @property
    def is_running(
        self,
    ) -> bool:
        """
        Return True when the background worker thread is alive.
        """

        return (
            self.worker_thread is not None
            and self.worker_thread.is_alive()
            and not self.stop_event.is_set()
        )

    def start(
        self,
    ) -> None:
        """
        Start the background queue worker.

        Safe to call more than once.
        """

        if self.is_running:
            logger.warning(
                "VM Agent worker is already running."
            )
            return

        self.stop_event.clear()

        self.started_at = utc_now_iso()

        try:
            self.job_manager.recover_interrupted_jobs()

        except Exception as exc:
            logger.exception(
                "Interrupted-job recovery failed."
            )

            self.last_error = {
                "type": type(exc).__name__,
                "message": str(exc),
                "stage": "startup_recovery",
                "recorded_at": utc_now_iso(),
            }

        self.worker_thread = threading.Thread(
            target=self._run_loop,
            name="vm-agent-worker",
            daemon=True,
        )

        self.worker_thread.start()

        logger.info(
            "VM Agent worker started. "
            "poll_interval_seconds=%s "
            "shared_root=%s",
            self.poll_interval_seconds,
            SHARED_ROOT,
        )

    def stop(
        self,
        join_timeout_seconds: float = 30.0,
    ) -> None:
        """
        Request graceful worker shutdown.

        An actively running browser job is allowed to finish before the
        thread exits, up to the supplied join timeout.
        """

        if self.worker_thread is None:
            return

        logger.info(
            "VM Agent worker shutdown requested."
        )

        self.stop_event.set()

        self.worker_thread.join(
            timeout=join_timeout_seconds
        )

        if self.worker_thread.is_alive():
            logger.warning(
                "VM Agent worker did not stop within "
                "%s seconds.",
                join_timeout_seconds,
            )
        else:
            logger.info(
                "VM Agent worker stopped."
            )

    def _run_loop(
        self,
    ) -> None:
        """
        Continuously poll and process pending requests.
        """

        logger.info(
            "VM Agent worker loop entered."
        )

        while not self.stop_event.is_set():
            self.last_poll_at = utc_now_iso()

            try:
                processed = (
                    self.process_next_job()
                )

                if not processed:
                    self.stop_event.wait(
                        self.poll_interval_seconds
                    )

            except Exception as exc:
                logger.exception(
                    "Unexpected VM Agent worker-loop error."
                )

                self.last_error = {
                    "type": type(exc).__name__,
                    "message": str(exc),
                    "stage": "worker_loop",
                    "recorded_at": utc_now_iso(),
                }

                self.stop_event.wait(
                    self.poll_interval_seconds
                )

        logger.info(
            "VM Agent worker loop exited."
        )

    def process_next_job(
        self,
    ) -> bool:
        """
        Process the oldest pending request.

        Returns:
            True if a request was found and processed.
            False if the input queue was empty.
        """

        if not self.processing_lock.acquire(
            blocking=False
        ):
            return False

        try:
            pending_jobs = (
                self.job_manager
                .get_pending_jobs()
            )

            if not pending_jobs:
                return False

            request_path = pending_jobs[0]

            self.current_job_file = str(
                request_path
            )

            self.last_job_started_at = (
                utc_now_iso()
            )

            logger.info(
                "Worker processing request. file=%s",
                request_path.name,
            )

            try:
                result = (
                    self.job_manager.process_job(
                        request_path
                    )
                )

                self.last_result = result

                result_status = str(
                    result.get(
                        "status",
                        "unknown",
                    )
                ).lower()

                if result_status in {
                    "failed",
                    "rejected",
                }:
                    self.failed_job_count += 1
                else:
                    self.processed_job_count += 1

                logger.info(
                    "Worker finished request. "
                    "file=%s status=%s session_id=%s",
                    request_path.name,
                    result_status,
                    result.get(
                        "session_id"
                    ),
                )

            except Exception as exc:
                self.failed_job_count += 1

                self.last_error = {
                    "type": type(exc).__name__,
                    "message": str(exc),
                    "stage": "process_job",
                    "request_file": str(
                        request_path
                    ),
                    "recorded_at": utc_now_iso(),
                }

                logger.exception(
                    "Worker failed to process request. "
                    "file=%s",
                    request_path.name,
                )

            finally:
                self.last_job_completed_at = (
                    utc_now_iso()
                )

                self.current_job_file = None

            return True

        finally:
            self.processing_lock.release()

    def get_status(
        self,
    ) -> dict[str, Any]:
        """
        Return current worker state.
        """

        return {
            "running": self.is_running,
            "started_at": self.started_at,
            "last_poll_at": self.last_poll_at,
            "current_job_file": (
                self.current_job_file
            ),
            "last_job_started_at": (
                self.last_job_started_at
            ),
            "last_job_completed_at": (
                self.last_job_completed_at
            ),
            "processed_job_count": (
                self.processed_job_count
            ),
            "failed_job_count": (
                self.failed_job_count
            ),
            "last_result": self.last_result,
            "last_error": self.last_error,
        }


create_required_directories()

agent_worker = AgentWorker(
    poll_interval_seconds=(
        POLL_INTERVAL_SECONDS
    )
)


@asynccontextmanager
async def application_lifespan(
    app: FastAPI,
):
    """
    Start and stop the background worker with the FastAPI application.
    """

    logger.info(
        "Starting Email URL Sandbox VM Agent API."
    )

    agent_worker.start()

    try:
        yield

    finally:
        agent_worker.stop()

        logger.info(
            "Email URL Sandbox VM Agent API stopped."
        )


app = FastAPI(
    title="Email URL Sandbox VM Agent",
    description=(
        "VM-side URL analysis agent for the "
        "Email URL Sandbox project."
    ),
    version="2.0.0",
    lifespan=application_lifespan,
)


def count_json_files(
    directory: Path,
) -> int:
    """
    Count JSON files in a queue directory.
    """

    try:
        return sum(
            1
            for path in directory.glob(
                "*.json"
            )
            if path.is_file()
        )
    except OSError:
        return 0


def count_report_files() -> int:
    """
    Count final report.json files.
    """

    try:
        return sum(
            1
            for path in REPORTS_DIR.glob(
                "*/report.json"
            )
            if path.is_file()
        )
    except OSError:
        return 0


@app.get("/")
def root() -> dict[str, Any]:
    """
    Basic API information.
    """

    return {
        "service": (
            "Email URL Sandbox VM Agent"
        ),
        "version": "2.0.0",
        "status": "running",
        "worker_running": (
            agent_worker.is_running
        ),
        "timestamp": utc_now_iso(),
    }


@app.get("/health")
def health() -> dict[str, Any]:
    """
    Health endpoint used by the host backend.
    """

    worker_running = (
        agent_worker.is_running
    )

    health_status = (
        "healthy"
        if worker_running
        else "degraded"
    )

    return {
        "status": health_status,
        "service": "vm-agent",
        "version": "2.0.0",
        "worker_running": (
            worker_running
        ),
        "shared_root": str(
            SHARED_ROOT
        ),
        "timestamp": utc_now_iso(),
    }


@app.get("/worker/status")
def worker_status() -> dict[str, Any]:
    """
    Return detailed background-worker information.
    """

    return {
        "worker": (
            agent_worker.get_status()
        ),
        "timestamp": utc_now_iso(),
    }


@app.get("/queue/status")
def queue_status() -> dict[str, Any]:
    """
    Return shared-folder queue counts.
    """

    return {
        "input": {
            "path": str(INPUT_DIR),
            "pending_jobs": (
                count_json_files(
                    INPUT_DIR
                )
            ),
        },
        "processing": {
            "path": str(
                PROCESSING_DIR
            ),
            "active_jobs": (
                count_json_files(
                    PROCESSING_DIR
                )
            ),
        },
        "completed": {
            "path": str(
                COMPLETED_DIR
            ),
            "completed_jobs": (
                count_json_files(
                    COMPLETED_DIR
                )
            ),
        },
        "failed": {
            "path": str(
                FAILED_DIR
            ),
            "failed_request_files": (
                count_json_files(
                    FAILED_DIR
                )
            ),
        },
        "reports": {
            "path": str(
                REPORTS_DIR
            ),
            "report_count": (
                count_report_files()
            ),
        },
        "timestamp": utc_now_iso(),
    }


@app.post("/worker/process-next")
def process_next_job() -> dict[str, Any]:
    """
    Manually ask the worker to process the next pending job.

    This endpoint is intended for development and debugging.

    Normally, jobs are processed automatically by the worker loop.
    """

    if not agent_worker.is_running:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "The VM Agent worker is not running."
            ),
        )

    if agent_worker.current_job_file:
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "The VM Agent is already processing a job."
            ),
        )

    processed = (
        agent_worker.process_next_job()
    )

    if not processed:
        return {
            "processed": False,
            "message": (
                "No pending jobs were found."
            ),
            "timestamp": utc_now_iso(),
        }

    return {
        "processed": True,
        "result": (
            agent_worker.last_result
        ),
        "timestamp": utc_now_iso(),
    }


@app.get("/reports/{session_id}")
def get_report_status(
    session_id: str,
) -> dict[str, Any]:
    """
    Check whether a final report exists for a session.

    This endpoint returns report metadata, not the full report body.
    The host backend should read the report from the shared reports
    directory.
    """

    try:
        paths = (
            agent_worker
            .job_manager
            .session_manager
            .get_session_paths(
                session_id
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc

    report_exists = (
        paths.report_file.is_file()
    )

    return {
        "session_id": session_id,
        "report_ready": report_exists,
        "report_path": (
            str(paths.report_file)
            if report_exists
            else None
        ),
        "timestamp": utc_now_iso(),
    }