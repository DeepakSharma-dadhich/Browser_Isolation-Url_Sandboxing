"use strict";

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticateClient, requireUserAuth, requireRole } = require("../middleware/auth");

// All admin routes strictly enforce authenticated user with ADMIN role
router.use(authenticateClient, requireUserAuth, requireRole("ADMIN"));

// Team & User Management
router.get("/users", adminController.getUsers);
router.post("/users", adminController.createUser);
router.put("/users/:userId/role", adminController.updateUserRole);
router.put("/users/:userId/status", adminController.updateUserStatus);
router.delete("/users/:userId", adminController.deleteUser);

// Gateway Subscriptions & Quotas
router.get("/gateways", adminController.getGateways);
router.put("/gateways/:gateway", adminController.updateGateway);

// Global Threat Analytics & Audit Logs
router.get("/analytics", adminController.getAnalytics);
router.get("/audit-logs", adminController.getAuditLogs);

module.exports = router;
