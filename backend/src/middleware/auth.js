"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");
const { JWT_SECRET } = require("../services/auth.service");

/**
 * Cryptographically verify client secret against stored hash.
 * Supports:
 *  1. bcrypt hashes ($2a$, $2b$, $2y$)
 *  2. SHA-256 hashes (hex)
 *  3. Plaintext legacy fallback (for default seed records)
 */
async function verifyClientSecret(providedSecret, storedHash) {
  if (!providedSecret || !storedHash) return false;
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    return await bcrypt.compare(providedSecret, storedHash);
  }
  const sha256 = crypto.createHash("sha256").update(providedSecret).digest("hex");
  if (sha256 === storedHash) {
    return true;
  }
  return providedSecret === storedHash;
}

/**
 * In-memory sliding-window request tracker.
 * Map<key, number[]> where key is client_id (or IP/userId) and values are millisecond timestamps.
 */
const rateLimitBuckets = new Map();

// Periodic prune every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitBuckets.entries()) {
    const valid = timestamps.filter((t) => now - t < 120000);
    if (valid.length === 0) {
      rateLimitBuckets.delete(key);
    } else {
      rateLimitBuckets.set(key, valid);
    }
  }
}, 120000).unref();

/**
 * Sliding-window rate limiter per client_id / IP.
 * @param {Object} options { windowMs: 60000, max: 60 }
 */
function rateLimitApiClient(options = {}) {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 60;

  return function (req, res, next) {
    const key = (req.apiClient && req.apiClient.client_id)
      || (req.headers["x-api-key"])
      || (req.user && `usr_${req.user.id}`)
      || req.ip
      || "global";

    const now = Date.now();
    let timestamps = rateLimitBuckets.get(key) || [];
    // Keep timestamps in the active window
    const windowStart = now - windowMs;
    timestamps = timestamps.filter((t) => t > windowStart);

    const count = timestamps.length;
    const remaining = Math.max(0, max - count - 1);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));

    if (count >= max) {
      const oldest = timestamps[0] || now;
      const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: "API_RATE_LIMIT_EXCEEDED",
        message: `Too many requests for client '${key}'. Limit is ${max} requests per ${windowMs / 1000}s.`,
        limit: max,
        remaining: 0,
        retryAfterSeconds: retryAfter
      });
    }

    timestamps.push(now);
    rateLimitBuckets.set(key, timestamps);
    return next();
  };
}

/**
 * Scope alias map for interchangeable permission names.
 */
const SCOPE_ALIASES = {
  "analysis:create": ["analysis:create", "scans:submit", "analyses:create", "scans:create"],
  "scans:submit": ["analysis:create", "scans:submit", "analyses:create", "scans:create"],
  "analysis:read": ["analysis:read", "scans:read", "analyses:read"],
  "scans:read": ["analysis:read", "scans:read", "analyses:read"],
  "email:detonate": ["email:detonate", "analysis:create"],
  "integrations:manage": ["integrations:manage", "admin"],
  "webhooks:manage": ["webhooks:manage", "admin"]
};

/**
 * Require one or more scopes for API Client access.
 * If accessed via web dashboard user session or extension, permission is automatically granted.
 * @param {string|string[]} requiredScopes
 */
function requireScope(requiredScopes) {
  const scopesList = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];

  return function (req, res, next) {
    // If request is from an API client, strictly enforce assigned scopes
    if (req.apiClient) {
      const clientScopes = req.apiClient.scopes || [];

      // Wildcard / admin scope has all privileges
      if (clientScopes.includes("*") || clientScopes.includes("admin")) {
        return next();
      }

      const hasPermission = scopesList.some((reqScope) => {
        const acceptableScopes = SCOPE_ALIASES[reqScope] || [reqScope];
        return acceptableScopes.some((sc) => clientScopes.includes(sc));
      });

      if (!hasPermission) {
        return res.status(403).json({
          error: "INSUFFICIENT_SCOPE",
          message: `API client '${req.apiClient.client_id}' lacks required permission: ${scopesList.join(", ")}`,
          requiredScopes: scopesList,
          grantedScopes: clientScopes
        });
      }
    }

    return next();
  };
}

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
    let apiKey = req.headers["x-api-key"] || req.headers["x-client-id"] || req.query?.api_key || null;
    let clientSecret = req.headers["x-client-secret"] || req.headers["x-api-secret"] || null;
    let extToken = req.headers["x-extension-token"] || req.query?.ext_token || req.query?.token || null;

    // HTTP Basic Auth parsing (e.g. Authorization: Basic base64(client_id:client_secret))
    if (authHeader.startsWith("Basic ")) {
      try {
        const decoded = Buffer.from(authHeader.slice(6).trim(), "base64").toString("utf-8");
        const colonIdx = decoded.indexOf(":");
        if (colonIdx > 0) {
          apiKey = decoded.slice(0, colonIdx).trim();
          clientSecret = decoded.slice(colonIdx + 1).trim();
        }
      } catch {
        // Ignore malformed Basic Auth and continue to next authenticators
      }
    }

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
        `SELECT id, organization_id, name, client_id, client_secret_hash, scopes, is_active
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
      let secretVerified = false;

      // If client secret is provided, verify it cryptographically
      if (clientSecret) {
        const isMatch = await verifyClientSecret(clientSecret, client.client_secret_hash);
        if (!isMatch) {
          return res.status(401).json({
            error: "INVALID_CLIENT_SECRET",
            message: "The provided client secret is incorrect for this API key."
          });
        }
        secretVerified = true;
      }

      req.apiClient = {
        id: client.id,
        organization_id: client.organization_id,
        name: client.name,
        client_id: client.client_id,
        scopes: client.scopes || [],
        is_active: client.is_active,
        secretVerified
      };
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
      } catch {
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

/**
 * Require client secret verification strictly (for sensitive M2M endpoints).
 */
function requireClientSecret(req, res, next) {
  if (!req.apiClient) {
    return res.status(401).json({
      error: "API_KEY_REQUIRED",
      message: "An API client credential is required for this endpoint."
    });
  }
  if (!req.apiClient.secretVerified) {
    return res.status(401).json({
      error: "CLIENT_SECRET_REQUIRED",
      message: "This endpoint requires client secret verification via 'X-Client-Secret' header or HTTP Basic Auth."
    });
  }
  return next();
}

/**
 * Require specific user role (e.g. 'ADMIN', 'ANALYST').
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: "AUTHENTICATION_REQUIRED",
        message: "You must be logged in to access this resource."
      });
    }
    const userRole = (req.user.role || "ANALYST").toUpperCase();
    if (!roles.map((r) => r.toUpperCase()).includes(userRole)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `Access denied. Requires one of the following roles: ${roles.join(", ")}. Current role: ${userRole}.`
      });
    }
    return next();
  };
}

/**
 * Prevent read-only VIEWER role from executing state-mutating scan detonations.
 */
function restrictViewer(req, res, next) {
  if (req.user && req.user.role && req.user.role.toUpperCase() === "VIEWER") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Read-only access: Viewers cannot trigger URL scans or sandbox detonations."
    });
  }
  return next();
}

module.exports = {
  authenticateClient,
  requireUserAuth,
  requireRole,
  restrictViewer,
  requireApiKey,
  requireClientSecret,
  requireScope,
  rateLimitApiClient,
  verifyClientSecret
};
