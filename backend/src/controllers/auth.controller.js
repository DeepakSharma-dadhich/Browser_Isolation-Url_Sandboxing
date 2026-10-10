"use strict";

const authService = require("../services/auth.service");

async function register(req, res) {
  try {
    const { email, password, fullName, orgName } = req.body || {};
    const result = await authService.register({ email, password, fullName, orgName });
    return res.status(201).json({
      status: "success",
      message: "Account created successfully.",
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
    const { email, password } = req.body || {};
    const result = await authService.login({ email, password });
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

module.exports = {
  register,
  login,
  getMe,
  regenerateToken
};
