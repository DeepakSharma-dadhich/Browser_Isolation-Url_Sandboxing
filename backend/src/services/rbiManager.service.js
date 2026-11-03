"use strict";

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

const activeSessions = new Map();
let nextPort = 9225;

function getPythonPath() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  const venvWin = path.resolve(__dirname, "../../../venv/Scripts/python.exe");
  if (fs.existsSync(venvWin)) return venvWin;
  const venvLinux = path.resolve(__dirname, "../../../venv/bin/python");
  if (fs.existsSync(venvLinux)) return venvLinux;
  return process.platform === "win32" ? "python" : "python3";
}

const { query } = require("../config/db");

function getRbiScriptPath() {
  if (process.env.RBI_SCRIPT_PATH) return process.env.RBI_SCRIPT_PATH;
  const relPath = path.resolve(__dirname, "../../../vm-agent/rbi_server.py");
  if (fs.existsSync(relPath)) return relPath;
  const dockerPath = "/app/vm-agent/rbi_server.py";
  if (fs.existsSync(dockerPath)) return dockerPath;
  return relPath;
}

/**
 * Launch an on-demand isolated Remote Browser Isolation (RBI) session.
 */
async function launchRbiSession({ url, sessionId, recordEvidence = true }) {
  const existing = activeSessions.get(sessionId);
  if (existing && existing.alive) {
    return {
      session_id: sessionId,
      port: existing.port,
      ws_path: `/ws/rbi/${sessionId}`
    };
  }

  // Pre-insert analysis record into PostgreSQL so it can be queried by API / frontend
  try {
    const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
    await query(
      `INSERT INTO analyses (id, organization_id, submitted_url, status, created_at, started_at)
       VALUES ($1, $2, $3, 'RUNNING', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET status = 'RUNNING', started_at = NOW()`,
      [sessionId, DEFAULT_ORG_ID, url]
    );
  } catch (err) {
    console.warn("[BrowseGuard RBI] Note on pre-insert analysis:", err.message);
  }

  const port = nextPort++;
  if (nextPort > 9350) nextPort = 9225;

  const pythonExec = getPythonPath();
  const scriptPath = getRbiScriptPath();

  console.log(`[BrowseGuard RBI] Spawning interactive browser on port ${port} for session: ${sessionId} (URL: ${url})`);

  const spawnArgs = [
    scriptPath,
    "--url", url,
    "--port", String(port),
    "--session-id", sessionId
  ];
  if (recordEvidence) {
    spawnArgs.push("--save-report");
  }

  const child = spawn(
    pythonExec,
    spawnArgs,
    {
      cwd: path.resolve(__dirname, "../../../vm-agent"),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1"
      }
    }
  );

  const sessionRecord = {
    sessionId,
    port,
    process: child,
    alive: true,
    startedAt: Date.now()
  };

  activeSessions.set(sessionId, sessionRecord);

  child.stdout.on("data", (data) => {
    console.log(`[RBI Worker ${sessionId.slice(0, 8)}] ${data.toString().trim()}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`[RBI Worker Err ${sessionId.slice(0, 8)}] ${data.toString().trim()}`);
  });

  child.on("exit", (code) => {
    console.log(`[RBI Worker ${sessionId.slice(0, 8)}] Exited with code ${code}`);
    if (sessionRecord.reaper) clearTimeout(sessionRecord.reaper);
    sessionRecord.alive = false;
    activeSessions.delete(sessionId);
  });

  // Safety reaper: terminate abandoned interactive sessions after 3 minutes
  sessionRecord.reaper = setTimeout(() => {
    console.log(`[BrowseGuard RBI] Reaping idle/abandoned session: ${sessionId}`);
    terminateRbiSession(sessionId);
  }, 180000);

  // Wait for the Python WebSocket server to be ready
  let ready = false;
  for (let attempt = 0; attempt < 25; attempt++) {
    await new Promise((res) => setTimeout(res, 300));
    try {
      const probeWs = new WebSocket(`ws://127.0.0.1:${port}`);
      await new Promise((res, rej) => {
        probeWs.on("open", () => {
          probeWs.close();
          ready = true;
          res();
        });
        probeWs.on("error", rej);
      });
      if (ready) break;
    } catch {}
  }

  if (!ready) {
    child.kill();
    activeSessions.delete(sessionId);
    throw new Error("RBI session initialization timed out waiting for isolated Chromium startup.");
  }

  return {
    session_id: sessionId,
    port,
    ws_path: `/ws/rbi/${sessionId}`
  };
}

/**
 * Bridge incoming client WebSocket to the internal isolated Python browser WebSocket.
 */
function bridgeWebSocketConnection(clientWs, sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session || !session.alive) {
    clientWs.send(JSON.stringify({ type: "error", message: "RBI session not found or expired." }));
    clientWs.close();
    return;
  }

  const targetWs = new WebSocket(`ws://127.0.0.1:${session.port}`);

  targetWs.on("open", () => {
    console.log(`[BrowseGuard RBI] Bridge established for session ${sessionId}`);
  });

  // Python Screencast Frames -> Frontend Client
  targetWs.on("message", (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  // Frontend User Inputs -> Python Isolated Browser
  clientWs.on("message", (data) => {
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(data);
    }
  });

  clientWs.on("close", () => {
    console.log(`[BrowseGuard RBI] Frontend client disconnected for ${sessionId}`);
    targetWs.close();
  });

  targetWs.on("close", () => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });

  targetWs.on("error", (err) => {
    console.error(`[BrowseGuard RBI] Bridge target error:`, err.message);
  });
}

function terminateRbiSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session && session.process) {
    session.process.kill();
    activeSessions.delete(sessionId);
    return true;
  }
  return false;
}

function isRbiSessionActive(sessionId) {
  const session = activeSessions.get(sessionId);
  return Boolean(session && session.alive);
}

module.exports = {
  launchRbiSession,
  bridgeWebSocketConnection,
  terminateRbiSession,
  isRbiSessionActive
};
