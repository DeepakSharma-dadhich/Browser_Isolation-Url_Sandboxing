"use strict";

const { pool } = require("../config/db");

async function seedDefaultClients() {
  const query = `
    INSERT INTO api_clients (
      id,
      organization_id,
      name,
      client_id,
      client_secret_hash,
      scopes,
      is_active
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001',
      'Email Gateway Integration Client',
      'bg_live_email_gateway_default',
      'bg_sec_email_gateway_default',
      ARRAY['analysis:create', 'analysis:read'],
      TRUE
    ) ON CONFLICT (id) DO NOTHING
    RETURNING *;
  `;

  try {
    const res = await pool.query(query);
    if (res.rows.length > 0) {
      console.log("[DB Seed] Created API client:", res.rows[0].client_id);
    } else {
      console.log("[DB Seed] Default API client already exists.");
    }
  } catch (err) {
    console.error("[DB Seed Error]:", err.message);
  } finally {
    await pool.end();
  }
}

seedDefaultClients();
