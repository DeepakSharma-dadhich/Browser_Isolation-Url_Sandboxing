"use strict";

const axios = require("axios");
const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

const BASE_URL = "http://localhost:3000";

async function runClientSecretAndScopeSecurityTests() {
  console.log("\n=======================================================");
  console.log("🛡️  BROWSEGUARD API SECURITY HARDENING TEST SUITE");
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
    // 1. Create a test client with bcrypt secret hash and specific scopes
    const testClientId = "bg_live_sec_test_" + Date.now();
    const rawSecret = "bg_sec_super_secret_token_12345";
    const hashedSecret = await bcrypt.hash(rawSecret, 10);
    const orgId = "00000000-0000-0000-0000-000000000001";

    await pool.query(
      `INSERT INTO api_clients (
        organization_id, name, client_id, client_secret_hash, scopes, is_active
      ) VALUES ($1, $2, $3, $4, $5, TRUE)
      ON CONFLICT (client_id) DO UPDATE SET client_secret_hash = $4;`,
      [orgId, "Security Hardening Test Key", testClientId, hashedSecret, ["analysis:read"]]
    );

    console.log(`[Setup] Provisioned test client '${testClientId}' with scope: ['analysis:read']`);

    // TEST 1: Authentication with Valid Client Secret via Headers
    console.log("\n--- TEST 1: Header Authentication with Valid Client Secret ---");
    try {
      const res1 = await axios.get(`${BASE_URL}/api/v1/analyses`, {
        headers: {
          "x-api-key": testClientId,
          "x-client-secret": rawSecret
        }
      });
      assert(res1.status === 200 && Array.isArray(res1.data.data), "Valid API key + bcrypt secret returns HTTP 200 with reports array");
      assert(res1.headers["x-ratelimit-limit"] !== undefined, "Response includes 'X-RateLimit-Limit' header");
    } catch (err) {
      assert(false, `Test 1 failed with error: ${err.response?.data?.message || err.message}`);
    }

    // TEST 2: Authentication with Invalid Client Secret
    console.log("\n--- TEST 2: Header Authentication with Invalid Client Secret ---");
    try {
      await axios.get(`${BASE_URL}/api/v1/analyses`, {
        headers: {
          "x-api-key": testClientId,
          "x-client-secret": "bg_sec_wrong_password_99999"
        }
      });
      assert(false, "Invalid client secret should have been rejected with 401");
    } catch (err) {
      const status = err.response?.status;
      const errorCode = err.response?.data?.error;
      assert(status === 401 && errorCode === "INVALID_CLIENT_SECRET", "Invalid client secret correctly rejected with HTTP 401 'INVALID_CLIENT_SECRET'");
    }

    // TEST 3: HTTP Basic Auth (RFC 7617)
    console.log("\n--- TEST 3: HTTP Basic Auth (client_id:client_secret) ---");
    try {
      const basicHeader = "Basic " + Buffer.from(`${testClientId}:${rawSecret}`).toString("base64");
      const res3 = await axios.get(`${BASE_URL}/api/v1/analyses`, {
        headers: {
          Authorization: basicHeader
        }
      });
      assert(res3.status === 200, "RFC 7617 HTTP Basic Auth header decoded and authenticated successfully");
    } catch (err) {
      assert(false, `Test 3 failed: ${err.response?.data?.message || err.message}`);
    }

    // TEST 4: Scope Enforcement (Lacks required 'analysis:create' scope)
    console.log("\n--- TEST 4: Scope Enforcement for Restricted Operations ---");
    try {
      await axios.post(
        `${BASE_URL}/api/v1/analyses`,
        { url: "https://example.com/test-url" },
        {
          headers: {
            "x-api-key": testClientId,
            "x-client-secret": rawSecret
          }
        }
      );
      assert(false, "Client with read-only scope should NOT be allowed to submit analyses");
    } catch (err) {
      const status = err.response?.status;
      const errorCode = err.response?.data?.error;
      assert(status === 403 && errorCode === "INSUFFICIENT_SCOPE", "Missing 'analysis:create' scope correctly rejected with HTTP 403 'INSUFFICIENT_SCOPE'");
    }

    // TEST 5: Grant Full Scopes and Verify Successful Submission Permission
    console.log("\n--- TEST 5: Verified Scope Permission Execution ---");
    await pool.query(
      "UPDATE api_clients SET scopes = $1 WHERE client_id = $2",
      [["analysis:create", "analysis:read"], testClientId]
    );

    try {
      const res5 = await axios.post(
        `${BASE_URL}/api/v1/analyses`,
        { url: "https://safe-demo-portal.com/login" },
        {
          headers: {
            "x-api-key": testClientId,
            "x-client-secret": rawSecret
          }
        }
      );
      const isSuccess = (res5.status === 200 || res5.status === 202) && Boolean(res5.data.data?.analysis_id || res5.data.analysisId);
      assert(isSuccess, "API Client with 'analysis:create' scope successfully submitted analysis job (HTTP 202 Queued)");
    } catch (err) {
      assert(false, `Test 5 failed: ${err.response?.data?.message || err.message}`);
    }

    // TEST 6: Backward Compatibility for Legacy API Key without Secret
    console.log("\n--- TEST 6: Backward Compatibility for Simple X-API-Key ---");
    try {
      const res6 = await axios.get(`${BASE_URL}/api/v1/analyses`, {
        headers: {
          "x-api-key": "bg_live_email_gateway_default"
        }
      });
      assert(res6.status === 200, "Legacy client 'bg_live_email_gateway_default' without secret maintains 100% backward compatibility");
    } catch (err) {
      assert(false, `Test 6 failed: ${err.response?.data?.message || err.message}`);
    }

    // TEST 7: In-Memory Sliding-Window Rate Limiter
    console.log("\n--- TEST 7: Rate Limiter Response Headers & Quota Tracking ---");
    try {
      const res7 = await axios.get(`${BASE_URL}/api/v1/analyses`, {
        headers: {
          "x-api-key": testClientId,
          "x-client-secret": rawSecret
        }
      });
      const limitHeader = res7.headers["x-ratelimit-limit"];
      const remHeader = res7.headers["x-ratelimit-remaining"];
      const resetHeader = res7.headers["x-ratelimit-reset"];
      assert(limitHeader && remHeader !== undefined && resetHeader, `Rate limit headers present: Limit=${limitHeader}, Remaining=${remHeader}, Reset=${resetHeader}`);
    } catch (err) {
      assert(false, `Test 7 failed: ${err.message}`);
    }

    // Cleanup test client
    await pool.query("DELETE FROM api_clients WHERE client_id = $1", [testClientId]);
    console.log(`[Cleanup] Removed test client '${testClientId}'`);

  } catch (err) {
    console.error("Test Suite execution failed:", err);
  } finally {
    await pool.end();
  }

  console.log("\n=======================================================");
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("=======================================================\n");

  if (passed === total) {
    console.log("🎉 ALL API SECURITY HARDENING CRITERIA VERIFIED OPERATIONAL!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runClientSecretAndScopeSecurityTests();
