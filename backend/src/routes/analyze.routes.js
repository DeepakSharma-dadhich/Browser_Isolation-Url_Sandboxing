"use strict";

const express = require("express");

const {
  analyzeUrl,
  getStatus,
  getReport
} = require(
  "../controllers/analyze.controller"
);


const router = express.Router();


/**
 * Submit URL for VM analysis.
 *
 * POST /api/analyze
 */
router.post(
  "/",
  analyzeUrl
);


/**
 * Get current processing state or final summary.
 *
 * GET /api/analyze/:sessionId/status
 */
router.get(
  "/:sessionId/status",
  getStatus
);


/**
 * Get complete report.json.
 *
 * GET /api/analyze/:sessionId/report
 */
router.get(
  "/:sessionId/report",
  getReport
);


module.exports = router;