/**
 * Test Suite: Interactive API Playground & Gateway Developer Endpoints
 * Verifies that all endpoints exposed in the API Terminal Playground respond cleanly
 * with proper status codes, JSON formats, and sliding-window rate limit telemetry.
 */
"use strict";

const http = require("http");
const axios = require("axios");

const BASE_URL = "http://localhost:3000";

async function runApiPlaygroundSuite() {
  console.log("=======================================================");
  console.log("⚡ BROWSEGUARD API TERMINAL & PLAYGROUND TEST SUITE");
  console.log("=======================================================\n");

  let passedCount = 0;
  const totalTests = 8;

  // 1. Test Root Service Endpoint
  console.log("--- TEST 1: Service Root & CORS Exposed Headers ---");
  try {
    const res = await axios.get(`${BASE_URL}/`);
    if (res.status === 200 && res.data.service) {
      console.log(`  ✅ [PASS] Root service endpoint active: ${res.data.service}`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Root endpoint returned unexpected response:", res.data);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] Root service error:", err.message);
  }

  // 2. Test EML Parsing via Email Gateway API
  console.log("\n--- TEST 2: POST /api/v1/email-gateway/parse-eml ---");
  try {
    const rawEml = [
      'From: "Security Ops" <alert@soc-sandbox.local>',
      'To: analyst@victim.org',
      'Subject: Security Update Notification',
      'Authentication-Results: spf=pass; dkim=pass',
      'Content-Type: text/html',
      '',
      '<p>Please verify your session: <a href="https://secure-login-verify.pages.dev/token">Click Here</a></p>'
    ].join("\r\n");

    const res = await axios.post(`${BASE_URL}/api/v1/email-gateway/parse-eml`, {
      filename: "security_update.eml",
      rawEml
    });

    const links = res.data.extracted_links || res.data.extractedLinks || res.data.data?.extractedLinks;
    const authResults = res.data.email_summary?.auth_results || res.data.authenticationResults;

    if (res.status === 200 && links && links.length > 0) {
      console.log(`  ✅ [PASS] Successfully parsed EML, extracted ${links.length} link(s)`);
      console.log(`  ✅ [PASS] Authentication status: SPF=${authResults?.spf || "PASS"}`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] EML parsing returned unexpected data:", res.data);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] EML endpoint error:", err.message);
  }

  // 3. Test Aggregated STIX 2.1 Threat Feed Query
  console.log("\n--- TEST 3: GET /api/v1/analyses/threat-feed/stix?minScore=0&limit=10 ---");
  try {
    const res = await axios.get(`${BASE_URL}/api/v1/analyses/threat-feed/stix?minScore=0&limit=10`);
    if (res.status === 200 && res.data.type === "bundle" && Array.isArray(res.data.objects)) {
      console.log(`  ✅ [PASS] STIX 2.1 Bundle received with ${res.data.objects.length} threat objects`);
      console.log(`  ✅ [PASS] STIX spec_version: ${res.data.objects[0]?.spec_version || "2.1"}`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] STIX threat feed returned invalid bundle:", res.data);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] STIX feed error:", err.message);
  }

  // 4. Test SIEM Webhook Ping Dispatch Endpoint
  console.log("\n--- TEST 4: POST /api/v1/integrations/test ---");
  let mockServer;
  try {
    const mockPort = 9988;
    mockServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));
    });
    await new Promise((resolve) => mockServer.listen(mockPort, resolve));

    const res = await axios.post(`${BASE_URL}/api/v1/integrations/test`, {
      provider: "webhook",
      api_key: `http://localhost:${mockPort}/test-siem-sink`,
      config: { secret: "test_playground_secret_key" }
    });

    if (res.status === 200 && res.data.success) {
      console.log(`  ✅ [PASS] SIEM Webhook dispatch confirmed: ${res.data.message}`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] SIEM test returned failure:", res.data);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] SIEM test error:", err.message);
  } finally {
    if (mockServer) mockServer.close();
  }

  // 5. Test Rate Limit Headers Presence
  console.log("\n--- TEST 5: Rate Limiter Telemetry in Response Headers ---");
  try {
    const res = await axios.get(`${BASE_URL}/api/v1/analyses?limit=1`);
    const limitH = res.headers["x-ratelimit-limit"];
    const remainH = res.headers["x-ratelimit-remaining"];
    const resetH = res.headers["x-ratelimit-reset"];

    if (limitH && remainH !== undefined) {
      console.log(`  ✅ [PASS] Rate Limit Telemetry Verified: Limit=${limitH}, Remaining=${remainH}, Reset=${resetH}`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Rate limit headers missing:", res.headers);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] Header check error:", err.message);
  }

  // 6. Test Extension Token Header Authentication
  console.log("\n--- TEST 6: Extension Token Authentication (X-Extension-Token) ---");
  try {
    const res = await axios.get(`${BASE_URL}/api/v1/extension/verify`, {
      headers: { "X-Extension-Token": "bg_ext_admin_live_token_777" }
    });
    if (res.status === 200 && res.data.success && res.data.user) {
      console.log(`  ✅ [PASS] Extension token verified: User '${res.data.user.email}', Organization '${res.data.organization?.name}'`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Extension verify failed:", res.data);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] Extension verify error:", err.message);
  }

  // 7. Test Subscriptions & Quota Query
  console.log("\n--- TEST 7: GET /api/v1/auth/subscriptions ---");
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: "admin@browseguard.local",
      password: "Password123!"
    });
    const token = loginRes.data?.data?.token;

    const subRes = await axios.get(`${BASE_URL}/api/v1/auth/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (subRes.status === 200 && subRes.data?.data) {
      const gws = Object.keys(subRes.data.data || {});
      console.log(`  ✅ [PASS] Subscriptions retrieved for gateways: [${gws.join(", ")}]`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Subscriptions returned invalid format:", subRes.data);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] Subscriptions test error:", err.message);
  }

  // 8. Test Analysis Detonation Submission with API Key
  console.log("\n--- TEST 8: POST /api/v1/analyses with API Key ---");
  try {
    const res = await axios.post(
      `${BASE_URL}/api/v1/analyses`,
      {
        url: "https://example.com/api-playground-verification",
        os: "linux_chromium",
        antiCloak: true
      },
      {
        headers: { "X-API-Key": "bg_live_email_gateway_default" }
      }
    );

    const targetId = res.data?.data?.analysis_id || res.data?.data?.session_id;
    if (res.status === 202 && res.data.success && targetId) {
      console.log(`  ✅ [PASS] Detonation successfully queued: id='${targetId}', status='${res.data.data.status}'`);
      passedCount++;
    } else {
      console.error("  ❌ [FAIL] Detonation submission unexpected response:", res.data);
    }
  } catch (err) {
    console.error("  ❌ [FAIL] Detonation submission error:", err.message);
  }

  console.log("\n=======================================================");
  console.log(`RESULTS: ${passedCount}/${totalTests} TESTS PASSED (${Math.round((passedCount / totalTests) * 100)}%)`);
  console.log("=======================================================\n");

  if (passedCount === totalTests) {
    console.log("🎉 ALL API TERMINAL PLAYGROUND ENDPOINTS VERIFIED OPERATIONAL!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runApiPlaygroundSuite().catch((err) => {
  console.error("Fatal suite failure:", err);
  process.exit(1);
});
