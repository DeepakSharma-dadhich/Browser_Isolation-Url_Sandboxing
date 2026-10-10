-- =========================================================
-- BrowseGuard Schema Migration 002: User Accounts, Extension Token & MITRE ATT&CK
-- =========================================================

-- 1. Add extension_token and role column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS extension_token VARCHAR(128) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'ANALYST';

-- 2. Add MITRE ATT&CK mapping columns to findings table
ALTER TABLE findings ADD COLUMN IF NOT EXISTS mitre_attack_id VARCHAR(32);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS mitre_attack_name VARCHAR(128);

-- 3. Add index on extension_token for rapid authentication from browser extension
CREATE INDEX IF NOT EXISTS idx_users_extension_token ON users (extension_token) WHERE extension_token IS NOT NULL;

-- 4. Add index on analysis requested_by_user_id for user-scoped scan history queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses (requested_by_user_id, created_at DESC);

-- 5. Seed default admin user:
-- Email: admin@browseguard.local
-- Password: Password123!
-- Extension token: bg_ext_admin_live_token_777
INSERT INTO users (id, email, password_hash, full_name, role, extension_token, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'admin@browseguard.local',
    '$2b$10$SGrPSqQfe4dMzGxv.ICQ8..7/RCHCipQSd4aaH8sly3p.P.TvZGFS',
    'Security Administrator',
    'ADMIN',
    'bg_ext_admin_live_token_777',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Seed default membership
INSERT INTO organization_members (organization_id, user_id, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'ADMIN'
) ON CONFLICT (organization_id, user_id) DO NOTHING;
