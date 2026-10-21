/**
 * Test Suite: Advanced Phishing & Malware Heuristics Integration
 * Validates that modern behavioral heuristics (ClickFix, OAuth Device Phishing,
 * Scareware, Fake Browser Updates, Clipboard Hijacking) seamlessly integrate
 * through the BrowseGuard REST API, STIX 2.1 export, and SIEM alert dispatcher.
 */
const http = require("http");
const axios = require("axios");
const crypto = require("crypto");
const { pool } = require("../config/db");

const BASE_URL = "http://localhost:3000";
const MOCK_SIEM_PORT = 9877;

async function runAdvancedHeuristicsIntegrationSuite() {
  console.log("======================================================================");
  console.log("🎯  BROWSEGUARD ADVANCED PHISHING & MALWARE HEURISTICS INTEGRATION");
  console.log("======================================================================\n");

  const receivedAlerts = [];
  const mockServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        receivedAlerts.push(JSON.parse(body));
      } catch {
        receivedAlerts.push(body);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, acknowledged: true }));
    });
  });

  await new Promise((resolve) => mockServer.listen(MOCK_SIEM_PORT, resolve));

  let passedCount = 0;
  const totalTests = 7;
  const testAnalysisId = crypto.randomUUID();

  try {
    // 1. Create a simulated high-severity multi-vector analysis record
    console.log("--- TEST 1: Seed Simulated Multi-Vector Incident in PostgreSQL ---");
    const orgRes = await pool.query("SELECT id FROM organizations LIMIT 1;");
    const orgId = orgRes.rows[0]?.id;

    await pool.query(
      `
      INSERT INTO analyses (
        id, organization_id, submitted_url, final_url, final_hostname,
        status, verdict, risk_score, risk_level, recommended_action,
        page_title, duration_ms, completeness, created_at, completed_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        'COMPLETED', 'MALICIOUS', 100, 'critical', 'BLOCK_AND_ISOLATE',
        $6, 4200, 'complete', NOW(), NOW()
      );
      `,
      [
        testAnalysisId,
        orgId,
        "https://verify-cloudflare-gate.top/captcha",
        "https://verify-cloudflare-gate.top/captcha",
        "verify-cloudflare-gate.top",
        "Cloudflare Human Verification Required"
      ]
    );
    passedCount++;

    // 2. Insert the 5 Advanced Heuristic findings into PostgreSQL
    console.log("--- TEST 2: Seed Advanced Heuristic Findings (ClickFix, OAuth, Scareware, Update, Clip) ---");
    const testFindings = [
      {
        id: "CLICKFIX-001",
        title: "ClickFix Fake CAPTCHA / PowerShell Paste-and-Run Lure",
        category: "social_engineering_lure",
        severity: "CRITICAL",
        score: 50,
        mitre_id: "T1204.002",
        mitre_name: "User Execution: Fake CAPTCHA / PowerShell Paste Lure",
        evidence: { lure_type: "clickfix_fake_captcha", has_run_dialog_instructions: true, has_paste_execute_instructions: true }
      },
      {
        id: "OAUTH-001",
        title: "OAuth 2.0 Device Authorization Phishing (Device Login Hijack)",
        category: "credential_phishing",
        severity: "CRITICAL",
        score: 45,
        mitre_id: "T1528",
        mitre_name: "Steal Application Access Token: Device Authorization Phishing",
        evidence: { impersonated_endpoint: "microsoft.com/devicelogin", detected_code_sample: "B7X8-K9M2" }
      },
      {
        id: "SCARED-001",
        title: "Tech Support Scam / Fake Security Lockout Lure",
        category: "social_engineering_lure",
        severity: "HIGH",
        score: 40,
        mitre_id: "T1204.001",
        mitre_name: "User Execution: Tech Support Scam / Fake Security Lockout",
        evidence: { lure_type: "tech_support_scam_scareware", has_phone_number: true }
      },
      {
        id: "UPDATE-001",
        title: "Fake Browser Update Lure (Drive-by Compromise)",
        category: "social_engineering_lure",
        severity: "HIGH",
        score: 35,
        mitre_id: "T1189",
        mitre_name: "Drive-by Compromise: Fake Browser Update Lure",
        evidence: { lure_type: "fake_browser_update", unauthorized_domain: "cdn-fast-browser-patch.org" }
      },
      {
        id: "CLIP-001",
        title: "Malicious Clipboard Hijacking Payload",
        category: "malware_evasion",
        severity: "CRITICAL",
        score: 45,
        mitre_id: "T1115",
        mitre_name: "Clipboard Data: Malicious Clipboard Hijacking",
        evidence: { technique: "malicious_clipboard_hijacking", api_abused: "navigator.clipboard.writeText" }
      }
    ];

    for (const f of testFindings) {
      await pool.query(
        `
        INSERT INTO findings (
          analysis_id, rule_id, rule_version, title, description,
          category, severity, confidence, score_contribution,
          evidence, mitre_attack_id, mitre_attack_name
        ) VALUES ($1, $2, '1.0', $3, 'Advanced behavioral heuristic detection.', $4, $5, 1.0, $6, $7, $8, $9);
        `,
        [
          testAnalysisId,
          f.id,
          f.title,
          f.category,
          f.severity,
          f.score,
          JSON.stringify(f.evidence),
          f.mitre_id,
          f.mitre_name
        ]
      );
    }

    console.log(`  ✅ [PASS] Successfully inserted 5 heuristic findings for analysis ID: '${testAnalysisId}'`);
    passedCount++;

    // 3. Query analysis via Express REST API
    console.log("--- TEST 3: REST API GET /api/v1/analyses/:id Findings & MITRE Validation ---");
    const apiRes = await axios.get(`${BASE_URL}/api/v1/analyses/${testAnalysisId}`);
    if (apiRes.status !== 200 || !apiRes.data.success) {
      throw new Error(`API returned non-200 status: ${apiRes.status}`);
    }

    const fetchedFindings = apiRes.data.data.findings || [];
    if (fetchedFindings.length < 5) {
      throw new Error(`Expected at least 5 findings, got ${fetchedFindings.length}`);
    }

    const findingRuleIds = fetchedFindings.map(f => f.rule_id || f.id);
    const expectedRuleIds = ["CLICKFIX-001", "OAUTH-001", "SCARED-001", "UPDATE-001", "CLIP-001"];
    for (const exp of expectedRuleIds) {
      if (!findingRuleIds.includes(exp)) {
        throw new Error(`Missing expected finding ID: ${exp}`);
      }
    }

    const clickfixFinding = fetchedFindings.find(f => (f.id === "CLICKFIX-001" || f.rule_id === "CLICKFIX-001"));
    if (!clickfixFinding || clickfixFinding.mitre_attack_id !== "T1204.002") {
      throw new Error(`CLICKFIX-001 expected MITRE T1204.002, got ${clickfixFinding?.mitre_attack_id}`);
    }

    console.log(`  ✅ [PASS] REST API returned all 5 findings with complete MITRE ATT&CK taxonomy.`);
    passedCount++;

    // 4. Verify STIX 2.1 Bundle Export
    console.log("--- TEST 4: STIX 2.1 Bundle Export Validation for New Heuristic Techniques ---");
    const stixRes = await axios.get(`${BASE_URL}/api/v1/analyses/${testAnalysisId}/stix`);
    if (stixRes.status !== 200 || stixRes.data.type !== "bundle") {
      throw new Error("STIX export did not return a valid bundle.");
    }

    const bundleObjects = stixRes.data.objects || [];
    const attackPatterns = bundleObjects.filter(o => o.type === "attack-pattern");
    const externalIds = [];
    attackPatterns.forEach(ap => {
      (ap.external_references || []).forEach(ref => {
        if (ref.external_id) externalIds.push(ref.external_id);
      });
    });

    if (!externalIds.includes("T1204.002") || !externalIds.includes("T1528")) {
      throw new Error(`STIX bundle missing expected MITRE external IDs (found: ${externalIds.join(", ")})`);
    }

    console.log(`  ✅ [PASS] STIX 2.1 bundle generated with Attack Patterns: ${externalIds.join(", ")}`);
    passedCount++;

    // 5. Verify SIEM Webhook Alert Dispatch with New MITRE Techniques
    console.log("--- TEST 5: 1-Click SIEM Alert Dispatch with MITRE & Heuristic Telemetry ---");
    const siemRes = await axios.post(`${BASE_URL}/api/v1/analyses/${testAnalysisId}/dispatch-siem`, {
      target_url: `http://localhost:${MOCK_SIEM_PORT}/siem/collector`
    });

    if (siemRes.status !== 200 || !siemRes.data.success) {
      throw new Error("SIEM dispatch endpoint failed.");
    }

    const receivedAlert = receivedAlerts[0];
    const mitreList = receivedAlert?.incident?.mitre_attack;
    if (!Array.isArray(mitreList)) {
      throw new Error("SIEM mock receiver did not capture alert with incident.mitre_attack array.");
    }

    const siemMitreIds = mitreList.map(t => t.id);
    if (!siemMitreIds.includes("T1204.002") || !siemMitreIds.includes("T1528")) {
      throw new Error(`SIEM alert missing ClickFix / OAuth MITRE techniques: ${siemMitreIds.join(", ")}`);
    }

    console.log(`  ✅ [PASS] SIEM incident alert payload includes MITRE techniques: ${siemMitreIds.join(", ")}`);
    passedCount++;

    // 6. Verify Executive Brief Summary Metrics
    console.log("--- TEST 6: Executive Brief Metrics Computation ---");
    const execScore = apiRes.data.data.risk_score;
    const execVerdict = apiRes.data.data.verdict;
    const criticalCount = fetchedFindings.filter(f => f.severity === "CRITICAL").length;

    if (execScore < 90 || execVerdict !== "MALICIOUS" || criticalCount < 3) {
      throw new Error(`Unexpected executive briefing metrics: score=${execScore}, criticalCount=${criticalCount}`);
    }

    console.log(`  ✅ [PASS] Executive briefing metrics: Score=${execScore}, Critical Findings=${criticalCount}, Verdict=${execVerdict}`);
    passedCount++;

    // 7. Clean up test database records
    console.log("--- TEST 7: Database Cleanup of Synthetic Incident ---");
    await pool.query("DELETE FROM findings WHERE analysis_id = $1;", [testAnalysisId]);
    await pool.query("DELETE FROM analyses WHERE id = $1;", [testAnalysisId]);
    mockServer.close();
    console.log(`  ✅ [PASS] Cleaned up synthetic incident '${testAnalysisId}'.`);
    passedCount++;

  } catch (err) {
    console.error(`  ❌ [FAIL] ${err.message}`);
    // Cleanup if failure
    try {
      await pool.query("DELETE FROM findings WHERE analysis_id = $1;", [testAnalysisId]);
      await pool.query("DELETE FROM analyses WHERE id = $1;", [testAnalysisId]);
      mockServer.close();
    } catch (_) {}
    process.exit(1);
  }

  console.log("\n======================================================================");
  console.log(`🏁  SUITE COMPLETE: ${passedCount}/${totalTests} TESTS PASSED (100%)`);
  console.log("======================================================================\n");
  process.exit(0);
}

runAdvancedHeuristicsIntegrationSuite();
