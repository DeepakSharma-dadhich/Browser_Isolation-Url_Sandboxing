"""
VM Agent job lifecycle manager.

Lifecycle:

    shared/input/
        ↓
    shared/processing/
        ↓
    browser_controller.analyze_url()
        ↓
    shared/completed/

Failure:

    shared/failed/

The Job Manager does not launch Playwright directly.
Browser execution is delegated to browser_controller.py.
"""

from __future__ import annotations

import os
import shutil
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from browser_controller import analyze_url

from config import (
    COMPLETED_DIR,
    FAILED_DIR,
    FILE_STABILITY_DELAY_SECONDS,
    INPUT_DIR,
    MAX_REQUEST_SIZE_BYTES,
    PROCESSING_DIR,
)

from models.job_request import (
    JobRequest,
    JobRequestError,
)

from session_manager import (
    SessionManager,
    SessionPaths,
)

from utils.json_utils import (
    JSONFileError,
    read_json_file,
    write_json_atomic,
)

from utils.logging_utils import configure_logging


logger = configure_logging(
    "vm_agent.services.job_manager"
)


def utc_now_iso() -> str:
    """
    Return current UTC time in ISO-8601 format.
    """

    return datetime.now(
        timezone.utc
    ).isoformat()


class JobManagerError(Exception):
    """
    Raised when a job lifecycle operation fails.
    """


class JobManager:
    """
    Claims, validates, executes and archives URL-analysis jobs.
    """

    def __init__(self) -> None:
        self.session_manager = SessionManager()

        for directory in (
            INPUT_DIR,
            PROCESSING_DIR,
            COMPLETED_DIR,
            FAILED_DIR,
        ):
            directory.mkdir(
                parents=True,
                exist_ok=True,
            )

    def get_pending_jobs(self) -> list[Path]:
        """
        Return stable request JSON files ordered by modification time.
        """

        pending_files = [
            path
            for path in INPUT_DIR.glob("*.json")
            if path.is_file()
        ]

        pending_files.sort(
            key=lambda path: path.stat().st_mtime
        )

        stable_files: list[Path] = []

        for request_path in pending_files:
            if self.is_file_stable(request_path):
                stable_files.append(request_path)

        return stable_files

    def is_file_stable(
        self,
        file_path: Path,
    ) -> bool:
        """
        Verify that the host has finished writing the request.

        A request is stable only when:

        - It exists
        - It is not empty
        - Its size does not change
        - Its modification timestamp does not change
        """

        try:
            first_state = file_path.stat()

            if first_state.st_size <= 0:
                return False

            time.sleep(
                FILE_STABILITY_DELAY_SECONDS
            )

            second_state = file_path.stat()

            if second_state.st_size <= 0:
                return False

            return (
                first_state.st_size
                == second_state.st_size
                and first_state.st_mtime_ns
                == second_state.st_mtime_ns
            )

        except FileNotFoundError:
            return False

        except OSError as exc:
            logger.warning(
                "Unable to check request stability. "
                "file=%s error=%s",
                file_path,
                exc,
            )

            return False

    def claim_job(
        self,
        request_path: Path,
    ) -> Path:
        """
        Atomically move a request from input to processing.

        Atomic movement prevents two VM Agent processes from claiming
        the same request.
        """

        request_path = Path(request_path)

        processing_path = (
            PROCESSING_DIR
            / request_path.name
        )

        if processing_path.exists():
            processing_path = (
                PROCESSING_DIR
                / (
                    f"{request_path.stem}_"
                    f"{int(time.time() * 1000)}"
                    f"{request_path.suffix}"
                )
            )

        try:
            os.replace(
                request_path,
                processing_path,
            )

        except FileNotFoundError as exc:
            raise JobManagerError(
                f"Request was already claimed or removed: "
                f"{request_path.name}"
            ) from exc

        except OSError as exc:
            raise JobManagerError(
                f"Unable to claim request "
                f"{request_path.name}: {exc}"
            ) from exc

        return processing_path

    def load_job(
        self,
        processing_path: Path,
    ) -> JobRequest:
        """
        Read and validate one claimed request.
        """

        try:
            payload = read_json_file(
                processing_path,
                max_size_bytes=(
                    MAX_REQUEST_SIZE_BYTES
                ),
            )

        except JSONFileError as exc:
            raise JobRequestError(
                str(exc)
            ) from exc

        return JobRequest.from_dict(
            payload
        )

    def process_job(
        self,
        request_path: Path,
    ) -> dict[str, Any]:
        """
        Process one input request.

        Returns a structured job result for logging and future API use.
        """

        processing_path: Path | None = None
        job: JobRequest | None = None
        paths: SessionPaths | None = None

        started_at = utc_now_iso()

        try:
            processing_path = self.claim_job(
                request_path
            )

            logger.info(
                "Job claimed. file=%s",
                processing_path.name,
            )

            job = self.load_job(
                processing_path
            )

            logger.info(
                "Job validated. "
                "session_id=%s url=%s",
                job.session_id,
                job.url,
            )

            if self.report_exists(
                job.session_id
            ):
                logger.warning(
                    "Duplicate completed job detected. "
                    "session_id=%s",
                    job.session_id,
                )

                completed_path = (
                    self.archive_completed(
                        processing_path,
                        suffix="_duplicate",
                    )
                )

                return {
                    "session_id": (
                        job.session_id
                    ),
                    "status": "duplicate",
                    "request_file": str(
                        completed_path
                    ),
                    "report_path": str(
                        self.session_manager
                        .get_session_paths(
                            job.session_id
                        )
                        .report_file
                    ),
                }

            paths = (
                self.session_manager
                .create_session(
                    job.session_id
                )
            )

            self.session_manager.save_request_snapshot(
                paths=paths,
                request_data=job.to_dict(),
            )

            self.session_manager.write_status(
                paths=paths,
                status="queued",
                additional_data={
                    "source": job.source,
                    "request_file": str(
                        processing_path
                    ),
                    "job_started_at": (
                        started_at
                    ),
                },
            )

            result = analyze_url(
                url=job.url,
                session_path=paths,
                session_id=job.session_id,
            )

            report_path = result.get(
                "report_path"
            )

            if not report_path:
                raise JobManagerError(
                    "Browser pipeline completed without "
                    "creating report.json."
                )

            completed_path = (
                self.archive_completed(
                    processing_path
                )
            )

            logger.info(
                "Job completed. "
                "session_id=%s report=%s",
                job.session_id,
                report_path,
            )

            return {
                "session_id": (
                    job.session_id
                ),
                "status": "completed",
                "request_file": str(
                    completed_path
                ),
                "report_path": report_path,
                "verdict": result.get(
                    "decision",
                    {},
                ).get(
                    "verdict"
                ),
            }

        except JobRequestError as exc:
            logger.warning(
                "Job validation failed. "
                "file=%s error=%s",
                (
                    processing_path.name
                    if processing_path
                    else request_path.name
                ),
                exc,
            )

            failed_request = (
                processing_path
                or request_path
            )

            failed_path = (
                self.archive_failed(
                    failed_request,
                    failure_type=(
                        "validation_error"
                    ),
                    error=exc,
                    job=job,
                )
            )

            return {
                "session_id": (
                    job.session_id
                    if job
                    else None
                ),
                "status": "rejected",
                "request_file": str(
                    failed_path
                ),
                "error": str(exc),
            }

        except Exception as exc:
            logger.exception(
                "Job execution failed. "
                "file=%s",
                (
                    processing_path.name
                    if processing_path
                    else request_path.name
                ),
            )

            if (
                paths is not None
                and job is not None
            ):
                try:
                    self.session_manager.record_error(
                        paths=paths,
                        error_name="job_error",
                        error_data={
                            "type": type(
                                exc
                            ).__name__,
                            "message": str(
                                exc
                            ),
                            "traceback": (
                                traceback.format_exc()
                            ),
                        },
                    )

                    self.session_manager.write_status(
                        paths=paths,
                        status="failed",
                        additional_data={
                            "error": str(exc),
                        },
                    )

                except Exception:
                    logger.exception(
                        "Unable to save session failure details."
                    )

            failed_request = (
                processing_path
                or request_path
            )

            failed_path = (
                self.archive_failed(
                    failed_request,
                    failure_type=(
                        "execution_error"
                    ),
                    error=exc,
                    job=job,
                )
            )

            return {
                "session_id": (
                    job.session_id
                    if job
                    else None
                ),
                "status": "failed",
                "request_file": str(
                    failed_path
                ),
                "error": str(exc),
            }

    def report_exists(
        self,
        session_id: str,
    ) -> bool:
        """
        Return True if the authoritative report already exists.
        """

        report_path = (
            self.session_manager
            .get_session_paths(
                session_id
            )
            .report_file
        )

        return report_path.is_file()

    def archive_completed(
        self,
        processing_path: Path,
        *,
        suffix: str = "",
    ) -> Path:
        """
        Move a successfully processed request to completed.
        """

        destination = (
            COMPLETED_DIR
            / (
                f"{processing_path.stem}"
                f"{suffix}"
                f"{processing_path.suffix}"
            )
        )

        destination = self.create_unique_path(
            destination
        )

        return self.move_file(
            processing_path,
            destination,
        )

    def archive_failed(
        self,
        request_path: Path,
        *,
        failure_type: str,
        error: Exception,
        job: JobRequest | None,
    ) -> Path:
        """
        Move a failed request and create an accompanying error file.
        """

        timestamp = datetime.now(
            timezone.utc
        ).strftime(
            "%Y%m%dT%H%M%S%fZ"
        )

        destination = (
            FAILED_DIR
            / (
                f"{request_path.stem}"
                f"_failed_{timestamp}"
                f"{request_path.suffix}"
            )
        )

        failed_path = self.move_file(
            request_path,
            destination,
        )

        error_file = failed_path.with_name(
            f"{failed_path.stem}.error.json"
        )

        write_json_atomic(
            error_file,
            {
                "failure_type": (
                    failure_type
                ),
                "failed_at": utc_now_iso(),
                "error": {
                    "type": type(
                        error
                    ).__name__,
                    "message": str(
                        error
                    ),
                },
                "session_id": (
                    job.session_id
                    if job
                    else None
                ),
                "url": (
                    job.url
                    if job
                    else None
                ),
                "original_request_file": (
                    request_path.name
                ),
            },
        )

        return failed_path

    def recover_interrupted_jobs(
        self,
    ) -> None:
        """
        Recover requests left in processing after VM Agent interruption.

        If a final report already exists, the request is archived as
        completed. Otherwise, it is returned to the input queue.
        """

        interrupted_files = list(
            PROCESSING_DIR.glob(
                "*.json"
            )
        )

        if not interrupted_files:
            return

        logger.warning(
            "Found %s interrupted job(s).",
            len(interrupted_files),
        )

        for processing_path in interrupted_files:
            try:
                job = self.load_job(
                    processing_path
                )

                if self.report_exists(
                    job.session_id
                ):
                    self.archive_completed(
                        processing_path,
                        suffix="_recovered",
                    )

                    logger.info(
                        "Recovered completed job. "
                        "session_id=%s",
                        job.session_id,
                    )

                    continue

                destination = (
                    INPUT_DIR
                    / processing_path.name
                )

                destination = (
                    self.create_unique_path(
                        destination
                    )
                )

                self.move_file(
                    processing_path,
                    destination,
                )

                logger.info(
                    "Returned interrupted job to input. "
                    "session_id=%s",
                    job.session_id,
                )

            except Exception as exc:
                logger.exception(
                    "Unable to recover processing job. "
                    "file=%s",
                    processing_path.name,
                )

                try:
                    self.archive_failed(
                        processing_path,
                        failure_type=(
                            "recovery_error"
                        ),
                        error=exc,
                        job=None,
                    )

                except Exception:
                    logger.exception(
                        "Unable to archive unrecoverable job."
                    )

    @staticmethod
    def create_unique_path(
        path: Path,
    ) -> Path:
        """
        Return a non-conflicting path.
        """

        if not path.exists():
            return path

        timestamp = int(
            time.time() * 1000
        )

        return path.with_name(
            f"{path.stem}_{timestamp}"
            f"{path.suffix}"
        )

    @staticmethod
    def move_file(
        source: Path,
        destination: Path,
    ) -> Path:
        """
        Move a file safely.

        os.replace is attempted first.
        shutil.move is used when source and destination are on
        different file systems.
        """

        destination.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        try:
            os.replace(
                source,
                destination,
            )

        except OSError:
            shutil.move(
                str(source),
                str(destination),
            )

        return destination