"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const analyzeRoutes = require(
  "./routes/analyze.routes"
);

const {
  initializeSharedDirectories,
  getSharedFolderInfo,
  VmAgentServiceError
} = require(
  "./services/vmAgent.service"
);


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
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]
  })
);


/**
 * Limit request size because this API accepts only URL metadata.
 */
app.use(
  express.json({
    limit: "32kb"
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


/**
 * Host backend health endpoint.
 */
app.get(
  "/api/health",
  (
    request,
    response
  ) => {
    return response.json({
      status: "healthy",
      service: "host-backend",
      version: "2.0.0",
      timestamp:
        new Date().toISOString(),
      shared_folder:
        getSharedFolderInfo()
    });
  }
);


/**
 * URL-analysis routes.
 */
app.use(
  "/api/analyze",
  analyzeRoutes
);


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
    const {
  initializeJobStore
} = require(
  "./services/jobStore.service"
);

    await initializeSharedDirectories();
    await initializeJobStore();
    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          "Email URL Sandbox Host Backend"
        );

        console.log(
          `Server: http://localhost:${PORT}`
        );

        console.log(
          "Shared folder:",
          getSharedFolderInfo()
            .shared_root
        );
      }
    );
  } catch (error) {
    console.error(
      "Unable to initialize host backend:",
      error
    );

    process.exit(1);
  }
}


startServer();


module.exports = app;