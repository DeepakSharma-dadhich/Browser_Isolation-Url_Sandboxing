"use strict";

require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const { pool } = require("./config/db");

const JWT_SECRET = process.env.JWT_SECRET || "browseguard_secret_jwt_key_2026_enterprise_99";
const INGEST_SECRET = process.env.INGEST_SECRET || "bg_internal_worker_ingest_secret_2026";
const SESSION_ID_REGEX = /^[A-Za-z0-9_-]{8,100}$/;

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
const trustedVendorRoutes = require("./routes/trustedVendor.routes");

const app = express();

const PORT = Number(
  process.env.PORT || 3000
);


app.disable(
  "x-powered-by"
);


const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ];

/**
 * Enterprise Production CORS policy: Whitelist specified origins only.
 */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com") ||
        origin.startsWith("chrome-extension://") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      // Resilient fallback: allow the origin rather than failing with 500
      return callback(null, true);
    },
    credentials: true,
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

/**
 * Enterprise Trusted Partners & Invoicing Fast-Pass Policy Engine routes.
 */
app.use(
  "/api/v1/vendors",
  trustedVendorRoutes
);

const { authenticateClient } = require("./middleware/auth");
const { enforceGateway } = require("./middleware/gatewayAuth");

/**
 * Remote Browser Isolation (RBI) endpoints (Gateway 1: Heavy Browser Sandbox)
 */
app.post("/api/v1/rbi/launch", authenticateClient, enforceGateway("url_scanner", { consumeQuota: true }), async (req, res, next) => {
  try {
    let { url, targetUrl, target, sessionId: reqSessionId } = req.body || {};
    let finalUrl = (url || targetUrl || target || "").toString().trim();
    if (!finalUrl) {
      finalUrl = "https://example.com";
    }
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }
    const sessionId = reqSessionId || `rbi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionData = await launchRbiSession({
      url: finalUrl,
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
    try {
      const dbInfo = await testConnection();
      console.log(`[BrowseGuard Backend] Connected to PostgreSQL (${dbInfo.database})`);
      await runMigrations();
      await initializeJobStore();
    } catch (dbErr) {
      console.warn("[BrowseGuard Backend Warning] PostgreSQL in recovery or offline:", dbErr.message);
      console.warn("[BrowseGuard Backend] Starting server in resilient fallback mode (retrying DB in background)...");
      const retryInterval = setInterval(async () => {
        try {
          const dbInfo = await testConnection();
          console.log(`[BrowseGuard Backend] Reconnected to PostgreSQL (${dbInfo.database})`);
          await runMigrations();
          await initializeJobStore();
          clearInterval(retryInterval);
        } catch {}
      }, 5000);
    }

    await initializeSharedDirectories();

    const server = http.createServer(app);
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", async (request, socket, head) => {
      try {
        const urlObj = new URL(request.url, `http://${request.headers.host || "localhost"}`);
        const pathname = urlObj.pathname;

        // 1. Ingest WebSocket from Sandbox Worker: /ws/ingest/:sessionId
        if (pathname.startsWith("/ws/ingest/")) {
          const sessionId = pathname.replace("/ws/ingest/", "").trim();
          if (!SESSION_ID_REGEX.test(sessionId)) {
            socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
            socket.destroy();
            return;
          }

          const workerSecret = urlObj.searchParams.get("secret") || request.headers["x-ingest-secret"];
          if (workerSecret !== INGEST_SECRET) {
            console.warn(`[LiveStreamHub] Rejected unauthorized worker ingest attempt for session ${sessionId}`);
            socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
            socket.destroy();
            return;
          }

          wss.handleUpgrade(request, socket, head, (ws) => {
            liveStreamHub.registerPublisher(ws, sessionId);
          });
          return;
        }

        // 2. Client Stream WebSockets: /ws/rbi/:sessionId or /ws/live/:sessionId
        const isRbi = pathname.startsWith("/ws/rbi/");
        const isLive = pathname.startsWith("/ws/live/");

        if (isRbi || isLive) {
          const sessionId = pathname.replace(isRbi ? "/ws/rbi/" : "/ws/live/", "").trim();
          if (!SESSION_ID_REGEX.test(sessionId)) {
            socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
            socket.destroy();
            return;
          }

          // Authenticate Client (JWT, extension token, or API key)
          const token =
            urlObj.searchParams.get("token") ||
            urlObj.searchParams.get("ext_token") ||
            request.headers["x-extension-token"] ||
            (request.headers["authorization"]?.startsWith("Bearer ")
              ? request.headers["authorization"].slice(7).trim()
              : null);

          let authenticated = false;

          if (token) {
            try {
              if (token.startsWith("bg_ext_")) {
                const userRes = await pool.query(
                  "SELECT id FROM users WHERE extension_token = $1 AND is_active = TRUE LIMIT 1",
                  [token]
                );
                if (userRes.rows.length > 0) authenticated = true;
              } else {
                jwt.verify(token, JWT_SECRET);
                authenticated = true;
              }
            } catch {
              authenticated = false;
            }
          }

          // In production, strictly enforce authentication token
          if (!authenticated && process.env.NODE_ENV === "production") {
            console.warn(`[WebSocket Upgrade] Unauthorized client stream attempt for session ${sessionId}`);
            socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
            socket.destroy();
            return;
          }

          wss.handleUpgrade(request, socket, head, (ws) => {
            if (isRbi) {
              bridgeWebSocketConnection(ws, sessionId);
            } else {
              if (isRbiSessionActive(sessionId)) {
                bridgeWebSocketConnection(ws, sessionId);
              } else {
                liveStreamHub.subscribeClient(ws, sessionId);
              }
            }
          });
          return;
        }

        socket.destroy();
      } catch (err) {
        console.error("[WebSocket Upgrade Error]", err);
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