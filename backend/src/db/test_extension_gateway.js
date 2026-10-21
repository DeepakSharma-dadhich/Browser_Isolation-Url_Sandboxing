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

async function runExtensionGatewaySuite() {
  console.log("=================================================================");
  console.log("   BrowseGuard Gateway 3: Browser Extension Shield Verification  ");
  console.log("=================================================================");

  const adminToken = "bg_ext_admin_live_token_777";
  let testsPassed = 0;
  let totalTests = 6;

  // TEST 1: Extension Pairing Handshake
  console.log("\n[Test 1] Verifying extension handshake with pairing token...");
  const verifyRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/v1/extension/verify",
    method: "GET",
    headers: { "X-Extension-Token": adminToken }
  });

  if (verifyRes.status === 200 && verifyRes.data?.success) {
    console.log(`  ✓ Passed: Paired with ${verifyRes.data.user.email} (${verifyRes.data.organization.name})`);
    console.log(`    Gateway: ${verifyRes.data.gateway.gateway} • Status: ${verifyRes.data.gateway.status} • Quota: ${verifyRes.data.gateway.quota_remaining}`);
    testsPassed++;
  } else {
    console.error("  ✗ FAILED Test 1:", verifyRes.status, verifyRes.data);
  }

  // TEST 2: Rejection of Invalid Token
  console.log("\n[Test 2] Verifying rejection of unauthenticated / forged extension token...");
  const invalidRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/v1/extension/verify",
    method: "GET",
    headers: { "X-Extension-Token": "bg_ext_forged_rogue_token" }
  });

  if (invalidRes.status === 401 && invalidRes.data?.error === "INVALID_EXTENSION_TOKEN") {
    console.log(`  ✓ Passed: HTTP 401 correctly returned (${invalidRes.data.message})`);
    testsPassed++;
  } else {
    console.error("  ✗ FAILED Test 2:", invalidRes.status, invalidRes.data);
  }

  // TEST 3: Package Archive Download
  console.log("\n[Test 3] Verifying packaged extension zip archive availability...");
  const dlRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/v1/extension/download",
    method: "GET"
  });

  if (dlRes.status === 200 && dlRes.headers["content-type"] === "application/zip") {
    console.log(`  ✓ Passed: Archive download served HTTP 200 with Content-Type 'application/zip'`);
    testsPassed++;
  } else {
    console.error("  ✗ FAILED Test 3:", dlRes.status, dlRes.headers);
  }

  // TEST 4: Extension URL Click-Interception Submission
  console.log("\n[Test 4] Simulating webmail link click-interception analysis submission...");
  const targetUrl = "https://phishing-portal.test-gateway3.corp/login";
  const submitRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/v1/analyses",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Token": adminToken
      }
    },
    {
      url: targetUrl,
      source: "BROWSER_EXTENSION",
      scan_options: {
        trigger: "extension_click_interception"
      }
    }
  );

  let analysisId = null;
  if (submitRes.status === 200 || submitRes.status === 201 || submitRes.status === 202) {
    analysisId = submitRes.data?.data?.analysis_id;
    console.log(`  ✓ Passed: URL analysis successfully queued by Extension Shield! Analysis ID: ${analysisId}`);
    testsPassed++;
  } else {
    console.error("  ✗ FAILED Test 4:", submitRes.status, submitRes.data);
  }

  // TEST 5: Status polling using extension token
  console.log("\n[Test 5] Polling analysis state using extension token...");
  if (analysisId) {
    const statusRes = await request({
      hostname: "localhost",
      port: 3000,
      path: `/api/v1/analyses/${analysisId}/status`,
      method: "GET",
      headers: { "X-Extension-Token": adminToken }
    });

    if (statusRes.status === 200 && statusRes.data?.data) {
      console.log(`  ✓ Passed: Status retrieved (State: ${statusRes.data.data.status}, Cached: ${statusRes.data.data.cached || false})`);
      testsPassed++;
    } else {
      console.error("  ✗ FAILED Test 5:", statusRes.status, statusRes.data);
    }
  } else {
    console.error("  ✗ Skipped Test 5 due to missing analysisId");
  }

  // TEST 6: Static frontend package availability
  console.log("\n[Test 6] Verifying static web frontend serves extension package...");
  const frontDlRes = await request({
    hostname: "localhost",
    port: 5173,
    path: "/downloads/browseguard-extension.zip",
    method: "GET"
  });

  if (frontDlRes.status === 200) {
    console.log(`  ✓ Passed: Frontend dev server statically serves /downloads/browseguard-extension.zip (HTTP 200)`);
    testsPassed++;
  } else {
    console.error("  ✗ FAILED Test 6:", frontDlRes.status);
  }

  console.log("\n=================================================================");
  console.log(`  Results: ${testsPassed}/${totalTests} Tests Passed successfully!`);
  console.log("=================================================================\n");
  process.exit(testsPassed === totalTests ? 0 : 1);
}

runExtensionGatewaySuite().catch((err) => {
  console.error("FATAL Suite Error:", err);
  process.exit(1);
});
