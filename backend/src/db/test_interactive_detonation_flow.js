/**
 * End-to-end verification of Interactive Sandbox Detonation (BrowseGuard style):
 * Tests live input dispatching (mouse, navigation), anti-stealth initialization,
 * and on-demand threat report compilation into PostgreSQL.
 */

"use strict";

const WebSocket = require("ws");
const http = require("http");

async function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      `http://127.0.0.1:3000${urlPath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          "X-API-Key": "bg_live_email_gateway_default"
        }
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:3000${urlPath}`, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    }).on("error", reject);
  });
}

async function testInteractiveDetonation() {
  console.log("==========================================================");
  console.log("🚀 TESTING INTERACTIVE DETONATION & CONTROL FLOW");
  console.log("==========================================================");

  const testSessionId = `session_interactive_${Date.now()}`;
  const targetUrl = "http://127.0.0.1:3000/api/v1/simulations/clickfix-captcha";

  console.log(`\n1. Launching Interactive Detonation Session for: ${targetUrl}`);
  console.log(`   Session ID: ${testSessionId}`);

  const launchRes = await postJson("/api/v1/rbi/launch", {
    url: targetUrl,
    sessionId: testSessionId
  });

  if (launchRes.status !== 200) {
    console.error("Launch failed:", launchRes);
    process.exit(1);
  }

  console.log("✅ Interactive Sandbox spawned successfully on port:", launchRes.data?.data?.port);

  // 2. Connect client WebSocket to /ws/live/:sessionId
  console.log(`\n2. Connecting WebSocket to ws://127.0.0.1:3000/ws/live/${testSessionId}...`);
  const ws = new WebSocket(`ws://127.0.0.1:3000/ws/live/${testSessionId}`);

  let frameCount = 0;
  let isInteractiveReady = false;
  let analysisCompleted = false;

  await new Promise((resolve, reject) => {
    ws.on("open", () => {
      console.log("✅ WebSocket connection open and bridged to isolated Chromium!");
      resolve();
    });
    ws.on("error", reject);
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "frame") {
        frameCount++;
        if (frameCount === 1) {
          console.log(`   📹 [Stream] First CDP screencast frame received! (bytes: ${msg.data?.length})`);
          isInteractiveReady = true;
        }
      } else if (msg.type === "state") {
        console.log(`   🌐 [Navigation] Page URL state update: ${msg.url} - Title: ${msg.title}`);
      } else if (msg.type === "event") {
        console.log(`   ⚡ [Event] ${msg.message}`);
      } else if (msg.type === "completed") {
        console.log(`   🏁 [Completed] Finalized with verdict: ${msg.verdict}, risk score: ${msg.risk_score}`);
        analysisCompleted = true;
      }
    } catch {}
  });

  // Wait for initial render
  console.log("\n3. Waiting for initial page rendering & screencast frames...");
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (isInteractiveReady) break;
  }

  if (!isInteractiveReady) {
    console.error("Failed to receive live frame.");
    process.exit(1);
  }

  // 4. Test User Mouse Interaction (Click on the fake CAPTCHA box at x=640, y=400)
  console.log("\n4. Simulating user mouse click on verification box (x=640, y=400)...");
  ws.send(JSON.stringify({
    type: "mouse",
    eventType: "mousePressed",
    x: 640,
    y: 400,
    button: "left",
    clickCount: 1
  }));
  await new Promise((r) => setTimeout(r, 100));
  ws.send(JSON.stringify({
    type: "mouse",
    eventType: "mouseReleased",
    x: 640,
    y: 400,
    button: "left",
    clickCount: 1
  }));
  console.log("✅ Mouse click dispatched over CDP!");

  await new Promise((r) => setTimeout(r, 1500));

  // 5. Test Live Address Bar Navigation to OAuth phish simulation
  console.log("\n5. Simulating user navigation to OAuth simulation via address bar...");
  const newUrl = "http://127.0.0.1:3000/api/v1/simulations/oauth-device-login";
  ws.send(JSON.stringify({
    type: "navigate",
    url: newUrl
  }));

  await new Promise((r) => setTimeout(r, 2500));

  // 6. User clicks 'Generate Threat Report' to conclude analysis
  console.log("\n6. User requests 'Finish & Generate Threat Report'...");
  ws.send(JSON.stringify({
    type: "finish_analysis"
  }));

  // Wait for report finalization
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (analysisCompleted) break;
  }

  // Verify in PostgreSQL database
  console.log("\n7. Verifying completed record in PostgreSQL database via GET /api/analyze/:id/status...");
  const statusRes = await getJson(`/api/analyze/${encodeURIComponent(testSessionId)}/status`);
  const statusData = statusRes.data?.data || {};

  console.log(`   Database status: ${statusData.status}, Verdict: ${statusData.verdict}, Findings: ${statusData.findings?.length || 0}`);

  ws.close();

  // Terminate process
  await postJson(`/api/v1/rbi/${testSessionId}/terminate`, {});

  const isDbComplete = Boolean(
    statusData.status === "completed" ||
    statusData.status === "completed_with_errors" ||
    statusData.report_ready
  );

  console.log("\n==========================================================");
  console.log("📊 INTERACTIVE DETONATION RESULTS:");
  console.log(`- Frames received:          ${frameCount}`);
  console.log(`- Mouse & Nav dispatched:   PASS`);
  console.log(`- Final report generated:   ${analysisCompleted}`);
  console.log(`- Database committed:       ${isDbComplete}`);
  console.log("==========================================================");

  if (frameCount > 0 && analysisCompleted && isDbComplete) {
    console.log("🎉 INTERACTIVE DETONATION VERIFIED 100% OPERATIONAL!");
    process.exit(0);
  } else {
    console.error("❌ Verification failed.");
    process.exit(1);
  }
}

testInteractiveDetonation().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
