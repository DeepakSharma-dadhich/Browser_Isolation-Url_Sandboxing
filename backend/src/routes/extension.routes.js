"use strict";

const express = require("express");
const router = express.Router();
const { authenticateClient } = require("../middleware/auth");
const { verifyExtensionPairing, downloadExtensionZip, fastCheckUrl } = require("../controllers/extension.controller");

// Public package download
router.get("/download", downloadExtensionZip);

// Protected extension credential verification
router.get("/verify", authenticateClient, verifyExtensionPairing);
router.post("/verify", authenticateClient, verifyExtensionPairing);

// Sub-30ms fast-path URL threat check for zero browsing delay
router.get("/fast-check", authenticateClient, fastCheckUrl);
router.post("/fast-check", authenticateClient, fastCheckUrl);

module.exports = router;
