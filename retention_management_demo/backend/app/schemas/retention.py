"""
Pydantic schemas for API requests and responses.

These schemas are intentionally explicit because retention changes are risky:
shortening retention may make existing data eligible for deletion.
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.retention import ApplyScope, DataType, DeleteMode


class RetentionPolicyChangeRequest(BaseModel):
    tenant_id: UUID
    data_type: DataType
    retention_days: int = Field(ge=1, le=3650)
    apply_scope: ApplyScope
    delete_mode: DeleteMode = DeleteMode.SOFT_DELETE_THEN_PURGE
    confirm_existing_shortening: bool = False
    actor: str = "admin@example.com"


class RetentionPolicyView(BaseModel):
    data_type: DataType
    retention_days: int
    version: int
    delete_mode: DeleteMode


class DryRunResponse(BaseModel):
    tenant_id: UUID
    data_type: DataType
    current_retention_days: Optional[int]
    requested_retention_days: int
    apply_scope: ApplyScope
    affected_existing_records: int
    legal_hold_records_skipped: int
    warning: Optional[str]


class PolicyChangeResponse(BaseModel):
    policy_id: UUID
    version: int
    affected_existing_records: int
    message: str


class CleanupResponse(BaseModel):
    soft_deleted: int
    hard_purged: int
    skipped_legal_hold: int


class RetentionDashboardResponse(BaseModel):
    tenant_id: UUID
    policies: list[RetentionPolicyView]
    total_records: int
    expired_now: int
    legal_hold_records: int
