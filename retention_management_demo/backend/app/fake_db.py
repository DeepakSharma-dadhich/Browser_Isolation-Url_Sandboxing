"""
Fake in-memory database for demo and developer understanding.

Production replacement:
- PostgreSQL / MySQL for policy, metadata, audit logs.
- Object storage such as S3/Azure Blob/GCS for raw emails and attachments.
- Immutable log/SIEM sink for audit logs.
"""

from datetime import datetime, timedelta
from uuid import UUID, uuid4

from app.models.retention import (
    AuditLog,
    DataType,
    DeleteMode,
    EmailRecord,
    RetentionPolicy,
)


TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")


class FakeDatabase:
    def __init__(self) -> None:
        self.policies: list[RetentionPolicy] = []
        self.records: list[EmailRecord] = []
        self.audit_logs: list[AuditLog] = []
        self.seed()

    def seed(self) -> None:
        now = datetime.utcnow()
        defaults = {
            DataType.CLEAN_RAW_EMAIL: 14,
            DataType.SUSPICIOUS_RAW_EMAIL: 30,
            DataType.QUARANTINE_EMAIL: 180,
            DataType.ATTACHMENT: 30,
            DataType.EMAIL_METADATA: 365,
            DataType.SCAN_EVENT: 365,
            DataType.AUDIT_LOG: 180,
            DataType.REPORT: 365,
        }

        for data_type, days in defaults.items():
            policy = RetentionPolicy(
                id=uuid4(),
                tenant_id=TENANT_ID,
                data_type=data_type,
                version=1,
                retention_days=days,
                delete_mode=DeleteMode.SOFT_DELETE_THEN_PURGE,
                effective_from=now,
                is_active=True,
                created_by="seed",
                created_at=now,
            )
            self.policies.append(policy)

            # Create one fresh, one old, and one legal-hold record per type.
            for idx, age_days in enumerate([3, days + 5, days + 30], start=1):
                created_at = now - timedelta(days=age_days)
                self.records.append(
                    EmailRecord(
                        id=uuid4(),
                        tenant_id=TENANT_ID,
                        data_type=data_type,
                        subject=f"{data_type.value} sample {idx}",
                        created_at=created_at,
                        expires_at=created_at + timedelta(days=days),
                        retention_policy_id=policy.id,
                        legal_hold=idx == 3,
                        storage_key=f"{TENANT_ID}/{data_type.value}/{idx}.eml",
                    )
                )

    def active_policy(self, tenant_id: UUID, data_type: DataType) -> RetentionPolicy | None:
        candidates = [
            policy
            for policy in self.policies
            if policy.tenant_id == tenant_id and policy.data_type == data_type and policy.is_active
        ]
        return max(candidates, key=lambda p: p.version, default=None)

    def next_policy_version(self, tenant_id: UUID, data_type: DataType) -> int:
        versions = [
            policy.version
            for policy in self.policies
            if policy.tenant_id == tenant_id and policy.data_type == data_type
        ]
        return max(versions, default=0) + 1


db = FakeDatabase()
