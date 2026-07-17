"""
URL-analysis job request model and validation.

A valid request is created by the host application and consumed only
by the VM Agent.

Example:

{
    "session_id": "session_20260710_001",
    "url": "https://example.com",
    "submitted_at": "2026-07-10T15:00:00+05:30",
    "source": "email_security_backend",
    "request_version": "2.0",
    "metadata": {}
}
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from urllib.parse import urlsplit

from config import MAX_URL_LENGTH


SESSION_ID_PATTERN = re.compile(
    r"^[A-Za-z0-9_-]{8,100}$"
)

ALLOWED_SCHEMES = {
    "http",
    "https",
}


class JobRequestError(ValueError):
    """
    Raised when an incoming job request is invalid.
    """


@dataclass(frozen=True)
class JobRequest:
    """
    Validated URL-analysis job.
    """

    session_id: str
    url: str
    submitted_at: str

    source: str = "unknown"
    request_version: str = "2.0"

    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    @classmethod
    def from_dict(
        cls,
        payload: dict[str, Any],
    ) -> "JobRequest":
        """
        Validate and create a JobRequest from JSON data.
        """

        if not isinstance(
            payload,
            dict,
        ):
            raise JobRequestError(
                "Request JSON root must be an object."
            )

        session_id = payload.get(
            "session_id"
        )

        url = payload.get(
            "url"
        )

        submitted_at = payload.get(
            "submitted_at"
        )

        source = payload.get(
            "source",
            "unknown",
        )

        request_version = payload.get(
            "request_version",
            "2.0",
        )

        metadata = payload.get(
            "metadata",
            {},
        )

        validated_session_id = (
            cls.validate_session_id(
                session_id
            )
        )

        validated_url = cls.validate_url(
            url
        )

        validated_submitted_at = (
            cls.validate_submitted_at(
                submitted_at
            )
        )

        validated_source = (
            cls.validate_source(
                source
            )
        )

        validated_request_version = (
            cls.validate_request_version(
                request_version
            )
        )

        if not isinstance(
            metadata,
            dict,
        ):
            raise JobRequestError(
                "metadata must be a JSON object."
            )

        return cls(
            session_id=validated_session_id,
            url=validated_url,
            submitted_at=(
                validated_submitted_at
            ),
            source=validated_source,
            request_version=(
                validated_request_version
            ),
            metadata=metadata,
        )

    @staticmethod
    def validate_session_id(
        session_id: Any,
    ) -> str:
        """
        Validate session identifier.
        """

        if not isinstance(
            session_id,
            str,
        ):
            raise JobRequestError(
                "session_id must be a string."
            )

        normalized = session_id.strip()

        if not SESSION_ID_PATTERN.fullmatch(
            normalized
        ):
            raise JobRequestError(
                "session_id must contain only letters, numbers, "
                "underscores and hyphens, with length 8-100."
            )

        return normalized

    @staticmethod
    def validate_url(
        url: Any,
    ) -> str:
        """
        Validate submitted URL.

        Only HTTP and HTTPS are accepted.
        """

        if not isinstance(
            url,
            str,
        ):
            raise JobRequestError(
                "url must be a string."
            )

        normalized = url.strip()

        if not normalized:
            raise JobRequestError(
                "url cannot be empty."
            )

        if len(normalized) > MAX_URL_LENGTH:
            raise JobRequestError(
                f"url exceeds the maximum length of "
                f"{MAX_URL_LENGTH} characters."
            )

        if any(
            character in normalized
            for character in (
                "\r",
                "\n",
                "\x00",
            )
        ):
            raise JobRequestError(
                "url contains prohibited control characters."
            )

        try:
            parsed = urlsplit(
                normalized
            )
        except Exception as exc:
            raise JobRequestError(
                "url could not be parsed."
            ) from exc

        scheme = parsed.scheme.lower()

        if scheme not in ALLOWED_SCHEMES:
            raise JobRequestError(
                "Only HTTP and HTTPS URLs are supported."
            )

        if not parsed.hostname:
            raise JobRequestError(
                "url must contain a hostname."
            )

        if (
            parsed.username is not None
            or parsed.password is not None
        ):
            raise JobRequestError(
                "URLs containing embedded credentials "
                "are not accepted."
            )

        try:
            parsed.port
        except ValueError as exc:
            raise JobRequestError(
                "url contains an invalid port."
            ) from exc

        return normalized

    @staticmethod
    def validate_submitted_at(
        submitted_at: Any,
    ) -> str:
        """
        Validate ISO-8601 submission timestamp.
        """

        if not isinstance(
            submitted_at,
            str,
        ):
            raise JobRequestError(
                "submitted_at must be an ISO-8601 string."
            )

        normalized = submitted_at.strip()

        if not normalized:
            raise JobRequestError(
                "submitted_at cannot be empty."
            )

        iso_value = normalized.replace(
            "Z",
            "+00:00",
        )

        try:
            datetime.fromisoformat(
                iso_value
            )
        except ValueError as exc:
            raise JobRequestError(
                "submitted_at must be a valid ISO-8601 datetime."
            ) from exc

        return normalized

    @staticmethod
    def validate_source(
        source: Any,
    ) -> str:
        """
        Validate request source.
        """

        if not isinstance(
            source,
            str,
        ):
            raise JobRequestError(
                "source must be a string."
            )

        normalized = source.strip()

        if not normalized:
            return "unknown"

        if len(normalized) > 100:
            raise JobRequestError(
                "source cannot exceed 100 characters."
            )

        return normalized

    @staticmethod
    def validate_request_version(
        request_version: Any,
    ) -> str:
        """
        Validate request schema version.
        """

        if not isinstance(
            request_version,
            str,
        ):
            raise JobRequestError(
                "request_version must be a string."
            )

        normalized = (
            request_version.strip()
        )

        if not normalized:
            raise JobRequestError(
                "request_version cannot be empty."
            )

        return normalized

    def to_dict(
        self,
    ) -> dict[str, Any]:
        """
        Convert the validated job to JSON-compatible data.
        """

        return {
            "session_id": self.session_id,
            "url": self.url,
            "submitted_at": (
                self.submitted_at
            ),
            "source": self.source,
            "request_version": (
                self.request_version
            ),
            "metadata": self.metadata,
        }