"use strict";

const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");
const { JWT_SECRET } = require("../services/auth.service");

/**
 * Universal Multi-Gateway Authentication Middleware.
 * Resolves context for:
 *   1. User JWT Token (Dashboard UI)
 *   2. Extension Token (Browser Extension Gateway)
 *   3. API Key / Client Secret (Email Security Gateway / API Gateway)
 *   4. Anonymous Dashboard Fallback (Default Tenant)
 */
async function authenticateClient(req, res, next) {
  try {
    let authHeader = req.headers["authorization"] || "";
    let bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    let apiKey = req.headers["x-api-key"] || null;
    let extToken = req.headers["x-extension-token"] || null;

    // 1. Check if token is an extension token
    if (bearerToken && bearerToken.startsWith("bg_ext_")) {
      extToken = bearerToken;
      bearerToken = null;
    }

    // 2. Check if token is an API key (e.g. bg_live_...)
    if (bearerToken && bearerToken.startsWith("bg_live_")) {
      apiKey = bearerToken;
      bearerToken = null;
    }

    // A. Authenticate Browser Extension Token
    if (extToken) {
      const userRes = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.is_active,
                COALESCE(om.organization_id, $2) as organization_id
         FROM users u
         LEFT JOIN organization_members om ON om.user_id = u.id
         WHERE u.extension_token = $1 AND u.is_active = TRUE
         LIMIT 1;`,
        [extToken, DEFAULT_ORG_ID]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({
          error: "INVALID_EXTENSION_TOKEN",
          message: "The provided extension pairing token is invalid or deactivated."
        });
      }

      const user = userRes.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      };
      req.orgId = user.organization_id;
      req.sourceChannel = "EXTENSION";
      return next();
    }

    // B. Authenticate API Key (Email Gateway / Programmatic API)
    if (apiKey) {
      const clientRes = await pool.query(
        `SELECT id, organization_id, name, client_id, scopes, is_active
         FROM api_clients
         WHERE client_id = $1 AND is_active = TRUE`,
        [apiKey]
      );

      if (clientRes.rows.length === 0) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Invalid or inactive API key provided."
        });
      }

      const client = clientRes.rows[0];
      req.apiClient = client;
      req.orgId = client.organization_id;
      req.sourceChannel = "EMAIL_SECURITY";

      // Fire-and-forget last_used_at update
      pool.query("UPDATE api_clients SET last_used_at = NOW() WHERE id = $1", [client.id]).catch(() => {});
      return next();
    }

    // C. Authenticate User JWT Bearer Token (Web Dashboard)
    if (bearerToken) {
      try {
        const decoded = jwt.verify(bearerToken, JWT_SECRET);
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };
        req.orgId = decoded.orgId || DEFAULT_ORG_ID;
        req.sourceChannel = "MANUAL";
        return next();
      } catch (jwtErr) {
        return res.status(401).json({
          error: "TOKEN_EXPIRED_OR_INVALID",
          message: "Your login session has expired or is invalid. Please log in again."
        });
      }
    }

    // D. Default tenant fallback for unauthenticated public dashboard demo
    req.user = null;
    req.apiClient = null;
    req.orgId = DEFAULT_ORG_ID;
    req.sourceChannel = "MANUAL";
    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to authenticate request context."
    });
  }
}

/**
 * Require Login middleware (for user-specific endpoints like /auth/me).
 */
function requireUserAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "AUTHENTICATION_REQUIRED",
      message: "You must be logged in to access this resource."
    });
  }
  return next();
}

/**
 * Require API Key strictly for programmatic integration endpoints.
 */
function requireApiKey(req, res, next) {
  if (!req.apiClient) {
    return res.status(401).json({
      error: "API_KEY_REQUIRED",
      message: "A valid API Key header ('X-API-Key' or 'Authorization: Bearer <key>') is required for this endpoint."
    });
  }
  return next();
}

module.exports = {
  authenticateClient,
  requireUserAuth,
  requireApiKey
};
