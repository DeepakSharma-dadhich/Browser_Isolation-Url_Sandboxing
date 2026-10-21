"use strict";

const axios = require("axios");
const { pool } = require("../config/db");

const BASE_URL = "http://localhost:3000";

async function testStixThreatIntelExport() {
  console.log("\n=======================================================");
  console.log("📦  BROWSEGUARD OASIS STIX 2.1 THREAT INTEL EXPORT TEST");
  console.log("=======================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Get an existing completed analysis from PostgreSQL
    const res = await pool.query(
      `SELECT id, submitted_url, verdict, risk_score
       FROM analyses
       ORDER BY created_at DESC
       LIMIT 1;`
    );

    if (res.rows.length === 0) {
      console.log("⚠️ No existing analyses found in DB. Submitting a quick demo scan...");
      // Submit scan
      const subRes = await axios.post(`${BASE_URL}/api/v1/analyses`, {
        url: "https://phish-test.example.com/invoice-login"
      });
      var targetSessionId = subRes.data.data.analysis_id;
    } else {
      var targetSessionId = res.rows[0].id;
      console.log(`[Found] Target analysis record for STIX export: ${targetSessionId}`);
    }

    // TEST 1: Query STIX 2.1 Bundle for Individual Analysis
    console.log("\n--- TEST 1: GET /api/v1/analyses/:id/stix ---");
    const stixRes = await axios.get(`${BASE_URL}/api/v1/analyses/${targetSessionId}/stix`);
    assert(stixRes.status === 200, "STIX export endpoint returned HTTP 200");

    const bundle = stixRes.data;
    assert(bundle.type === "bundle", "Root object is a valid STIX 'bundle'");
    assert(bundle.spec_version === "2.1", "STIX specification version is '2.1'");
    assert(Array.isArray(bundle.objects) && bundle.objects.length > 0, `Bundle contains ${bundle.objects.length} STIX objects`);

    // Verify Identity object
    const identityObj = bundle.objects.find((o) => o.type === "identity");
    assert(Boolean(identityObj), "Bundle includes BrowseGuard system 'identity' object");

    // Verify Indicator objects
    const indicators = bundle.objects.filter((o) => o.type === "indicator");
    assert(indicators.length > 0, `Generated ${indicators.length} STIX 2.1 'indicator' object(s)`);
    assert(indicators[0].pattern.includes("value ="), `Indicator pattern syntax valid: ${indicators[0].pattern}`);

    // TEST 2: Download Attachment Header Flag
    console.log("\n--- TEST 2: GET /api/v1/analyses/:id/stix?download=true ---");
    const downloadRes = await axios.get(`${BASE_URL}/api/v1/analyses/${targetSessionId}/stix?download=true`);
    const dispHeader = downloadRes.headers["content-disposition"] || "";
    assert(dispHeader.includes("attachment") && dispHeader.includes(".json"), `Content-Disposition header includes attachment filename: '${dispHeader}'`);

    // TEST 3: Aggregated Organization Threat Intel Feed (TAXII endpoint)
    console.log("\n--- TEST 3: GET /api/v1/analyses/threat-feed/stix ---");
    const feedRes = await axios.get(`${BASE_URL}/api/v1/analyses/threat-feed/stix?limit=10`);
    assert(feedRes.status === 200, "Aggregated threat feed returned HTTP 200");
    const feedBundle = feedRes.data;
    assert(feedBundle.type === "bundle" && feedBundle.spec_version === "2.1", "Threat feed root is valid STIX 2.1 bundle");
    assert(Array.isArray(feedBundle.objects), `Aggregated feed bundle contains ${feedBundle.objects.length} objects`);

  } catch (err) {
    console.error("Test execution failed:", err.response?.data || err.message);
  } finally {
    await pool.end();
  }

  console.log("\n=======================================================");
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("=======================================================\n");

  if (passed === total) {
    console.log("🎉 ALL STIX 2.1 THREAT INTEL EXPORT TESTS PASSED!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testStixThreatIntelExport();
