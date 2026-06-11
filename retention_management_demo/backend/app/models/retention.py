"""
Retention domain models.

Production note:
These are dataclasses for the demo. In production, convert these to SQLAlchemy
models with migrations and database constraints.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class DataType(str, Enum):
    CLEAN_RAW_EMAIL = "clean_raw_email"
    SUSPICIOUS_RAW_EMAIL = "suspicious_raw_email"
    QUARANTINE_EMAIL = "quarantine_email"
    ATTACHMENT = "attachment"
    EMAIL_METADATA = "email_metadata"
    SCAN_EVENT = "scan_event"
    AUDIT_LOG = "audit_log"
    REPORT = "report"


class ApplyScope(str, Enum):
    NEW_DATA_ONLY = "new_data_only"
    EXISTING_AND_NEW = "existing_and_new"


class DeleteMode(str, Enum):
    SOFT_DELETE_THEN_PURGE = "soft_delete_then_purge"
    HARD_DELETE_ON_EXPIRY = "hard_delete_on_expiry"


@dataclass
class RetentionPolicy:
    id: UUID
    tenant_id: UUID
    data_type: DataType
    version: int
    retention_days: int
    delete_mode: DeleteMode
    effective_from: datetime
    is_active: bool
    created_by: str
    created_at: datetime


@dataclass
class EmailRecord:
    """
    Represents any lifecycle-managed email object.

    Examples:
    - raw .eml file metadata
    - quarantine item
    - attachment reference
    - scan event row
    """

    id: UUID
    tenant_id: UUID
    data_type: DataType
    subject: str
    created_at: datetime
    expires_at: datetime
    retention_policy_id: UUID
    legal_hold: bool = False
    deleted_at: Optional[datetime] = None
    purged_at: Optional[datetime] = None
    storage_key: Optional[str] = None


@dataclass
class AuditLog:
    id: UUID = field(default_factory=uuid4)
    tenant_id: UUID = field(default_factory=uuid4)
    actor: str = "system"
    action: str = ""
    message: str = ""
    affected_count: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
