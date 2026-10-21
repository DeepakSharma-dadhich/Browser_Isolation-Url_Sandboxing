"use strict";

const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");

/**
 * Check organization scan quota and concurrent scan limits.
 */
async function checkScanQuota(req, res, next) {
  const orgId = req.orgId || DEFAULT_ORG_ID;

  try {
    // 1. Fetch organization quota rules
    const orgRes = await pool.query(
      `SELECT max_concurrent_scans, monthly_scan_quota, plan_tier
       FROM organizations
       WHERE id = $1`,
      [orgId]
    );

    if (orgRes.rows.length === 0) {
      return next();
    }

    const org = orgRes.rows[0];

    // 2. Auto-reap abandoned zombie sessions older than 5 minutes
    await pool.query(
      `UPDATE analyses 
       SET status = 'FAILED', 
           error_message = 'Session timed out after exceeding max execution window',
           completed_at = NOW()
       WHERE organization_id = $1 AND status IN ('QUEUED', 'RUNNING') AND submitted_at < NOW() - INTERVAL '5 minutes'`,
      [orgId]
    ).catch(() => {});

    // 3. Check active concurrent scans
    const concurrentRes = await pool.query(
      `SELECT COUNT(*)::int AS active_count
       FROM analyses
       WHERE organization_id = $1 AND status IN ('QUEUED', 'RUNNING')`,
      [orgId]
    );

    const activeCount = concurrentRes.rows[0]?.active_count || 0;
    if (activeCount >= org.max_concurrent_scans) {
      return res.status(429).json({
        success: false,
        error: {
          code: "CONCURRENT_SCAN_LIMIT_EXCEEDED",
          message: `Tenant has reached the maximum concurrent scan limit (${org.max_concurrent_scans}). Please wait for active scans to finish.`,
          active_scans: activeCount,
          max_allowed: org.max_concurrent_scans
        }
      });
    }

    // 3. Check monthly scan usage
    const monthlyRes = await pool.query(
      `SELECT COUNT(*)::int AS monthly_count
       FROM analyses
       WHERE organization_id = $1 AND submitted_at >= date_trunc('month', NOW())`,
      [orgId]
    );

    const monthlyCount = monthlyRes.rows[0]?.monthly_count || 0;
    if (monthlyCount >= org.monthly_scan_quota) {
      return res.status(429).json({
        success: false,
        error: {
          code: "MONTHLY_QUOTA_EXCEEDED",
          message: `Tenant has exhausted the monthly scan quota (${org.monthly_scan_quota} scans). Contact administrator to upgrade plan tier.`,
          monthly_scans_used: monthlyCount,
          quota: org.monthly_scan_quota,
          plan_tier: org.plan_tier
        }
      });
    }

    return next();
  } catch (err) {
    console.error("[Quota Middleware Error]", err);
    // Fail-open on internal error to avoid blocking critical scans
    return next();
  }
}

module.exports = {
  checkScanQuota
};
