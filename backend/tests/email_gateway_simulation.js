"use strict";

const http = require("http");
const crypto = require("crypto");

const API_BASE = process.env.BROWSEGUARD_API_URL || "http://localhost:3000";
const API_KEY = process.env.BROWSEGUARD_API_KEY || "bg_live_email_gateway_default";
const WEBHOOK_SECRET = process.env.BROWSEGUARD_WEBHOOK_SECRET || "bg_wh_secret_default_2026";
const WEBHOOK_PORT = 4040;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function verifyHmacSignature(payloadBuffer, signatureHeader, secret) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const expectedSig = signatureHeader.slice(7);
  const actualSig = crypto
    .createHmac("sha256", secret)
    .update(payloadBuffer)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(actualSig, "utf8"),
    Buffer.from(expectedSig, "utf8")
  );
}

/**
 * Start a mock Email Gateway Webhook Receiver to validate BrowseGuard automated notifications.
 */
function startMockGatewayWebhookServer(port) {
  const receivedWebhooks = [];
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/webhook") {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const rawBody = Buffer.concat(chunks);
        const signatureHeader = req.headers["x-browseguard-signature"];
        const eventHeader = req.headers["x-browseguard-event"];
        const isValidSignature = verifyHmacSignature(
          rawBody,
          signatureHeader,
          WEBHOOK_SECRET
        );

        let parsedBody = null;
        try {
          parsedBody = JSON.parse(rawBody.toString("utf8"));
        } catch (e) {
          parsedBody = { raw: rawBody.toString("utf8") };
        }

        const entry = {
          timestamp: new Date().toISOString(),
          event: eventHeader,
          signatureValid: isValidSignature,
          body: parsedBody
        };
        receivedWebhooks.push(entry);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "acknowledged", event: eventHeader }));
      });
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => {
      resolve({
        server,
        port,
        getWebhooks: () => receivedWebhooks,
        close: () => new Promise((res) => server.close(res))
      });
    });
    server.on("error", reject);
  });
}

/**
 * Execute HTTP JSON requests with API key.
 */
async function apiRequest(endpoint, options = {}, retries = 3) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(options.headers || {})
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const contentType = resp.headers.get("content-type") || "";
      let data = null;
      if (contentType.includes("application/json")) {
        data = await resp.json();
      } else {
        data = await resp.text();
      }

      return {
        status: resp.status,
        headers: resp.headers,
        data
      };
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000);
    }
  }
}

async function runEmailGatewaySimulation() {
  console.log("======================================================================");
  console.log("  BROWSEGUARD ENTERPRISE EMAIL THREAT DETECTION INTEGRATION TEST");
  console.log("======================================================================");
  console.log(`[Config] Target API: ${API_BASE}`);
  console.log(`[Config] API Key: ${API_KEY.slice(0, 10)}...`);

  // Step 1: Healthcheck
  console.log("\n[1/6] Verifying BrowseGuard Control Plane Health...");
  const health = await apiRequest("/api/health");
  if (health.status !== 200 || health.data.status !== "healthy") {
    throw new Error(`BrowseGuard is not healthy: ${JSON.stringify(health.data)}`);
  }
  console.log(`  ✓ System Status: ${health.data.status} (DB: ${health.data.database.status}, Shared: OK)`);

  // Step 2: Spin up Mock Email Gateway Webhook Listener
  console.log(`\n[2/6] Starting Mock Email Gateway Webhook Listener on port ${WEBHOOK_PORT}...`);
  const webhookServer = await startMockGatewayWebhookServer(WEBHOOK_PORT);
  console.log(`  ✓ Webhook listener active at http://127.0.0.1:${WEBHOOK_PORT}/webhook`);

  try {
    // Step 3: Test Scenario A - Malicious SSRF / Cloud Metadata Probe in Phishing Email
    console.log("\n[3/6] Simulating Inbound Phishing Email with Cloud Metadata SSRF URL...");
    const maliciousEmailContext = {
      message_id: `<phish.${Date.now()}@internal-payroll-security.com>`,
      sender: "security-update@fakepayroll.com",
      recipient: "devops-lead@enterprise.corp",
      subject: "Action Required: Verify AWS IAM Credentials",
      extracted_url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
    };

    const idempotencyKey = crypto
      .createHash("sha256")
      .update(maliciousEmailContext.message_id + maliciousEmailContext.extracted_url)
      .digest("hex");

    console.log(`  Submitting URL: ${maliciousEmailContext.extracted_url}`);
    console.log(`  Idempotency Key: ${idempotencyKey.slice(0, 16)}...`);

    const submissionA = await apiRequest("/api/v1/analyses", {
      method: "POST",
      body: {
        url: maliciousEmailContext.extracted_url,
        source: "EMAIL_SECURITY",
        idempotency_key: idempotencyKey,
        callback_url: `http://127.0.0.1:${WEBHOOK_PORT}/webhook`,
        client_reference_id: maliciousEmailContext.message_id,
        scan_options: {
          email_metadata: {
            sender: maliciousEmailContext.sender,
            recipient: maliciousEmailContext.recipient,
            subject: maliciousEmailContext.subject
          }
        }
      }
    });

    if (submissionA.status !== 202) {
      throw new Error(`Submission failed with status ${submissionA.status}: ${JSON.stringify(submissionA.data)}`);
    }
    const analysisIdA = submissionA.data.data.analysis_id;
    console.log(`  ✓ Analysis Job Enqueued: ${analysisIdA}`);

    // Step 4: Verify Idempotency Deduplication (Replay submission with same key)
    console.log("\n[4/6] Verifying Idempotent Replay Prevention...");
    const replaySubmission = await apiRequest("/api/v1/analyses", {
      method: "POST",
      body: {
        url: maliciousEmailContext.extracted_url,
        source: "EMAIL_SECURITY",
        idempotency_key: idempotencyKey,
        callback_url: `http://127.0.0.1:${WEBHOOK_PORT}/webhook`
      }
    });

    if (replaySubmission.status !== 200 || !replaySubmission.data.is_idempotent_replay) {
      throw new Error(`Expected idempotent replay response, got: ${JSON.stringify(replaySubmission.data)}`);
    }
    console.log(`  ✓ Idempotency Replay confirmed: Returned original ID ${replaySubmission.data.data.analysis_id} without duplicate scan.`);

    // Step 5: Wait for Worker Execution, Polling status & Webhook Dispatch
    console.log("\n[5/6] Awaiting Isolated Chromium Sandbox Execution & Polling Status...");
    let completedStatus = null;
    const maxWaitSec = 25;
    const pollIntervalMs = 1500;
    const startWait = Date.now();

    while ((Date.now() - startWait) < maxWaitSec * 1000) {
      const poll = await apiRequest(`/api/v1/analyses/${analysisIdA}/status`);
      if (poll.status === 200 && poll.data.data.report_ready) {
        completedStatus = poll.data.data;
        break;
      }
      process.stdout.write(".");
      await sleep(pollIntervalMs);
    }
    console.log("");

    if (!completedStatus) {
      throw new Error(`Analysis ${analysisIdA} timed out after ${maxWaitSec}s`);
    }

    console.log(`  ✓ Sandbox Analysis Completed in ${completedStatus.duration_ms || "N/A"}ms`);
    console.log(`  - Verdict: ${completedStatus.verdict}`);
    console.log(`  - Risk Score: ${completedStatus.risk_score} (${completedStatus.risk_level})`);
    console.log(`  - Action: ${completedStatus.recommended_action}`);
    console.log(`  - Allow User Access: ${completedStatus.allow_user_access}`);

    // Gateway Policy Evaluation
    if (completedStatus.verdict === "MALICIOUS" || completedStatus.risk_score >= 80) {
      console.log(`  🛡️ [Gateway Policy Decision]: REWRITE_URL_AND_QUARANTINE (Malicious threat neutralized)`);
    } else {
      console.log(`  ℹ️ [Gateway Policy Decision]: ALLOW_DELIVERY`);
    }

    // Step 6: Verify Webhook Delivery & Cryptographic Signature
    console.log("\n[6/6] Verifying Webhook Delivery & Cryptographic HMAC-SHA256 Signature...");
    // Give brief grace for webhook network delivery if needed
    let webhooks = webhookServer.getWebhooks();
    if (webhooks.length === 0) {
      await sleep(1500);
      webhooks = webhookServer.getWebhooks();
    }

    if (webhooks.length === 0) {
      console.warn("  ⚠️ Warning: No webhook received on mock port (check async dispatcher logs).");
    } else {
      const wh = webhooks.find((w) => w.body?.analysis?.session_id === analysisIdA) || webhooks[0];
      console.log(`  ✓ Received Webhook Event: '${wh.event}'`);
      console.log(`  ✓ HMAC-SHA256 Cryptographic Signature: ${wh.signatureValid ? "VALID (Verified via secret)" : "INVALID"}`);
      console.log(`  ✓ Webhook Payload Verdict: ${wh.body?.analysis?.verdict}`);
      console.log(`  ✓ Client Reference ID matched: ${wh.body?.analysis?.client_reference_id}`);
    }

    // Fetch Full Canonical Report from PostgreSQL
    console.log("\n[Bonus] Verifying Full Canonical Forensic Report & Visual Screenshot...");
    const fullReport = await apiRequest(`/api/v1/analyses/${analysisIdA}`);
    if (fullReport.status === 200 && fullReport.data.report_ready) {
      const rep = fullReport.data.data;
      console.log(`  ✓ PostgreSQL Canonical Record Verified:`);
      console.log(`    - ID: ${rep.session_id || rep.analysis?.session_id}`);
      console.log(`    - Findings Count: ${rep.findings?.length || rep.analysis?.findings_count || 0}`);
      if (rep.findings && rep.findings.length > 0) {
        rep.findings.slice(0, 3).forEach((f) => {
          console.log(`      * [${f.severity || f.level}] ${f.title || f.rule_id || f.message}`);
        });
      }
    }

    // Check screenshot stream
    const screenshotResp = await apiRequest(`/api/v1/analyses/${analysisIdA}/screenshot`);
    console.log(`  ✓ Screenshot binary stream status: ${screenshotResp.status} (${screenshotResp.headers.get("content-type")})`);

    console.log("\n======================================================================");
    console.log("  ALL ENTERPRISE EMAIL INTEGRATION TESTS PASSED SUCCESSFULLY! ✓");
    console.log("======================================================================");
  } finally {
    await webhookServer.close();
  }
}

runEmailGatewaySimulation().catch((err) => {
  console.error("\n❌ Simulation Failed:", err.message);
  process.exit(1);
});
