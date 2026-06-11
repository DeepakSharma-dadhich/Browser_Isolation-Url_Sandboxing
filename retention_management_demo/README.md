# ArkMail Retention Management Demo

This package shows a production-style retention settings implementation for an email security dashboard.

It includes:

- A single-page HTML retention settings UI.
- Split Python backend files like a production FastAPI project.
- A fake in-memory database for demo/testing.
- Policy versioning.
- Dry-run before applying risky retention changes.
- Existing data expiry override.
- Legal hold skip.
- Cleanup worker simulation.
- Audit logging.

## Folder Structure

```text
retention_management_demo/
  backend/
    requirements.txt
    app/
      main.py
      fake_db.py
      api/
        retention_routes.py
      models/
        retention.py
      schemas/
        retention.py
      services/
        retention_service.py
  frontend/
    retention-settings.html
```

## Production Flow

1. Admin opens retention settings.
2. Admin chooses data type, retention days and apply scope.
3. Frontend calls `POST /api/retention/dry-run`.
4. Backend calculates how many existing records would become expired.
5. If retention is shortened, frontend shows a warning.
6. Admin confirms.
7. Frontend calls `POST /api/retention/policies`.
8. Backend creates a new policy version.
9. If scope is `existing_and_new`, backend recalculates `expires_at` for existing records.
10. Cleanup worker later soft-deletes and purges expired records.
11. Every action is audit logged.

## Key API Endpoints

```text
GET  /api/retention/{tenant_id}
POST /api/retention/dry-run
POST /api/retention/policies
POST /api/retention/{tenant_id}/cleanup
```

## Retention Apply Scope

### New Data Only

Only future records use the new retention period.

Existing records keep their old `expires_at`.

This is the safest default.

### Existing + New Data

Backend recalculates expiry for old records:

```text
new_expires_at = record.created_at + new_retention_days
```

If the new expiry is already in the past, the record becomes eligible for cleanup.

Legal-hold records are skipped.

## Production Database Replacement

The demo uses `fake_db.py`. In production, replace it with:

- PostgreSQL tables for policies, metadata and audit logs.
- Object storage for raw emails and attachments.
- Redis/SQS/RabbitMQ for worker queues if needed.
- SIEM or immutable storage for audit logs.

Recommended database tables:

```text
retention_policies
email_records
attachment_records
quarantine_records
scan_events
audit_logs
retention_cleanup_runs
```

## Production Worker

Do not delete records directly in the admin API request.

Use a scheduled worker:

- Celery Beat
- APScheduler
- Kubernetes CronJob
- AWS EventBridge + Lambda
- Azure Functions Timer

Worker responsibilities:

- Find expired records.
- Skip legal hold.
- Soft delete first.
- Delete object storage files.
- Hard purge later.
- Write cleanup audit summary.
- Alert if cleanup fails.

## Security Rules

- Retention policy changes require admin RBAC permission.
- Shortening retention requires dry-run and explicit confirmation.
- Audit logs must be immutable or forwarded to SIEM.
- Legal hold overrides retention deletion.
- Raw email retention should be shorter than metadata retention.
- Tenant ID must be included in every query.
- Object storage lifecycle rules should match backend policies.

## Demo Run

Install backend dependencies:

```powershell
cd C:\Users\Admin\Documents\Onboarding\outputs\research_docs\retention_management_demo\backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open:

```text
C:\Users\Admin\Documents\Onboarding\outputs\research_docs\retention_management_demo\frontend\retention-settings.html
```

The UI works even if backend is not running because it has demo-mode fallback logic.

## Production Defaults For ArkMail

| Data Type | Suggested Default |
|---|---:|
| Clean raw emails | 14 days |
| Suspicious raw emails | 30 days |
| Quarantined emails | 180 days |
| Attachments | Same as related email |
| Email metadata | 365 days |
| Scan events | 365 days |
| Audit logs | 180-365 days |
| Reports | 365 days |

