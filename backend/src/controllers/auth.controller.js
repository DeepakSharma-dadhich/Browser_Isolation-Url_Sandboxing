"use strict";

const authService = require("../services/auth.service");

async function register(req, res) {
  try {
    const { email, password, fullName, orgName, gateway } = req.body || {};
    const result = await authService.register({ email, password, fullName, orgName, gateway });
    return res.status(201).json({
      status: "success",
      message: `Account created successfully with free trial for ${gateway || "URL Scanner"}.`,
      data: result
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Registration failed."
    });
  }
}

async function login(req, res) {
  try {
    const { email, password, targetGateway } = req.body || {};
    const result = await authService.login({ email, password, targetGateway });
    return res.status(200).json({
      status: "success",
      message: "Authentication successful.",
      data: result
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Login failed."
    });
  }
}

async function getMe(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    const profile = await authService.getUserProfile(req.user.id);
    return res.status(200).json({
      status: "success",
      data: profile
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to load user profile."
    });
  }
}

async function getSubscriptions(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    const subscriptions = await authService.getUserGatewaySubscriptions(req.user.id);
    return res.status(200).json({
      status: "success",
      data: subscriptions
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to load subscriptions."
    });
  }
}

async function activateTrial(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    const { gateway } = req.body || {};
    const subscription = await authService.activateGatewayTrial(req.user.id, gateway);
    const allSubs = await authService.getUserGatewaySubscriptions(req.user.id);
    return res.status(200).json({
      status: "success",
      message: `Free trial activated successfully for ${gateway}!`,
      data: {
        subscription,
        allSubscriptions: allSubs
      }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to activate trial.",
      code: error.code
    });
  }
}

async function upgradeSubscription(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    const { gateway, planTier } = req.body || {};
    const subscription = await authService.upgradeGatewaySubscription(req.user.id, gateway, planTier || "PRO");
    const allSubs = await authService.getUserGatewaySubscriptions(req.user.id);
    return res.status(200).json({
      status: "success",
      message: `Gateway ${gateway} upgraded to ${planTier || "PRO"} tier successfully!`,
      data: {
        subscription,
        allSubscriptions: allSubs
      }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to upgrade subscription."
    });
  }
}

async function regenerateToken(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    const newToken = await authService.regenerateExtensionToken(req.user.id);
    return res.status(200).json({
      status: "success",
      message: "New extension token generated successfully.",
      data: { extensionToken: newToken }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to regenerate extension token."
    });
  }
}

async function updateProfile(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    const { fullName } = req.body || {};
    const updated = await authService.updateUserProfile(req.user.id, { fullName });
    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully.",
      data: updated
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to update profile."
    });
  }
}

async function changePassword(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    const { currentPassword, newPassword } = req.body || {};
    const result = await authService.changePassword(req.user.id, { currentPassword, newPassword });
    return res.status(200).json({
      status: "success",
      message: result.message
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to change password."
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getSubscriptions,
  activateTrial,
  upgradeSubscription,
  regenerateToken
};
