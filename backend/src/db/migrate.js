"use strict";

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function runMigrations() {
  console.log("[Migration] Running PostgreSQL migrations...");

  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      console.log(`[Migration] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN;");
      await client.query(sql);
      await client.query("COMMIT;");
      console.log(`[Migration] ${file} applied successfully!`);
    }
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("[Migration Failed]", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("[Migration] All migrations completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Migration Error]", err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
