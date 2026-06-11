"""
Retention API routes.

Routes stay thin. All risky logic lives in RetentionService.
"""

from uuid import UUID

from fastapi import APIRouter

from app.fake_db import db
from app.schemas.retention import (
    CleanupResponse,
    DryRunResponse,
    PolicyChangeResponse,
    RetentionDashboardResponse,
    RetentionPolicyChangeRequest,
)
from app.services.retention_service import RetentionService


router = APIRouter(prefix="/api/retention", tags=["retention"])
service = RetentionService(db)


@router.get("/{tenant_id}", response_model=RetentionDashboardResponse)
def get_retention_dashboard(tenant_id: UUID):
    return service.dashboard(tenant_id)


@router.post("/dry-run", response_model=DryRunResponse)
def dry_run_policy_change(request: RetentionPolicyChangeRequest):
    return service.dry_run(request)


@router.post("/policies", response_model=PolicyChangeResponse)
def change_policy(request: RetentionPolicyChangeRequest):
    return service.change_policy(request)


@router.post("/{tenant_id}/cleanup", response_model=CleanupResponse)
def run_cleanup(tenant_id: UUID):
    return service.cleanup(tenant_id)
