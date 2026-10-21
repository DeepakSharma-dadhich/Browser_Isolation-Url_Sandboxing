"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pool } = require("../../config/db");
const { sendSingleWebhook, WEBHOOK_SIGNING_SECRET } = require("../../services/webhookDispatcher");

const {
  submitAnalysis,
  getAnalysisStatus,
  getAnalysisReport,
  SCREENSHOTS_DIR,
  OUTPUT_DIR
} = require("../../services/vmAgent.service");

const {
  getAnalysisById,
  getReportByAnalysisId,
  getAnalysisByIdempotencyKey,
  listAnalyses,
  getAnalysisIocs,
  DEFAULT_ORG_ID
} = require("../../services/analysisRepository");

const {
  buildStixBundleForAnalysis,
  buildAggregatedStixThreatFeed
} = require("../../services/stixExporter.service");

/**
 * Normalize source channel from request.
 */
function normalizeSourceChannel(source) {
  if (!source) return "EXTERNAL_API";
  const s = String(source).toUpperCase();
  if (["EMAIL_SECURITY", "EMAIL_GATEWAY"].includes(s)) return "EMAIL_SECURITY";
  if (["EXTENSION", "BROWSER_EXTENSION"].includes(s)) return "EXTENSION";
  if (["MANUAL", "DASHBOARD"].includes(s)) return "MANUAL";
  return "EXTERNAL_API";
}

/**
 * POST /api/v1/analyses
 *
 * Primary entry point for programmatic Email Threat Detection & API scanners.
 */
async function submitAnalysisV1(req, res, next) {
  try {
    const {
      url,
      source,
      idempotency_key: idempotencyKey,
      callback_url: callbackUrl,
      client_reference_id: clientReferenceId,
      scan_options: scanOptions
    } = req.body || {};

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_URL",
          message: "A valid 'url' string is required in the request body."
        }
      });
    }

    const orgId = req.orgId || DEFAULT_ORG_ID;
    const sourceChannel = normalizeSourceChannel(source);

    // 1. Idempotency Check: Avoid redundant re-scanning if idempotency key is supplied
    if (idempotencyKey) {
      const existing = await getAnalysisByIdempotencyKey(orgId, idempotencyKey);
      if (existing) {
        return res.status(200).json({
          success: true,
          is_idempotent_replay: true,
          message: "Returning previously registered analysis for this idempotency key.",
          data: {
            analysis_id: existing.session_id,
            url: existing.submitted_url,
            status: existing.status.toUpperCase(),
            verdict: existing.verdict,
            risk_score: existing.risk_score,
            report_ready: existing.report_ready,
            created_at: existing.created_at,
            links: {
              self: `/api/v1/analyses/${existing.session_id}`,
              status: `/api/v1/analyses/${existing.session_id}/status`,
              report: `/api/v1/analyses/${existing.session_id}`,
              screenshot: `/api/v1/analyses/${existing.session_id}/screenshot`
            }
          }
        });
      }
    }

    // 2. Enqueue analysis job in VM Agent queue & register in PostgreSQL
    const metadata = {
      client_reference_id: clientReferenceId || null,
      callback_url: callbackUrl || null,
      scan_options: scanOptions || {},
      api_client_id: req.apiClient?.id || null
    };

    const queuedJob = await submitAnalysis({
      url,
      metadata,
      orgId,
      userId: req.user?.id || null,
      sourceChannel,
      idempotencyKey
    });

    return res.status(202).json({
      success: true,
      message: "Analysis request queued successfully.",
      data: {
        analysis_id: queuedJob.session_id,
        url: queuedJob.url,
        status: "QUEUED",
        source_channel: sourceChannel,
        submitted_at: queuedJob.submitted_at || new Date().toISOString(),
        links: {
          self: `/api/v1/analyses/${queuedJob.session_id}`,
          status: `/api/v1/analyses/${queuedJob.session_id}/status`,
          report: `/api/v1/analyses/${queuedJob.session_id}`,
          screenshot: `/api/v1/analyses/${queuedJob.session_id}/screenshot`
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/:id
 *
 * Retrieve full canonical report or current execution state.
 */
async function getAnalysisV1(req, res, next) {
  try {
    const analysisId = req.params.id;

    // 1. Check full canonical report first from PostgreSQL
    let rawReport = await getReportByAnalysisId(analysisId);
    if (!rawReport) {
      // Trigger disk check & DB ingestion if ready on disk
      try {
        rawReport = await getAnalysisReport(analysisId);
      } catch {}
    }

    if (rawReport) {
      const enrichedReport = {
        ...rawReport,
        submitted_url: rawReport.submitted_url || rawReport.target?.submitted_url || null,
        final_url: rawReport.final_url || rawReport.target?.final_url || null,
        page_title: rawReport.page_title || rawReport.target?.page_title || null,
        verdict: rawReport.verdict || rawReport.decision?.verdict || "UNKNOWN",
        risk_score: typeof rawReport.risk_score === "number" ? rawReport.risk_score : (rawReport.decision?.risk_score ?? 0),
        risk_level: rawReport.risk_level || rawReport.decision?.risk_level || (rawReport.decision?.risk_score >= 70 ? "HIGH" : rawReport.decision?.risk_score >= 30 ? "MEDIUM" : "LOW"),
        findings: rawReport.findings || rawReport.analysis?.findings || [],
        duration_ms: rawReport.duration_ms || rawReport.execution?.duration_ms || null,
      };

      return res.status(200).json({
        success: true,
        report_ready: true,
        data: enrichedReport
      });
    }

    // 2. Return current running state
    const statusData = await getAnalysisById(analysisId);
    if (statusData) {
      return res.status(200).json({
        success: true,
        report_ready: false,
        data: statusData
      });
    }

    return res.status(404).json({
      success: false,
      error: {
        code: "ANALYSIS_NOT_FOUND",
        message: `Analysis with ID '${analysisId}' was not found.`
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/:id/status
 *
 * Fast polling endpoint for automated email gateways and integrations.
 */
async function getAnalysisStatusV1(req, res, next) {
  try {
    const analysisId = req.params.id;

    // Check if report is already finalized in PostgreSQL
    const dbAnalysis = await getAnalysisById(analysisId);
    if (dbAnalysis && dbAnalysis.report_ready) {
      return res.status(200).json({
        success: true,
        data: {
          analysis_id: dbAnalysis.session_id,
          status: dbAnalysis.status.toUpperCase(),
          verdict: dbAnalysis.verdict,
          recommended_action: dbAnalysis.recommended_action,
          allow_user_access: dbAnalysis.allow_user_access,
          risk_score: dbAnalysis.risk_score,
          risk_level: dbAnalysis.risk_level,
          finding_count: dbAnalysis.finding_count,
          duration_ms: dbAnalysis.duration_ms,
          report_ready: true,
          submitted_at: dbAnalysis.created_at,
          completed_at: dbAnalysis.completed_at
        }
      });
    }

    // If not yet finalized in DB, check vmAgent service (which checks disk & ingests report into DB if complete)
    const activeStatus = await getAnalysisStatus(analysisId);
    return res.status(200).json({
      success: true,
      data: {
        analysis_id: activeStatus.session_id || analysisId,
        status: (activeStatus.status || "QUEUED").toUpperCase(),
        verdict: activeStatus.verdict || "UNKNOWN",
        recommended_action: activeStatus.recommended_action || "REVIEW",
        allow_user_access: activeStatus.allow_user_access || false,
        risk_score: activeStatus.risk_score || 0,
        risk_level: activeStatus.risk_level || "unknown",
        finding_count: activeStatus.finding_count || 0,
        duration_ms: activeStatus.duration_ms || null,
        report_ready: Boolean(activeStatus.report_ready),
        submitted_at: activeStatus.submitted_at || activeStatus.created_at,
        completed_at: activeStatus.completed_at || null
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/:id/screenshot
 *
 * Stream captured visual evidence PNG.
 */
async function getAnalysisScreenshotV1(req, res, next) {
  try {
    const analysisId = req.params.id;
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      analysisId,
      "final_page.png"
    );

    if (!fs.existsSync(screenshotPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: "SCREENSHOT_NOT_FOUND",
          message: "No screenshot artifact is available for this analysis."
        }
      });
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(path.resolve(screenshotPath));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses
 *
 * List and filter historical analysis records.
 */
async function listAnalysesV1(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const verdict = req.query.verdict || null;
    const status = req.query.status || null;
    const search = req.query.search || null;

    const items = await listAnalyses({
      orgId,
      limit,
      offset,
      verdict,
      status,
      search
    });

    return res.status(200).json({
      success: true,
      meta: {
        limit,
        offset,
        count: items.length
      },
      data: items
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/:id/iocs
 *
 * Retrieve structured Indicators of Compromise (IOCs) & MITRE ATT&CK matrix for SOC blocklisting.
 */
async function getAnalysisIocsV1(req, res, next) {
  try {
    const analysisId = req.params.id;
    const iocs = await getAnalysisIocs(analysisId);
    if (!iocs) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Analysis not found or IOCs not yet ready."
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: iocs
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/:id/har
 *
 * Download full network stream HTTP Archive (HAR) log for ANY.RUN-style packet analysis.
 */
async function getAnalysisHarV1(req, res, next) {
  try {
    const analysisId = req.params.id;
    const harPath = path.join(
      OUTPUT_DIR,
      analysisId,
      "network",
      "traffic.har"
    );

    if (!fs.existsSync(harPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: "HAR_NOT_FOUND",
          message: "No HAR network traffic log is available for this analysis."
        }
      });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analysis_${analysisId}_network.har"`
    );
    return res.sendFile(path.resolve(harPath));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/:id/dom
 *
 * View rendered DOM HTML snapshot.
 */
async function getAnalysisDomV1(req, res, next) {
  try {
    const analysisId = req.params.id;
    const domPath = path.join(
      OUTPUT_DIR,
      analysisId,
      "html",
      "page.html"
    );

    if (!fs.existsSync(domPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: "DOM_NOT_FOUND",
          message: "No DOM HTML snapshot is available for this analysis."
        }
      });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.sendFile(path.resolve(domPath));
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/:id/stix
 *
 * Export OASIS STIX 2.1 Threat Intelligence Bundle for this analysis.
 */
async function getAnalysisStixV1(req, res, next) {
  try {
    const analysisId = req.params.id;
    const isDownload = req.query.download === "true";

    const stixBundle = await buildStixBundleForAnalysis(analysisId);

    if (isDownload) {
      res.setHeader("Content-Disposition", `attachment; filename="browseguard_stix_${analysisId}.json"`);
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(stixBundle);
  } catch (error) {
    if (error.message && error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: { code: "ANALYSIS_NOT_FOUND", message: error.message }
      });
    }
    return next(error);
  }
}

/**
 * GET /api/v1/analyses/threat-feed/stix
 *
 * Aggregated STIX 2.1 threat feed for SIEM, SOAR, and TAXII polling.
 */
async function getAggregatedStixThreatFeedV1(req, res, next) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const feedBundle = await buildAggregatedStixThreatFeed(orgId, limit);

    if (req.query.download === "true") {
      res.setHeader("Content-Disposition", `attachment; filename="browseguard_threat_feed_stix21.json"`);
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(feedBundle);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/analyses/:id/dispatch-siem
 *
 * Dispatch an authoritative Security Incident Alert to configured SIEM / SOAR / Slack webhooks.
 * Supports manual target Webhook URL override and custom containment checklist telemetry.
 */
async function dispatchSiemAlertV1(req, res, next) {
  try {
    const analysisId = req.params.id;
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const {
      target_url: customWebhookUrl,
      tlp = "TLP:AMBER+STRICT",
      containment_checklist = {},
      notes = ""
    } = req.body || {};

    // 1. Fetch analysis details and IOCs
    const analysis = await getAnalysisById(analysisId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { code: "ANALYSIS_NOT_FOUND", message: `Analysis '${analysisId}' was not found.` }
      });
    }

    const iocs = await getAnalysisIocs(analysisId);

    // 2. Format authoritative SIEM incident payload
    const incidentPayload = {
      event: "incident.security_alert",
      event_id: `evt_ir_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      timestamp: new Date().toISOString(),
      tlp,
      incident: {
        case_id: `BG-IR-${analysisId.toUpperCase().replace(/^SESSION_/, "")}`,
        analysis_id: analysisId,
        verdict: analysis.verdict,
        risk_score: analysis.risk_score,
        risk_level: analysis.risk_level,
        recommended_action: analysis.recommended_action,
        allow_user_access: analysis.allow_user_access,
        target_url: analysis.submitted_url,
        final_url: analysis.final_url,
        domain_changed: Boolean(analysis.metadata?.domain_changed),
        mitre_attack: (iocs?.mitre_attack_matrix || iocs?.mitre_attack || []).map((m) => ({
          id: m.id,
          name: m.name,
          severity: m.severity
        })),
        iocs: {
          urls: iocs?.indicators?.urls || [analysis.submitted_url],
          domains: iocs?.indicators?.domains || [],
          ips: iocs?.indicators?.ips || []
        },
        containment_checklist,
        analyst_notes: notes,
        analyst: {
          id: req.user?.id || "usr_soc_admin",
          name: req.user?.fullName || "Security Administrator",
          role: req.user?.role || "ADMIN"
        },
        links: {
          report: `/api/v1/analyses/${analysisId}`,
          screenshot: `/api/v1/analyses/${analysisId}/screenshot`,
          stix: `/api/v1/analyses/${analysisId}/stix`
        }
      }
    };

    const dispatches = [];

    // 3. Direct target webhook if provided in request body
    if (customWebhookUrl && /^https?:\/\//i.test(customWebhookUrl)) {
      const pingResult = await sendSingleWebhook({
        endpointUrl: customWebhookUrl,
        signingSecret: WEBHOOK_SIGNING_SECRET,
        provider: "webhook",
        payload: incidentPayload,
        sessionId: analysisId,
        orgId
      });
      dispatches.push(pingResult);
    }

    // 4. Also check active integrations configured in organization_integrations table
    const integrationsRes = await pool.query(
      `SELECT provider, api_key, config 
       FROM organization_integrations 
       WHERE organization_id = $1 AND is_enabled = TRUE AND provider IN ('webhook', 'slack');`,
      [orgId]
    );

    for (const integ of integrationsRes.rows) {
      const endpoint = integ.api_key;
      // Skip if already sent to this exact endpoint
      if (!endpoint || dispatches.some((d) => d.url === endpoint)) continue;

      const singleRes = await sendSingleWebhook({
        endpointUrl: endpoint,
        provider: integ.provider,
        payload: incidentPayload,
        signingSecret: integ.config?.secret || WEBHOOK_SIGNING_SECRET,
        sessionId: analysisId,
        orgId
      });
      dispatches.push(singleRes);
    }

    if (dispatches.length === 0) {
      return res.status(400).json({
        success: false,
        error: "NO_WEBHOOK_CONFIGURED",
        message: "No active SIEM or Webhook integration found. Provide a target_url or configure an integration in API Keys & BYOK."
      });
    }

    const anySuccess = dispatches.some((d) => d.success);
    return res.status(anySuccess ? 200 : 502).json({
      success: anySuccess,
      message: anySuccess
        ? `Incident alert successfully delivered to ${dispatches.filter((d) => d.success).length} destination(s).`
        : "Failed to deliver incident alert to configured destinations.",
      incident_id: incidentPayload.incident.case_id,
      event_id: incidentPayload.event_id,
      dispatches
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  submitAnalysisV1,
  getAnalysisV1,
  getAnalysisStatusV1,
  getAnalysisScreenshotV1,
  listAnalysesV1,
  getAnalysisIocsV1,
  getAnalysisHarV1,
  getAnalysisDomV1,
  getAnalysisStixV1,
  getAggregatedStixThreatFeedV1,
  dispatchSiemAlertV1
};

