"use strict";

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateClient, requireUserAuth } = require("../middleware/auth");

// Public endpoints
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected user endpoints
router.get("/me", authenticateClient, requireUserAuth, authController.getMe);
router.post("/extension-token/regenerate", authenticateClient, requireUserAuth, authController.regenerateToken);

module.exports = router;
