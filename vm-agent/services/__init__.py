"""
VM Agent service layer.
"""

from .browser_service import (
    BrowserCollectors,
    attach_collectors,
    collect_browser_evidence,
    persist_browser_evidence,
)


from .network_guard import (
    NetworkGuard,
    evaluate_target,
)


__all__ = [
    "BrowserCollectors",
    "attach_collectors",
    "collect_browser_evidence",
    "persist_browser_evidence",
    "NetworkGuard",
    "evaluate_target",
]