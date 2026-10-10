"use strict";

const path = require("path");
const fs = require("fs");

const {
  submitAnalysis,
  getAnalysisStatus,
  getAnalysisReport,
  SCREENSHOTS_DIR
} = require("../../services/vmAgent.service");

const {
  getAnalysisById,
  getReportByAnalysisId,
  getAnalysisByIdempotencyKey,
  listAnalyses,
  getAnalysisIocs,
  DEFAULT_ORG_ID
} = require("../../services/analysisRepository");

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
      return res.status(200).json({
        success: true,
        report_ready: true,
        data: rawReport
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

module.exports = {
  submitAnalysisV1,
  getAnalysisV1,
  getAnalysisStatusV1,
  getAnalysisScreenshotV1,
  listAnalysesV1,
  getAnalysisIocsV1
};
