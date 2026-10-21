"use strict";

const http = require("http");

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
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

async function runTests() {
  console.log("=================================================");
  console.log("  BROWSEGUARD MULTI-GATEWAY ISOLATION & QUOTA TEST");
  console.log("=================================================");

  const testEmail = `user_${Date.now()}@securitylab.test`;
  const testPassword = "Password123!";

  // 1. Register user strictly for Gateway 1 (url_scanner)
  console.log("\n[Test 1] Registering user for Gateway 1 (url_scanner) only...");
  const regRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/auth/register",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      email: testEmail,
      password: testPassword,
      fullName: "Isolation Test Analyst",
      gateway: "url_scanner"
    }
  );

  console.log(`Response status: ${regRes.status}`);
  if (regRes.status !== 201) {
    console.error("Registration failed:", regRes.data);
    process.exit(1);
  }

  const userToken = regRes.data.data.token;
  const extToken = regRes.data.data.user.extensionToken;
  const subscriptions = regRes.data.data.subscriptions;

  console.log("User Subscriptions:");
  console.log(" - url_scanner:", subscriptions.url_scanner?.status, "(Active:", subscriptions.url_scanner?.is_active, "Quota:", subscriptions.url_scanner?.quota_remaining, ")");
  console.log(" - browser_extension:", subscriptions.browser_extension?.status, "(Active:", subscriptions.browser_extension?.is_active, ")");
  console.log(" - email_gateway_api:", subscriptions.email_gateway_api?.status, "(Active:", subscriptions.email_gateway_api?.is_active, ")");

  if (!subscriptions.url_scanner?.is_active || subscriptions.browser_extension?.is_active || subscriptions.email_gateway_api?.is_active) {
    console.error("FAIL: User should have access ONLY to url_scanner!");
    process.exit(1);
  }
  console.log("PASS: Gateway 1 entitlement verified, Gateway 2 & 3 are locked.");

  // 2. User calls Gateway 1 (/api/analyze)
  console.log("\n[Test 2] User calls Gateway 1 (/api/analyze)...");
  const scanRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/analyze",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`
      }
    },
    { url: "https://example-sandbox-test.com" }
  );

  console.log(`Response status: ${scanRes.status}`);
  if (scanRes.status !== 202) {
    console.error("FAIL: Scan request failed:", scanRes.data);
    process.exit(1);
  }
  console.log("PASS: Gateway 1 scan accepted successfully!");

  // 3. User attempts to use Gateway 2 (Extension Shield with their pairing token)
  console.log("\n[Test 3] User attempts to use Gateway 2 (Extension Token) WITHOUT subscription...");
  const extScanRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/analyses",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Token": extToken
      }
    },
    {
      url: "https://phishing-extension-intercept.test",
      source: "BROWSER_EXTENSION"
    }
  );

  console.log(`Response status: ${extScanRes.status}`);
  console.log("Error response:", extScanRes.data?.error);
  if (extScanRes.status !== 403 || extScanRes.data?.error?.code !== "GATEWAY_ACCESS_DENIED") {
    console.error("FAIL: Gateway 2 should be blocked with 403 GATEWAY_ACCESS_DENIED!");
    process.exit(1);
  }
  console.log("PASS: Gateway 2 successfully blocked unentitled access!");

  // 4. User attempts to use Gateway 3 (Email Gateway link extraction) WITHOUT subscription
  console.log("\n[Test 4] User attempts to use Gateway 3 (Email Gateway API) WITHOUT subscription...");
  const emailGwRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/email-gateway/extract-and-detonate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`
      }
    },
    {
      email_content: "Check this invoice: https://suspicious-invoice-link.test/invoice.pdf"
    }
  );

  console.log(`Response status: ${emailGwRes.status}`);
  console.log("Error response:", emailGwRes.data?.error);
  if (emailGwRes.status !== 403 || emailGwRes.data?.error?.code !== "GATEWAY_ACCESS_DENIED") {
    console.error("FAIL: Gateway 3 should be blocked with 403 GATEWAY_ACCESS_DENIED!");
    process.exit(1);
  }
  console.log("PASS: Gateway 3 successfully blocked unentitled access!");

  // 5. User activates Free Trial for Gateway 2
  console.log("\n[Test 5] User activates Free Trial for Gateway 2 (browser_extension)...");
  const trialRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/auth/activate-trial",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`
      }
    },
    { gateway: "browser_extension" }
  );

  console.log(`Response status: ${trialRes.status}`);
  if (trialRes.status !== 200) {
    console.error("FAIL: Failed to activate trial:", trialRes.data);
    process.exit(1);
  }
  console.log("Trial activated successfully! New quota:", trialRes.data?.data?.subscription?.quota_total);

  // 6. User retries Gateway 2 (Extension Token) - should now SUCCEED!
  console.log("\n[Test 6] Retrying Gateway 2 (Extension Token) with active trial...");
  const extRetryRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/analyses",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Token": extToken
      }
    },
    {
      url: "https://phishing-extension-intercept.test",
      source: "BROWSER_EXTENSION"
    }
  );

  console.log(`Response status: ${extRetryRes.status}`);
  if (extRetryRes.status !== 202) {
    console.error("FAIL: Gateway 2 should succeed after trial activation! Got:", extRetryRes.data);
    process.exit(1);
  }
  console.log("PASS: Gateway 2 succeeded and consumed trial quota!");

  // 7. Test Admin User (has full access across all 3 gateways)
  console.log("\n[Test 7] Authenticating as Administrator (admin@browseguard.local)...");
  const adminLoginRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      email: "admin@browseguard.local",
      password: "Password123!"
    }
  );

  console.log(`Admin login status: ${adminLoginRes.status}`);
  const adminSubs = adminLoginRes.data?.data?.subscriptions;
  console.log("Admin Subscriptions:");
  console.log(" - url_scanner:", adminSubs?.url_scanner?.status, "Tier:", adminSubs?.url_scanner?.plan_tier);
  console.log(" - browser_extension:", adminSubs?.browser_extension?.status, "Tier:", adminSubs?.browser_extension?.plan_tier);
  console.log(" - email_gateway_api:", adminSubs?.email_gateway_api?.status, "Tier:", adminSubs?.email_gateway_api?.plan_tier);

  if (!adminSubs?.url_scanner?.is_active || !adminSubs?.browser_extension?.is_active || !adminSubs?.email_gateway_api?.is_active) {
    console.error("FAIL: Admin must have active access across all 3 gateways!");
    process.exit(1);
  }
  console.log("PASS: Admin holds unrestricted enterprise access across all 3 gateways.");

  // 8. Test Quota Exhaustion (Heavy compute protection)
  console.log("\n[Test 8] Testing Quota Exhaustion enforcement...");
  const { pool } = require("../config/db");
  // Artificially exhaust Gateway 1 quota for this user
  await pool.query(
    "UPDATE gateway_subscriptions SET quota_used = quota_total WHERE user_id = $1 AND gateway = 'url_scanner'",
    [regRes.data.data.user.id]
  );

  const exhaustedRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/analyze",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`
      }
    },
    { url: "https://exhausted-test.com" }
  );

  console.log(`Response status: ${exhaustedRes.status}`);
  console.log("Error code:", exhaustedRes.data?.error?.code);
  if (exhaustedRes.status !== 429 || exhaustedRes.data?.error?.code !== "GATEWAY_QUOTA_EXCEEDED") {
    console.error("FAIL: Should return 429 GATEWAY_QUOTA_EXCEEDED! Got:", exhaustedRes.data);
    process.exit(1);
  }
  console.log("PASS: Quota exhaustion blocked compute misuse with HTTP 429!");

  console.log("\n=================================================");
  console.log("  ALL GATEWAY ISOLATION & QUOTA CHECKS PASSED! ✓");
  console.log("=================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});

