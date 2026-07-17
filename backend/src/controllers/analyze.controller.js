"use strict";

/**
 * URL analysis API controller.
 *
 * This controller does not run browser analysis.
 * It delegates host-to-VM communication to vmAgent.service.js.
 */

const {
  submitAnalysis,
  getAnalysisStatus,
  getAnalysisReport
} = require(
  "../services/vmAgent.service"
);


/**
 * POST /api/analyze
 *
 * Body:
 *
 * {
 *   "url": "https://example.com",
 *   "metadata": {}
 * }
 */
async function analyzeUrl(
  request,
  response,
  next
) {
  try {
    const result =
      await submitAnalysis({
        url: request.body?.url,
        metadata:
          request.body?.metadata
      });

    return response
      .status(202)
      .json({
        success: true,

        message:
          "URL analysis request was queued successfully.",

        data: result
      });
  } catch (error) {
    return next(error);
  }
}


/**
 * GET /api/analyze/:sessionId/status
 */
async function getStatus(
  request,
  response,
  next
) {
  try {
    const result =
      await getAnalysisStatus(
        request.params.sessionId
      );

    return response
      .status(200)
      .json({
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
async function getReport(
  request,
  response,
  next
) {
  try {
    const report =
      await getAnalysisReport(
        request.params.sessionId
      );

    return response
      .status(200)
      .json({
        success: true,
        data: report
      });
  } catch (error) {
    return next(error);
  }
}


module.exports = {
  analyzeUrl,
  getStatus,
  getReport
};