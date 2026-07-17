"""
Browser console and page-error collector.
"""

from datetime import datetime, timezone
from typing import Any

from playwright.sync_api import ConsoleMessage, Error, Page


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


class ConsoleCollector:
    """
    Captures:

    - console.log
    - console.warning
    - console.error
    - console.debug
    - uncaught JavaScript page errors
    """

    def __init__(self) -> None:
        self.messages: list[dict[str, Any]] = []
        self.page_errors: list[dict[str, Any]] = []
        self._page: Page | None = None
        self._attached = False

    def attach(
        self,
        page: Page,
    ) -> "ConsoleCollector":
        """
        Attach event listeners to a Playwright page.
        """

        if self._attached:
            return self

        self._page = page

        page.on(
            "console",
            self._handle_console_message,
        )

        page.on(
            "pageerror",
            self._handle_page_error,
        )

        self._attached = True

        return self

    def _handle_console_message(
        self,
        message: ConsoleMessage,
    ) -> None:
        """
        Handle one browser console event.
        """

        location: dict[str, Any] = {}

        try:
            location = message.location
        except Exception:
            location = {}

        try:
            message_type = message.type
        except Exception:
            message_type = "unknown"

        try:
            message_text = message.text
        except Exception:
            message_text = ""

        self.messages.append(
            {
                "timestamp": utc_now_iso(),
                "type": message_type,
                "text": message_text,
                "location": location,
            }
        )

    def _handle_page_error(
        self,
        error: Error,
    ) -> None:
        """
        Handle an uncaught JavaScript error.
        """

        self.page_errors.append(
            {
                "timestamp": utc_now_iso(),
                "name": getattr(
                    error,
                    "name",
                    type(error).__name__,
                ),
                "message": getattr(
                    error,
                    "message",
                    str(error),
                ),
                "stack": getattr(
                    error,
                    "stack",
                    None,
                ),
            }
        )

    def get_data(self) -> dict[str, Any]:
        """
        Return all collected console evidence.
        """

        return {
            "collected_at": utc_now_iso(),
            "message_count": len(
                self.messages
            ),
            "page_error_count": len(
                self.page_errors
            ),
            "messages": list(
                self.messages
            ),
            "page_errors": list(
                self.page_errors
            ),
        }


def create_console_collector(
    page: Page,
) -> ConsoleCollector:
    """
    Create and attach a console collector.

    Browser Service usage:

        console_collector = create_console_collector(page)

        ...

        console_data = console_collector.get_data()
    """

    return ConsoleCollector().attach(page)