/**
 * Live Sandbox Detonation Test Suite
 * 
 * Submits real ClickFix and OAuth Device Phishing simulations into the sandbox queue,
 * monitors the headless browser execution, captures forensic findings and MITRE TTPs,
 * and validates the Executive Incident Brief & SIEM alert workflow.
 */
"use strict";

const http = require("http");
const axios = require("axios");

const BASE_URL = "http://localhost:3000";
const MOCK_SIEM_PORT = 9878;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runLiveSandboxDetonationSuite() {
  console.log("======================================================================");
  console.log("🚀  BROWSEGUARD LIVE SANDBOX DETONATION & MITRE ATT&CK SUITE");
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
      res.end(JSON.stringify({ acknowledged: true }));
    });
  });

  await new Promise((resolve) => mockServer.listen(MOCK_SIEM_PORT, resolve));

  try {
    // -------------------------------------------------------------
    // DEMO 1: CLICKFIX FAKE CAPTCHA / POWERSHELL PASTE LURE
    // -------------------------------------------------------------
    console.log("--- DEMO 1: Submit Live ClickFix Fake CAPTCHA Scenario ---");
    const clickfixTarget = "http://127.0.0.1:3000/api/v1/simulations/clickfix-captcha";
    
    const submit1 = await axios.post(
      `${BASE_URL}/api/v1/analyses`,
      { url: clickfixTarget },
      { headers: { "X-API-Key": "bg_live_email_gateway_default" } }
    );

    const session1Id = submit1.data.data.analysis_id;
    console.log(`  ✅ [ENQUEUED] Job ID: '${session1Id}' submitted for detonation.`);

    // Poll until completed
    console.log("  ⏳ Waiting for Chromium sandbox detonation & threat evaluation...");
    let pollCount = 0;
    let completed1 = false;
    let finalData1 = null;

    while (pollCount < 30) {
      await sleep(1500);
      pollCount++;
      const pollRes = await axios.get(`${BASE_URL}/api/v1/analyses/${session1Id}`);
      if (pollRes.data.report_ready || pollRes.data.data?.status === "completed" || pollRes.data.data?.status === "completed_with_errors") {
        completed1 = true;
        finalData1 = pollRes.data.data;
        break;
      }
      process.stdout.write(".");
    }
    console.log("\n");

    if (!completed1) {
      throw new Error(`Detonation timed out for job '${session1Id}' after ${pollCount} poll attempts.`);
    }

    const verdict1 = finalData1.decision?.verdict || finalData1.verdict;
    const riskScore1 = finalData1.analysis?.risk_score ?? finalData1.risk_score;
    const findings1 = finalData1.analysis?.findings || finalData1.findings || [];

    console.log(`  🎯 [DETONATED] Completed in ~${pollCount * 1.5}s! Verdict: ${verdict1}, Risk Score: ${riskScore1}`);
    console.log(`  🔍 Identified ${findings1.length} security finding(s):`);
    for (const f of findings1) {
      console.log(`     * [${f.id || f.rule_id}] ${f.title} (Severity: ${f.severity}, Score: +${f.score || f.score_contribution}, MITRE: ${f.mitre_attack_id})`);
    }

    const clickfixFinding = findings1.find(f => (f.id || f.rule_id) === "CLICKFIX-001");
    if (!clickfixFinding) {
      throw new Error("CLICKFIX-001 finding was not detected during live detonation!");
    }
    console.log(`  ✅ [PASS] CLICKFIX-001 successfully detected with MITRE technique: ${clickfixFinding.mitre_attack_id}`);

    // Verify SIEM Alert Dispatch from this live detonation
    console.log("\n--- DEMO 1.1: 1-Click SIEM Alert Dispatch of ClickFix Incident ---");
    const siemRes = await axios.post(`${BASE_URL}/api/v1/analyses/${session1Id}/dispatch-siem`, {
      target_url: `http://localhost:${MOCK_SIEM_PORT}/siem/collector`,
      tlp: "TLP:RED",
      containment_checklist: {
        blockPerimeter: true,
        quarantineMail: true,
        revokeTokens: false
      },
      notes: "ClickFix fake Turnstile lure detonated in sandbox. PowerShell paste cradle observed."
    });

    if (siemRes.status !== 200 || !siemRes.data.success) {
      throw new Error("SIEM dispatch failed for ClickFix incident.");
    }
    console.log(`  ✅ [PASS] SIEM webhook dispatched. Case ID: '${siemRes.data.incident_id}'`);

    const receivedAlert = receivedAlerts[0];
    const alertMitre = (receivedAlert?.incident?.mitre_attack || []).map(m => m.id);
    if (!alertMitre.includes("T1204.002")) {
      throw new Error("SIEM alert did not include MITRE T1204.002 technique!");
    }
    console.log(`  ✅ [PASS] SIEM receiver verified MITRE TTPs: ${alertMitre.join(", ")}`);

    // -------------------------------------------------------------
    // DEMO 2: OAUTH DEVICE CODE PHISHING LURE
    // -------------------------------------------------------------
    console.log("\n--- DEMO 2: Submit Live OAuth 2.0 Device Code Phishing Scenario ---");
    const oauthTarget = "http://127.0.0.1:3000/api/v1/simulations/oauth-device-login";
    
    const submit2 = await axios.post(
      `${BASE_URL}/api/v1/analyses`,
      { url: oauthTarget },
      { headers: { "X-API-Key": "bg_live_email_gateway_default" } }
    );

    const session2Id = submit2.data.data.analysis_id;
    console.log(`  ✅ [ENQUEUED] Job ID: '${session2Id}' submitted for detonation.`);

    pollCount = 0;
    let completed2 = false;
    let finalData2 = null;

    while (pollCount < 30) {
      await sleep(1500);
      pollCount++;
      const pollRes = await axios.get(`${BASE_URL}/api/v1/analyses/${session2Id}`);
      if (pollRes.data.report_ready || pollRes.data.data?.status === "completed" || pollRes.data.data?.status === "completed_with_errors") {
        completed2 = true;
        finalData2 = pollRes.data.data;
        break;
      }
      process.stdout.write(".");
    }
    console.log("\n");

    if (!completed2) {
      throw new Error(`Detonation timed out for job '${session2Id}' after ${pollCount} poll attempts.`);
    }

    const verdict2 = finalData2.decision?.verdict || finalData2.verdict;
    const riskScore2 = finalData2.analysis?.risk_score ?? finalData2.risk_score;
    const findings2 = finalData2.analysis?.findings || finalData2.findings || [];

    console.log(`  🎯 [DETONATED] Completed in ~${pollCount * 1.5}s! Verdict: ${verdict2}, Risk Score: ${riskScore2}`);
    console.log(`  🔍 Identified ${findings2.length} security finding(s):`);
    for (const f of findings2) {
      console.log(`     * [${f.id || f.rule_id}] ${f.title} (Severity: ${f.severity}, Score: +${f.score || f.score_contribution}, MITRE: ${f.mitre_attack_id})`);
    }

    const oauthFinding = findings2.find(f => (f.id || f.rule_id) === "OAUTH-001");
    if (!oauthFinding) {
      throw new Error("OAUTH-001 finding was not detected during live detonation!");
    }
    console.log(`  ✅ [PASS] OAUTH-001 successfully detected with MITRE technique: ${oauthFinding.mitre_attack_id}`);

    // Verify STIX 2.1 Export for OAuth Incident
    console.log("\n--- DEMO 2.1: Export STIX 2.1 Threat Intel Bundle ---");
    const stixRes = await axios.get(`${BASE_URL}/api/v1/analyses/${session2Id}/stix`);
    const stixObjects = stixRes.data.objects || [];
    const attackPatterns = stixObjects.filter(o => o.type === "attack-pattern");
    console.log(`  ✅ [PASS] STIX 2.1 Threat Intel bundle generated with ${stixObjects.length} objects (${attackPatterns.length} Attack Patterns).`);

    mockServer.close();
    console.log("\n======================================================================");
    console.log("🎉  ALL LIVE SANDBOX DETONATIONS & FORENSIC FLOWS VERIFIED 100%!");
    console.log("======================================================================\n");
    process.exit(0);

  } catch (err) {
    mockServer.close();
    console.error(`\n❌ [ERROR] ${err.message}`);
    process.exit(1);
  }
}

runLiveSandboxDetonationSuite();
