"use strict";

const { pool } = require("../config/db");

const GATEWAY_CONFIG = {
  url_scanner: {
    name: "Interactive Threat Sandbox Studio",
    trial_quota: 500,
    trial_days: 14,
    pro_quota: 2500,
    enterprise_quota: 25000
  },
  browser_extension: {
    name: "Endpoint Browser Extension Shield",
    trial_quota: 50,
    trial_days: 14,
    pro_quota: 1000,
    enterprise_quota: 10000
  },
  email_gateway_api: {
    name: "Enterprise Email Security & API Gateway",
    trial_quota: 100,
    trial_days: 14,
    pro_quota: 2500,
    enterprise_quota: 25000
  }
};

const SUPPORTED_GATEWAYS = Object.keys(GATEWAY_CONFIG);

/**
 * Retrieve all gateway subscriptions and quotas for a user.
 */
async function getUserGatewaySubscriptions(userId) {
  if (!userId) return {};

  const query = `
    SELECT gateway, status, plan_tier, quota_total, quota_used, trial_started_at, expires_at, created_at
    FROM gateway_subscriptions
    WHERE user_id = $1;
  `;
  const result = await pool.query(query, [userId]);
  const rowsByGateway = {};
  for (const row of result.rows) {
    rowsByGateway[row.gateway] = row;
  }

  const now = new Date();
  const summary = {};

  for (const gw of SUPPORTED_GATEWAYS) {
    const config = GATEWAY_CONFIG[gw];
    const sub = rowsByGateway[gw];

    if (!sub) {
      summary[gw] = {
        gateway: gw,
        name: config.name,
        has_subscription: false,
        status: "LOCKED",
        plan_tier: "NONE",
        is_active: false,
        is_trial: false,
        is_expired: false,
        is_quota_exhausted: false,
        quota_total: 0,
        quota_used: 0,
        quota_remaining: 0,
        expires_at: null,
        days_remaining: 0,
        can_activate_trial: true
      };
      continue;
    }

    const expiresAt = new Date(sub.expires_at);
    const isExpired = expiresAt <= now;
    const isQuotaExhausted = sub.quota_used >= sub.quota_total;
    const isActive = !isExpired && !isQuotaExhausted && (sub.status === "ACTIVE" || sub.status === "TRIAL");
    const quotaRemaining = Math.max(0, sub.quota_total - sub.quota_used);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    let displayStatus = sub.status;
    if (isExpired) {
      displayStatus = "EXPIRED";
    } else if (isQuotaExhausted) {
      displayStatus = "QUOTA_EXHAUSTED";
    }

    summary[gw] = {
      gateway: gw,
      name: config.name,
      has_subscription: true,
      status: displayStatus,
      raw_status: sub.status,
      plan_tier: sub.plan_tier,
      is_active: isActive,
      is_trial: sub.status === "TRIAL",
      is_expired: isExpired,
      is_quota_exhausted: isQuotaExhausted,
      quota_total: sub.quota_total,
      quota_used: sub.quota_used,
      quota_remaining: quotaRemaining,
      expires_at: sub.expires_at,
      days_remaining: daysRemaining,
      can_activate_trial: false
    };
  }

  return summary;
}

/**
 * Activate a 14-day free trial for a specific gateway.
 */
async function activateGatewayTrial(userId, gateway) {
  if (!SUPPORTED_GATEWAYS.includes(gateway)) {
    const err = new Error(`Invalid gateway identifier '${gateway}'. Supported: ${SUPPORTED_GATEWAYS.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  const existingRes = await pool.query(
    "SELECT id, status, plan_tier FROM gateway_subscriptions WHERE user_id = $1 AND gateway = $2",
    [userId, gateway]
  );

  if (existingRes.rows.length > 0) {
    const err = new Error(`You have already activated or used the trial for '${GATEWAY_CONFIG[gateway].name}'. Upgrade to continue.`);
    err.statusCode = 409;
    err.code = "TRIAL_ALREADY_USED";
    throw err;
  }

  const config = GATEWAY_CONFIG[gateway];
  const query = `
    INSERT INTO gateway_subscriptions (
      user_id,
      gateway,
      status,
      plan_tier,
      quota_total,
      quota_used,
      trial_started_at,
      expires_at
    ) VALUES (
      $1,
      $2,
      'TRIAL',
      'FREE_TRIAL',
      $3,
      0,
      NOW(),
      NOW() + ($4 || ' days')::INTERVAL
    )
    RETURNING *;
  `;

  const result = await pool.query(query, [userId, gateway, config.trial_quota, config.trial_days]);
  return result.rows[0];
}

/**
 * Upgrade/Purchase a subscription for a specific gateway.
 */
async function upgradeGatewaySubscription(userId, gateway, planTier = "PRO") {
  if (!SUPPORTED_GATEWAYS.includes(gateway)) {
    const err = new Error(`Invalid gateway identifier '${gateway}'.`);
    err.statusCode = 400;
    throw err;
  }

  const normalizedTier = planTier.toUpperCase();
  const config = GATEWAY_CONFIG[gateway];
  const quota = normalizedTier === "ENTERPRISE" ? config.enterprise_quota : config.pro_quota;

  const query = `
    INSERT INTO gateway_subscriptions (
      user_id,
      gateway,
      status,
      plan_tier,
      quota_total,
      quota_used,
      trial_started_at,
      expires_at,
      updated_at
    ) VALUES (
      $1,
      $2,
      'ACTIVE',
      $3,
      $4,
      0,
      NOW(),
      NOW() + INTERVAL '1 year',
      NOW()
    )
    ON CONFLICT (user_id, gateway) DO UPDATE
    SET status = 'ACTIVE',
        plan_tier = $3,
        quota_total = $4,
        quota_used = 0,
        expires_at = NOW() + INTERVAL '1 year',
        updated_at = NOW()
    RETURNING *;
  `;

  const result = await pool.query(query, [userId, gateway, normalizedTier, quota]);
  return result.rows[0];
}

/**
 * Validate gateway entitlement and atomically consume 1 unit of quota.
 */
async function checkAndConsumeGatewayQuota(userId, gateway, count = 1) {
  if (!userId) {
    const err = new Error(`Authentication required for ${GATEWAY_CONFIG[gateway]?.name || gateway}.`);
    err.statusCode = 401;
    err.code = "AUTHENTICATION_REQUIRED";
    throw err;
  }

  const query = `
    SELECT id, user_id, gateway, status, plan_tier, quota_total, quota_used, expires_at
    FROM gateway_subscriptions
    WHERE user_id = $1 AND gateway = $2;
  `;
  const res = await pool.query(query, [userId, gateway]);

  if (res.rows.length === 0) {
    const err = new Error(
      `Access Denied: You do not have an active subscription or free trial for Gateway '${GATEWAY_CONFIG[gateway]?.name || gateway}'.`
    );
    err.statusCode = 403;
    err.code = "GATEWAY_ACCESS_DENIED";
    err.gateway = gateway;
    err.can_activate_trial = true;
    throw err;
  }

  const sub = res.rows[0];
  const now = new Date();
  const expiresAt = new Date(sub.expires_at);

  if (expiresAt <= now) {
    const err = new Error(
      `Your trial/subscription for ${GATEWAY_CONFIG[gateway]?.name || gateway} expired on ${expiresAt.toISOString().slice(0, 10)}. Please upgrade to run live VM analyses.`
    );
    err.statusCode = 403;
    err.code = "GATEWAY_SUBSCRIPTION_EXPIRED";
    err.gateway = gateway;
    err.can_upgrade = true;
    throw err;
  }

  if (sub.quota_used + count > sub.quota_total) {
    const err = new Error(
      `Heavy Compute Quota Exceeded: You have used ${sub.quota_used} of ${sub.quota_total} allowed operations for ${GATEWAY_CONFIG[gateway]?.name || gateway}. Upgrade to continue.`
    );
    err.statusCode = 429;
    err.code = "GATEWAY_QUOTA_EXCEEDED";
    err.gateway = gateway;
    err.quota_used = sub.quota_used;
    err.quota_total = sub.quota_total;
    err.can_upgrade = true;
    throw err;
  }

  // Atomically increment quota
  const updateRes = await pool.query(
    `UPDATE gateway_subscriptions
     SET quota_used = quota_used + $1, updated_at = NOW()
     WHERE id = $2
     RETURNING quota_used, quota_total, expires_at;`,
    [count, sub.id]
  );

  return {
    allowed: true,
    gateway,
    quota_used: updateRes.rows[0].quota_used,
    quota_total: updateRes.rows[0].quota_total,
    quota_remaining: Math.max(0, updateRes.rows[0].quota_total - updateRes.rows[0].quota_used)
  };
}

module.exports = {
  GATEWAY_CONFIG,
  SUPPORTED_GATEWAYS,
  getUserGatewaySubscriptions,
  activateGatewayTrial,
  upgradeGatewaySubscription,
  checkAndConsumeGatewayQuota
};
