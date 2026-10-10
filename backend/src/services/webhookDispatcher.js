"use strict";

const crypto = require("crypto");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("./analysisRepository");

const WEBHOOK_SIGNING_SECRET =
  process.env.BROWSEGUARD_WEBHOOK_SECRET || "bg_wh_secret_default_2026";

/**
 * Dispatch an automated asynchronous webhook to an integrated Email Security Gateway or SIEM.
 */
async function dispatchWebhook({
  sessionId,
  orgId = DEFAULT_ORG_ID,
  url,
  verdict,
  recommendedAction,
  allowUserAccess,
  riskScore,
  riskLevel,
  durationMs,
  findingCount = 0,
  findings = [],
  metadata = {}
}) {
  const callbackUrl = metadata?.callback_url;
  if (!callbackUrl || typeof callbackUrl !== "string") {
    return { dispatched: false, reason: "NO_CALLBACK_URL" };
  }

  const payload = {
    event: "analysis.completed",
    event_id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    timestamp: new Date().toISOString(),
    analysis: {
      session_id: sessionId,
      url,
      verdict,
      recommended_action: recommendedAction,
      allow_user_access: allowUserAccess,
      risk_score: riskScore,
      risk_level: riskLevel,
      duration_ms: durationMs,
      finding_count: findingCount,
      findings_sample: findings.slice(0, 5),
      client_reference_id: metadata?.client_reference_id || null,
      links: {
        report: `/api/v1/analyses/${sessionId}`,
        screenshot: `/api/v1/analyses/${sessionId}/screenshot`,
        status: `/api/v1/analyses/${sessionId}/status`
      }
    }
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", WEBHOOK_SIGNING_SECRET)
    .update(payloadString)
    .digest("hex");

  let status = 0;
  let responseText = "";
  let dispatchError = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BrowseGuard-Webhook-Dispatcher/2.1.0",
        "X-BrowseGuard-Event": "analysis.completed",
        "X-BrowseGuard-Signature": `sha256=${signature}`
      },
      body: payloadString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    status = resp.status;
    responseText = await resp.text().catch(() => "");
  } catch (err) {
    dispatchError = err.message;
  }

  // Record audit event in PostgreSQL
  try {
    await pool.query(
      `INSERT INTO audit_events (
        organization_id,
        actor_type,
        actor_id,
        action,
        resource_type,
        resource_id,
        details
      ) VALUES ($1, 'SYSTEM', 'webhook_dispatcher', 'WEBHOOK_DISPATCHED', 'ANALYSIS', $2, $3);`,
      [
        orgId,
        sessionId,
        JSON.stringify({
          callback_url: callbackUrl,
          http_status: status,
          success: status >= 200 && status < 300,
          error: dispatchError,
          response_snippet: responseText.slice(0, 256)
        })
      ]
    );
  } catch (auditErr) {
    console.error("[Webhook Audit Error]", auditErr.message);
  }

  return {
    dispatched: true,
    status,
    success: status >= 200 && status < 300,
    error: dispatchError
  };
}

module.exports = {
  dispatchWebhook
};
