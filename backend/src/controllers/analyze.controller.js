"use strict";

/**
 * URL analysis API controller.
 *
 * This controller does not run browser analysis.
 * It delegates host-to-VM communication and database persistence
 * to vmAgent.service.js and analysisRepository.js.
 */

const path = require("path");
const fs = require("fs");

const {
  submitAnalysis,
  getAnalysisStatus,
  getAnalysisReport,
  listAnalyses,
  SCREENSHOTS_DIR,
  OUTPUT_DIR
} = require("../services/vmAgent.service");

/**
 * POST /api/analyze
 *
 * Body:
 * {
 *   "url": "https://example.com",
 *   "metadata": {}
 * }
 */
async function analyzeUrl(request, response, next) {
  try {
    const result = await submitAnalysis({
      url: request.body?.url,
      metadata: request.body?.metadata,
      orgId: request.orgId,
      userId: request.user?.id || null,
      sourceChannel: request.sourceChannel || "MANUAL"
    });

    return response.status(202).json({
      success: true,
      message: "URL analysis request was queued successfully.",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/analyze/:sessionId/status
 */
async function getStatus(request, response, next) {
  try {
    const result = await getAnalysisStatus(request.params.sessionId);

    return response.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/analyze/:sessionId/report
 */
async function getReport(request, response, next) {
  try {
    const report = await getAnalysisReport(request.params.sessionId);

    return response.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/analyze/history
 */
async function getHistory(request, response, next) {
  try {
    const limit = Math.min(
      100,
      Math.max(1, parseInt(request.query.limit, 10) || 50)
    );
    const offset = Math.max(0, parseInt(request.query.offset, 10) || 0);
    const verdict = request.query.verdict || null;
    const status = request.query.status || null;
    const search = request.query.search || null;

    let items = [];
    try {
      items = await listAnalyses({
        limit,
        offset,
        verdict,
        status,
        search
      });
    } catch (dbErr) {
      console.warn("[History Warning] Database query failed, returning fallback list:", dbErr.message);
      items = [];
    }

    return response.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    return next(error);
  }
}

const SESSION_ID_REGEX = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * Validate session ID to prevent path traversal.
 */
function assertValidSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== "string" || !SESSION_ID_REGEX.test(sessionId)) {
    const error = new Error("Invalid session identifier provided.");
    error.statusCode = 400;
    error.code = "INVALID_SESSION_ID";
    throw error;
  }
}

/**
 * Ensure resolved file path is safely contained within the intended base directory.
 */
function assertPathContained(targetPath, baseDir) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    const error = new Error("Access denied: path traversal detected.");
    error.statusCode = 403;
    error.code = "ACCESS_DENIED";
    throw error;
  }
  return resolvedTarget;
}

/**
 * GET /api/analyze/:sessionId/screenshot
 */
async function getScreenshot(request, response, next) {
  try {
    const sessionId = request.params.sessionId;
    assertValidSessionId(sessionId);

    const safePath = assertPathContained(
      path.join(SCREENSHOTS_DIR, sessionId, "final_page.png"),
      SCREENSHOTS_DIR
    );

    if (!fs.existsSync(safePath)) {
      return response.status(404).json({
        success: false,
        error: {
          code: "SCREENSHOT_NOT_FOUND",
          message: "No screenshot is available for this session."
        }
      });
    }

    response.setHeader("Content-Type", "image/png");
    response.setHeader("Content-Security-Policy", "default-src 'none'");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    return response.sendFile(safePath);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/analyze/:sessionId/har
 */
async function getHar(request, response, next) {
  try {
    const sessionId = request.params.sessionId;
    assertValidSessionId(sessionId);

    const safePath = assertPathContained(
      path.join(OUTPUT_DIR, sessionId, "network", "traffic.har"),
      OUTPUT_DIR
    );

    if (!fs.existsSync(safePath)) {
      return response.status(404).json({
        success: false,
        error: {
          code: "HAR_NOT_FOUND",
          message: "No HAR network traffic log is available for this session."
        }
      });
    }

    response.setHeader("Content-Type", "application/json");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="analysis_${sessionId}_network.har"`
    );
    return response.sendFile(safePath);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/analyze/:sessionId/dom
 */
async function getDom(request, response, next) {
  try {
    const sessionId = request.params.sessionId;
    assertValidSessionId(sessionId);

    const safePath = assertPathContained(
      path.join(OUTPUT_DIR, sessionId, "html", "page.html"),
      OUTPUT_DIR
    );

    if (!fs.existsSync(safePath)) {
      return response.status(404).json({
        success: false,
        error: {
          code: "DOM_NOT_FOUND",
          message: "No DOM HTML snapshot is available for this session."
        }
      });
    }

    // Serve untrusted detonated HTML inside a sandboxed CSP context to prevent XSS
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return response.sendFile(safePath);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  analyzeUrl,
  getStatus,
  getReport,
  getHistory,
  getScreenshot,
  getHar,
  getDom
};