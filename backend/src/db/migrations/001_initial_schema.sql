-- =========================================================
-- BrowseGuard Schema Migration 001: Initial Relational Schema
-- Target: PostgreSQL 14+
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Safe creation of ENUM types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'VIEWER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_channel') THEN
        CREATE TYPE source_channel AS ENUM ('MANUAL', 'EMAIL_SECURITY', 'EXTENSION', 'EXTERNAL_API');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status') THEN
        CREATE TYPE analysis_status AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'TIMED_OUT', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_verdict') THEN
        CREATE TYPE analysis_verdict AS ENUM ('SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'MALICIOUS', 'UNKNOWN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_severity') THEN
        CREATE TYPE finding_severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_type') THEN
        CREATE TYPE artifact_type AS ENUM ('SCREENSHOT', 'DOM_SNAPSHOT', 'HAR_LOG', 'DOWNLOADED_SAMPLE', 'RAW_EVIDENCE');
    END IF;
END $$;

-- ---------------------------------------------------------
-- 1. ORGANIZATIONS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'EVALUATION',
    max_concurrent_scans INT NOT NULL DEFAULT 5,
    monthly_scan_quota INT NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default workspace if not present
INSERT INTO organizations (id, name, slug, plan_tier, max_concurrent_scans, monthly_scan_quota)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'default',
    'ENTERPRISE',
    20,
    100000
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------
-- 2. USERS & MEMBERSHIPS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'ANALYST',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

-- ---------------------------------------------------------
-- 3. API CLIENTS (Email Security, Extension, APIs)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client_id VARCHAR(64) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['analysis:create', 'analysis:read'],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 4. ANALYSES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyses (
    id VARCHAR(64) PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    api_client_id UUID REFERENCES api_clients(id) ON DELETE SET NULL,
    
    source_channel source_channel NOT NULL DEFAULT 'MANUAL',
    idempotency_key VARCHAR(128),
    
    submitted_url TEXT NOT NULL,
    submitted_hostname VARCHAR(512),
    final_url TEXT,
    final_hostname VARCHAR(512),
    domain_changed BOOLEAN DEFAULT FALSE,
    page_title TEXT,
    http_status_code INT,
    server_ip VARCHAR(64),
    
    status analysis_status NOT NULL DEFAULT 'QUEUED',
    verdict analysis_verdict DEFAULT 'UNKNOWN',
    recommended_action VARCHAR(50) DEFAULT 'REVIEW',
    allow_user_access BOOLEAN DEFAULT FALSE,
    decision_reason TEXT,
    
    risk_score INT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(32) DEFAULT 'unknown',
    
    duration_ms INT,
    completeness VARCHAR(64) DEFAULT 'complete',
    error_code VARCHAR(64),
    error_message TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_org_created ON analyses (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses (status);
CREATE INDEX IF NOT EXISTS idx_analyses_verdict ON analyses (verdict);
CREATE INDEX IF NOT EXISTS idx_analyses_submitted_url ON analyses (submitted_url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_idempotency ON analyses (organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------
-- 5. FINDINGS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id VARCHAR(64) NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    rule_id VARCHAR(64) NOT NULL,
    rule_version VARCHAR(32) DEFAULT '1.0',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    severity finding_severity NOT NULL,
    confidence NUMERIC(3, 2) DEFAULT 1.00 CHECK (confidence >= 0.00 AND confidence <= 1.00),
    score_contribution INT NOT NULL DEFAULT 0,
    evidence JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findings_analysis ON findings (analysis_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings (severity);

-- ---------------------------------------------------------
-- 6. REDIRECT EVENTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS redirect_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id VARCHAR(64) NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    redirect_type VARCHAR(64) NOT NULL,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status_code INT,
    timestamp TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_redirect_analysis_seq ON redirect_events (analysis_id, sequence ASC);

-- ---------------------------------------------------------
-- 7. ARTIFACT RECORDS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS artifact_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id VARCHAR(64) NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    artifact_type artifact_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256_hash VARCHAR(64),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_analysis ON artifact_records (analysis_id);

-- ---------------------------------------------------------
-- 8. REPORTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    analysis_id VARCHAR(64) PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,
    schema_version VARCHAR(32) NOT NULL DEFAULT '2.1',
    evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    browser_behaviour JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_report JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 9. AUDIT EVENTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_type VARCHAR(32) NOT NULL,
    actor_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64),
    resource_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_events (organization_id, created_at DESC);
