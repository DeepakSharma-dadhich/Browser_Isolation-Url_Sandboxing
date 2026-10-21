"use strict";

const { pool } = require("../config/db");

async function migrate() {
  const sql = `
    CREATE TABLE IF NOT EXISTS organization_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      api_key VARCHAR(500) NOT NULL,
      config JSONB DEFAULT '{}'::jsonb,
      is_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(organization_id, provider)
    );
    ALTER TABLE organization_integrations ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
  `;
  try {
    await pool.query(sql);
    console.log("Migration successful: organization_integrations table ready!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
