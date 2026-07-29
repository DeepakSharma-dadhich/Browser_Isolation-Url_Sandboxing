"""
Browser evidence collectors.

Collectors gather raw evidence only. They do not calculate risk,
make security decisions, or generate the final report.
"""

from .metadata_collector import collect_metadata
from .console_collector import create_console_collector
from .network_collector import create_network_collector
from .redirect_collector import create_redirect_collector
from .client_redirect_collector import (
    create_client_redirect_collector,
)
from .download_collector import create_download_collector
from .html_collector import save_html_source


__all__ = [
    "collect_metadata",
    "create_console_collector",
    "create_network_collector",
    "create_redirect_collector",
    "create_client_redirect_collector",
    "create_download_collector",
    "save_html_source",
]