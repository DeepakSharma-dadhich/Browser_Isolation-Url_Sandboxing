"use strict";

const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const activeSessions = new Map();
let nextPort = 9225;

function getPythonPath() {
  const venvPython = path.resolve(__dirname, "../../../venv/Scripts/python.exe");
  return venvPython;
}

function getRbiScriptPath() {
  return path.resolve(__dirname, "../../../vm-agent/rbi_server.py");
}

/**
 * Launch an on-demand isolated Remote Browser Isolation (RBI) session.
 */
async function launchRbiSession({ url, sessionId }) {
  const existing = activeSessions.get(sessionId);
  if (existing && existing.alive) {
    return {
      session_id: sessionId,
      port: existing.port,
      ws_path: `/ws/rbi/${sessionId}`
    };
  }

  const port = nextPort++;
  if (nextPort > 9350) nextPort = 9225;

  const pythonExec = getPythonPath();
  const scriptPath = getRbiScriptPath();

  console.log(`[BrowseGuard RBI] Spawning isolated browser on port ${port} for URL: ${url}`);

  const child = spawn(
    pythonExec,
    [scriptPath, "--url", url, "--port", String(port)],
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
    sessionRecord.alive = false;
    activeSessions.delete(sessionId);
  });

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

module.exports = {
  launchRbiSession,
  bridgeWebSocketConnection,
  terminateRbiSession
};
