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
  SCREENSHOTS_DIR
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

    const items = await listAnalyses({
      limit,
      offset,
      verdict,
      status,
      search
    });

    return response.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/analyze/:sessionId/screenshot
 */
async function getScreenshot(request, response, next) {
  try {
    const sessionId = request.params.sessionId;
    const screenshotPath = path.join(
      SCREENSHOTS_DIR,
      sessionId,
      "final_page.png"
    );

    if (!fs.existsSync(screenshotPath)) {
      return response.status(404).json({
        success: false,
        error: {
          code: "SCREENSHOT_NOT_FOUND",
          message: "No screenshot is available for this session."
        }
      });
    }

    return response.sendFile(path.resolve(screenshotPath));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  analyzeUrl,
  getStatus,
  getReport,
  getHistory,
  getScreenshot
};