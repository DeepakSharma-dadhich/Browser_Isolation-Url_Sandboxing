"""
Browser evidence collectors for BrowseGuard.

Collectors gather raw evidence only. They do not calculate risk,
make security decisions, or generate the final report.
"""

from .metadata_collector import collect_metadata
from .console_collector import create_console_collector
from .network_collector import create_network_collector
from .redirect_collector import create_redirect_collector
from .client_redirect_collector import create_client_redirect_collector
from .download_collector import create_download_collector
from .html_collector import save_html_source
from .cookie_collector import collect_cookies
from .certificate_collector import collect_certificate
from .forms_collector import collect_forms
from .headers_collector import collect_headers
from .javascript_collector import collect_javascript


__all__ = [
    "collect_metadata",
    "create_console_collector",
    "create_network_collector",
    "create_redirect_collector",
    "create_client_redirect_collector",
    "create_download_collector",
    "save_html_source",
    "collect_cookies",
    "collect_certificate",
    "collect_forms",
    "collect_headers",
    "collect_javascript",
]