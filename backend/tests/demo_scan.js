"use strict";

const targetUrl =
  "https://15g9g.mjt.lu/lnk/EAAACX2kwNwAAc6rWr4ABIYxdeoAAYKLJykAolkTADahGwBqx4SxYOfUmbkBRhadVnKt7aftXwAxVYw/1/xaDbYxqNye-v8u2hCzBrcA/aHR0cHM6Ly9jb2RpbmdleGFtLnJ5ZXJzb25pdHNvbHV0aW9ucy5jb20vZS9qdnIz";

async function runDemoScan() {
  console.log("======================================================================");
  console.log("  BROWSEGUARD LIVE DEMO URL FORENSIC ANALYSIS");
  console.log("======================================================================");
  console.log(`[Target URL]: ${targetUrl}`);

  console.log("\n[1/3] Submitting link to BrowseGuard Control Plane API...");
  const submitResp = await fetch("http://localhost:3000/api/v1/analyses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "bg_live_email_gateway_default"
    },
    body: JSON.stringify({
      url: targetUrl,
      source: "EMAIL_SECURITY",
      scan_options: {
        email_metadata: {
          note: "Live demo analysis requested by user"
        }
      }
    })
  });

  const submitJson = await submitResp.json();
  const sessionId = submitJson?.data?.analysis_id;
  if (!sessionId) {
    throw new Error(`Failed to enqueue: ${JSON.stringify(submitJson)}`);
  }
  console.log(`  ✓ Enqueued successfully! Session ID: ${sessionId}`);

  console.log("\n[2/3] Executing in isolated Chromium sandbox & waiting for completion...");
  let reportData = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    process.stdout.write(".");
    const statusResp = await fetch(
      `http://localhost:3000/api/v1/analyses/${sessionId}/status`,
      {
        headers: { "X-API-Key": "bg_live_email_gateway_default" }
      }
    );
    const statusJson = await statusResp.json();
    if (statusJson.data?.report_ready) {
      reportData = statusJson.data;
      break;
    }
  }
  console.log("");

  if (!reportData) {
    throw new Error("Analysis timed out.");
  }

  console.log("\n[3/3] Retrieving Full Canonical Forensic Report & Findings...");
  const fullResp = await fetch(
    `http://localhost:3000/api/v1/analyses/${sessionId}`,
    {
      headers: { "X-API-Key": "bg_live_email_gateway_default" }
    }
  );
  const fullJson = await fullResp.json();
  const report = fullJson.data;

  console.log("\n======================================================================");
  console.log("  ANALYSIS RESULTS & THREAT VERDICT");
  console.log("======================================================================");
  console.log(`Verdict:            ${reportData.verdict}`);
  console.log(`Risk Score:         ${reportData.risk_score} / 100 (${reportData.risk_level})`);
  console.log(`Recommended Action: ${reportData.recommended_action}`);
  console.log(`Allow User Access:  ${reportData.allow_user_access}`);
  console.log(`Execution Time:     ${reportData.duration_ms} ms`);
  console.log(`Submitted URL:      ${targetUrl}`);
  console.log(`Final URL:          ${report.target?.final_url || report.final_url}`);
  console.log(`Final Page Title:   ${report.target?.page_title || report.page_title}`);

  console.log("\n--- REDIRECTION CHAIN ---");
  const redirects = report.browser_behaviour?.http_redirects?.events || [];
  if (redirects.length > 0) {
    redirects.forEach((r, idx) => {
      console.log(`  [Hop ${idx + 1}] HTTP ${r.status_code || 302}: ${r.from || r.source_url} => ${r.to || r.target_url}`);
    });
  } else {
    console.log("  No external HTTP redirects observed.");
  }

  console.log("\n--- SECURITY FINDINGS ---");
  const findings = report.analysis?.findings || report.findings || [];
  if (findings.length > 0) {
    findings.forEach((f) => {
      console.log(`  * [${f.severity?.toUpperCase() || f.level?.toUpperCase()}] ${f.title || f.id}`);
      console.log(`    Description: ${f.description || f.message}`);
      console.log(`    Score: +${f.score || f.score_contribution} pts\n`);
    });
  } else {
    console.log("  No malicious or suspicious indicators detected.");
  }

  console.log("======================================================================");
}

runDemoScan().catch((err) => {
  console.error("\n❌ Demo scan error:", err.message);
  process.exit(1);
});
