"use strict";

const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:Daksh123@localhost:5432/Browser_Isolation";

const isCloudDb =
  connectionString.includes("neon.tech") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("sslmode=require") ||
  process.env.NODE_ENV === "production";

const poolConfig = {
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

if (isCloudDb && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1")) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Error]", err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 200) {
    console.debug(`[Slow Query (${duration}ms)]`, text);
  }
  return res;
}

async function getClient() {
  return await pool.connect();
}

async function testConnection() {
  try {
    const res = await pool.query(
      "SELECT NOW() AS current_time, current_database() AS db_name;"
    );
    return {
      connected: true,
      database: res.rows[0].db_name,
      timestamp: res.rows[0].current_time
    };
  } catch (error) {
    console.error("[PostgreSQL Connection Failed]", error.message);
    throw error;
  }
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection
};
