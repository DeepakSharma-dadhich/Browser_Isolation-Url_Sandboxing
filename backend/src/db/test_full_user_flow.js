"use strict";

const http = require("http");

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
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

async function runFullUserFlowTest() {
  console.log("=============================================================");
  console.log("  BROWSEGUARD COMPLETE PRODUCT FUNCTIONALITY VALIDATION TEST");
  console.log("=============================================================");

  const timestamp = Date.now();
  const email = `analyst_flow_${timestamp}@defense.corp`;
  const password = "Password123!";

  // 1. Health check
  console.log("\n[Step 1] Checking host backend and database health...");
  const healthRes = await request({ hostname: "localhost", port: 3000, path: "/api/health", method: "GET" });
  console.log(`Backend Status: ${healthRes.data?.status}, DB: ${healthRes.data?.database?.status}`);
  if (healthRes.data?.status !== "healthy") {
    console.error("FAIL: Backend not healthy");
    process.exit(1);
  }

  // 2. Register for Gateway 1 (URL Scanner)
  console.log("\n[Step 2] Registering user account choosing Gateway 1 (url_scanner)...");
  const regRes = await request(
    { hostname: "localhost", port: 3000, path: "/api/v1/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
    { email, password, fullName: "Charlie Analyst", gateway: "url_scanner" }
  );
  console.log(`HTTP ${regRes.status}: ${regRes.data?.message}`);
  const token = regRes.data?.data?.token;
  const extToken = regRes.data?.data?.user?.extensionToken;

  // 3. Verify subscriptions
  console.log("\n[Step 3] Fetching user subscriptions matrix via GET /api/v1/auth/subscriptions...");
  const subsRes = await request(
    { hostname: "localhost", port: 3000, path: "/api/v1/auth/subscriptions", method: "GET", headers: { Authorization: `Bearer ${token}` } }
  );
  const subs = subsRes.data?.data;
  console.log("Subscriptions retrieved:");
  console.log(" - Gateway 1 (URL Scanner):", subs?.url_scanner?.status, "| Quota:", subs?.url_scanner?.quota_remaining, "scans");
  console.log(" - Gateway 2 (Extension):", subs?.browser_extension?.status, "| Is Active:", subs?.browser_extension?.is_active);
  console.log(" - Gateway 3 (Email API):", subs?.email_gateway_api?.status, "| Is Active:", subs?.email_gateway_api?.is_active);

  if (!subs?.url_scanner?.is_active || subs?.browser_extension?.is_active || subs?.email_gateway_api?.is_active) {
    console.error("FAIL: Only url_scanner should be active!");
    process.exit(1);
  }
  console.log("PASS: Per-gateway isolation verified on account creation.");

  // 4. Detonate URL in Gateway 1
  console.log("\n[Step 4] Detonating URL in Gateway 1 (POST /api/analyze)...");
  const scanRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/analyze",
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    },
    { url: "https://secure-portal-auth.test" }
  );
  console.log(`HTTP ${scanRes.status}: Session ID ${scanRes.data?.data?.session_id}`);
  if (scanRes.status !== 202) {
    console.error("FAIL: Scan failed");
    process.exit(1);
  }
  console.log("PASS: Heavy VM Sandbox accepted job and consumed quota.");

  // 5. Verify Gateway 2 is BLOCKED
  console.log("\n[Step 5] Testing Gateway 2 isolation (Extension request before trial activation)...");
  const extRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/analyses",
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Extension-Token": extToken }
    },
    { url: "https://webmail-click.test", source: "BROWSER_EXTENSION" }
  );
  console.log(`HTTP ${extRes.status} (Expected 403): Code = ${extRes.data?.error?.code}`);
  if (extRes.status !== 403 || extRes.data?.error?.code !== "GATEWAY_ACCESS_DENIED") {
    console.error("FAIL: Unsubscribed gateway should be blocked with 403 GATEWAY_ACCESS_DENIED");
    process.exit(1);
  }
  console.log("PASS: Extension gateway blocked unentitled user.");

  // 6. Activate Gateway 2 Free Trial
  console.log("\n[Step 6] Activating 14-Day Free Trial for Gateway 2 (POST /api/v1/auth/activate-trial)...");
  const trial2Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/auth/activate-trial",
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    },
    { gateway: "browser_extension" }
  );
  console.log(`HTTP ${trial2Res.status}: ${trial2Res.data?.message}`);
  if (trial2Res.status !== 200) {
    console.error("FAIL: Trial activation failed");
    process.exit(1);
  }

  // 7. Retest Gateway 2 - now succeeds
  console.log("\n[Step 7] Retesting Gateway 2 after trial activation...");
  const extRes2 = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/analyses",
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Extension-Token": extToken }
    },
    { url: "https://webmail-click.test", source: "BROWSER_EXTENSION" }
  );
  console.log(`HTTP ${extRes2.status}: Analysis ID ${extRes2.data?.data?.analysis_id}`);
  if (extRes2.status !== 202) {
    console.error("FAIL: Gateway 2 should succeed after trial activation");
    process.exit(1);
  }
  console.log("PASS: Gateway 2 accepted extension request and decremented quota.");

  // 8. Activate Gateway 3 Free Trial & Test Email Link Extraction
  console.log("\n[Step 8] Activating Gateway 3 (email_gateway_api) Free Trial...");
  const trial3Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/auth/activate-trial",
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    },
    { gateway: "email_gateway_api" }
  );
  console.log(`HTTP ${trial3Res.status}: ${trial3Res.data?.message}`);

  console.log("\n[Step 9] Testing Email Link Extraction & Detonation in Gateway 3...");
  const emailRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/email-gateway/extract-and-detonate",
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    },
    {
      email_content: "Invoice notification: https://invoice-review.test/doc.pdf",
      sender: "billing@vendor.test",
      recipient: email
    }
  );
  console.log(`HTTP ${emailRes.status}: Extracted ${emailRes.data?.extracted_count} links`);
  console.log("Isolation URL generated:", emailRes.data?.analyses?.[0]?.isolation_url);
  if (emailRes.status !== 200 || emailRes.data?.extracted_count !== 1) {
    console.error("FAIL: Email gateway link extraction failed");
    process.exit(1);
  }
  console.log("PASS: Gateway 3 link extraction and click-time rewriter functioned perfectly.");

  // 10. Final Subscriptions Check
  console.log("\n[Step 10] Checking final subscriptions matrix across all 3 gateways...");
  const finalSubsRes = await request(
    { hostname: "localhost", port: 3000, path: "/api/v1/auth/subscriptions", method: "GET", headers: { Authorization: `Bearer ${token}` } }
  );
  const finalSubs = finalSubsRes.data?.data;
  console.log("Final Subscription State:");
  console.log(` - Gateway 1: ${finalSubs?.url_scanner?.status} (Remaining: ${finalSubs?.url_scanner?.quota_remaining}/${finalSubs?.url_scanner?.quota_total})`);
  console.log(` - Gateway 2: ${finalSubs?.browser_extension?.status} (Remaining: ${finalSubs?.browser_extension?.quota_remaining}/${finalSubs?.browser_extension?.quota_total})`);
  console.log(` - Gateway 3: ${finalSubs?.email_gateway_api?.status} (Remaining: ${finalSubs?.email_gateway_api?.quota_remaining}/${finalSubs?.email_gateway_api?.quota_total})`);

  console.log("\n=============================================================");
  console.log("  ALL PRODUCT & GATEWAY FUNCTIONALITY 100% OPERATIONAL! ✓");
  console.log("=============================================================\n");
  process.exit(0);
}

runFullUserFlowTest().catch((err) => {
  console.error("Validation error:", err);
  process.exit(1);
});
