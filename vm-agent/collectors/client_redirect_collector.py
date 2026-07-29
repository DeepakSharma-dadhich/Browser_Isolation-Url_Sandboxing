"""
Client-side navigation evidence collector.

Collects browser-side navigation signals such as:

- JavaScript History API changes
- URL hash changes
- HTML meta-refresh declarations
- Main-frame navigations without making security decisions

This collector gathers raw evidence only.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlsplit

from playwright.sync_api import Frame, Page


def utc_now_iso() -> str:
    """Return the current UTC time in ISO-8601 format."""

    return datetime.now(timezone.utc).isoformat()


def normalize_url(
    url: str | None,
    base_url: str | None = None,
) -> str | None:
    """Resolve and normalize a URL without fragments."""

    if not url:
        return None

    try:
        resolved_url = (
            urljoin(base_url, url)
            if base_url
            else url
        )

        parsed = urlsplit(resolved_url)

        return parsed._replace(
            fragment=""
        ).geturl()

    except Exception:
        return url


def parse_meta_refresh_content(
    content: str | None,
    base_url: str | None,
) -> dict[str, Any]:
    """
    Parse HTML meta-refresh content.

    Examples:

        0;url=https://example.com
        5; URL='/login'
    """

    result: dict[str, Any] = {
        "raw_content": content,
        "delay_seconds": None,
        "target_url": None,
    }

    if not content:
        return result

    parts = content.split(
        ";",
        maxsplit=1,
    )

    delay_value = parts[0].strip()

    try:
        result["delay_seconds"] = float(
            delay_value
        )
    except ValueError:
        result["delay_seconds"] = None

    if len(parts) < 2:
        return result

    target_part = parts[1].strip()

    if "=" not in target_part:
        return result

    key, value = target_part.split(
        "=",
        maxsplit=1,
    )

    if key.strip().lower() != "url":
        return result

    target = value.strip().strip(
        "\"'"
    )

    result["target_url"] = normalize_url(
        target,
        base_url=base_url,
    )

    return result


class ClientRedirectCollector:
    """
    Collect browser-side navigation and redirect signals.
    """

    def __init__(
        self,
        maximum_events: int = 100,
    ) -> None:
        if maximum_events < 1:
            raise ValueError(
                "maximum_events must be at least 1"
            )

        self.maximum_events = maximum_events

        self.events: list[
            dict[str, Any]
        ] = []

        self.main_frame_navigations: list[
            dict[str, Any]
        ] = []

        self.meta_refreshes: list[
            dict[str, Any]
        ] = []

        self.history_changes: list[
            dict[str, Any]
        ] = []

        self.hash_changes: list[
            dict[str, Any]
        ] = []

        self.event_limit_reached = False
        self.event_limit_exceeded = False

        self._page: Page | None = None
        self._attached = False

        self._seen_events: set[
            tuple[Any, ...]
        ] = set()

    def attach(
        self,
        page: Page,
    ) -> "ClientRedirectCollector":
        """Attach browser-side instrumentation."""

        if self._attached:
            return self

        self._page = page

        page.expose_binding(
            "__sandboxRecordClientNavigation",
            self._receive_browser_event,
        )

        page.add_init_script(
            script=self._instrumentation_script()
        )

        page.on(
            "framenavigated",
            self._handle_frame_navigation,
        )

        self._attached = True

        return self

    def _instrumentation_script(self) -> str:
        """
        Return JavaScript injected before page scripts execute.
        """

        return r"""
(() => {
    if (window.__sandboxClientRedirectInstalled) {
        return;
    }

    window.__sandboxClientRedirectInstalled = true;

    const emit = (payload) => {
        try {
            const result =
                window.__sandboxRecordClientNavigation(payload);

            if (
                result &&
                typeof result.catch === "function"
            ) {
                result.catch(() => {});
            }
        } catch (_) {
            // Evidence collection must never break the page.
        }
    };

    const currentUrl = () => {
        try {
            return window.location.href;
        } catch (_) {
            return null;
        }
    };

    const emitHistoryChange = (
        method,
        previousUrl,
        destinationUrl
    ) => {
        emit({
            type: "history_api",
            method,
            previous_url: previousUrl,
            destination_url: destinationUrl,
            document_url: currentUrl(),
            browser_timestamp: new Date().toISOString()
        });
    };

    for (const methodName of [
        "pushState",
        "replaceState"
    ]) {
        const originalMethod =
            window.history[methodName];

        if (
            typeof originalMethod !== "function"
        ) {
            continue;
        }

        window.history[methodName] =
            function (...args) {
                const previousUrl = currentUrl();

                const result =
                    originalMethod.apply(
                        this,
                        args
                    );

                emitHistoryChange(
                    methodName,
                    previousUrl,
                    currentUrl()
                );

                return result;
            };
    }

    window.addEventListener(
        "popstate",
        () => {
            emit({
                type: "history_api",
                method: "popstate",
                destination_url: currentUrl(),
                document_url: currentUrl(),
                browser_timestamp:
                    new Date().toISOString()
            });
        },
        true
    );

    window.addEventListener(
        "hashchange",
        (event) => {
            emit({
                type: "hash_change",
                previous_url: event.oldURL || null,
                destination_url: event.newURL || currentUrl(),
                document_url: currentUrl(),
                browser_timestamp:
                    new Date().toISOString()
            });
        },
        true
    );

    const seenMetaRefreshElements =
        new WeakSet();

    const inspectMetaRefresh = (element) => {
        if (
            !element ||
            seenMetaRefreshElements.has(element)
        ) {
            return;
        }

        const httpEquiv = (
            element.getAttribute("http-equiv") ||
            ""
        ).trim().toLowerCase();

        if (httpEquiv !== "refresh") {
            return;
        }

        seenMetaRefreshElements.add(element);

        emit({
            type: "meta_refresh",
            content:
                element.getAttribute("content"),
            document_url: currentUrl(),
            browser_timestamp:
                new Date().toISOString()
        });
    };

    const scanMetaRefreshes = (root) => {
        try {
            if (
                root &&
                root.matches &&
                root.matches(
                    'meta[http-equiv]'
                )
            ) {
                inspectMetaRefresh(root);
            }

            if (
                root &&
                root.querySelectorAll
            ) {
                root.querySelectorAll(
                    'meta[http-equiv]'
                ).forEach(
                    inspectMetaRefresh
                );
            }
        } catch (_) {
            // Ignore malformed or inaccessible DOM nodes.
        }
    };

    const startMetaObserver = () => {
        scanMetaRefreshes(document);

        const observer = new MutationObserver(
            (mutations) => {
                for (
                    const mutation
                    of mutations
                ) {
                    if (
                        mutation.type ===
                        "attributes"
                    ) {
                        inspectMetaRefresh(
                            mutation.target
                        );
                    }

                    for (
                        const node
                        of mutation.addedNodes
                    ) {
                        if (
                            node.nodeType ===
                            Node.ELEMENT_NODE
                        ) {
                            scanMetaRefreshes(
                                node
                            );
                        }
                    }
                }
            }
        );

        observer.observe(
            document.documentElement ||
            document,
            {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    "http-equiv",
                    "content"
                ]
            }
        );
    };

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            startMetaObserver,
            {
                once: true
            }
        );
    } else {
        startMetaObserver();
    }
})();
"""

    def _append_event(
        self,
        event: dict[str, Any],
    ) -> None:
        """Store one unique event within the configured limit."""

        fingerprint = (
            event.get("type"),
            event.get("method"),
            event.get("previous_url"),
            event.get("destination_url"),
            event.get("document_url"),
            event.get("raw_content"),
        )

        if fingerprint in self._seen_events:
            return

        self._seen_events.add(fingerprint)

        if len(self.events) >= self.maximum_events:
            self.event_limit_reached = True
            self.event_limit_exceeded = True
            return

        self.events.append(event)

        if len(self.events) >= self.maximum_events:
            self.event_limit_reached = True

    def _receive_browser_event(
        self,
        source: Any,
        payload: Any,
    ) -> None:
        """
        Receive an event emitted by the injected browser script.
        """

        if not isinstance(payload, dict):
            return

        event_type = payload.get("type")

        frame = getattr(
            source,
            "frame",
            None,
        )

        if self._page is not None:
            try:
                if frame != self._page.main_frame:
                    return
            except Exception:
                return

        document_url = normalize_url(
            payload.get("document_url")
        )

        event: dict[str, Any] = {
            "timestamp": utc_now_iso(),
            "browser_timestamp": payload.get(
                "browser_timestamp"
            ),
            "type": event_type,
            "document_url": document_url,
        }

        if event_type == "history_api":
            event.update(
                {
                    "method": payload.get(
                        "method"
                    ),
                    "previous_url": normalize_url(
                        payload.get(
                            "previous_url"
                        )
                    ),
                    "destination_url": normalize_url(
                        payload.get(
                            "destination_url"
                        ),
                        base_url=document_url,
                    ),
                }
            )

            self.history_changes.append(event)

        elif event_type == "hash_change":
            event.update(
                {
                    "previous_url": normalize_url(
                        payload.get(
                            "previous_url"
                        )
                    ),
                    "destination_url": normalize_url(
                        payload.get(
                            "destination_url"
                        ),
                        base_url=document_url,
                    ),
                }
            )

            self.hash_changes.append(event)

        elif event_type == "meta_refresh":
            parsed = parse_meta_refresh_content(
                payload.get("content"),
                base_url=document_url,
            )

            event.update(
                {
                    "raw_content": parsed[
                        "raw_content"
                    ],
                    "delay_seconds": parsed[
                        "delay_seconds"
                    ],
                    "destination_url": parsed[
                        "target_url"
                    ],
                }
            )

            self.meta_refreshes.append(event)

        else:
            return

        self._append_event(event)

    def _handle_frame_navigation(
        self,
        frame: Frame,
    ) -> None:
        """Record unique main-frame navigations."""

        if self._page is None:
            return

        try:
            if frame != self._page.main_frame:
                return

            frame_url = normalize_url(
                frame.url
            )

        except Exception:
            return

        if not frame_url:
            return

        if (
            self.main_frame_navigations
            and self.main_frame_navigations[
                -1
            ].get("url") == frame_url
        ):
            return

        self.main_frame_navigations.append(
            {
                "timestamp": utc_now_iso(),
                "navigation_number": (
                    len(
                        self.main_frame_navigations
                    )
                    + 1
                ),
                "url": frame_url,
            }
        )

    def get_data(self) -> dict[str, Any]:
        """Return collected client-side navigation evidence."""

        meta_refresh_targets = [
            event.get("destination_url")
            for event in self.meta_refreshes
            if event.get("destination_url")
        ]

        history_targets = [
            event.get("destination_url")
            for event in self.history_changes
            if event.get("destination_url")
        ]

        return {
            "collected_at": utc_now_iso(),
            "event_count": len(self.events),
            "maximum_events": self.maximum_events,
            "event_limit_reached": (
                self.event_limit_reached
            ),
            "event_limit_exceeded": (
                self.event_limit_exceeded
            ),
            "events": list(self.events),
            "meta_refresh_count": len(
                self.meta_refreshes
            ),
            "meta_refreshes": list(
                self.meta_refreshes
            ),
            "history_change_count": len(
                self.history_changes
            ),
            "history_changes": list(
                self.history_changes
            ),
            "hash_change_count": len(
                self.hash_changes
            ),
            "hash_changes": list(
                self.hash_changes
            ),
            "main_frame_navigation_count": len(
                self.main_frame_navigations
            ),
            "main_frame_navigations": list(
                self.main_frame_navigations
            ),
            "meta_refresh_targets": list(
                dict.fromkeys(
                    meta_refresh_targets
                )
            ),
            "history_targets": list(
                dict.fromkeys(
                    history_targets
                )
            ),
        }


def create_client_redirect_collector(
    page: Page,
    maximum_events: int = 100,
) -> ClientRedirectCollector:
    """Create and attach the client-side redirect collector."""

    return ClientRedirectCollector(
        maximum_events=maximum_events
    ).attach(page)