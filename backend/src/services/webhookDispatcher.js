"use strict";

const crypto = require("crypto");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("./analysisRepository");

const WEBHOOK_SIGNING_SECRET =
  process.env.BROWSEGUARD_WEBHOOK_SECRET || "bg_wh_secret_default_2026";

/**
 * Dispatch an automated asynchronous webhook to an integrated Email Security Gateway, SIEM, or Slack.
 */
async function dispatchWebhook({
  sessionId,
  orgId = DEFAULT_ORG_ID,
  url,
  verdict,
  recommendedAction,
  allowUserAccess,
  riskScore = 0,
  riskLevel = "safe",
  durationMs,
  findingCount = 0,
  findings = [],
  metadata = {}
}) {
  const dispatchResults = [];

  // 1. Direct per-request callback URL if specified in analysis job metadata
  const perJobCallback = metadata?.callback_url;
  if (perJobCallback && typeof perJobCallback === "string") {
    const res = await sendSingleWebhook({
      endpointUrl: perJobCallback,
      signingSecret: WEBHOOK_SIGNING_SECRET,
      provider: "webhook",
      payload: {
        event: "analysis.completed",
        event_id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        timestamp: new Date().toISOString(),
        organization_id: orgId,
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
            isolation: `http://localhost:5173/?isolate=${encodeURIComponent(url)}`
          }
        }
      },
      sessionId,
      orgId
    });
    dispatchResults.push(res);
  }

  // 2. Organization-Wide SIEM / Slack integrations from organization_integrations table
  try {
    const orgIntegrationsRes = await pool.query(
      `SELECT provider, api_key, config 
       FROM organization_integrations 
       WHERE organization_id = $1 AND is_enabled = TRUE AND provider IN ('webhook', 'slack');`,
      [orgId]
    );

    for (const integ of orgIntegrationsRes.rows) {
      const endpointUrl = integ.api_key;
      if (!endpointUrl || !/^https?:\/\//i.test(endpointUrl)) continue;

      const cfg = integ.config || {};
      const minScore = Number(cfg.min_score !== undefined ? cfg.min_score : 60);
      const isMalicious = verdict === "MALICIOUS" || verdict === "HIGH_RISK";
      const isSuspicious = verdict === "SUSPICIOUS";

      // Check severity threshold filter unless alert_on_all is enabled
      if (!cfg.alert_on_all && !isMalicious && !isSuspicious && riskScore < minScore) {
        continue;
      }

      if (integ.provider === "slack") {
        const slackColor = isMalicious ? "#ef4444" : isSuspicious ? "#f59e0b" : "#10b981";
        const slackPayload = {
          text: `🚨 BrowseGuard Threat Alert: ${verdict || "UNKNOWN"} URL Detected (${riskScore}/100)`,
          attachments: [
            {
              color: slackColor,
              blocks: [
                {
                  type: "header",
                  text: { type: "plain_text", text: "🚨 BrowseGuard Zero-Trust Threat Alert" }
                },
                {
                  type: "section",
                  fields: [
                    { type: "mrkdwn", text: `*Verdict:*\n\`${verdict || "UNKNOWN"}\`` },
                    { type: "mrkdwn", text: `*Risk Score:*\n*${riskScore}/100*` },
                    { type: "mrkdwn", text: `*Action:*\n*${recommendedAction || "BLOCK"}*` },
                    { type: "mrkdwn", text: `*Findings:*\n${findingCount} threat indicators` }
                  ]
                },
                {
                  type: "section",
                  text: { type: "mrkdwn", text: `*Target URL:*\n\`${url}\`` }
                },
                {
                  type: "actions",
                  elements: [
                    {
                      type: "button",
                      text: { type: "plain_text", text: "⚡ Open in Isolated Browser" },
                      url: `http://localhost:5173/?isolate=${encodeURIComponent(url)}`,
                      style: "primary"
                    },
                    {
                      type: "button",
                      text: { type: "plain_text", text: "Inspect Forensic Report" },
                      url: `http://localhost:5173/?session=${sessionId}`
                    }
                  ]
                }
              ]
            }
          ]
        };

        const res = await sendSingleWebhook({
          endpointUrl,
          signingSecret: null,
          provider: "slack",
          payload: slackPayload,
          sessionId,
          orgId
        });
        dispatchResults.push(res);
      } else {
        // Standard Enterprise SIEM Webhook
        const secret = cfg.secret || WEBHOOK_SIGNING_SECRET;
        const siemPayload = {
          event: "threat.alert",
          event_id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          timestamp: new Date().toISOString(),
          organization_id: orgId,
          alert: {
            session_id: sessionId,
            url,
            verdict,
            recommended_action: recommendedAction,
            risk_score: riskScore,
            risk_level: riskLevel,
            finding_count: findingCount,
            findings_sample: findings.slice(0, 5),
            isolation_url: `http://localhost:5173/?isolate=${encodeURIComponent(url)}`,
            report_url: `/api/v1/analyses/${sessionId}`
          }
        };

        const res = await sendSingleWebhook({
          endpointUrl,
          signingSecret: secret,
          provider: "webhook",
          payload: siemPayload,
          sessionId,
          orgId
        });
        dispatchResults.push(res);
      }
    }
  } catch (dbErr) {
    console.error("[Webhook Dispatch DB Error]", dbErr.message);
  }

  return {
    dispatched: dispatchResults.length > 0,
    count: dispatchResults.length,
    results: dispatchResults
  };
}

/**
 * Send an individual webhook request with HMAC signature and record audit log.
 */
async function sendSingleWebhook({
  endpointUrl,
  signingSecret,
  provider = "webhook",
  payload,
  sessionId = null,
  orgId = DEFAULT_ORG_ID
}) {
  const startTime = Date.now();
  const payloadString = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "BrowseGuard-Security-Dispatcher/2.1.0"
  };

  let signatureHeader = null;
  if (signingSecret && provider === "webhook") {
    const signature = crypto
      .createHmac("sha256", signingSecret)
      .update(payloadString)
      .digest("hex");
    signatureHeader = `sha256=${signature}`;
    headers["X-BrowseGuard-Event"] = payload.event || "threat.alert";
    headers["X-BrowseGuard-Signature"] = signatureHeader;
  }

  let status = 0;
  let responseText = "";
  let dispatchError = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(endpointUrl, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    status = resp.status;
    responseText = await resp.text().catch(() => "");
  } catch (err) {
    dispatchError = err.message;
  }

  const latencyMs = Date.now() - startTime;

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
          endpoint_url: endpointUrl,
          provider,
          http_status: status,
          latency_ms: latencyMs,
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
    url: endpointUrl,
    provider,
    status,
    latency_ms: latencyMs,
    signature: signatureHeader,
    success: status >= 200 && status < 300,
    error: dispatchError
  };
}

/**
 * Send a live test ping to verify webhook connectivity from the UI.
 */
async function sendTestWebhookPing({
  url,
  provider = "webhook",
  secret = null
}) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("A valid HTTP or HTTPS endpoint URL is required.");
  }

  const startTime = Date.now();
  let payload;
  const signingSecret = secret || WEBHOOK_SIGNING_SECRET;

  if (provider === "slack") {
    payload = {
      text: "✅ BrowseGuard Alert Test: Connection Successfully Verified",
      attachments: [
        {
          color: "#00acf5",
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "✅ BrowseGuard Slack Integration Test" }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*Status:* Connected\n*Timestamp:* " + new Date().toISOString() + "\nBrowseGuard is authorized to deliver automated real-time threat alerts to this channel."
              }
            }
          ]
        }
      ]
    };
  } else {
    payload = {
      event: "test.ping",
      event_id: `evt_test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      message: "BrowseGuard Enterprise Webhook connectivity test successfully verified.",
      sample_alert: {
        verdict: "MALICIOUS",
        risk_score: 95,
        risk_level: "critical",
        sample_target_url: "https://login.microsoftonline.com.tenant-verify.phish-net.org",
        recommended_action: "BLOCK"
      }
    };
  }

  const payloadString = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "BrowseGuard-Security-Dispatcher/2.1.0"
  };

  let signatureHeader = null;
  if (provider === "webhook") {
    const signature = crypto
      .createHmac("sha256", signingSecret)
      .update(payloadString)
      .digest("hex");
    signatureHeader = `sha256=${signature}`;
    headers["X-BrowseGuard-Event"] = "test.ping";
    headers["X-BrowseGuard-Signature"] = signatureHeader;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const responseText = await resp.text().catch(() => "");

    return {
      success: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      latency_ms: latencyMs,
      signature: signatureHeader,
      response_snippet: responseText.slice(0, 200)
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      status: 0,
      latency_ms: Date.now() - startTime,
      error: err.message
    };
  }
}

module.exports = {
  dispatchWebhook,
  sendSingleWebhook,
  sendTestWebhookPing,
  WEBHOOK_SIGNING_SECRET
};
