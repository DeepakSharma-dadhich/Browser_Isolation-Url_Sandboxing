"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("./analysisRepository");

const JWT_SECRET = process.env.JWT_SECRET || "browseguard_jwt_fallback_secret_key_8899";
const JWT_EXPIRES_IN = "7d";

function generateExtensionToken() {
  return `bg_ext_${crypto.randomBytes(24).toString("hex")}`;
}

function generateJwt(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role || "ANALYST",
      orgId: user.organization_id || DEFAULT_ORG_ID
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register({ email, password, fullName, orgName = "Default Organization" }) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    const err = new Error("A valid email address is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!password || password.length < 6) {
    const err = new Error("Password must be at least 6 characters long.");
    err.statusCode = 400;
    throw err;
  }

  const existingRes = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail]
  );
  if (existingRes.rows.length > 0) {
    const err = new Error("An account with this email already exists.");
    err.statusCode = 409;
    throw err;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const extToken = generateExtensionToken();

  const client = await pool.connect();
  try {
    await client.query("BEGIN;");

    // Insert user
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, extension_token, is_active)
       VALUES ($1, $2, $3, 'ANALYST', $4, TRUE)
       RETURNING id, email, full_name, role, extension_token, created_at;`,
      [normalizedEmail, passwordHash, fullName || normalizedEmail.split("@")[0], extToken]
    );
    const user = userRes.rows[0];

    // Link user to Default Organization
    await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role)
       VALUES ($1, $2, 'ANALYST')
       ON CONFLICT (organization_id, user_id) DO NOTHING;`,
      [DEFAULT_ORG_ID, user.id]
    );

    await client.query("COMMIT;");

    user.organization_id = DEFAULT_ORG_ID;
    const token = generateJwt(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        extensionToken: user.extension_token,
        organizationId: DEFAULT_ORG_ID
      },
      token
    };
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    client.release();
  }
}

async function login({ email, password }) {
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

  const token = generateJwt(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      extensionToken: user.extension_token,
      organizationId: user.organization_id
    },
    token
  };
}

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
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    extensionToken: u.extension_token,
    organizationId: u.organization_id,
    organizationName: u.organization_name,
    createdAt: u.created_at
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

module.exports = {
  register,
  login,
  getUserProfile,
  regenerateExtensionToken,
  generateJwt,
  JWT_SECRET
};
