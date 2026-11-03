"use strict";

const express = require("express");
const router = express.Router();

const {
  getVendors,
  addVendor,
  updateVendor,
  removeVendor,
  evaluateVendorInvoice
} = require("../controllers/trustedVendor.controller");

const {
  authenticateClient,
  requireUserAuth,
  requireRole,
  requireScope
} = require("../middleware/auth");

const { DEFAULT_ORG_ID } = require("../services/analysisRepository");

// Apply authentication across all vendor routes
router.use(authenticateClient);

// Safely extract tenant orgId from verified auth context only (prevent header injection)
router.use((req, res, next) => {
  if (req.user) {
    req.orgId = req.user.organizationId || req.user.organization_id || DEFAULT_ORG_ID;
  } else if (req.apiClient) {
    req.orgId = req.apiClient.organization_id || DEFAULT_ORG_ID;
  } else {
    return res.status(401).json({
      error: "AUTHENTICATION_REQUIRED",
      message: "You must be authenticated to access trusted partner and invoice verification policies."
    });
  }
  next();
});

// View trusted vendors (Analyst or Admin)
router.get("/", requireRole(["OWNER", "ADMIN", "ANALYST"]), getVendors);

// Create, update, or delete vendor whitelist policies (Admin only)
router.post("/", requireRole(["OWNER", "ADMIN"]), addVendor);
router.put("/:id", requireRole(["OWNER", "ADMIN"]), updateVendor);
router.delete("/:id", requireRole(["OWNER", "ADMIN"]), removeVendor);

// Evaluate invoice fast-pass against trusted vendor rules
router.post("/evaluate", requireRole(["OWNER", "ADMIN", "ANALYST"]), evaluateVendorInvoice);

module.exports = router;
