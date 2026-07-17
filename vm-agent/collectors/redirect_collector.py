"""
Navigation and redirect collector.

Captures:

- HTTP redirect responses
- Main-frame navigations
- Final redirect chain
"""

from datetime import datetime, timezone
from typing import Any

from playwright.sync_api import (
    Frame,
    Page,
    Request,
    Response,
)


REDIRECT_STATUS_CODES = {
    300,
    301,
    302,
    303,
    304,
    305,
    307,
    308,
}


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


class RedirectCollector:
    """
    Collects redirect and navigation evidence.
    """

    def __init__(
        self,
        maximum_redirects: int = 20,
    ) -> None:
        self.maximum_redirects = (
            maximum_redirects
        )

        self.redirects: list[
            dict[str, Any]
        ] = []

        self.frame_navigations: list[
            dict[str, Any]
        ] = []

        self.redirect_limit_exceeded = False

        self._page: Page | None = None
        self._attached = False

    def attach(
        self,
        page: Page,
    ) -> "RedirectCollector":
        """
        Attach redirect listeners.
        """

        if self._attached:
            return self

        self._page = page

        page.on(
            "response",
            self._handle_response,
        )

        page.on(
            "framenavigated",
            self._handle_frame_navigation,
        )

        self._attached = True

        return self

    def _handle_response(
        self,
        response: Response,
    ) -> None:
        """
        Capture HTTP redirect responses.
        """

        try:
            status = response.status
        except Exception:
            return

        if status not in REDIRECT_STATUS_CODES:
            return

        request: Request = response.request

        try:
            headers = response.all_headers()
        except Exception:
            headers = {}

        location = headers.get("location")

        redirect_record = {
            "timestamp": utc_now_iso(),
            "source_url": response.url,
            "status": status,
            "location": location,
            "request_method": request.method,
        }

        self.redirects.append(
            redirect_record
        )

        if (
            len(self.redirects)
            > self.maximum_redirects
        ):
            self.redirect_limit_exceeded = True

    def _handle_frame_navigation(
        self,
        frame: Frame,
    ) -> None:
        """
        Record main-frame URL changes.

        Subframe navigations are ignored to prevent iframe traffic from
        being mistaken for the primary redirect chain.
        """

        if self._page is None:
            return

        try:
            if frame != self._page.main_frame:
                return
        except Exception:
            return

        try:
            frame_url = frame.url
        except Exception:
            frame_url = None

        self.frame_navigations.append(
            {
                "timestamp": utc_now_iso(),
                "url": frame_url,
            }
        )

    def get_data(self) -> dict[str, Any]:
        """
        Return redirect evidence.
        """

        final_url: str | None = None

        if self.frame_navigations:
            final_url = (
                self.frame_navigations[-1]
                .get("url")
            )

        return {
            "collected_at": utc_now_iso(),
            "redirect_count": len(
                self.redirects
            ),
            "navigation_count": len(
                self.frame_navigations
            ),
            "maximum_redirects": (
                self.maximum_redirects
            ),
            "redirect_limit_exceeded": (
                self.redirect_limit_exceeded
            ),
            "redirects": list(
                self.redirects
            ),
            "main_frame_navigations": list(
                self.frame_navigations
            ),
            "final_url": final_url,
        }


def create_redirect_collector(
    page: Page,
    maximum_redirects: int = 20,
) -> RedirectCollector:
    """
    Create and attach a redirect collector.

    Browser Service usage:

        redirect_collector = create_redirect_collector(
            page,
            maximum_redirects=MAX_REDIRECTS,
        )

        ...

        redirect_data = redirect_collector.get_data()
    """

    return RedirectCollector(
        maximum_redirects=maximum_redirects
    ).attach(page)