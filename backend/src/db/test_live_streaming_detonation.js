/**
 * End-to-end verification script for Option D:
 * Real-Time Live Screencasting & Action Telemetry during Automated Detonation.
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

async function runLiveStreamingVerification() {
  console.log("==========================================================");
  console.log("🧪 TESTING OPTION D: LIVE SCREENCAST & EVENT STREAMING");
  console.log("==========================================================");

  // 1. Submit ClickFix Captcha Simulation
  const targetUrl = "http://127.0.0.1:3000/api/v1/simulations/clickfix-captcha";
  console.log(`\n1. Submitting analysis request for simulation: ${targetUrl}`);

  const submitRes = await postJson("/api/analyze", {
    url: targetUrl,
    metadata: { test_suite: "live_streaming_verification" }
  });

  if (submitRes.status !== 200 && submitRes.status !== 202) {
    console.error("Submission failed:", submitRes);
    process.exit(1);
  }

  const sessionId = submitRes.data?.data?.session_id;
  console.log(`✅ Job created successfully! session_id: ${sessionId}`);

  // 2. Connect WebSocket client to /ws/live/:sessionId
  console.log(`\n2. Subscribing to live WebSocket stream: ws://127.0.0.1:3000/ws/live/${sessionId}`);
  const ws = new WebSocket(`ws://127.0.0.1:3000/ws/live/${sessionId}`);

  let frameCount = 0;
  let eventCount = 0;
  const receivedEvents = [];

  ws.on("open", () => {
    console.log("✅ WebSocket connection established with LiveStreamHub!");
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "frame") {
        frameCount++;
        if (frameCount === 1 || frameCount % 10 === 0) {
          console.log(`   [LiveStream] 📹 Received CDP Screencast Frame #${frameCount} (bytes: ${msg.data?.length || 0})`);
        }
      } else if (msg.type === "event") {
        eventCount++;
        receivedEvents.push(msg.data?.message);
        console.log(`   [LiveStream] ⚡ Event: [${msg.data?.level?.toUpperCase()}] ${msg.data?.message}`);
      } else if (msg.type === "status") {
        console.log(`   [LiveStream] ℹ️ Status update: ${msg.status} (${msg.message || ""})`);
      } else if (msg.type === "completed") {
        console.log(`   [LiveStream] 🏁 Stream completed signal received!`);
      }
    } catch (err) {
      console.warn("WS parse error:", err);
    }
  });

  ws.on("error", (err) => {
    console.error("WS error:", err.message);
  });

  // 3. Poll until completed or timeout
  console.log("\n3. Waiting for worker detonation to finish...");
  let completed = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusRes = await getJson(`/api/analyze/${encodeURIComponent(sessionId)}/status`);
    const statusData = statusRes.data?.data || {};

    if (statusData.status === "completed" || statusData.report_ready) {
      console.log(`✅ Detonation finished in database with status: ${statusData.status}`);
      completed = true;
      break;
    }
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }

  // 4. Assertions
  console.log("\n==========================================================");
  console.log("📊 LIVE STREAMING VERIFICATION METRICS:");
  console.log(`- Frames captured & streamed: ${frameCount}`);
  console.log(`- Action events recorded:     ${eventCount}`);
  console.log(`- Analysis completed:         ${completed}`);
  console.log("==========================================================");

  if (frameCount > 0 && eventCount > 0 && completed) {
    console.log("🎉 OPTION D REAL-TIME LIVE STREAMING PASSED 100%!");
    process.exit(0);
  } else {
    console.error("❌ Live streaming test did not capture frames or events.");
    process.exit(1);
  }
}

runLiveStreamingVerification().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
