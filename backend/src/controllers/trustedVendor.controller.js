"use strict";

const {
  listTrustedVendors,
  createTrustedVendor,
  updateTrustedVendor,
  deleteTrustedVendor,
  evaluateEmailForFastPass
} = require("../services/trustedVendor.service");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");

/**
 * GET /api/v1/vendors
 */
async function getVendors(req, res) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const vendors = await listTrustedVendors(orgId);
    return res.status(200).json({
      success: true,
      data: vendors
    });
  } catch (error) {
    console.error("[Trusted Vendors List Error]", error);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: error.message
    });
  }
}

/**
 * POST /api/v1/vendors
 */
async function addVendor(req, res) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const vendor = await createTrustedVendor(orgId, req.body);
    return res.status(201).json({
      success: true,
      message: "Trusted vendor registered successfully.",
      data: vendor
    });
  } catch (error) {
    console.error("[Trusted Vendor Create Error]", error);
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: error.message
    });
  }
}

/**
 * PUT /api/v1/vendors/:id
 */
async function updateVendor(req, res) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const vendor = await updateTrustedVendor(req.params.id, orgId, req.body);
    return res.status(200).json({
      success: true,
      message: "Trusted vendor policy updated successfully.",
      data: vendor
    });
  } catch (error) {
    console.error("[Trusted Vendor Update Error]", error);
    return res.status(400).json({
      success: false,
      error: "UPDATE_ERROR",
      message: error.message
    });
  }
}

/**
 * DELETE /api/v1/vendors/:id
 */
async function removeVendor(req, res) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const deleted = await deleteTrustedVendor(req.params.id, orgId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Vendor record not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: "Trusted vendor removed successfully."
    });
  } catch (error) {
    console.error("[Trusted Vendor Delete Error]", error);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: error.message
    });
  }
}

/**
 * POST /api/v1/vendors/evaluate
 * Fast-pass simulator and email/invoice gatekeeper
 */
async function evaluateVendorInvoice(req, res) {
  try {
    const orgId = req.orgId || DEFAULT_ORG_ID;
    const {
      sender,
      subject,
      authResults,
      links,
      attachments
    } = req.body;

    if (!sender) {
      return res.status(400).json({
        success: false,
        error: "SENDER_REQUIRED",
        message: "Email sender is required for fast-pass evaluation."
      });
    }

    const evaluation = await evaluateEmailForFastPass({
      sender,
      subject,
      authResults,
      links,
      attachments,
      organizationId: orgId
    });

    return res.status(200).json({
      success: true,
      evaluation
    });
  } catch (error) {
    console.error("[Fast-Pass Evaluation Error]", error);
    return res.status(500).json({
      success: false,
      error: "EVALUATION_ERROR",
      message: error.message
    });
  }
}

module.exports = {
  getVendors,
  addVendor,
  updateVendor,
  removeVendor,
  evaluateVendorInvoice
};
