"""
Central logging configuration for the VM Agent.
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from config import (
    LOG_BACKUP_COUNT,
    LOG_FILE_NAME,
    LOG_LEVEL,
    LOG_MAX_BYTES,
    LOGS_DIR,
)


def configure_logging(
    logger_name: str = "vm_agent",
) -> logging.Logger:
    """
    Configure console and rotating-file logging.

    Log output is written to:

        shared/logs/vm-agent.log

    Args:
        logger_name:
            Name of the application logger.

    Returns:
        Configured logger instance.
    """

    LOGS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    log_file_path = Path(
        LOGS_DIR / LOG_FILE_NAME
    )

    logger = logging.getLogger(
        logger_name
    )

    numeric_log_level = getattr(
        logging,
        LOG_LEVEL,
        logging.INFO,
    )

    logger.setLevel(
        numeric_log_level
    )

    # Prevent the same message from also being sent through
    # the root logger.
    logger.propagate = False

    # Avoid duplicate handlers if configuration is called again.
    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | "
        "%(name)s | %(message)s"
    )

    console_handler = logging.StreamHandler(
        sys.stdout
    )

    console_handler.setLevel(
        numeric_log_level
    )

    console_handler.setFormatter(
        formatter
    )

    file_handler = RotatingFileHandler(
        filename=log_file_path,
        maxBytes=LOG_MAX_BYTES,
        backupCount=LOG_BACKUP_COUNT,
        encoding="utf-8",
    )

    file_handler.setLevel(
        numeric_log_level
    )

    file_handler.setFormatter(
        formatter
    )

    logger.addHandler(
        console_handler
    )

    logger.addHandler(
        file_handler
    )

    return logger