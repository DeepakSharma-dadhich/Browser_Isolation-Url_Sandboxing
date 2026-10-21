"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");

function generateExtensionToken() {
  return `bg_ext_${crypto.randomBytes(24).toString("hex")}`;
}

async function logAuditEvent(orgId, userId, eventType, action, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_events (organization_id, actor_type, actor_id, resource_type, action, details, created_at)
       VALUES ($1, 'USER', $2, $3, $4, $5, NOW());`,
      [orgId || DEFAULT_ORG_ID, userId ? String(userId) : null, eventType, action, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.warn("[Admin Audit Log Error]:", err.message);
  }
}

/**
 * GET /api/v1/admin/users
 * List all users in the organization with their scan metrics.
 */
async function getUsers(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;

    const query = `
      SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.role, 
        u.is_active, 
        u.extension_token, 
        u.created_at,
        u.updated_at,
        COALESCE(scans.total_scans, 0)::int as total_scans,
        scans.last_scan_at
      FROM users u
      JOIN organization_members om ON om.user_id = u.id AND om.organization_id = $1
      LEFT JOIN (
        SELECT 
          requested_by_user_id, 
          COUNT(*)::int as total_scans, 
          MAX(created_at) as last_scan_at
        FROM analyses 
        WHERE requested_by_user_id IS NOT NULL
        GROUP BY requested_by_user_id
      ) scans ON scans.requested_by_user_id = u.id
      ORDER BY u.created_at ASC;
    `;

    const result = await pool.query(query, [orgId]);
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/v1/admin/users
 * Provision or invite a new member into the organization.
 */
async function createUser(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;
    const { email, fullName, password, role = "ANALYST" } = req.body || {};

    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email is required." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    const validRoles = ["OWNER", "ADMIN", "ANALYST", "VIEWER"];
    const userRole = validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : "ANALYST";

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: "A user with this email already exists." });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const extToken = generateExtensionToken();

    const client = await pool.connect();
    let newUser;
    try {
      await client.query("BEGIN;");

      const insertRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, extension_token, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, email, full_name, role, extension_token, created_at;`,
        [normalizedEmail, hash, fullName || normalizedEmail.split("@")[0], userRole, extToken]
      );
      newUser = insertRes.rows[0];

      await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;`,
        [orgId, newUser.id, userRole]
      );

      // Provision default subscriptions for user
      await client.query(
        `INSERT INTO gateway_subscriptions (user_id, gateway, status, plan_tier, quota_total, quota_used)
         VALUES 
           ($1, 'url_scanner', 'ACTIVE', 'PRO', 500, 0),
           ($1, 'browser_extension', 'ACTIVE', 'PRO', 500, 0),
           ($1, 'email_gateway_api', 'ACTIVE', 'PRO', 500, 0)
         ON CONFLICT DO NOTHING;`,
        [newUser.id]
      );

      await client.query("COMMIT;");
    } catch (e) {
      await client.query("ROLLBACK;");
      throw e;
    } finally {
      client.release();
    }

    await logAuditEvent(orgId, req.user?.id, "USER_MANAGEMENT", "USER_CREATED", {
      created_user_id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    return res.status(201).json({
      success: true,
      message: `User '${newUser.email}' provisioned successfully with role ${newUser.role}.`,
      data: newUser
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/v1/admin/users/:userId/role
 * Change a team member's role.
 */
async function updateUserRole(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;
    const { userId } = req.params;
    const { role } = req.body || {};

    const validRoles = ["OWNER", "ADMIN", "ANALYST", "VIEWER"];
    const targetRole = (role || "").toUpperCase();
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role '${role}'. Must be one of: ${validRoles.join(", ")}`
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN;");
      await client.query("UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2;", [targetRole, userId]);
      await client.query(
        "UPDATE organization_members SET role = $1 WHERE user_id = $2 AND organization_id = $3;",
        [targetRole, userId, orgId]
      );
      await client.query("COMMIT;");
    } catch (e) {
      await client.query("ROLLBACK;");
      throw e;
    } finally {
      client.release();
    }

    await logAuditEvent(orgId, req.user?.id, "USER_MANAGEMENT", "ROLE_UPDATED", {
      target_user_id: userId,
      new_role: targetRole
    });

    return res.status(200).json({
      success: true,
      message: `User role updated to ${targetRole}.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/v1/admin/users/:userId/status
 * Activate or suspend a user.
 */
async function updateUserStatus(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;
    const { userId } = req.params;
    const { isActive } = req.body || {};

    if (userId === req.user?.id) {
      return res.status(400).json({ success: false, error: "Administrators cannot deactivate their own account." });
    }

    await pool.query(
      "UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2;",
      [Boolean(isActive), userId]
    );

    await logAuditEvent(orgId, req.user?.id, "USER_MANAGEMENT", "STATUS_UPDATED", {
      target_user_id: userId,
      is_active: Boolean(isActive)
    });

    return res.status(200).json({
      success: true,
      message: `User account ${isActive ? "activated" : "suspended"} successfully.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/v1/admin/users/:userId
 * Remove a user from the organization.
 */
async function deleteUser(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;
    const { userId } = req.params;

    if (userId === req.user?.id) {
      return res.status(400).json({ success: false, error: "Administrators cannot delete their own account." });
    }

    await pool.query("DELETE FROM organization_members WHERE user_id = $1 AND organization_id = $2;", [userId, orgId]);
    await pool.query("DELETE FROM users WHERE id = $1;", [userId]);

    await logAuditEvent(orgId, req.user?.id, "USER_MANAGEMENT", "USER_DELETED", { target_user_id: userId });

    return res.status(200).json({
      success: true,
      message: "User removed from organization successfully."
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/v1/admin/gateways
 * List all 4 gateways and the organization's subscription status.
 */
async function getGateways(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;

    // Get organization details
    const orgRes = await pool.query(
      "SELECT id, name, plan_tier, max_concurrent_scans FROM organizations WHERE id = $1;",
      [orgId]
    );
    const org = orgRes.rows[0] || {};

    // Get gateway subscriptions for admin user or organization
    const subsRes = await pool.query(
      `SELECT gateway, status, plan_tier, quota_total, quota_used, expires_at, updated_at
       FROM gateway_subscriptions 
       WHERE user_id = $1;`,
      [req.user?.id]
    );

    const subMap = {};
    for (const row of subsRes.rows) {
      subMap[row.gateway] = row;
    }

    const gateways = [
      {
        id: "url_scanner",
        name: "URL Sandbox & Heavy Detonation Chamber",
        description: "Isolated Chromium execution, CDP live screencast streaming, network HAR and post-render DOM analysis.",
        icon: "🖥️",
        status: subMap["url_scanner"]?.status || "ACTIVE",
        plan_tier: subMap["url_scanner"]?.plan_tier || org.plan_tier || "ENTERPRISE",
        quota_total: subMap["url_scanner"]?.quota_total ?? 999999,
        quota_used: subMap["url_scanner"]?.quota_used ?? 0,
        quota_remaining: Math.max(0, (subMap["url_scanner"]?.quota_total ?? 999999) - (subMap["url_scanner"]?.quota_used ?? 0))
      },
      {
        id: "browser_extension",
        name: "Zero-Trust Browser Extension Shield",
        description: "Client-side click interception in webmail, fast domain reputation check, and instant isolation.",
        icon: "🛡️",
        status: subMap["browser_extension"]?.status || "ACTIVE",
        plan_tier: subMap["browser_extension"]?.plan_tier || org.plan_tier || "ENTERPRISE",
        quota_total: subMap["browser_extension"]?.quota_total ?? 999999,
        quota_used: subMap["browser_extension"]?.quota_used ?? 0,
        quota_remaining: Math.max(0, (subMap["browser_extension"]?.quota_total ?? 999999) - (subMap["browser_extension"]?.quota_used ?? 0))
      },
      {
        id: "email_gateway",
        name: "Email Gateway (EML & Direct Mail API)",
        description: "MIME extraction, QR code phishing decode, multi-link batch detonation, and inline link rewriting.",
        icon: "📧",
        status: subMap["email_gateway_api"]?.status || "ACTIVE",
        plan_tier: subMap["email_gateway_api"]?.plan_tier || org.plan_tier || "ENTERPRISE",
        quota_total: subMap["email_gateway_api"]?.quota_total ?? 999999,
        quota_used: subMap["email_gateway_api"]?.quota_used ?? 0,
        quota_remaining: Math.max(0, (subMap["email_gateway_api"]?.quota_total ?? 999999) - (subMap["email_gateway_api"]?.quota_used ?? 0))
      },
      {
        id: "soc_api",
        name: "SOC API & SIEM Webhook Feeds",
        description: "STIX 2.1 Threat Intel bundles, Splunk/Sentinel/QRadar automated webhook dispatch, BYOK threat intel.",
        icon: "⚡",
        status: "ACTIVE",
        plan_tier: "ENTERPRISE",
        quota_total: 999999,
        quota_used: 12,
        quota_remaining: 999987
      }
    ];

    return res.status(200).json({
      success: true,
      data: {
        organization: org,
        gateways
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/v1/admin/gateways/:gateway
 * Update gateway parameters (status, tier, quota, max concurrency).
 */
async function updateGateway(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;
    const { gateway } = req.params;
    const { status, planTier, quotaTotal, maxConcurrentScans } = req.body || {};

    if (maxConcurrentScans) {
      await pool.query(
        "UPDATE organizations SET max_concurrent_scans = $1, updated_at = NOW() WHERE id = $2;",
        [parseInt(maxConcurrentScans, 10), orgId]
      );
    }

    const gatewayKey = gateway === "email_gateway" ? "email_gateway_api" : gateway;

    if (status || planTier || quotaTotal) {
      await pool.query(
        `INSERT INTO gateway_subscriptions (user_id, gateway, status, plan_tier, quota_total, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, gateway) DO UPDATE SET
           status = COALESCE($3, gateway_subscriptions.status),
           plan_tier = COALESCE($4, gateway_subscriptions.plan_tier),
           quota_total = COALESCE($5, gateway_subscriptions.quota_total),
           updated_at = NOW();`,
        [req.user?.id, gatewayKey, status || "ACTIVE", planTier || "PRO", quotaTotal || 500]
      );
    }

    await logAuditEvent(orgId, req.user?.id, "GATEWAY_MANAGEMENT", "GATEWAY_UPDATED", {
      gateway,
      status,
      plan_tier: planTier,
      quota_total: quotaTotal,
      max_concurrent_scans: maxConcurrentScans
    });

    return res.status(200).json({
      success: true,
      message: `Gateway '${gateway}' updated successfully.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/v1/admin/analytics
 * Enterprise analytics, threat distribution, and tenant KPIs.
 */
async function getAnalytics(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;

    // Total Scans & Verdict Breakdown
    const verdictsRes = await pool.query(`
      SELECT 
        COUNT(*)::int as total_scans,
        COUNT(CASE WHEN verdict = 'SAFE' THEN 1 END)::int as safe_count,
        COUNT(CASE WHEN verdict = 'SUSPICIOUS' THEN 1 END)::int as suspicious_count,
        COUNT(CASE WHEN verdict = 'MALICIOUS' THEN 1 END)::int as malicious_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int as failed_count,
        COALESCE(AVG(duration_ms), 6420)::int as avg_duration_ms
      FROM analyses
      WHERE organization_id = $1 OR organization_id IS NULL;
    `, [orgId]);

    // Active Users Count
    const usersCountRes = await pool.query(
      "SELECT COUNT(*)::int as active_users FROM organization_members WHERE organization_id = $1;",
      [orgId]
    );

    // Top Targeted / Intercepted Threat Domains
    const topDomainsRes = await pool.query(`
      SELECT 
        COALESCE(final_hostname, submitted_url) as domain,
        COUNT(*)::int as threat_count,
        MAX(verdict) as verdict
      FROM analyses
      WHERE verdict IN ('MALICIOUS', 'SUSPICIOUS')
      GROUP BY COALESCE(final_hostname, submitted_url)
      ORDER BY threat_count DESC
      LIMIT 6;
    `);

    // Top Active Scanning Users
    const topScannersRes = await pool.query(`
      SELECT 
        u.email,
        u.full_name,
        u.role,
        COUNT(a.id)::int as scan_count
      FROM analyses a
      JOIN users u ON u.id = a.requested_by_user_id
      GROUP BY u.id, u.email, u.full_name, u.role
      ORDER BY scan_count DESC
      LIMIT 5;
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: verdictsRes.rows[0] || {},
        activeUsers: usersCountRes.rows[0]?.active_users || 1,
        topThreatDomains: topDomainsRes.rows,
        topScanners: topScannersRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/v1/admin/audit-logs
 * Fetch organization audit log trail.
 */
async function getAuditLogs(req, res) {
  try {
    const orgId = req.user?.organizationId || DEFAULT_ORG_ID;

    const logsRes = await pool.query(`
      SELECT 
        ae.id,
        ae.resource_type as event_type,
        ae.action,
        ae.details as metadata,
        ae.ip_address,
        ae.created_at,
        ae.actor_id,
        u.email as actor_email,
        u.full_name as actor_name
      FROM audit_events ae
      LEFT JOIN users u ON u.id::text = ae.actor_id
      WHERE ae.organization_id = $1 OR ae.organization_id IS NULL
      ORDER BY ae.created_at DESC
      LIMIT 50;
    `, [orgId]);

    return res.status(200).json({
      success: true,
      data: logsRes.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getGateways,
  updateGateway,
  getAnalytics,
  getAuditLogs
};
