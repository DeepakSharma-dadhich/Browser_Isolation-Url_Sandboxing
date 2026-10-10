"use strict";

const express = require("express");
const { authenticateClient } = require("../../middleware/auth");
const { checkScanQuota } = require("../../middleware/quota");
const {
  submitAnalysisV1,
  getAnalysisV1,
  getAnalysisStatusV1,
  getAnalysisScreenshotV1,
  listAnalysesV1,
  getAnalysisIocsV1
} = require("../../controllers/v1/analyses.controller");

const router = express.Router();

// Apply auth & tenant context resolution across all v1 analyses routes
router.use(authenticateClient);

/**
 * Submit URL analysis request.
 * POST /api/v1/analyses
 */
router.post("/", checkScanQuota, submitAnalysisV1);

/**
 * List & search analyses.
 * GET /api/v1/analyses
 */
router.get("/", listAnalysesV1);

/**
 * Query fast analysis status.
 * GET /api/v1/analyses/:id/status
 */
router.get("/:id/status", getAnalysisStatusV1);

/**
 * Retrieve captured screenshot artifact.
 * GET /api/v1/analyses/:id/screenshot
 */
router.get("/:id/screenshot", getAnalysisScreenshotV1);

/**
 * Retrieve Indicators of Compromise (IOCs) & MITRE ATT&CK Matrix.
 * GET /api/v1/analyses/:id/iocs
 */
router.get("/:id/iocs", getAnalysisIocsV1);

/**
 * Retrieve canonical analysis report or details.
 * GET /api/v1/analyses/:id
 */
router.get("/:id", getAnalysisV1);

module.exports = router;
