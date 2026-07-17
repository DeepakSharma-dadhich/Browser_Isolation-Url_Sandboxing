"""
Browser network activity collector.

Captures requests, responses and request failures.
"""

from datetime import datetime, timezone
from typing import Any

from playwright.sync_api import (
    Page,
    Request,
    Response,
)


def utc_now_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def safe_request_headers(
    request: Request,
) -> dict[str, str]:
    try:
        return request.all_headers()
    except Exception:
        return {}


def safe_response_headers(
    response: Response,
) -> dict[str, str]:
    try:
        return response.all_headers()
    except Exception:
        return {}


def safe_post_data(
    request: Request,
) -> str | None:
    """
    Return request post data when available.

    A size limit is applied because request bodies can become large.
    """

    try:
        post_data = request.post_data
    except Exception:
        return None

    if post_data is None:
        return None

    maximum_length = 10_000

    if len(post_data) > maximum_length:
        return (
            post_data[:maximum_length]
            + "...[truncated]"
        )

    return post_data


class NetworkCollector:
    """
    Collects browser network evidence in memory.
    """

    def __init__(self) -> None:
        self.requests: list[dict[str, Any]] = []
        self.responses: list[dict[str, Any]] = []
        self.failed_requests: list[
            dict[str, Any]
        ] = []

        self._page: Page | None = None
        self._attached = False

    def attach(
        self,
        page: Page,
    ) -> "NetworkCollector":
        """
        Attach network listeners to the page.
        """

        if self._attached:
            return self

        self._page = page

        page.on(
            "request",
            self._handle_request,
        )

        page.on(
            "response",
            self._handle_response,
        )

        page.on(
            "requestfailed",
            self._handle_request_failed,
        )

        self._attached = True

        return self

    def _handle_request(
        self,
        request: Request,
    ) -> None:
        """
        Record an outgoing request.
        """

        redirected_from_url: str | None = None

        try:
            if request.redirected_from:
                redirected_from_url = (
                    request.redirected_from.url
                )
        except Exception:
            redirected_from_url = None

        try:
            is_navigation_request = (
                request.is_navigation_request()
            )
        except Exception:
            is_navigation_request = False

        self.requests.append(
            {
                "timestamp": utc_now_iso(),
                "url": request.url,
                "method": request.method,
                "resource_type": (
                    request.resource_type
                ),
                "is_navigation_request": (
                    is_navigation_request
                ),
                "frame_url": self._safe_frame_url(
                    request
                ),
                "redirected_from": (
                    redirected_from_url
                ),
                "headers": safe_request_headers(
                    request
                ),
                "post_data": safe_post_data(
                    request
                ),
            }
        )

    def _handle_response(
        self,
        response: Response,
    ) -> None:
        """
        Record an incoming response.
        """

        request = response.request

        try:
            from_service_worker = (
                response.from_service_worker
            )
        except Exception:
            from_service_worker = False

        self.responses.append(
            {
                "timestamp": utc_now_iso(),
                "url": response.url,
                "status": response.status,
                "status_text": (
                    response.status_text
                ),
                "request_method": (
                    request.method
                ),
                "resource_type": (
                    request.resource_type
                ),
                "headers": safe_response_headers(
                    response
                ),
                "from_service_worker": (
                    from_service_worker
                ),
            }
        )

    def _handle_request_failed(
        self,
        request: Request,
    ) -> None:
        """
        Record a failed request.
        """

        failure_text: str | None

        try:
            failure_text = request.failure
        except Exception:
            failure_text = None

        self.failed_requests.append(
            {
                "timestamp": utc_now_iso(),
                "url": request.url,
                "method": request.method,
                "resource_type": (
                    request.resource_type
                ),
                "failure": failure_text,
            }
        )

    @staticmethod
    def _safe_frame_url(
        request: Request,
    ) -> str | None:
        try:
            return request.frame.url
        except Exception:
            return None

    def get_data(self) -> dict[str, Any]:
        """
        Return all collected network evidence.
        """

        return {
            "collected_at": utc_now_iso(),
            "request_count": len(
                self.requests
            ),
            "response_count": len(
                self.responses
            ),
            "failed_request_count": len(
                self.failed_requests
            ),
            "requests": list(
                self.requests
            ),
            "responses": list(
                self.responses
            ),
            "failed_requests": list(
                self.failed_requests
            ),
        }


def create_network_collector(
    page: Page,
) -> NetworkCollector:
    """
    Create and attach a network collector.

    Browser Service usage:

        network_collector = create_network_collector(page)

        ...

        network_data = network_collector.get_data()
    """

    return NetworkCollector().attach(page)