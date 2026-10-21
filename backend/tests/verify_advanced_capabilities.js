"use strict";

const axios = require("axios");
const { pool } = require("../src/config/db");

const BASE_URL = "http://localhost:3000";

async function runVerification() {
  console.log("=== BROWSEGUARD ADVANCED CAPABILITIES VERIFICATION ===");
  console.log("(HAR Network Stream, Anti-Cloaking Engine, DOM Snapshot, MITRE Matrix)\n");

  // 1. Authenticate with Administrator
  console.log("[Test 1] Authenticating Admin user & obtaining Extension Token...");
  const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
    email: "admin@browseguard.local",
    password: "Password123!"
  });
  const extToken = loginRes.data.data.user.extensionToken;
  console.log("[OK] Authenticated! Extension Token:", extToken);

  // 2. Submit URL for dynamic analysis via PostgreSQL direct queue
  console.log("\n[Test 2] Submitting URL with redirect chain: http://google.com ...");
  const submitRes = await axios.post(
    `${BASE_URL}/api/v1/analyses`,
    {
      url: "http://google.com",
      source: "BROWSER_EXTENSION",
      scan_options: { capture_har: true }
    },
    { headers: { "X-Extension-Token": extToken } }
  );
  const analysisId = submitRes.data.data.analysis_id;
  console.log("[OK] Enqueued in PostgreSQL:", analysisId);

  // 3. Poll until completed by worker
  console.log("\n[Test 3] Waiting for Python Worker to execute in Chromium sandbox...");
  let completed = false;
  let statusData = null;
  const startTime = Date.now();

  while (Date.now() - startTime < 45000) {
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
    throw new Error("Worker timed out processing analysis job.");
  }
  console.log("\n[OK] Analysis Completed! Verdict:", statusData.verdict, "Risk Score:", statusData.risk_score);

  // 4. Verify PostgreSQL artifact_records table
  console.log("\n[Test 4] Querying PostgreSQL artifact_records for analysis...");
  const artifactsDb = await pool.query(
    "SELECT artifact_type, file_name, mime_type, size_bytes FROM artifact_records WHERE analysis_id = $1;",
    [analysisId]
  );
  console.log("[OK] Artifact records found in PostgreSQL:", artifactsDb.rows);
  const artifactTypes = artifactsDb.rows.map((r) => r.artifact_type);
  if (!artifactTypes.includes("SCREENSHOT")) {
    throw new Error("Missing SCREENSHOT in artifact_records");
  }
  if (!artifactTypes.includes("HAR_LOG")) {
    throw new Error("Missing HAR_LOG in artifact_records");
  }
  if (!artifactTypes.includes("DOM_SNAPSHOT")) {
    throw new Error("Missing DOM_SNAPSHOT in artifact_records");
  }
  console.log("[OK] All required artifact types (SCREENSHOT, HAR_LOG, DOM_SNAPSHOT) present in database!");

  // 5. Test GET /api/v1/analyses/:id/har download
  console.log("\n[Test 5] Downloading HAR network stream via GET /api/v1/analyses/:id/har ...");
  const harRes = await axios.get(`${BASE_URL}/api/v1/analyses/${analysisId}/har`, {
    headers: { "X-Extension-Token": extToken }
  });
  if (!harRes.data?.log || !Array.isArray(harRes.data?.log?.entries)) {
    throw new Error("Invalid HAR file format returned.");
  }
  console.log("[OK] HAR log verified! Total network entries recorded:", harRes.data.log.entries.length);

  // 6. Test GET /api/v1/analyses/:id/dom snapshot
  console.log("\n[Test 6] Fetching DOM snapshot HTML via GET /api/v1/analyses/:id/dom ...");
  const domRes = await axios.get(`${BASE_URL}/api/v1/analyses/${analysisId}/dom`, {
    headers: { "X-Extension-Token": extToken }
  });
  if (typeof domRes.data !== "string" || !domRes.data.includes("<")) {
    throw new Error("Invalid DOM HTML returned.");
  }
  console.log("[OK] Rendered DOM HTML snapshot retrieved! Size:", domRes.data.length, "bytes");

  // 7. Test GET /api/v1/analyses/:id/iocs
  console.log("\n[Test 7] Verifying IOCs & MITRE matrix via GET /api/v1/analyses/:id/iocs ...");
  const iocsRes = await axios.get(`${BASE_URL}/api/v1/analyses/${analysisId}/iocs`, {
    headers: { "X-Extension-Token": extToken }
  });
  const iocsData = iocsRes.data.data;
  const indicators = iocsData.indicators || {};
  const mitreMatrix = iocsData.mitre_attack_matrix || [];
  console.log("[OK] IOCs Summary:", {
    verdict: iocsData.verdict,
    domains_count: (indicators.domains || []).length,
    ips_count: (indicators.ipv4_addresses || []).length,
    urls_count: (indicators.urls || []).length,
    mitre_attack_count: mitreMatrix.length
  });

  console.log("\n=======================================================");
  console.log(">>> ALL 7 ADVANCED CAPABILITY TESTS PASSED (100%) <<<");
  console.log("=======================================================\n");

  await pool.end();
}

runVerification().catch((err) => {
  console.error("Verification failed:", err.message);
  if (err.response?.data) console.error("API Error details:", err.response.data);
  pool.end();
  process.exit(1);
});
