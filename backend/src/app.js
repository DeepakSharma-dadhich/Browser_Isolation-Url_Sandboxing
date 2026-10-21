"use strict";

require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const {
  launchRbiSession,
  bridgeWebSocketConnection,
  terminateRbiSession,
  isRbiSessionActive
} = require("./services/rbiManager.service");

const { liveStreamHub } = require("./services/liveStreamHub.service");

const analyzeRoutes = require(
  "./routes/analyze.routes"
);

const analysesV1Routes = require(
  "./routes/v1/analyses.routes"
);

const {
  initializeSharedDirectories,
  getSharedFolderInfo,
  VmAgentServiceError
} = require(
  "./services/vmAgent.service"
);


const authRoutes = require("./routes/auth.routes");
const apiKeysRoutes = require("./routes/apiKeys.routes");
const extensionRoutes = require("./routes/extension.routes");
const simulationsRoutes = require("./routes/v1/simulations.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

const PORT = Number(
  process.env.PORT || 3000
);


app.disable(
  "x-powered-by"
);


/**
 * Allow the frontend and development tools to call the API.
 */
app.use(
  cors({
    origin: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Client-Secret",
      "X-Extension-Token",
      "X-Organization-Id"
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
      "Content-Type",
      "Content-Disposition"
    ]
  })
);


/**
 * Accept JSON payloads up to 10MB to accommodate RFC822 EML MIME and STIX bundles.
 */
app.use(
  express.json({
    limit: "10mb"
  })
);


/**
 * Basic service endpoint.
 */
app.get(
  "/",
  (
    request,
    response
  ) => {
    return response.json({
      service:
        "Email URL Sandbox Host Backend",
      version: "2.0.0",
      status: "running"
    });
  }
);


const { testConnection } = require("./config/db");

/**
 * Host backend health endpoint.
 */
app.get(
  "/api/health",
  async (request, response) => {
    let dbStatus = "connected";
    let dbDetails = null;

    try {
      dbDetails = await testConnection();
    } catch (err) {
      dbStatus = "disconnected";
    }

    return response.json({
      status: dbStatus === "connected" ? "healthy" : "degraded",
      service: "browseguard-backend",
      version: "2.1.0",
      database: {
        status: dbStatus,
        details: dbDetails
      },
      timestamp: new Date().toISOString(),
      shared_folder: getSharedFolderInfo()
    });
  }
);


/**
 * URL-analysis routes (legacy & web dashboard).
 */
app.use(
  "/api/analyze",
  analyzeRoutes
);

/**
 * Enterprise Authentication & User Account routes.
 */
app.use(
  "/api/v1/auth",
  authRoutes
);

/**
 * Enterprise REST API v1 (Email Threat Detection & Integrations).
 */
app.use(
  "/api/v1/analyses",
  analysesV1Routes
);

/**
  * API Keys & Email Gateway link extraction routes.
  */
app.use(
  "/api/v1",
  apiKeysRoutes
);

/**
 * Browser Extension Shield routes (Package download & pairing verification).
 */
app.use(
  "/api/v1/extension",
  extensionRoutes
);

app.use(
  "/api/v1/simulations",
  simulationsRoutes
);

/**
 * Enterprise Admin Console & Team Management routes.
 */
app.use(
  "/api/v1/admin",
  adminRoutes
);

const { authenticateClient } = require("./middleware/auth");
const { enforceGateway } = require("./middleware/gatewayAuth");

/**
 * Remote Browser Isolation (RBI) endpoints (Gateway 1: Heavy Browser Sandbox)
 */
app.post("/api/v1/rbi/launch", authenticateClient, enforceGateway("url_scanner", { consumeQuota: true }), async (req, res, next) => {
  try {
    const { url, sessionId: reqSessionId } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "Valid url is required" });
    }
    const sessionId = reqSessionId || `rbi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionData = await launchRbiSession({
      url,
      sessionId,
      orgId: req.orgId || req.user?.organizationId
    });
    return res.status(200).json({
      success: true,
      message: "Remote Browser Isolation session initialized.",
      data: sessionData
    });
  } catch (err) {
    return next(err);
  }
});

app.post("/api/v1/rbi/:sessionId/terminate", (req, res) => {
  const terminated = terminateRbiSession(req.params.sessionId);
  return res.json({ success: true, terminated });
});

/**
 * Live Detonation Screencast fallback endpoint (latest frame buffer).
 */
app.get("/api/v1/analyses/:id/live-frame", (req, res) => {
  const frameBuffer = liveStreamHub.getLatestFrame(req.params.id);
  if (!frameBuffer) {
    return res.status(204).end();
  }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  return res.send(frameBuffer);
});


/**
 * Unknown endpoint handler.
 */
app.use(
  (
    request,
    response
  ) => {
    return response
      .status(404)
      .json({
        success: false,
        error: {
          code:
            "ENDPOINT_NOT_FOUND",
          message:
            "Endpoint not found."
        }
      });
  }
);


/**
 * Central error handler.
 */
app.use(
  (
    error,
    request,
    response,
    next
  ) => {
    console.error(
      "[Host Backend Error]",
      error
    );

    const statusCode =
      error instanceof
      VmAgentServiceError
        ? error.statusCode
        : Number(
            error.statusCode
          ) || 500;

    const errorCode =
      error.code ||
      "INTERNAL_SERVER_ERROR";

    const message =
      statusCode >= 500 &&
      process.env.NODE_ENV !==
        "development"
        ? "Internal server error."
        : error.message;

    return response
      .status(statusCode)
      .json({
        success: false,

        error: {
          code: errorCode,
          message
        }
      });
  }
);


/**
 * Start server only after shared directories are accessible.
 */
async function startServer() {
  try {
    const { runMigrations } = require("./db/migrate");
    const { initializeJobStore } = require("./services/jobStore.service");

    console.log("[BrowseGuard Backend] Connecting to PostgreSQL...");
    const dbInfo = await testConnection();
    console.log(`[BrowseGuard Backend] Connected to PostgreSQL (${dbInfo.database})`);

    await runMigrations();
    await initializeSharedDirectories();
    await initializeJobStore();

    const server = http.createServer(app);
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      try {
        const { pathname } = new URL(request.url, `http://${request.headers.host || "localhost"}`);
        if (pathname.startsWith("/ws/rbi/")) {
          const sessionId = pathname.replace("/ws/rbi/", "");
          wss.handleUpgrade(request, socket, head, (ws) => {
            bridgeWebSocketConnection(ws, sessionId);
          });
        } else if (pathname.startsWith("/ws/live/")) {
          const sessionId = pathname.replace("/ws/live/", "");
          wss.handleUpgrade(request, socket, head, (ws) => {
            if (isRbiSessionActive(sessionId)) {
              bridgeWebSocketConnection(ws, sessionId);
            } else {
              liveStreamHub.subscribeClient(ws, sessionId);
            }
          });
        } else if (pathname.startsWith("/ws/ingest/")) {
          const sessionId = pathname.replace("/ws/ingest/", "");
          wss.handleUpgrade(request, socket, head, (ws) => {
            liveStreamHub.registerPublisher(ws, sessionId);
          });
        } else {
          socket.destroy();
        }
      } catch (err) {
        socket.destroy();
      }
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log("BrowseGuard Host Backend running with RBI Streaming");
      console.log(`Server: http://localhost:${PORT}`);
      console.log("Shared folder:", getSharedFolderInfo().shared_root);
    });
  } catch (error) {
    console.error("Unable to initialize host backend:", error);
    process.exit(1);
  }
}


startServer();


module.exports = app;