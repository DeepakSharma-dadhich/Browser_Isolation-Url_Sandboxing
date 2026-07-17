"""
Safe JSON reading and writing utilities.

The final report and important status files are written atomically.

Atomic writing prevents another process from reading a partially
written JSON file.
"""

import json
import os
from pathlib import Path
from typing import Any


class JSONFileError(Exception):
    """
    Raised when a JSON file cannot be safely read or written.
    """


def read_json_file(
    file_path: Path,
    *,
    max_size_bytes: int | None = None,
) -> Any:
    """
    Read and parse a JSON file.

    Args:
        file_path:
            Path of the JSON file.

        max_size_bytes:
            Optional maximum allowed file size.

    Returns:
        Parsed JSON content.

    Raises:
        JSONFileError:
            If the file is missing, empty, too large, unreadable,
            or contains invalid JSON.
    """

    file_path = Path(file_path)

    if not file_path.exists():
        raise JSONFileError(
            f"JSON file does not exist: {file_path}"
        )

    if not file_path.is_file():
        raise JSONFileError(
            f"JSON path is not a file: {file_path}"
        )

    try:
        file_size = file_path.stat().st_size
    except OSError as exc:
        raise JSONFileError(
            f"Unable to inspect JSON file: {file_path}"
        ) from exc

    if file_size == 0:
        raise JSONFileError(
            f"JSON file is empty: {file_path}"
        )

    if (
        max_size_bytes is not None
        and file_size > max_size_bytes
    ):
        raise JSONFileError(
            f"JSON file exceeds the maximum allowed size of "
            f"{max_size_bytes} bytes: {file_path}"
        )

    try:
        with file_path.open(
            "r",
            encoding="utf-8-sig",
        ) as json_file:
            return json.load(json_file)

    except json.JSONDecodeError as exc:
        raise JSONFileError(
            f"Invalid JSON in {file_path}: {exc}"
        ) from exc

    except UnicodeDecodeError as exc:
        raise JSONFileError(
            f"Unable to decode JSON file as UTF-8: {file_path}"
        ) from exc

    except OSError as exc:
        raise JSONFileError(
            f"Unable to read JSON file: {file_path}"
        ) from exc


def write_json_atomic(
    file_path: Path,
    data: Any,
    *,
    indent: int = 2,
) -> Path:
    """
    Write JSON using a temporary file and atomic rename.

    Process:

        1. Write complete JSON to file.tmp
        2. Flush the data
        3. Rename file.tmp to the final destination

    This prevents readers from seeing incomplete JSON.

    Args:
        file_path:
            Final JSON file destination.

        data:
            JSON-serializable data.

        indent:
            JSON indentation level.

    Returns:
        Final file path.

    Raises:
        JSONFileError:
            If the file cannot be written.
    """

    file_path = Path(file_path)

    file_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_path = file_path.with_name(
        f"{file_path.name}.tmp"
    )

    try:
        with temporary_path.open(
            "w",
            encoding="utf-8",
        ) as json_file:
            json.dump(
                data,
                json_file,
                indent=indent,
                ensure_ascii=False,
                default=str,
            )

            json_file.flush()
            os.fsync(json_file.fileno())

        os.replace(
            temporary_path,
            file_path,
        )

        return file_path

    except (OSError, TypeError, ValueError) as exc:
        try:
            if temporary_path.exists():
                temporary_path.unlink()
        except OSError:
            pass

        raise JSONFileError(
            f"Unable to write JSON file: {file_path}"
        ) from exc