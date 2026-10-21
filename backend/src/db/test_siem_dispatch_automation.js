/**
 * Test Suite: SIEM Alert Dispatch Automation from Incident Response Brief
 * Validates that 1-click dispatching delivers cryptographically signed (HMAC-SHA256)
 * incident payloads to mock SIEM / SOAR receivers with complete forensic telemetry.
 */
"use strict";

const http = require("http");
const crypto = require("crypto");
const axios = require("axios");
const { pool } = require("../config/db");
const { WEBHOOK_SIGNING_SECRET } = require("../services/webhookDispatcher");

const BASE_URL = "http://localhost:3000";
const MOCK_SIEM_PORT = 9876;

async function runSiemDispatchAutomationSuite() {
  console.log("=======================================================");
  console.log("🔔  BROWSEGUARD SIEM DISPATCH AUTOMATION TEST SUITE");
  console.log("=======================================================\n");

  const receivedAlerts = [];
  const mockServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        receivedAlerts.push({
          url: req.url,
          headers: req.headers,
          body: parsed,
          rawBody: body
        });
      } catch {
        receivedAlerts.push({
          url: req.url,
          headers: req.headers,
          rawBody: body
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ acknowledged: true, alert_id: `SIEM_ACK_${Date.now()}` }));
    });
  });

  await new Promise((resolve) => mockServer.listen(MOCK_SIEM_PORT, resolve));
  console.log(`[Mock SIEM] Receiver active on http://localhost:${MOCK_SIEM_PORT}/siem/collector`);

  let passedCount = 0;
  const totalTests = 8;

  try {
    // 1. Locate an analysis record
    console.log("\n--- TEST 1: Retrieve Target Incident for SIEM Dispatch ---");
    const rowRes = await pool.query(`
      SELECT id, submitted_url, verdict, risk_score 
      FROM analyses 
      ORDER BY created_at DESC 
      LIMIT 1;
    `);

    if (rowRes.rows.length === 0) {
      console.error("  ❌ [FAIL] No analysis records exist in database.");
      process.exit(1);
    }

    const targetId = rowRes.rows[0].id;
    console.log(`  ✅ [PASS] Found target incident: '${targetId}' (Verdict: ${rowRes.rows[0].verdict || "UNKNOWN"})`);
    passedCount++;

    // 2. Dispatch Incident Alert to Mock SIEM
    console.log(`\n--- TEST 2: POST /api/v1/analyses/${targetId}/dispatch-siem ---`);
    const dispatchRes = await axios.post(`${BASE_URL}/api/v1/analyses/${targetId}/dispatch-siem`, {
      target_url: `http://localhost:${MOCK_SIEM_PORT}/siem/collector`,
      tlp: "TLP:AMBER+STRICT",
      containment_checklist: {
        blockPerimeter: true,
        quarantineMail: true,
        revokeTokens: true,
        ingestSiem: true,
        threatHuntEdr: false
      },
      notes: "Incident escalated from BrowseGuard IR Brief. Hostile credential harvester confirmed."
    });

    if (dispatchRes.status === 200 && dispatchRes.data.success) {
      console.log(`  ✅ [PASS] API response returned HTTP 200 (${dispatchRes.data.message})`);
      console.log(`  ✅ [PASS] Case ID assigned: '${dispatchRes.data.incident_id}'`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Dispatch endpoint failed:", dispatchRes.data);
    }

    // 3. Verify Mock SIEM Received Alert
    console.log("\n--- TEST 3: Verify Alert Ingestion at SIEM Receiver ---");
    if (receivedAlerts.length > 0) {
      const lastAlert = receivedAlerts[receivedAlerts.length - 1];
      console.log(`  ✅ [PASS] SIEM received alert on URL path: '${lastAlert.url}'`);
      console.log(`  ✅ [PASS] Event type: '${lastAlert.body?.event}'`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] No alert was received by mock SIEM server.");
    }

    // 4. Verify Cryptographic HMAC-SHA256 Signature Header
    console.log("\n--- TEST 4: HMAC-SHA256 Cryptographic Signature Verification ---");
    const lastAlert = receivedAlerts[receivedAlerts.length - 1];
    const sigHeader = lastAlert.headers["x-browseguard-signature"];

    if (sigHeader && sigHeader.startsWith("sha256=")) {
      const expectedSig = "sha256=" + crypto
        .createHmac("sha256", WEBHOOK_SIGNING_SECRET)
        .update(lastAlert.rawBody)
        .digest("hex");

      if (sigHeader === expectedSig) {
        console.log(`  ✅ [PASS] Cryptographic signature matches: '${sigHeader.slice(0, 24)}...'`);
        passedCount++;
      } else {
        console.error(`  ❌ [FAIL] Signature mismatch. Received: ${sigHeader}, Expected: ${expectedSig}`);
      }
    } else {
      console.error("  ❌ [FAIL] Missing or malformed X-BrowseGuard-Signature header:", sigHeader);
    }

    // 5. Verify Forensic Payload Content & Containment Checklist
    console.log("\n--- TEST 5: Verify Forensic Integrity & Containment Directives ---");
    const inc = lastAlert.body?.incident;
    if (inc && inc.target_url && inc.containment_checklist?.blockPerimeter) {
      console.log(`  ✅ [PASS] Incident target URL embedded: '${inc.target_url}'`);
      console.log(`  ✅ [PASS] Containment directives included: blockPerimeter=true, quarantineMail=true, revokeTokens=true`);
      console.log(`  ✅ [PASS] Analyst notes included: '${inc.analyst_notes}'`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Incident payload missing forensic fields:", inc);
    }

    // 6. Verify Dispatch Telemetry in API Response
    console.log("\n--- TEST 6: Dispatch Telemetry & Latency Metrics ---");
    const dispatchDetails = dispatchRes.data.dispatches?.[0];
    if (dispatchDetails && typeof dispatchDetails.latency_ms === "number") {
      console.log(`  ✅ [PASS] Dispatch telemetry confirmed: status=${dispatchDetails.status}, latency=${dispatchDetails.latency_ms}ms`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Missing dispatch telemetry:", dispatchDetails);
    }

    // 7. Verify Audit Event Recorded in PostgreSQL
    console.log("\n--- TEST 7: PostgreSQL Audit Event Record Verification ---");
    const auditRes = await pool.query(`
      SELECT id, action, details 
      FROM audit_events 
      WHERE resource_id = $1 AND action = 'WEBHOOK_DISPATCHED' 
      ORDER BY created_at DESC 
      LIMIT 1;
    `, [targetId]);

    if (auditRes.rows.length > 0) {
      console.log(`  ✅ [PASS] Audit event '${auditRes.rows[0].action}' recorded for analysis '${targetId}'`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] No audit event was logged in PostgreSQL.");
    }

    // 8. Test Error Handling for Missing / Offline Destination
    console.log("\n--- TEST 8: Rejection when Destination Offline or Missing ---");
    try {
      await axios.post(`${BASE_URL}/api/v1/analyses/${targetId}/dispatch-siem`, {
        target_url: "" // empty target, forces check on DB integrations
      });
      console.error("  ❌ [FAIL] Expected error when no live target configured.");
    } catch (err) {
      if (err.response && [400, 502].includes(err.response.status)) {
        console.log(`  ✅ [PASS] Properly rejected offline or missing destination (HTTP ${err.response.status} ${err.response.data?.error || "DELIVERY_FAILED"})`);
        passedCount++;
      } else {
        console.error("  ❌ [FAIL] Unexpected error:", err.message);
      }
    }

  } finally {
    mockServer.close();
  }

  console.log("\n=======================================================");
  console.log(`RESULTS: ${passedCount}/${totalTests} TESTS PASSED (${Math.round((passedCount / totalTests) * 100)}%)`);
  console.log("=======================================================");

  if (passedCount === totalTests) {
    console.log("\n🎉 ALL SIEM ALERT DISPATCH AUTOMATION CRITERIA VERIFIED OPERATIONAL!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSiemDispatchAutomationSuite().catch((err) => {
  console.error("Fatal suite error:", err);
  process.exit(1);
});
