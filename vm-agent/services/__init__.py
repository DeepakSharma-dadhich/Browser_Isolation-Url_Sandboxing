"""
VM Agent service layer.
"""

from .browser_service import (
    BrowserCollectors,
    attach_collectors,
    collect_browser_evidence,
    persist_browser_evidence,
)


__all__ = [
    "BrowserCollectors",
    "attach_collectors",
    "collect_browser_evidence",
    "persist_browser_evidence",
]