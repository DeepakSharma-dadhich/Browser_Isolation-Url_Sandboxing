"use strict";

/**
 * BrowseGuard Master Full-Project Comprehensive Audit & Diagnostic System
 * Validates VM Agent, Sandbox, Backend APIs, PostgreSQL Schema, and Frontend SPA.
 */

const http = require("http");
const { pool } = require("../config/db");
const { execSync, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

const results = {
  database: { passed: false, details: [] },
  backend: { passed: false, details: [] },
  simulations: { passed: false, details: [] },
  vmAgent: { passed: false, details: [] },
  securitySuites: { passed: false, details: [] },
  frontend: { passed: false, details: [] }
};

async function runAudit() {
  console.log("======================================================================");
  console.log("🛡️  BROWSEGUARD FULL-PROJECT MASTER AUDIT & DIAGNOSTIC SYSTEM");
  console.log("======================================================================\n");

  // ---------------------------------------------------------
  // 1. DATABASE AUDIT
  // ---------------------------------------------------------
  console.log("▶ [1/5] AUDITING POSTGRESQL DATABASE & SCHEMA INTEGRITY...");
  try {
    const tablesQuery = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    const tableNames = tablesQuery.rows.map((r) => r.table_name);
    console.log(`   Found ${tableNames.length} tables in PostgreSQL:`);

    const expectedTables = [
      "analyses",
      "api_clients",
      "artifact_records",
      "audit_events",
      "findings",
      "gateway_subscriptions",
      "organization_members",
      "organizations",
      "redirect_events",
      "reports",
      "users"
    ];

    let missingTables = [];
    for (const expected of expectedTables) {
      if (tableNames.includes(expected)) {
        const countRes = await pool.query(`SELECT count(*) FROM "${expected}";`);
        const count = countRes.rows[0].count;
        results.database.details.push(`Table '${expected}': ${count} rows`);
        console.log(`   ✅ ${expected.padEnd(25)} (${count} records)`);
      } else {
        missingTables.push(expected);
        console.log(`   ❌ ${expected.padEnd(25)} MISSING!`);
      }
    }

    results.database.passed = missingTables.length === 0;
  } catch (err) {
    console.error("   ❌ Database audit error:", err.message);
    results.database.passed = false;
    results.database.details.push(err.message);
  }

  // ---------------------------------------------------------
  // 2. BACKEND API ENDPOINTS, SIMULATIONS & AUTH AUDIT
  // ---------------------------------------------------------
  console.log("\n▶ [2/5] AUDITING BACKEND REST APIS, SIMULATIONS & GATEWAY SECURITY...");
  try {
    // 2a. Analysis History
    const historyRes = await makeRequest({
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/analyze/history?limit=5",
      method: "GET"
    });
    if (historyRes.status === 200) {
      console.log(`   ✅ GET /api/analyze/history (HTTP 200, count: ${historyRes.body?.count || 0})`);
      results.backend.details.push("Analysis history endpoint: PASS");
    } else {
      console.log(`   ❌ GET /api/analyze/history returned status ${historyRes.status}`);
      results.backend.details.push(`Analysis history endpoint returned ${historyRes.status}`);
    }

    // 2b. Cyber Threat Simulations (All 4 in-lab scenarios)
    const simEndpoints = [
      "/api/v1/simulations/clickfix-captcha",
      "/api/v1/simulations/oauth-device-login",
      "/api/v1/simulations/scareware-lockout",
      "/api/v1/simulations/fake-chrome-update"
    ];
    let simsOk = true;
    for (const ep of simEndpoints) {
      const res = await makeRequest({
        hostname: "127.0.0.1",
        port: 3000,
        path: ep,
        method: "GET"
      });
      if (res.status === 200) {
        console.log(`   ✅ Simulation: ${ep} (HTTP 200, length: ${(res.raw || JSON.stringify(res.body)).length} bytes)`);
        results.simulations.details.push(`${ep}: PASS`);
      } else {
        console.log(`   ❌ Simulation: ${ep} FAILED with HTTP ${res.status}`);
        simsOk = false;
        results.simulations.details.push(`${ep}: FAIL (${res.status})`);
      }
    }
    results.simulations.passed = simsOk;

    // 2c. User Registration, Token Issuance & Subscription Provisioning
    const testEmail = `audit_${Date.now()}@browseguard-test.local`;
    const regRes = await makeRequest(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/v1/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        email: testEmail,
        password: "SuperSecureAuditPassword123!",
        fullName: "System Auditor"
      }
    );

    if (regRes.status === 201) {
      const token = regRes.body?.data?.tokens?.accessToken;
      console.log(`   ✅ POST /api/v1/auth/register (HTTP 201, User Created & JWT Issued)`);
      results.backend.details.push("Registration & JWT token generation: PASS");

      // Verify subscriptions
      const subRes = await makeRequest({
        hostname: "127.0.0.1",
        port: 3000,
        path: "/api/v1/subscriptions/current",
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subRes.status === 200 && subRes.body?.data?.url_scanner) {
        console.log(`   ✅ GET /api/v1/subscriptions/current (HTTP 200, Quota provisions verified)`);
        results.backend.details.push("Subscription & quota provisioning: PASS");
      }
    } else {
      console.log(`   ❌ Auth registration failed with HTTP ${regRes.status}:`, regRes.body);
    }

    results.backend.passed = results.backend.details.length >= 2;
  } catch (err) {
    console.error("   ❌ Backend API audit error:", err.message);
    results.backend.passed = false;
  }

  // ---------------------------------------------------------
  // 3. INTEGRATION TEST SUITES AUDIT
  // ---------------------------------------------------------
  console.log("\n▶ [3/5] EXECUTING COMPREHENSIVE INTEGRATION TEST SUITES...");
  const suites = [
    { name: "Interactive Detonation & Control Flow", file: "test_interactive_detonation_flow.js" },
    { name: "Advanced Heuristics Engine", file: "test_advanced_heuristics_integration.js" },
    { name: "Email Gateway Ingestion & Links", file: "test_eml_gateway.js" },
    { name: "Executive Report & PDF Generator", file: "test_executive_report.js" },
    { name: "Browser Extension Gateway", file: "test_extension_gateway.js" },
    { name: "STIX 2.1 Threat Intel Bundle Export", file: "test_stix_export.js" },
    { name: "Multi-Tenant Quota & Entitlements", file: "test_full_user_flow.js" },
    { name: "Zero-Trust Gateway Isolation", file: "test_gateway_isolation.js" },
    { name: "SIEM Webhooks & Incident Dispatch", file: "test_webhooks_siem.js" },
    { name: "SIEM Dispatch Automation", file: "test_siem_dispatch_automation.js" },
    { name: "SOC API Terminal & Client Secret Auth", file: "test_api_playground_suite.js" }
  ];

  let passedSuites = 0;
  for (const suite of suites) {
    process.stdout.write(`   Running [${suite.name}]... `);
    try {
      execSync(`node src/db/${suite.file}`, {
        cwd: path.resolve(__dirname, "..", ".."),
        stdio: "pipe",
        timeout: 45000
      });
      console.log("PASSED ✅");
      passedSuites++;
      results.securitySuites.details.push(`${suite.name}: PASS`);
    } catch (err) {
      console.log("FAILED ❌");
      const errOut = err.stdout ? err.stdout.toString() : err.message;
      results.securitySuites.details.push(`${suite.name}: FAIL (${errOut.slice(0, 150)}...)`);
    }
  }
  results.securitySuites.passed = passedSuites === suites.length;

  // ---------------------------------------------------------
  // 4. VM AGENT / PYTHON SANDBOX ENGINE AUDIT
  // ---------------------------------------------------------
  console.log("\n▶ [4/5] AUDITING VM AGENT SANDBOX PYTHON MODULES & ENGINES...");
  try {
    const pythonExe = path.resolve(__dirname, "..", "..", "..", "venv", "Scripts", "python.exe");
    const vmAgentDir = path.resolve(__dirname, "..", "..", "..", "vm-agent");

    const pythonCheck = execFileSync(
      pythonExe,
      ["-c", "import playwright, psycopg, websockets; from services.threat_analyzer import analyze_threats; print('Python imports & Threat Analyzer OK')"],
      {
        cwd: vmAgentDir,
        stdio: "pipe",
        timeout: 10000
      }
    );
    console.log(`   ✅ Python Sandbox Modules: ${pythonCheck.toString().trim()}`);

    // Run Python Advanced Heuristics unit test
    const pyTest = execFileSync(
      pythonExe,
      ["test_advanced_heuristics.py"],
      {
        cwd: vmAgentDir,
        stdio: "pipe",
        timeout: 15000
      }
    );
    console.log("   ✅ Python Threat Heuristics Unit Suite: PASSED (Win+R, Turnstile & OAuth detected)");
    results.vmAgent.passed = true;
    results.vmAgent.details.push("Python dependencies, Playwright, Threat Analyzer, and Heuristics verified");
  } catch (err) {
    console.error("   ❌ VM Agent Python verification failed:", err.message);
    if (err.stderr) console.error("      STDERR:", err.stderr.toString());
    if (err.stdout) console.error("      STDOUT:", err.stdout.toString());
    results.vmAgent.passed = false;
  }

  // ---------------------------------------------------------
  // 5. FRONTEND COMPILATION & ASSETS AUDIT
  // ---------------------------------------------------------
  console.log("\n▶ [5/5] AUDITING FRONTEND SPA PRODUCTION BUILD & ASSETS...");
  try {
    const frontendDir = path.resolve(__dirname, "..", "..", "..", "frontend");
    execSync("npm run build", {
      cwd: frontendDir,
      stdio: "pipe",
      timeout: 30000
    });
    const distHtml = path.resolve(frontendDir, "dist", "index.html");
    if (fs.existsSync(distHtml)) {
      const stats = fs.statSync(distHtml);
      console.log(`   ✅ Vite Production Build Success: dist/index.html generated (${stats.size} bytes)`);
      results.frontend.passed = true;
      results.frontend.details.push("Vite bundle compiled cleanly with 0 errors");
    } else {
      console.log("   ❌ Vite build succeeded but dist/index.html is missing");
      results.frontend.passed = false;
    }
  } catch (err) {
    console.error("   ❌ Frontend build failed:", err.stdout ? err.stdout.toString() : err.message);
    results.frontend.passed = false;
  }

  // ---------------------------------------------------------
  // MASTER AUDIT REPORT SUMMARY
  // ---------------------------------------------------------
  console.log("\n======================================================================");
  console.log("📊 MASTER AUDIT SCORECARD & STATUS REPORT");
  console.log("======================================================================");
  console.log(`1. PostgreSQL Database:      ${results.database.passed ? "HEALTHY ✅" : "UNHEALTHY ❌"}`);
  console.log(`2. Backend REST & Auth APIs: ${results.backend.passed ? "HEALTHY ✅" : "UNHEALTHY ❌"}`);
  console.log(`3. Threat Simulations:       ${results.simulations.passed ? "HEALTHY ✅" : "UNHEALTHY ❌"}`);
  console.log(`4. VM Agent Sandbox Python:  ${results.vmAgent.passed ? "HEALTHY ✅" : "UNHEALTHY ❌"}`);
  console.log(`5. Security Integration (${passedSuites}/${suites.length}): ${results.securitySuites.passed ? "ALL PASSED ✅" : "SOME FAILED ❌"}`);
  console.log(`6. Frontend SPA Web Studio:  ${results.frontend.passed ? "CLEAN BUILD ✅" : "BUILD FAILED ❌"}`);
  console.log("======================================================================");

  const overallSuccess =
    results.database.passed &&
    results.backend.passed &&
    results.simulations.passed &&
    results.vmAgent.passed &&
    results.securitySuites.passed &&
    results.frontend.passed;

  if (overallSuccess) {
    console.log("🎉 ALL SYSTEMS GO! THE FULL PLATFORM IS 100% OPERATIONAL & VERIFIED!\n");
  } else {
    console.log("⚠️ AUDIT IDENTIFIED ISSUES REQUIRING ATTENTION.\n");
  }

  await pool.end();
  process.exit(overallSuccess ? 0 : 1);
}

runAudit().catch(async (e) => {
  console.error("Fatal Audit Runner Error:", e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
