"""
Final rendered HTML source collector.
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from playwright.sync_api import Page


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def save_html_source(
    page: Page,
    html_dir: Path,
    filename: str = "page.html",
    maximum_size_bytes: int = 10 * 1024 * 1024,
) -> dict[str, Any]:
    """
    Save the final rendered HTML source.

    Args:
        page:
            Active Playwright page.

        html_dir:
            Session HTML evidence directory.

        filename:
            HTML evidence filename.

        maximum_size_bytes:
            Maximum HTML size stored by this collector.

    Returns:
        HTML evidence metadata.
    """

    html_dir = Path(
        html_dir
    )

    html_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    html_path = (
        html_dir / filename
    )

    result: dict[str, Any] = {
        "collected_at": utc_now_iso(),
        "saved": False,
        "path": str(html_path),
        "size_bytes": 0,
        "truncated": False,
        "error": None,
    }

    try:
        html_content = page.content()

        encoded_content = html_content.encode(
            "utf-8",
            errors="replace",
        )

        if (
            len(encoded_content)
            > maximum_size_bytes
        ):
            encoded_content = (
                encoded_content[
                    :maximum_size_bytes
                ]
            )

            result["truncated"] = True

        html_path.write_bytes(
            encoded_content
        )

        result["saved"] = True
        result["size_bytes"] = len(
            encoded_content
        )

    except Exception as exc:
        result["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
        }

    return result