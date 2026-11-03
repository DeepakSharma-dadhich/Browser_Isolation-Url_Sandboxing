"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("./analysisRepository");
const {
  getUserGatewaySubscriptions,
  activateGatewayTrial,
  upgradeGatewaySubscription,
  SUPPORTED_GATEWAYS
} = require("./subscription.service");

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: JWT_SECRET environment variable is strictly required in production mode.");
  }
  console.warn("[Security Warning] JWT_SECRET is not configured. Generating an ephemeral secret for this process session.");
  return crypto.randomBytes(32).toString("hex");
})();

const JWT_EXPIRES_IN = "7d";

function generateExtensionToken() {
  return `bg_ext_${crypto.randomBytes(24).toString("hex")}`;
}

function generateJwt(user, gateway = null) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role || "ANALYST",
      orgId: user.organization_id || DEFAULT_ORG_ID,
      activeGateway: gateway || null
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Register a user and provision Free Trial ONLY for the selected gateway.
 * The other 2 gateways remain strictly locked until trial activated or upgraded.
 */
async function register({ email, password, fullName, orgName = "Default Organization", gateway = "url_scanner" }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    const err = new Error("A valid email address is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!password || password.length < 8) {
    const err = new Error("Password must be at least 8 characters long.");
    err.statusCode = 400;
    throw err;
  }

  const selectedGateway = SUPPORTED_GATEWAYS.includes(gateway) ? gateway : "url_scanner";

  const existingRes = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );
  if (existingRes.rows.length > 0) {
    const err = new Error("An account with this email already exists.");
    err.statusCode = 409;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const extToken = generateExtensionToken();

  const client = await pool.connect();
  let user;
  try {
    await client.query("BEGIN;");

    // Insert user
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, extension_token, is_active)
       VALUES ($1, $2, $3, 'ANALYST', $4, TRUE)
       RETURNING id, email, full_name, role, extension_token, created_at;`,
      [normalizedEmail, passwordHash, fullName || normalizedEmail.split("@")[0], extToken]
    );
    user = userRes.rows[0];

    // Link user to Default Organization
    await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, 'ANALYST')
       ON CONFLICT (organization_id, user_id) DO NOTHING;`,
      [DEFAULT_ORG_ID, user.id]
    );

    await client.query("COMMIT;");
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    client.release();
  }

  // Provision free trial ONLY for the requested gateway
  await activateGatewayTrial(user.id, selectedGateway);

  const subscriptions = await getUserGatewaySubscriptions(user.id);
  user.organization_id = DEFAULT_ORG_ID;
  const token = generateJwt(user, selectedGateway);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      extensionToken: user.extension_token,
      organizationId: DEFAULT_ORG_ID
    },
    token,
    activeGateway: selectedGateway,
    subscriptions
  };
}

/**
 * Authenticate user and verify per-gateway access rights.
 */
async function login({ email, password, targetGateway = null }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    const err = new Error("Email and password are required.");
    err.statusCode = 400;
    throw err;
  }

  const userRes = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.extension_token, u.is_active,
            COALESCE(om.organization_id, $2) as organization_id
     FROM users u
     LEFT JOIN organization_members om ON om.user_id = u.id
     WHERE u.email = $1
     LIMIT 1;`,
    [normalizedEmail, DEFAULT_ORG_ID]
  );

  if (userRes.rows.length === 0) {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    throw err;
  }

  const user = userRes.rows[0];
  if (!user.is_active) {
    const err = new Error("This account has been deactivated.");
    err.statusCode = 403;
    throw err;
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    const err = new Error("Invalid email or password.");
    err.statusCode = 401;
    throw err;
  }

  // Ensure user has extension token
  if (!user.extension_token) {
    const newExtToken = generateExtensionToken();
    await pool.query("UPDATE users SET extension_token = $1 WHERE id = $2", [newExtToken, user.id]);
    user.extension_token = newExtToken;
  }

  const subscriptions = await getUserGatewaySubscriptions(user.id);
  const token = generateJwt(user, targetGateway);

  let targetGatewayStatus = null;
  if (targetGateway && SUPPORTED_GATEWAYS.includes(targetGateway)) {
    targetGatewayStatus = subscriptions[targetGateway] || null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      extensionToken: user.extension_token,
      organizationId: user.organization_id
    },
    token,
    targetGateway,
    targetGatewayStatus,
    subscriptions
  };
}

/**
 * Get comprehensive profile with all gateway entitlements.
 */
async function getUserProfile(userId) {
  const userRes = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.extension_token, u.is_active, u.created_at,
            COALESCE(om.organization_id, $2) as organization_id,
            COALESCE(o.name, 'Default Organization') as organization_name
     FROM users u
     LEFT JOIN organization_members om ON om.user_id = u.id
     LEFT JOIN organizations o ON o.id = om.organization_id
     WHERE u.id = $1
     LIMIT 1;`,
    [userId, DEFAULT_ORG_ID]
  );

  if (userRes.rows.length === 0) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  const u = userRes.rows[0];
  const subscriptions = await getUserGatewaySubscriptions(userId);

  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    extensionToken: u.extension_token,
    organizationId: u.organization_id,
    organizationName: u.organization_name,
    createdAt: u.created_at,
    subscriptions
  };
}

async function regenerateExtensionToken(userId) {
  const newToken = generateExtensionToken();
  const res = await pool.query(
    `UPDATE users SET extension_token = $1, updated_at = NOW() WHERE id = $2 RETURNING extension_token;`,
    [newToken, userId]
  );
  if (res.rows.length === 0) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }
  return newToken;
}

async function updateUserProfile(userId, { fullName }) {
  const trimmed = (fullName || "").trim();
  if (!trimmed) {
    const err = new Error("Full name cannot be empty.");
    err.statusCode = 400;
    throw err;
  }
  const res = await pool.query(
    `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, extension_token;`,
    [trimmed, userId]
  );
  if (res.rows.length === 0) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }
  return res.rows[0];
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    const err = new Error("Current password and new password are required.");
    err.statusCode = 400;
    throw err;
  }
  if (newPassword.length < 6) {
    const err = new Error("New password must be at least 6 characters long.");
    err.statusCode = 400;
    throw err;
  }

  const userRes = await pool.query(
    "SELECT id, password_hash FROM users WHERE id = $1;",
    [userId]
  );
  if (userRes.rows.length === 0) {
    const err = new Error("User not found.");
    err.statusCode = 404;
    throw err;
  }

  const isMatch = bcrypt.compareSync(currentPassword, userRes.rows[0].password_hash);
  if (!isMatch) {
    const err = new Error("Current password does not match.");
    err.statusCode = 400;
    throw err;
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  await pool.query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;",
    [newHash, userId]
  );

  return { message: "Password updated successfully." };
}

module.exports = {
  register,
  login,
  getUserProfile,
  updateUserProfile,
  changePassword,
  regenerateExtensionToken,
  activateGatewayTrial,
  upgradeGatewaySubscription,
  getUserGatewaySubscriptions,
  generateJwt,
  JWT_SECRET
};
