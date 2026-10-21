"use strict";

const http = require("http");
const crypto = require("crypto");
const { pool } = require("../config/db");
const { dispatchWebhook } = require("../services/webhookDispatcher");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
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

async function runWebhookSiemSuite() {
  console.log("=================================================================");
  console.log("   BrowseGuard Enterprise Webhook & SIEM Alerting Verification   ");
  console.log("=================================================================");

  const receivedRequests = [];
  const MOCK_PORT = 3999;
  const TEST_SECRET = "bg_wh_test_secret_key_8888";

  // 1. Start Local Mock HTTP SIEM Receiver
  const mockServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        receivedRequests.push({
          url: req.url,
          headers: req.headers,
          body: parsed,
          rawBody: body
        });
      } catch {
        receivedRequests.push({
          url: req.url,
          headers: req.headers,
          rawBody: body
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true, status: "ACK" }));
    });
  });

  await new Promise((resolve) => mockServer.listen(MOCK_PORT, resolve));
  console.log(`[Mock SIEM] Receiver active on http://localhost:${MOCK_PORT}`);

  let testsPassed = 0;
  const totalTests = 5;

  try {
    // TEST 1: Live Ping Verification with HMAC Header
    console.log("\n[Test 1] Testing live webhook ping to mock receiver...");
    const pingRes = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/v1/integrations/test",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        provider: "webhook",
        api_key: `http://localhost:${MOCK_PORT}/api/v1/siem/alerts`,
        config: { secret: TEST_SECRET }
      }
    );

    if (pingRes.status === 200 && pingRes.data?.success) {
      console.log(`  ✓ Passed: Ping returned HTTP 200 (${pingRes.data.message})`);
      const lastReq = receivedRequests[receivedRequests.length - 1];
      if (lastReq && lastReq.headers["x-browseguard-signature"]) {
        const sigHeader = lastReq.headers["x-browseguard-signature"].replace("sha256=", "");
        const expectedSig = crypto.createHmac("sha256", TEST_SECRET).update(lastReq.rawBody).digest("hex");
        if (sigHeader === expectedSig) {
          console.log(`  ✓ Passed: HMAC-SHA256 signature verified matching (${sigHeader.slice(0, 16)}...)`);
          testsPassed++;
        } else {
          console.error("  ✗ FAILED HMAC signature mismatch!");
        }
      } else {
        console.error("  ✗ FAILED Missing signature header in mock receiver");
      }
    } else {
      console.error("  ✗ FAILED Test 1:", pingRes.status, pingRes.data);
    }

    // TEST 2: Save Organization Webhook & Slack Integrations
    console.log("\n[Test 2] Saving organization webhook & slack integration...");
    const saveHookRes = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/v1/integrations",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        provider: "webhook",
        api_key: `http://localhost:${MOCK_PORT}/api/v1/siem/alerts`,
        config: { secret: TEST_SECRET, min_score: 50 }
      }
    );

    const saveSlackRes = await request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/v1/integrations",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        provider: "slack",
        api_key: `http://localhost:${MOCK_PORT}/services/slack-webhook`,
        config: { min_score: 50 }
      }
    );

    if (saveHookRes.status === 200 && saveSlackRes.status === 200) {
      console.log("  ✓ Passed: Successfully stored webhook & slack configs in PostgreSQL");
      testsPassed++;
    } else {
      console.error("  ✗ FAILED Test 2:", saveHookRes.status, saveSlackRes.status);
    }

    // TEST 3: List Organization Integrations
    console.log("\n[Test 3] Listing organization integrations via GET /api/v1/integrations...");
    const listRes = await request({
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/integrations",
      method: "GET"
    });

    const hasWebhook = listRes.data?.data?.some((i) => i.provider === "webhook" && i.is_enabled);
    const hasSlack = listRes.data?.data?.some((i) => i.provider === "slack" && i.is_enabled);

    if (listRes.status === 200 && hasWebhook && hasSlack) {
      console.log(`  ✓ Passed: Integrations retrieved (${listRes.data.data.length} total active feeds)`);
      testsPassed++;
    } else {
      console.error("  ✗ FAILED Test 3:", listRes.status, listRes.data);
    }

    // TEST 4: Automated Dispatch on High-Risk Threat Detection
    console.log("\n[Test 4] Simulating completed high-risk analysis verdict dispatch...");
    const initReqCount = receivedRequests.length;
    const sessionId = `test_ses_${Date.now()}`;

    const dispatchResult = await dispatchWebhook({
      sessionId,
      orgId: DEFAULT_ORG_ID,
      url: "https://login.microsoftonline.com.tenant-harvest.phish-net.org",
      verdict: "MALICIOUS",
      recommendedAction: "BLOCK",
      allowUserAccess: false,
      riskScore: 96,
      riskLevel: "critical",
      durationMs: 4200,
      findingCount: 3,
      findings: [
        { type: "BRAND_IMPERSONATION", title: "Targeted Microsoft 365 credential harvester" },
        { type: "HOMOGLYPH_DOMAIN", title: "Punycode deceptive lookalike host" }
      ]
    });

    // Allow async dispatches to finish
    await new Promise((r) => setTimeout(r, 800));

    const newReqs = receivedRequests.slice(initReqCount);
    console.log(`  ✓ Dispatched count: ${dispatchResult.count}, Mock receiver caught: ${newReqs.length} payloads`);

    const siemPayload = newReqs.find((r) => r.body?.event === "threat.alert");
    const slackPayload = newReqs.find((r) => r.body?.attachments && r.body?.text?.includes("BrowseGuard Threat Alert"));

    if (siemPayload && slackPayload) {
      console.log(`  ✓ Passed: SIEM payload delivered with score: ${siemPayload.body.alert?.risk_score}/100`);
      console.log(`  ✓ Passed: Slack payload delivered with color: ${slackPayload.body.attachments[0]?.color}`);
      testsPassed++;
    } else {
      console.error("  ✗ FAILED Test 4: Missing SIEM or Slack payload in mock receiver", newReqs);
    }

    // TEST 5: Verify Audit Log in PostgreSQL
    console.log("\n[Test 5] Verifying audit_events record in PostgreSQL...");
    const auditRes = await pool.query(
      `SELECT action, resource_type, details 
       FROM audit_events 
       WHERE resource_id = $1 AND action = 'WEBHOOK_DISPATCHED' 
       ORDER BY created_at DESC LIMIT 2;`,
      [sessionId]
    );

    if (auditRes.rows.length > 0) {
      console.log(`  ✓ Passed: Found ${auditRes.rows.length} WEBHOOK_DISPATCHED audit log records in database`);
      testsPassed++;
    } else {
      console.error("  ✗ FAILED Test 5: No audit events found in database");
    }

  } finally {
    mockServer.close();
  }

  console.log("\n=================================================================");
  console.log(`  Results: ${testsPassed}/${totalTests} Tests Passed successfully!`);
  console.log("=================================================================\n");
  process.exit(testsPassed === totalTests ? 0 : 1);
}

runWebhookSiemSuite().catch((err) => {
  console.error("FATAL Suite Error:", err);
  process.exit(1);
});
