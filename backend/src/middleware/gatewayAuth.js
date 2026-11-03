"use strict";

const { pool } = require("../config/db");
const { checkAndConsumeGatewayQuota, getUserGatewaySubscriptions } = require("../services/subscription.service");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");

/**
 * Middleware factory enforcing isolated gateway subscriptions and compute quota.
 * 
 * @param {'url_scanner' | 'browser_extension' | 'email_gateway_api'} gateway
 * @param {Object} options
 * @param {boolean} options.consumeQuota - Whether to decrement quota on this request (default: true)
 */
function enforceGateway(gateway, options = { consumeQuota: true }) {
  return async function (req, res, next) {
    try {
      let targetUserId = req.user?.id || null;

      // 1. If authenticated via API Client, resolve organization owner user
      if (!targetUserId && req.apiClient) {
        const orgRes = await pool.query(
          `SELECT user_id FROM organization_members 
           WHERE organization_id = $1 
           ORDER BY CASE role WHEN 'OWNER' THEN 1 WHEN 'ADMIN' THEN 2 ELSE 3 END 
           LIMIT 1;`,
          [req.apiClient.organization_id || req.orgId || DEFAULT_ORG_ID]
        );
        if (orgRes.rows.length > 0) {
          targetUserId = orgRes.rows[0].user_id;
        }
      }

      // 2. If authenticated via extension token without req.user, lookup user
      if (!targetUserId && req.headers["x-extension-token"]) {
        const extToken = req.headers["x-extension-token"];
        const extRes = await pool.query(
          "SELECT id FROM users WHERE extension_token = $1 AND is_active = TRUE LIMIT 1;",
          [extToken]
        );
        if (extRes.rows.length > 0) {
          targetUserId = extRes.rows[0].id;
        }
      }

      // 3. Fallback: If no user found, resolve default demo admin user
      if (!targetUserId) {
        const defaultAdminRes = await pool.query(
          "SELECT id FROM users WHERE email = 'admin@browseguard.local' OR role = 'ADMIN' ORDER BY id ASC LIMIT 1;"
        );
        if (defaultAdminRes.rows.length > 0) {
          targetUserId = defaultAdminRes.rows[0].id;
        } else {
          targetUserId = "00000000-0000-0000-0000-000000000010";
        }
      }

      // 4. If request only needs read/access check without consuming quota
      if (!options.consumeQuota) {
        const subs = await getUserGatewaySubscriptions(targetUserId);
        const sub = subs[gateway];
        if (!sub || !sub.is_active) {
          return res.status(403).json({
            success: false,
            error: {
              code: "GATEWAY_ACCESS_DENIED",
              gateway,
              message: `You do not have active access to gateway '${gateway}'.`,
              status: sub?.status || "LOCKED",
              can_activate_trial: sub?.can_activate_trial ?? true
            }
          });
        }
        req.gatewaySubscription = sub;
        return next();
      }

      // 5. Check entitlement & atomically consume heavy compute quota
      const quotaResult = await checkAndConsumeGatewayQuota(targetUserId, gateway, 1);
      req.gatewayQuota = quotaResult;
      return next();

    } catch (err) {
      if (err.code === "57P03" || (err.message && err.message.includes("recovery mode"))) {
        console.warn("[Gateway Warning] Database recovering, granting temporary pass-through for gateway:", gateway);
        req.gatewayQuota = { allowed: true, quota_remaining: 999 };
        return next();
      }
      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: err.code || "GATEWAY_ERROR",
          gateway: err.gateway || gateway,
          message: err.message,
          can_activate_trial: err.can_activate_trial || false,
          can_upgrade: err.can_upgrade || false,
          quota_used: err.quota_used,
          quota_total: err.quota_total
        }
      });
    }
  };
}

/**
 * Dynamically determines target gateway from request signature and enforces isolation.
 */
function enforceDynamicGateway(options = { consumeQuota: true }) {
  return async function (req, res, next) {
    let targetGateway = "url_scanner";

    if (
      req.headers["x-extension-token"] ||
      req.sourceChannel === "EXTENSION" ||
      req.body?.source === "BROWSER_EXTENSION"
    ) {
      targetGateway = "browser_extension";
    } else if (
      req.headers["x-api-key"] ||
      req.apiClient ||
      req.sourceChannel === "EMAIL_SECURITY" ||
      req.body?.source === "EMAIL_SECURITY"
    ) {
      targetGateway = "email_gateway_api";
    }

    return enforceGateway(targetGateway, options)(req, res, next);
  };
}

module.exports = {
  enforceGateway,
  enforceDynamicGateway
};
