"""
Central configuration for the VM Agent.

This file contains:

- Shared-folder locations
- Browser execution limits
- Agent polling configuration
- Logging configuration
- Required directory creation

All URL execution still happens inside the VM.
"""

import os
from pathlib import Path


# ---------------------------------------------------------
# Project locations
# ---------------------------------------------------------

# Current file:
# url-sandbox/vm-agent/config.py
VM_AGENT_ROOT = Path(__file__).resolve().parent

# Parent project folder:
# url-sandbox/
PROJECT_ROOT = VM_AGENT_ROOT.parent


def resolve_shared_root() -> Path:
    """
    Resolve the shared directory used by the host and VM.

    Production usage:
        Set the SANDBOX_SHARED_ROOT environment variable to the
        shared-folder path mounted inside the VM.

    Examples:

        Windows:
            set SANDBOX_SHARED_ROOT=Z:\\shared

        Linux:
            export SANDBOX_SHARED_ROOT=/mnt/url-sandbox/shared

    Development fallback:
        url-sandbox/shared/
    """

    configured_path = os.getenv("SANDBOX_SHARED_ROOT")

    if configured_path:
        return Path(configured_path).expanduser().resolve()

    if (VM_AGENT_ROOT / "shared").exists():
        return (VM_AGENT_ROOT / "shared").resolve()

    return (PROJECT_ROOT / "shared").resolve()


SHARED_ROOT = resolve_shared_root()


# ---------------------------------------------------------
# Job lifecycle directories
# ---------------------------------------------------------

# New requests waiting for the VM Agent
INPUT_DIR = SHARED_ROOT / "input"

# Requests currently claimed by the VM Agent
PROCESSING_DIR = SHARED_ROOT / "processing"

# Successfully processed requests
COMPLETED_DIR = SHARED_ROOT / "completed"

# Invalid or failed requests
FAILED_DIR = SHARED_ROOT / "failed"


# ---------------------------------------------------------
# Evidence and report directories
# ---------------------------------------------------------

# Raw browser evidence
OUTPUT_DIR = SHARED_ROOT / "output"

# Final report location
REPORTS_DIR = SHARED_ROOT / "reports"

# Screenshot storage
SCREENSHOTS_DIR = SHARED_ROOT / "screenshots"

# Operational logs
LOGS_DIR = SHARED_ROOT / "logs"


# ---------------------------------------------------------
# Agent configuration
# ---------------------------------------------------------

# Time between input-folder checks
POLL_INTERVAL_SECONDS = float(
    os.getenv(
        "SANDBOX_POLL_INTERVAL_SECONDS",
        "2",
    )
)

# Time used later to verify that a request file is no longer
# being written by the host
FILE_STABILITY_DELAY_SECONDS = float(
    os.getenv(
        "SANDBOX_FILE_STABILITY_DELAY_SECONDS",
        "0.5",
    )
)

# Maximum incoming request JSON size
MAX_REQUEST_SIZE_BYTES = int(
    os.getenv(
        "SANDBOX_MAX_REQUEST_SIZE_BYTES",
        str(1024 * 1024),
    )
)

# Maximum accepted URL length
MAX_URL_LENGTH = int(
    os.getenv(
        "SANDBOX_MAX_URL_LENGTH",
        "8192",
    )
)


# ---------------------------------------------------------
# Browser configuration
# ---------------------------------------------------------

# Maximum time for the main navigation
BROWSER_NAVIGATION_TIMEOUT_MS = int(
    os.getenv(
        "SANDBOX_BROWSER_NAVIGATION_TIMEOUT_MS",
        "30000",
    )
)

# Default timeout for Playwright operations
BROWSER_ACTION_TIMEOUT_MS = int(
    os.getenv(
        "SANDBOX_BROWSER_ACTION_TIMEOUT_MS",
        "10000",
    )
)

# Additional wait after navigation for dynamic content
PAGE_SETTLE_TIME_MS = int(
    os.getenv(
        "SANDBOX_PAGE_SETTLE_TIME_MS",
        "3000",
    )
)

# Maximum number of redirects we will accept later
MAX_REDIRECTS = int(
    os.getenv(
        "SANDBOX_MAX_REDIRECTS",
        "20",
    )
)

# Maximum number of popups/new tabs
MAX_POPUPS = int(
    os.getenv(
        "SANDBOX_MAX_POPUPS",
        "5",
    )
)

# Browser runs without a visible window by default
BROWSER_HEADLESS = (
    os.getenv(
        "SANDBOX_BROWSER_HEADLESS",
        "true",
    ).lower()
    in {
        "1",
        "true",
        "yes",
        "on",
    }
)


# ---------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------

LOG_LEVEL = os.getenv(
    "SANDBOX_LOG_LEVEL",
    "INFO",
).upper()

LOG_FILE_NAME = os.getenv(
    "SANDBOX_LOG_FILE_NAME",
    "vm-agent.log",
)

LOG_MAX_BYTES = int(
    os.getenv(
        "SANDBOX_LOG_MAX_BYTES",
        str(10 * 1024 * 1024),
    )
)

LOG_BACKUP_COUNT = int(
    os.getenv(
        "SANDBOX_LOG_BACKUP_COUNT",
        "5",
    )
)


# ---------------------------------------------------------
# Required directory creation
# ---------------------------------------------------------

REQUIRED_DIRECTORIES = (
    SHARED_ROOT,
    INPUT_DIR,
    PROCESSING_DIR,
    COMPLETED_DIR,
    FAILED_DIR,
    OUTPUT_DIR,
    REPORTS_DIR,
    SCREENSHOTS_DIR,
    LOGS_DIR,
)


def create_required_directories() -> None:
    """
    Create all required shared directories.

    Safe to call multiple times.
    Existing folders are not deleted or overwritten.
    """

    for directory in REQUIRED_DIRECTORIES:
        directory.mkdir(
            parents=True,
            exist_ok=True,
        )