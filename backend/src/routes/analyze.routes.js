"use strict";

const express = require("express");

const {
  analyzeUrl,
  getStatus,
  getReport,
  getHistory,
  getScreenshot
} = require("../controllers/analyze.controller");
const { authenticateClient } = require("../middleware/auth");
const { checkScanQuota } = require("../middleware/quota");

const router = express.Router();

// Apply auth & tenant context resolution across analyze routes
router.use(authenticateClient);

/**
 * Submit URL for VM analysis.
 * POST /api/analyze
 */
router.post("/", checkScanQuota, analyzeUrl);

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

module.exports = router;