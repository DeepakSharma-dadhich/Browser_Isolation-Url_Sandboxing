"use strict";

const express = require("express");

const {
  analyzeUrl,
  getStatus,
  getReport,
  getHistory,
  getScreenshot,
  getHar,
  getDom
} = require("../controllers/analyze.controller");
const { authenticateClient, restrictViewer } = require("../middleware/auth");
const { checkScanQuota } = require("../middleware/quota");
const { enforceGateway } = require("../middleware/gatewayAuth");

const router = express.Router();

// Apply auth & tenant context resolution across analyze routes
router.use(authenticateClient);

/**
 * Submit URL for VM analysis (Gateway 1: URL Scanner & Sandbox Studio).
 * Strictly enforces user entitlement & decrements compute quota.
 * POST /api/analyze
 */
router.post("/", restrictViewer, checkScanQuota, enforceGateway("url_scanner", { consumeQuota: true }), analyzeUrl);

/**
 * Get analysis history from PostgreSQL.
 * GET /api/analyze/history
 */
router.get("/history", getHistory);

/**
 * Get current processing state or final summary.
 * GET /api/analyze/:sessionId/status
 */
router.get("/:sessionId/status", getStatus);

/**
 * Get complete report.json.
 * GET /api/analyze/:sessionId/report
 */
router.get("/:sessionId/report", getReport);

/**
 * Stream captured screenshot image.
 * GET /api/analyze/:sessionId/screenshot
 */
router.get("/:sessionId/screenshot", getScreenshot);

/**
 * Download network traffic stream (HAR).
 * GET /api/analyze/:sessionId/har
 */
router.get("/:sessionId/har", getHar);

/**
 * View rendered DOM HTML.
 * GET /api/analyze/:sessionId/dom
 */
router.get("/:sessionId/dom", getDom);

module.exports = router;