-- =========================================================
-- BrowseGuard Schema Migration 003: Gateway Subscriptions & Trial Quota Isolation
-- Enforces per-gateway access barriers and heavy compute VM quota tracking
-- =========================================================

CREATE TABLE IF NOT EXISTS gateway_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gateway VARCHAR(50) NOT NULL, -- 'url_scanner', 'browser_extension', 'email_gateway_api'
    status VARCHAR(30) NOT NULL DEFAULT 'TRIAL', -- 'TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED'
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'FREE_TRIAL', -- 'FREE_TRIAL', 'PRO', 'ENTERPRISE'
    quota_total INT NOT NULL DEFAULT 20,
    quota_used INT NOT NULL DEFAULT 0,
    trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_gateway UNIQUE (user_id, gateway)
);

CREATE INDEX IF NOT EXISTS idx_gateway_subscriptions_user_gateway 
ON gateway_subscriptions (user_id, gateway);

-- Seed default enterprise subscriptions for admin user across all 3 gateways
INSERT INTO gateway_subscriptions (user_id, gateway, status, plan_tier, quota_total, quota_used, trial_started_at, expires_at)
VALUES
    ('00000000-0000-0000-0000-000000000010', 'url_scanner', 'ACTIVE', 'ENTERPRISE', 999999, 0, NOW(), '2099-01-01 00:00:00Z'),
    ('00000000-0000-0000-0000-000000000010', 'browser_extension', 'ACTIVE', 'ENTERPRISE', 999999, 0, NOW(), '2099-01-01 00:00:00Z'),
    ('00000000-0000-0000-0000-000000000010', 'email_gateway_api', 'ACTIVE', 'ENTERPRISE', 999999, 0, NOW(), '2099-01-01 00:00:00Z')
ON CONFLICT (user_id, gateway) DO UPDATE 
SET status = 'ACTIVE', 
    plan_tier = 'ENTERPRISE', 
    quota_total = 999999, 
    expires_at = '2099-01-01 00:00:00Z';
