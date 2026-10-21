"use strict";

const express = require("express");
const { authenticateClient, rateLimitApiClient, requireScope, restrictViewer } = require("../../middleware/auth");
const { checkScanQuota } = require("../../middleware/quota");
const { enforceDynamicGateway } = require("../../middleware/gatewayAuth");
const {
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
} = require("../../controllers/v1/analyses.controller");

const router = express.Router();

// Apply auth, sliding-window rate limit & tenant context resolution across all v1 analyses routes
router.use(authenticateClient);
router.use(rateLimitApiClient({ windowMs: 60000, max: 120 }));

/**
 * Submit URL analysis request.
 * Enforces dynamic gateway isolation (Extension Shield vs Email Gateway API vs Manual) & quotas.
 * POST /api/v1/analyses
 */
router.post("/", restrictViewer, requireScope("analysis:create"), checkScanQuota, enforceDynamicGateway({ consumeQuota: true }), submitAnalysisV1);

/**
 * List & search analyses.
 * GET /api/v1/analyses
 */
router.get("/", requireScope("analysis:read"), listAnalysesV1);

/**
 * Aggregated STIX 2.1 threat feed for SIEM, SOAR, and TAXII polling.
 * GET /api/v1/analyses/threat-feed/stix
 */
router.get("/threat-feed/stix", requireScope("analysis:read"), getAggregatedStixThreatFeedV1);

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
 * Download HAR network traffic stream.
 * GET /api/v1/analyses/:id/har
 */
router.get("/:id/har", getAnalysisHarV1);

/**
 * View rendered DOM snapshot HTML.
 * GET /api/v1/analyses/:id/dom
 */
router.get("/:id/dom", getAnalysisDomV1);

/**
 * Retrieve Indicators of Compromise (IOCs) & MITRE ATT&CK Matrix.
 * GET /api/v1/analyses/:id/iocs
 */
router.get("/:id/iocs", getAnalysisIocsV1);

/**
 * Export OASIS STIX 2.1 Cyber Threat Intelligence Bundle for this analysis.
 * GET /api/v1/analyses/:id/stix
 */
router.get("/:id/stix", requireScope("analysis:read"), getAnalysisStixV1);

/**
 * Dispatch authoritative Security Incident Alert to configured SIEM / SOAR / Slack webhooks.
 * POST /api/v1/analyses/:id/dispatch-siem
 */
router.post("/:id/dispatch-siem", dispatchSiemAlertV1);

/**
 * Retrieve canonical analysis report or details.
 * GET /api/v1/analyses/:id
 */
router.get("/:id", getAnalysisV1);

module.exports = router;
