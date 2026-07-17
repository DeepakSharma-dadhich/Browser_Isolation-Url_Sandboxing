"""
Shared utility functions used by the VM Agent.
"""

from .json_utils import (
    JSONFileError,
    read_json_file,
    write_json_atomic,
)

from .logging_utils import configure_logging


__all__ = [
    "JSONFileError",
    "read_json_file",
    "write_json_atomic",
    "configure_logging",
]