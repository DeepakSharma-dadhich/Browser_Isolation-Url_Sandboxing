"use strict";

const express = require("express");
const router = express.Router();

const { authenticateClient, rateLimitApiClient, requireScope } = require("../middleware/auth");
const { enforceGateway } = require("../middleware/gatewayAuth");
const {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  extractAndDetonateEmailLinks,
  parseEmlEndpoint,
  detonateEmlLinksEndpoint,
  listIntegrations,
  saveIntegration,
  deleteIntegration,
  testIntegration
} = require("../controllers/apiKeys.controller");

// All routes require client/user authentication and rate limiting
router.use(authenticateClient);
router.use(rateLimitApiClient({ windowMs: 60000, max: 60 }));

// BrowseGuard Platform API Key management
router.get("/api-keys", listApiKeys);
router.post("/api-keys", createApiKey);
router.delete("/api-keys/:id", revokeApiKey);

// BYOK (Bring Your Own Key) External Threat Feed Integrations
router.get("/integrations", listIntegrations);
router.post("/integrations", saveIntegration);
router.delete("/integrations/:provider", deleteIntegration);
router.post("/integrations/test", testIntegration);

// Email Gateway: Parse RFC822 / .EML raw stream (headers, SPF/DKIM, attachments, links, quishing)
router.post("/email-gateway/parse-eml", parseEmlEndpoint);

// Email Gateway: Detonate selected or all links in isolated VMs (consumes email_gateway_api quota)
router.post(
  "/email-gateway/detonate-links",
  requireScope("analysis:create"),
  enforceGateway("email_gateway_api", { consumeQuota: true }),
  detonateEmlLinksEndpoint
);

// Email Gateway legacy batch link extraction & sandbox detonation
router.post(
  "/email-gateway/extract-and-detonate",
  requireScope("analysis:create"),
  enforceGateway("email_gateway_api", { consumeQuota: true }),
  extractAndDetonateEmailLinks
);

module.exports = router;
