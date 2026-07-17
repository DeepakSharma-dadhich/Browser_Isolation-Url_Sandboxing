"""
Session directory and session-status management.

A session represents one URL analysis job.

Raw evidence is stored under:

    shared/output/<session_id>/

Screenshots are stored under:

    shared/screenshots/<session_id>/

The final authoritative report will later be stored at:

    shared/reports/<session_id>/report.json
"""

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config import (
    OUTPUT_DIR,
    REPORTS_DIR,
    SCREENSHOTS_DIR,
    create_required_directories,
)
from utils.json_utils import write_json_atomic


SESSION_ID_PATTERN = re.compile(
    r"^[A-Za-z0-9_-]{8,100}$"
)


class SessionError(Exception):
    """
    Raised when a session cannot be created or managed.
    """


def utc_now_iso() -> str:
    """
    Return the current UTC time in ISO-8601 format.
    """

    return datetime.now(
        timezone.utc
    ).isoformat()


@dataclass(frozen=True)
class SessionPaths:
    """
    Stores all directories and important files for one session.
    """

    session_id: str

    output_dir: Path
    screenshots_dir: Path
    report_dir: Path

    html_dir: Path
    cookies_dir: Path
    network_dir: Path
    console_dir: Path
    redirects_dir: Path
    downloads_dir: Path
    metadata_dir: Path
    errors_dir: Path

    status_file: Path
    request_snapshot_file: Path
    report_file: Path


class SessionManager:
    """
    Creates and manages URL-analysis session directories.
    """

    def __init__(self) -> None:
        create_required_directories()

    @staticmethod
    def validate_session_id(
        session_id: str,
    ) -> str:
        """
        Validate and normalize a session ID.

        Allowed characters:

        - A-Z
        - a-z
        - 0-9
        - underscore
        - hyphen

        Length:
            8 to 100 characters
        """

        if not isinstance(
            session_id,
            str,
        ):
            raise SessionError(
                "session_id must be a string."
            )

        normalized_session_id = (
            session_id.strip()
        )

        if not normalized_session_id:
            raise SessionError(
                "session_id cannot be empty."
            )

        if not SESSION_ID_PATTERN.fullmatch(
            normalized_session_id
        ):
            raise SessionError(
                "session_id must contain only letters, numbers, "
                "underscores and hyphens, with a length between "
                "8 and 100 characters."
            )

        return normalized_session_id

    def get_session_paths(
        self,
        session_id: str,
    ) -> SessionPaths:
        """
        Build all paths used by one session.

        This method does not create the directories.
        """

        session_id = self.validate_session_id(
            session_id
        )

        output_dir = (
            OUTPUT_DIR / session_id
        )

        screenshots_dir = (
            SCREENSHOTS_DIR / session_id
        )

        report_dir = (
            REPORTS_DIR / session_id
        )

        return SessionPaths(
            session_id=session_id,

            output_dir=output_dir,
            screenshots_dir=screenshots_dir,
            report_dir=report_dir,

            html_dir=output_dir / "html",
            cookies_dir=output_dir / "cookies",
            network_dir=output_dir / "network",
            console_dir=output_dir / "console",
            redirects_dir=output_dir / "redirects",
            downloads_dir=output_dir / "downloads",
            metadata_dir=output_dir / "metadata",
            errors_dir=output_dir / "errors",

            status_file=output_dir / "status.json",

            request_snapshot_file=(
                output_dir / "request.json"
            ),

            report_file=(
                report_dir / "report.json"
            ),
        )

    def create_session(
        self,
        session_id: str,
    ) -> SessionPaths:
        """
        Create all directories required for one analysis session.

        Safe to call multiple times.
        Existing evidence is not deleted.
        """

        paths = self.get_session_paths(
            session_id
        )

        directories = (
            paths.output_dir,
            paths.screenshots_dir,
            paths.report_dir,
            paths.html_dir,
            paths.cookies_dir,
            paths.network_dir,
            paths.console_dir,
            paths.redirects_dir,
            paths.downloads_dir,
            paths.metadata_dir,
            paths.errors_dir,
        )

        try:
            for directory in directories:
                directory.mkdir(
                    parents=True,
                    exist_ok=True,
                )

        except OSError as exc:
            raise SessionError(
                f"Unable to create session directories for "
                f"{paths.session_id}: {exc}"
            ) from exc

        self.write_status(
            paths=paths,
            status="created",
            additional_data={
                "created_at": utc_now_iso(),
            },
        )

        return paths

    def write_status(
        self,
        paths: SessionPaths,
        status: str,
        additional_data: dict[str, Any] | None = None,
    ) -> Path:
        """
        Write the current session execution status.

        Example states used later:

        - created
        - queued
        - running
        - analyzing
        - completed
        - failed
        """

        if not isinstance(status, str):
            raise SessionError(
                "Session status must be a string."
            )

        normalized_status = status.strip().lower()

        if not normalized_status:
            raise SessionError(
                "Session status cannot be empty."
            )

        status_data: dict[str, Any] = {
            "session_id": paths.session_id,
            "status": normalized_status,
            "updated_at": utc_now_iso(),
        }

        if additional_data:
            status_data.update(
                additional_data
            )

        try:
            return write_json_atomic(
                paths.status_file,
                status_data,
            )

        except Exception as exc:
            raise SessionError(
                f"Unable to write session status for "
                f"{paths.session_id}: {exc}"
            ) from exc

    def save_request_snapshot(
        self,
        paths: SessionPaths,
        request_data: dict[str, Any],
    ) -> Path:
        """
        Save the exact request associated with the session.

        This is evidence and debugging information.
        It is not another final report.
        """

        if not isinstance(
            request_data,
            dict,
        ):
            raise SessionError(
                "request_data must be a dictionary."
            )

        snapshot_data = {
            **request_data,
            "snapshot_created_at": utc_now_iso(),
        }

        try:
            return write_json_atomic(
                paths.request_snapshot_file,
                snapshot_data,
            )

        except Exception as exc:
            raise SessionError(
                f"Unable to save request snapshot for "
                f"{paths.session_id}: {exc}"
            ) from exc

    def record_error(
        self,
        paths: SessionPaths,
        error_name: str,
        error_data: dict[str, Any],
    ) -> Path:
        """
        Save structured error evidence inside the session error folder.
        """

        if not isinstance(
            error_name,
            str,
        ):
            raise SessionError(
                "error_name must be a string."
            )

        safe_error_name = re.sub(
            r"[^A-Za-z0-9_-]",
            "_",
            error_name.strip(),
        )

        if not safe_error_name:
            safe_error_name = "unknown_error"

        if not isinstance(
            error_data,
            dict,
        ):
            raise SessionError(
                "error_data must be a dictionary."
            )

        error_file = (
            paths.errors_dir
            / f"{safe_error_name}.json"
        )

        structured_error = {
            "session_id": paths.session_id,
            "error_name": safe_error_name,
            "recorded_at": utc_now_iso(),
            "details": error_data,
        }

        try:
            return write_json_atomic(
                error_file,
                structured_error,
            )

        except Exception as exc:
            raise SessionError(
                f"Unable to record error for "
                f"{paths.session_id}: {exc}"
            ) from exc