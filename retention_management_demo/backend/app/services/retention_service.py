"""
Retention service.

This is where production business logic belongs. API routes should stay thin.
"""

from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status

from app.fake_db import FakeDatabase
from app.models.retention import AuditLog, DataType, EmailRecord, RetentionPolicy
from app.schemas.retention import (
    CleanupResponse,
    DryRunResponse,
    PolicyChangeResponse,
    RetentionDashboardResponse,
    RetentionPolicyChangeRequest,
    RetentionPolicyView,
)


class RetentionService:
    def __init__(self, database: FakeDatabase) -> None:
        self.db = database

    def dashboard(self, tenant_id) -> RetentionDashboardResponse:
        now = datetime.utcnow()
        policies = [
            RetentionPolicyView(
                data_type=p.data_type,
                retention_days=p.retention_days,
                version=p.version,
                delete_mode=p.delete_mode,
            )
            for p in sorted(self.db.policies, key=lambda item: item.data_type.value)
            if p.tenant_id == tenant_id and p.is_active
        ]
        tenant_records = [r for r in self.db.records if r.tenant_id == tenant_id and r.purged_at is None]

        return RetentionDashboardResponse(
            tenant_id=tenant_id,
            policies=policies,
            total_records=len(tenant_records),
            expired_now=sum(1 for r in tenant_records if r.expires_at < now and not r.legal_hold),
            legal_hold_records=sum(1 for r in tenant_records if r.legal_hold),
        )

    def dry_run(self, request: RetentionPolicyChangeRequest) -> DryRunResponse:
        self._validate_retention_days(request.data_type, request.retention_days)
        active_policy = self.db.active_policy(request.tenant_id, request.data_type)
        affected = self._count_records_that_would_expire(request)
        legal_hold_skipped = self._count_legal_hold_records(request)

        warning = None
        if active_policy and request.retention_days < active_policy.retention_days and affected:
            warning = (
                f"Shortening retention from {active_policy.retention_days} to "
                f"{request.retention_days} days makes {affected} existing records "
                "eligible for deletion. Require explicit confirmation."
            )

        self._audit(
            request.tenant_id,
            request.actor,
            "retention_dry_run",
            f"Dry-run for {request.data_type.value}; affected={affected}.",
            affected,
        )

        return DryRunResponse(
            tenant_id=request.tenant_id,
            data_type=request.data_type,
            current_retention_days=active_policy.retention_days if active_policy else None,
            requested_retention_days=request.retention_days,
            apply_scope=request.apply_scope,
            affected_existing_records=affected,
            legal_hold_records_skipped=legal_hold_skipped,
            warning=warning,
        )

    def change_policy(self, request: RetentionPolicyChangeRequest) -> PolicyChangeResponse:
        """
        Applies retention changes.

        Important production behavior:
        - We create a new policy version.
        - We optionally override expires_at for existing data.
        - We do NOT delete inside this function. The cleanup worker deletes later.
        """

        self._validate_retention_days(request.data_type, request.retention_days)
        active_policy = self.db.active_policy(request.tenant_id, request.data_type)
        affected = self._count_records_that_would_expire(request)

        is_shortening = active_policy and request.retention_days < active_policy.retention_days
        if is_shortening and affected and not request.confirm_existing_shortening:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"{affected} existing records will become eligible for deletion. "
                    "Set confirm_existing_shortening=true after user confirms."
                ),
            )

        if active_policy:
            active_policy.is_active = False

        policy = RetentionPolicy(
            id=uuid4(),
            tenant_id=request.tenant_id,
            data_type=request.data_type,
            version=self.db.next_policy_version(request.tenant_id, request.data_type),
            retention_days=request.retention_days,
            delete_mode=request.delete_mode,
            effective_from=datetime.utcnow(),
            is_active=True,
            created_by=request.actor,
            created_at=datetime.utcnow(),
        )
        self.db.policies.append(policy)

        if request.apply_scope.value == "existing_and_new":
            self._override_existing_expiry(request, policy)

        self._audit(
            request.tenant_id,
            request.actor,
            "retention_policy_changed",
            (
                f"{request.data_type.value}: "
                f"{active_policy.retention_days if active_policy else 'none'} -> "
                f"{request.retention_days} days; scope={request.apply_scope.value}."
            ),
            affected,
        )

        return PolicyChangeResponse(
            policy_id=policy.id,
            version=policy.version,
            affected_existing_records=affected,
            message="Policy updated. Cleanup worker will process expired records.",
        )

    def cleanup(self, tenant_id) -> CleanupResponse:
        """
        Simulates a cleanup worker.

        Production replacement:
        - Run from Celery Beat / APScheduler / Kubernetes CronJob.
        - Delete object storage files before hard-purging DB rows.
        - Send cleanup summary to SIEM/immutable audit logs.
        """

        now = datetime.utcnow()
        soft_deleted = 0
        hard_purged = 0
        skipped_legal_hold = 0

        for record in self.db.records:
            if record.tenant_id != tenant_id or record.purged_at is not None:
                continue

            if record.expires_at >= now:
                continue

            if record.legal_hold:
                skipped_legal_hold += 1
                continue

            if record.deleted_at is None:
                record.deleted_at = now
                soft_deleted += 1
                continue

            # Demo grace period is immediate; production usually waits 7-30 days.
            record.purged_at = now
            hard_purged += 1

        self._audit(
            tenant_id,
            "system",
            "retention_cleanup",
            f"soft_deleted={soft_deleted}; hard_purged={hard_purged}; legal_hold={skipped_legal_hold}.",
            soft_deleted + hard_purged,
        )

        return CleanupResponse(
            soft_deleted=soft_deleted,
            hard_purged=hard_purged,
            skipped_legal_hold=skipped_legal_hold,
        )

    def _override_existing_expiry(self, request: RetentionPolicyChangeRequest, policy: RetentionPolicy) -> None:
        for record in self.db.records:
            if not self._is_matching_mutable_record(record, request):
                continue

            record.retention_policy_id = policy.id
            record.expires_at = record.created_at + timedelta(days=request.retention_days)

    def _count_records_that_would_expire(self, request: RetentionPolicyChangeRequest) -> int:
        if request.apply_scope.value != "existing_and_new":
            return 0

        cutoff = datetime.utcnow() - timedelta(days=request.retention_days)
        return sum(
            1
            for record in self.db.records
            if self._is_matching_mutable_record(record, request)
            and record.created_at < cutoff
        )

    def _count_legal_hold_records(self, request: RetentionPolicyChangeRequest) -> int:
        return sum(
            1
            for record in self.db.records
            if record.tenant_id == request.tenant_id
            and record.data_type == request.data_type
            and record.legal_hold
            and record.purged_at is None
        )

    @staticmethod
    def _is_matching_mutable_record(record: EmailRecord, request: RetentionPolicyChangeRequest) -> bool:
        return (
            record.tenant_id == request.tenant_id
            and record.data_type == request.data_type
            and not record.legal_hold
            and record.purged_at is None
        )

    @staticmethod
    def _validate_retention_days(data_type: DataType, days: int) -> None:
        """
        Production guardrails. Adjust min/max based on legal/compliance policy.
        """

        minimums = {
            DataType.CLEAN_RAW_EMAIL: 1,
            DataType.SUSPICIOUS_RAW_EMAIL: 7,
            DataType.QUARANTINE_EMAIL: 30,
            DataType.ATTACHMENT: 1,
            DataType.EMAIL_METADATA: 90,
            DataType.SCAN_EVENT: 90,
            DataType.AUDIT_LOG: 180,
            DataType.REPORT: 30,
        }
        minimum = minimums[data_type]
        if days < minimum:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{data_type.value} retention must be at least {minimum} days.",
            )

    def _audit(self, tenant_id, actor: str, action: str, message: str, affected: int) -> None:
        self.db.audit_logs.append(
            AuditLog(
                tenant_id=tenant_id,
                actor=actor,
                action=action,
                message=message,
                affected_count=affected,
                created_at=datetime.utcnow(),
            )
        )
