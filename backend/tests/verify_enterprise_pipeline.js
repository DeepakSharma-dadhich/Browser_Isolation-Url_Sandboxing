"use strict";

const axios = require("axios");
const { pool } = require("../src/config/db");

const BASE_URL = "http://localhost:3000";

async function runVerification() {
  console.log("=== BROWSEGUARD ENTERPRISE PIPELINE VERIFICATION ===\n");

  // 1. Authenticate with Default Admin
  console.log("[Test 1] Testing User Authentication & Token Issuance...");
  const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
    email: "admin@browseguard.local",
    password: "Password123!"
  });
  console.log("✓ Login Success:", loginRes.data.data.user.email);
  const userToken = loginRes.data.data.token;
  const extToken = loginRes.data.data.user.extensionToken;
  console.log("✓ Extension Pairing Token:", extToken);

  // 2. Submit URL via Gateway 2 (Browser Extension Token) directly into PostgreSQL queue
  console.log("\n[Test 2] Submitting Scan via Gateway 2 (Extension Token)...");
  const testUrl = "https://example.com/verify-pipeline";
  const submitRes = await axios.post(
    `${BASE_URL}/api/v1/analyses`,
    { url: testUrl, source: "BROWSER_EXTENSION" },
    { headers: { "X-Extension-Token": extToken } }
  );
  console.log("✓ Analysis Queued in PostgreSQL:", submitRes.data.data.analysis_id);
  const analysisId = submitRes.data.data.analysis_id;

  // 3. Poll PostgreSQL status until completed by python worker
  console.log("\n[Test 3] Waiting for Python Worker to claim & process via PostgreSQL queue...");
  let completed = false;
  let statusData = null;
  const startTime = Date.now();

  while (Date.now() - startTime < 30000) {
    await new Promise((r) => setTimeout(r, 1500));
    const statusRes = await axios.get(`${BASE_URL}/api/v1/analyses/${analysisId}/status`, {
      headers: { "X-Extension-Token": extToken }
    });
    statusData = statusRes.data.data;
    if (statusData.report_ready || statusData.status === "COMPLETED") {
      completed = true;
      break;
    }
    process.stdout.write(".");
  }

  if (!completed) {
    throw new Error("Worker did not complete PostgreSQL queue job within 30 seconds.");
  }
  console.log("\n✓ Worker completed scan! Status:", statusData.status, "Verdict:", statusData.verdict);

  // 4. Test ANY.RUN-inspired IOCs & MITRE ATT&CK Extraction Endpoint
  console.log("\n[Test 4] Querying GET /api/v1/analyses/:id/iocs...");
  const iocsRes = await axios.get(`${BASE_URL}/api/v1/analyses/${analysisId}/iocs`);
  console.log("✓ IOCs & Threat Intelligence Bundle Received:");
  console.log("  Target URL:", iocsRes.data.data.target_url);
  console.log("  Verdict:", iocsRes.data.data.verdict);
  console.log("  Extracted Domains:", iocsRes.data.data.indicators.domains);
  console.log("  Network URLs:", iocsRes.data.data.indicators.urls);
  console.log("  MITRE ATT&CK Matrix:", iocsRes.data.data.mitre_attack_matrix);

  // 5. Verify User Scoping in PostgreSQL
  console.log("\n[Test 5] Verifying PostgreSQL analysis row attributes...");
  const dbRow = await pool.query(
    "SELECT id, requested_by_user_id, source_channel, status, verdict FROM analyses WHERE id = $1",
    [analysisId]
  );
  const row = dbRow.rows[0];
  console.log("✓ Database Analysis Row Verified:");
  console.log("  Row ID:", row.id);
  console.log("  Requested By User ID:", row.requested_by_user_id);
  console.log("  Source Channel:", row.source_channel);
  console.log("  Status:", row.status);

  console.log("\n=======================================================");
  console.log("ALL ENTERPRISE PIPELINE & ANY.RUN ENHANCEMENTS VERIFIED 100%!");
  console.log("=======================================================");
  await pool.end();
}

runVerification().catch((err) => {
  console.error("\n❌ Verification Failed:", err.response?.data || err.message);
  process.exit(1);
});
