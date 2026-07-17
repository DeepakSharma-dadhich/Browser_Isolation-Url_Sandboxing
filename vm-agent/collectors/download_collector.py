"""
Browser download collector.

Captures download attempts and saves files inside the session download
directory.
"""

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from playwright.sync_api import (
    Download,
    Page,
)


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def sanitize_filename(
    filename: str,
) -> str:
    """
    Remove path separators and unsafe filename characters.
    """

    filename = Path(
        filename
    ).name

    sanitized = re.sub(
        r"[^A-Za-z0-9._-]",
        "_",
        filename,
    )

    sanitized = sanitized.strip(
        "._"
    )

    if not sanitized:
        sanitized = "download.bin"

    return sanitized[:200]


def unique_download_path(
    downloads_dir: Path,
    filename: str,
) -> Path:
    """
    Create a non-conflicting download destination.
    """

    destination = (
        downloads_dir / filename
    )

    if not destination.exists():
        return destination

    stem = destination.stem
    suffix = destination.suffix

    counter = 1

    while True:
        candidate = (
            downloads_dir
            / f"{stem}_{counter}{suffix}"
        )

        if not candidate.exists():
            return candidate

        counter += 1


class DownloadCollector:
    """
    Captures and saves browser downloads.
    """

    def __init__(
        self,
        downloads_dir: Path,
    ) -> None:
        self.downloads_dir = Path(
            downloads_dir
        )

        self.downloads_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.downloads: list[
            dict[str, Any]
        ] = []

        self._page: Page | None = None
        self._attached = False

    def attach(
        self,
        page: Page,
    ) -> "DownloadCollector":
        """
        Attach the download event listener.
        """

        if self._attached:
            return self

        self._page = page

        page.on(
            "download",
            self._handle_download,
        )

        self._attached = True

        return self

    def _handle_download(
        self,
        download: Download,
    ) -> None:
        """
        Save one browser download and record its details.
        """

        suggested_filename: str

        try:
            suggested_filename = (
                download.suggested_filename
            )
        except Exception:
            suggested_filename = (
                "download.bin"
            )

        safe_filename = sanitize_filename(
            suggested_filename
        )

        destination = unique_download_path(
            self.downloads_dir,
            safe_filename,
        )

        record: dict[str, Any] = {
            "timestamp": utc_now_iso(),
            "url": None,
            "suggested_filename": (
                suggested_filename
            ),
            "saved_filename": (
                destination.name
            ),
            "saved_path": str(
                destination
            ),
            "saved": False,
            "failure": None,
            "size_bytes": None,
        }

        try:
            record["url"] = download.url
        except Exception:
            record["url"] = None

        try:
            download.save_as(
                str(destination)
            )

            record["saved"] = True

            if destination.exists():
                record["size_bytes"] = (
                    destination.stat().st_size
                )

        except Exception as exc:
            record["failure"] = {
                "type": type(exc).__name__,
                "message": str(exc),
            }

        self.downloads.append(
            record
        )

    def get_data(self) -> dict[str, Any]:
        """
        Return all download evidence.
        """

        successful_downloads = [
            item
            for item in self.downloads
            if item.get("saved")
        ]

        failed_downloads = [
            item
            for item in self.downloads
            if not item.get("saved")
        ]

        return {
            "collected_at": utc_now_iso(),
            "download_attempt_count": len(
                self.downloads
            ),
            "successful_download_count": len(
                successful_downloads
            ),
            "failed_download_count": len(
                failed_downloads
            ),
            "downloads": list(
                self.downloads
            ),
        }


def create_download_collector(
    page: Page,
    downloads_dir: Path,
) -> DownloadCollector:
    """
    Create and attach a download collector.

    Browser Service usage:

        download_collector = create_download_collector(
            page,
            session_paths.downloads_dir,
        )

        ...

        download_data = download_collector.get_data()
    """

    return DownloadCollector(
        downloads_dir=downloads_dir
    ).attach(page)