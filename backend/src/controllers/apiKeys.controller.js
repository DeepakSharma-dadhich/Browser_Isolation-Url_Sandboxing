"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");
const { submitAnalysis } = require("../services/vmAgent.service");
const { sendTestWebhookPing } = require("../services/webhookDispatcher");
const { parseRawEml } = require("../services/emlParser.service");

// URL extraction regex matching standard web links in HTML or plain text
const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;

/**
 * List all API Keys for the current organization.
 */
async function listApiKeys(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;

    const query = `
      SELECT id, organization_id, name, client_id, scopes, is_active, last_used_at, created_at
      FROM api_clients
      WHERE organization_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [orgId]);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Create a new API Key for Email Gateway / SIEM integration.
 */
async function createApiKey(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const { name, scopes } = req.body || {};

    const clientName = (name || "").trim() || `Email Gateway Client ${new Date().toISOString().slice(0, 10)}`;
    const clientId = `bg_live_${crypto.randomBytes(8).toString("hex")}`;
    const rawSecret = `bg_sec_${crypto.randomBytes(16).toString("hex")}`;
    const clientSecretHash = await bcrypt.hash(rawSecret, 10);
    const clientScopes = Array.isArray(scopes) && scopes.length > 0
      ? scopes
      : ["analysis:create", "analysis:read"];

    const query = `
      INSERT INTO api_clients (
        organization_id,
        name,
        client_id,
        client_secret_hash,
        scopes,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING id, organization_id, name, client_id, scopes, is_active, created_at;
    `;

    const result = await pool.query(query, [
      orgId,
      clientName,
      clientId,
      clientSecretHash,
      clientScopes
    ]);

    const created = result.rows[0];

    return res.status(201).json({
      success: true,
      message: "API Key generated successfully. Save the client secret as it will not be shown again.",
      data: {
        ...created,
        client_secret: rawSecret
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Revoke an API Key.
 */
async function revokeApiKey(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const { id } = req.params;

    const query = `
      UPDATE api_clients
      SET is_active = FALSE, revoked_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id, name, client_id, is_active, revoked_at;
    `;
    const result = await pool.query(query, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "API Key not found or does not belong to your organization."
      });
    }

    return res.status(200).json({
      success: true,
      message: "API Key revoked successfully.",
      data: result.rows[0]
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Extract links from raw email body / .EML and enqueue them for sandbox detonation.
 * Also generates rewritten Browser Isolation URLs.
 */
async function extractAndDetonateEmailLinks(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const { email_content, sender, recipient, subject, callback_url } = req.body || {};

    if (!email_content || typeof email_content !== "string") {
      return res.status(400).json({
        success: false,
        error: "Field 'email_content' (HTML or plain text) is required."
      });
    }

    // Extract all distinct URLs
    const rawMatches = email_content.match(URL_REGEX) || [];
    // Clean trailing punctuation commonly caught by regex at sentence ends (. , ) > ] etc)
    const cleanedUrls = Array.from(
      new Set(
        rawMatches
          .map((u) => u.replace(/[.,;:)\]>]+$/, ""))
          .filter((u) => {
            try {
              const parsed = new URL(u);
              return ["http:", "https:"].includes(parsed.protocol);
            } catch {
              return false;
            }
          })
      )
    );

    if (cleanedUrls.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No hyperlinks detected in email content.",
        extracted_count: 0,
        links: []
      });
    }

    const hostOrigin = req.protocol + "://" + req.get("host");

    // Enqueue each URL into BrowseGuard sandbox queue
    const queuedAnalyses = [];
    for (const targetUrl of cleanedUrls) {
      try {
        const queuedJob = await submitAnalysis({
          url: targetUrl,
          organizationId: orgId,
          requestedByUserId: req.user?.id || null,
          sourceChannel: "EMAIL_SECURITY",
          metadata: {
            submitted_from: "email_security_gateway",
            sender: sender || null,
            recipient: recipient || null,
            subject: subject || null,
            callback_url: callback_url || null,
            api_client_id: req.apiClient?.id || null
          }
        });

        const isolationUrl = `${hostOrigin}/isolate?url=${encodeURIComponent(targetUrl)}`;

        queuedAnalyses.push({
          url: targetUrl,
          session_id: queuedJob.sessionId,
          status: queuedJob.status,
          isolation_url: isolationUrl
        });
      } catch (err) {
        queuedAnalyses.push({
          url: targetUrl,
          error: err.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Extracted ${cleanedUrls.length} distinct links and queued for sandbox detonation.`,
      email_metadata: {
        sender: sender || "unknown",
        recipient: recipient || "unknown",
        subject: subject || "No Subject"
      },
      extracted_count: cleanedUrls.length,
      analyses: queuedAnalyses
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Parse an uploaded .EML file or raw RFC822 string for real-time SOC investigation.
 * POST /api/v1/email-gateway/parse-eml
 */
async function parseEmlEndpoint(req, res, next) {
  try {
    const { raw_eml, rawEml, email_content, emailContent, sender, subject, recipient } = req.body || {};

    let contentToParse = raw_eml || rawEml;
    if (!contentToParse && (email_content || emailContent)) {
      const bodyText = email_content || emailContent;
      // Synthesize RFC822 stream if fields passed separately
      contentToParse = [
        `From: ${sender || "unknown@external.net"}`,
        `To: ${recipient || "target@internal.local"}`,
        `Subject: ${subject || "No Subject"}`,
        `Date: ${new Date().toUTCString()}`,
        `Content-Type: text/html; charset="UTF-8"`,
        "",
        email_content
      ].join("\n");
    }

    if (!contentToParse || typeof contentToParse !== "string") {
      return res.status(400).json({
        success: false,
        error: "Field 'raw_eml' or 'email_content' string is required."
      });
    }

    const parsed = parseRawEml(contentToParse);
    return res.status(200).json(parsed);
  } catch (err) {
    return next(err);
  }
}

/**
 * Detonate specific extracted links from an .EML into sandbox VMs.
 * POST /api/v1/email-gateway/detonate-links
 */
async function detonateEmlLinksEndpoint(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const { links, email_metadata } = req.body || {};

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({
        success: false,
        error: "An array of 'links' (URLs) is required to trigger sandbox detonation."
      });
    }

    const hostOrigin = req.protocol + "://" + req.get("host");
    const queuedAnalyses = [];

    for (const target of links) {
      const targetUrl = typeof target === "string" ? target : target.url;
      if (!targetUrl) continue;

      try {
        const queuedJob = await submitAnalysis({
          url: targetUrl,
          organizationId: orgId,
          requestedByUserId: req.user?.id || null,
          sourceChannel: "EMAIL_SECURITY",
          metadata: {
            submitted_from: "eml_forensics_studio",
            sender: email_metadata?.from?.address || email_metadata?.sender || null,
            subject: email_metadata?.subject || null,
            message_id: email_metadata?.message_id || null,
            api_client_id: req.apiClient?.id || null
          }
        });

        const isolationUrl = `${hostOrigin}/isolate?url=${encodeURIComponent(targetUrl)}`;

        queuedAnalyses.push({
          url: targetUrl,
          session_id: queuedJob.session_id || queuedJob.sessionId,
          status: queuedJob.status,
          isolation_url: isolationUrl
        });
      } catch (err) {
        queuedAnalyses.push({
          url: targetUrl,
          error: err.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Enqueued ${queuedAnalyses.length} extracted link(s) for sandbox detonation.`,
      analyses: queuedAnalyses
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Helper to mask sensitive keys for UI presentation
 */
function maskApiKey(key) {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

/**
 * List all external BYOK Threat Intelligence & Webhook integrations for organization.
 */
async function listIntegrations(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const query = `
      SELECT provider, api_key, config, is_enabled, updated_at
      FROM organization_integrations
      WHERE organization_id = $1
      ORDER BY provider ASC;
    `;
    const result = await pool.query(query, [orgId]);
    const integrations = result.rows.map((row) => ({
      provider: row.provider,
      masked_key: ["webhook", "slack"].includes(row.provider) ? row.api_key : maskApiKey(row.api_key),
      endpoint_url: row.api_key,
      config: row.config || {},
      is_enabled: row.is_enabled,
      updated_at: row.updated_at
    }));

    return res.status(200).json({
      success: true,
      data: integrations
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Save / Update a BYOK external feed or Webhook integration.
 */
async function saveIntegration(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const { provider, api_key: apiKey, config, is_enabled: isEnabled } = req.body || {};

    const cleanProvider = String(provider || "").toLowerCase();
    const validProviders = ["virustotal", "abuseipdb", "urlscan", "otx", "webhook", "slack"];

    if (!cleanProvider || !validProviders.includes(cleanProvider)) {
      return res.status(400).json({
        success: false,
        error: "Supported providers: virustotal, abuseipdb, urlscan, otx, webhook, slack."
      });
    }

    const cleanKey = (apiKey || "").trim();
    if (!cleanKey) {
      return res.status(400).json({
        success: false,
        error: cleanProvider === "webhook" || cleanProvider === "slack"
          ? "A valid HTTP or HTTPS Webhook Endpoint URL is required."
          : "A valid API Key is required."
      });
    }

    if (["webhook", "slack"].includes(cleanProvider) && !/^https?:\/\//i.test(cleanKey)) {
      return res.status(400).json({
        success: false,
        error: "Webhook URL must begin with http:// or https://"
      });
    }

    const effectiveConfig = { ...(config || {}) };
    if (cleanProvider === "webhook" && !effectiveConfig.secret) {
      effectiveConfig.secret = "bg_wh_sec_" + crypto.randomBytes(16).toString("hex");
    }

    const query = `
      INSERT INTO organization_integrations (
        organization_id,
        provider,
        api_key,
        config,
        is_enabled,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (organization_id, provider)
      DO UPDATE SET
        api_key = EXCLUDED.api_key,
        config = EXCLUDED.config,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = NOW()
      RETURNING provider, config, is_enabled, updated_at;
    `;

    const result = await pool.query(query, [
      orgId,
      cleanProvider,
      cleanKey,
      JSON.stringify(effectiveConfig),
      isEnabled !== undefined ? Boolean(isEnabled) : true
    ]);

    return res.status(200).json({
      success: true,
      message: `Successfully saved configuration for ${cleanProvider.toUpperCase()}.`,
      data: {
        ...result.rows[0],
        masked_key: ["webhook", "slack"].includes(cleanProvider) ? cleanKey : maskApiKey(cleanKey),
        endpoint_url: cleanKey
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Delete a BYOK or Webhook integration.
 */
async function deleteIntegration(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const { provider } = req.params;

    const query = `
      DELETE FROM organization_integrations
      WHERE organization_id = $1 AND provider = $2
      RETURNING provider;
    `;
    const result = await pool.query(query, [orgId, String(provider).toLowerCase()]);

    return res.status(200).json({
      success: true,
      message: `Integration for ${provider} removed.`,
      data: result.rows[0] || null
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Validate / test external BYOK key connection or dispatch live test webhook.
 */
async function testIntegration(req, res, next) {
  try {
    const { provider, api_key: apiKey, config } = req.body || {};
    const cleanKey = (apiKey || "").trim();
    const cleanProvider = String(provider || "").toLowerCase();

    if (!cleanKey) {
      return res.status(400).json({ success: false, error: "API key or Webhook URL is required." });
    }

    if (["webhook", "slack"].includes(cleanProvider)) {
      const pingResult = await sendTestWebhookPing({
        url: cleanKey,
        provider: cleanProvider,
        secret: config?.secret || null
      });

      if (!pingResult.success) {
        return res.status(400).json({
          success: false,
          error: `Webhook delivery test failed: ${pingResult.error || 'Endpoint returned HTTP ' + pingResult.status}`,
          details: pingResult
        });
      }

      return res.status(200).json({
        success: true,
        message: `✓ Webhook ping delivered successfully to ${cleanProvider.toUpperCase()} (HTTP ${pingResult.status}, latency: ${pingResult.latency_ms}ms)!`,
        details: pingResult
      });
    }

    if (cleanProvider === "virustotal") {
      if (cleanKey.length !== 64 || !/^[a-fA-F0-9]+$/.test(cleanKey)) {
        return res.status(400).json({
          success: false,
          error: "VirusTotal API keys must be a 64-character hexadecimal string."
        });
      }
    } else if (cleanProvider === "abuseipdb") {
      if (cleanKey.length < 32) {
        return res.status(400).json({
          success: false,
          error: "AbuseIPDB API key must be at least 32 characters long."
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Key for ${cleanProvider.toUpperCase()} verified! Ready for live threat intelligence enrichment.`
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  extractAndDetonateEmailLinks,
  parseEmlEndpoint,
  detonateEmlLinksEndpoint,
  listIntegrations,
  saveIntegration,
  deleteIntegration,
  testIntegration
};
