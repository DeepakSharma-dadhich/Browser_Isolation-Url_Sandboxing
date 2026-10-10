"use strict";

/**
 * Host-to-VM communication service.
 *
 * The host backend never opens or analyzes the submitted URL.
 *
 * Flow:
 *
 * Backend
 *   -> writes request JSON atomically
 *   -> vm-agent/shared/input/
 *   -> VM Agent processes request
 *   -> VM writes report.json
 *   -> Backend reads result
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");


/*
 * backend/src/services
 *          ↓ ../..
 * backend/
 */
const BACKEND_ROOT = path.resolve(
  __dirname,
  "..",
  ".."
);

const {
  saveJob,
  getJob,
  updateJob
} = require(
  "./jobStore.service"
);

const {
  createAnalysis,
  updateAnalysisStatus,
  saveAnalysisResult,
  getAnalysisById,
  getReportByAnalysisId,
  listAnalyses
} = require(
  "./analysisRepository"
);

const { dispatchWebhook } = require("./webhookDispatcher");


/*
 * Email-URL-Sandbox/
 * ├── backend/
 * └── vm-agent/
 */
const PROJECT_ROOT = path.resolve(
  BACKEND_ROOT,
  ".."
);


/*
 * Actual host-side shared folder:
 *
 * Email-URL-Sandbox/vm-agent/shared
 *
 * The same directory is visible inside the VM as:
 *
 * Z:\shared
 */
const SHARED_ROOT =
  process.env.SANDBOX_SHARED_ROOT ||
  path.join(
    PROJECT_ROOT,
    "vm-agent",
    "shared"
  );


const INPUT_DIR = path.join(
  SHARED_ROOT,
  "input"
);

const PROCESSING_DIR = path.join(
  SHARED_ROOT,
  "processing"
);

const COMPLETED_DIR = path.join(
  SHARED_ROOT,
  "completed"
);

const FAILED_DIR = path.join(
  SHARED_ROOT,
  "failed"
);

const OUTPUT_DIR = path.join(
  SHARED_ROOT,
  "output"
);

const REPORTS_DIR = path.join(
  SHARED_ROOT,
  "reports"
);

const SCREENSHOTS_DIR = path.join(
  SHARED_ROOT,
  "screenshots"
);


const MAXIMUM_URL_LENGTH = 8192;

const SESSION_ID_PATTERN =
  /^[A-Za-z0-9_-]{8,100}$/;


/**
 * Error used for expected API-level failures.
 */
class VmAgentServiceError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "VM_AGENT_SERVICE_ERROR"
  ) {
    super(message);

    this.name = "VmAgentServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}


/**
 * Create all shared directories required by the host and VM.
 */
async function initializeSharedDirectories() {
  const requiredDirectories = [
    INPUT_DIR,
    PROCESSING_DIR,
    COMPLETED_DIR,
    FAILED_DIR,
    OUTPUT_DIR,
    REPORTS_DIR
  ];

  await Promise.all(
    requiredDirectories.map(
      (directoryPath) =>
        fs.promises.mkdir(
          directoryPath,
          {
            recursive: true
          }
        )
    )
  );
}


/**
 * Check whether a path exists.
 */
async function pathExists(targetPath) {
  try {
    await fs.promises.access(
      targetPath
    );

    return true;
  } catch {
    return false;
  }
}


/**
 * Read and parse one JSON file.
 */
async function readJsonFile(filePath) {
  let rawContent;

  try {
    rawContent =
      await fs.promises.readFile(
        filePath,
        "utf8"
      );
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new VmAgentServiceError(
        "Requested file was not found.",
        404,
        "FILE_NOT_FOUND"
      );
    }

    throw error;
  }

  if (!rawContent.trim()) {
    throw new VmAgentServiceError(
      `JSON file is empty: ${filePath}`,
      500,
      "EMPTY_JSON_FILE"
    );
  }

  try {
    return JSON.parse(
      rawContent
    );
  } catch (error) {
    throw new VmAgentServiceError(
      `Invalid JSON file: ${filePath}`,
      500,
      "INVALID_JSON_FILE"
    );
  }
}


/**
 * Write JSON safely.
 *
 * The VM worker scans only *.json files.
 *
 * We first write a complete .tmp file and then rename it to .json.
 * This prevents the VM from reading a partially-written request.
 */
async function writeJsonAtomic(
  finalPath,
  data
) {
  const parentDirectory =
    path.dirname(finalPath);

  await fs.promises.mkdir(
    parentDirectory,
    {
      recursive: true
    }
  );

  const temporaryPath = path.join(
    parentDirectory,
    [
      ".",
      path.basename(finalPath),
      ".",
      process.pid,
      ".",
      Date.now(),
      ".tmp"
    ].join("")
  );

  const serializedData = JSON.stringify(
    data,
    null,
    2
  );

  try {
    await fs.promises.writeFile(
      temporaryPath,
      serializedData,
      {
        encoding: "utf8",
        flag: "wx"
      }
    );

    await fs.promises.rename(
      temporaryPath,
      finalPath
    );

    return finalPath;
  } catch (error) {
    try {
      await fs.promises.unlink(
        temporaryPath
      );
    } catch {
      // File may have already been renamed.
    }

    throw error;
  }
}


/**
 * Generate a session ID accepted by the VM SessionManager.
 *
 * Example:
 *
 * session_20260717_101530_a3f28b91
 */
function generateSessionId() {
  const now = new Date();

  const datePart = now
    .toISOString()
    .replace(
      /[-:.TZ]/g,
      ""
    )
    .slice(
      0,
      14
    );

  const randomPart = crypto
    .randomBytes(4)
    .toString("hex");

  return (
    `session_${datePart}_${randomPart}`
  );
}


/**
 * Validate session ID before using it in filesystem paths.
 */
function validateSessionId(
  sessionId
) {
  if (
    typeof sessionId !== "string" ||
    !SESSION_ID_PATTERN.test(
      sessionId
    )
  ) {
    throw new VmAgentServiceError(
      "Invalid session ID.",
      400,
      "INVALID_SESSION_ID"
    );
  }

  return sessionId;
}


/**
 * Perform only basic input validation.
 *
 * This does not classify or inspect the URL.
 * Security analysis still happens exclusively inside the VM.
 */
function validateUrl(inputUrl) {
  if (typeof inputUrl !== "string") {
    throw new VmAgentServiceError(
      "URL must be provided as a string.",
      400,
      "INVALID_URL_TYPE"
    );
  }

  const normalizedUrl =
    inputUrl.trim();

  if (!normalizedUrl) {
    throw new VmAgentServiceError(
      "URL is required.",
      400,
      "URL_REQUIRED"
    );
  }

  if (
    normalizedUrl.length >
    MAXIMUM_URL_LENGTH
  ) {
    throw new VmAgentServiceError(
      `URL cannot exceed ${MAXIMUM_URL_LENGTH} characters.`,
      400,
      "URL_TOO_LONG"
    );
  }

  if (
    normalizedUrl.includes("\r") ||
    normalizedUrl.includes("\n") ||
    normalizedUrl.includes("\0")
  ) {
    throw new VmAgentServiceError(
      "URL contains prohibited control characters.",
      400,
      "INVALID_URL_CHARACTERS"
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(
      normalizedUrl
    );
  } catch {
    throw new VmAgentServiceError(
      "The submitted URL is not valid.",
      400,
      "INVALID_URL"
    );
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new VmAgentServiceError(
      "Only HTTP and HTTPS URLs are supported.",
      400,
      "UNSUPPORTED_URL_SCHEME"
    );
  }

  if (!parsedUrl.hostname) {
    throw new VmAgentServiceError(
      "The URL must contain a hostname.",
      400,
      "URL_HOSTNAME_REQUIRED"
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new VmAgentServiceError(
      "URLs containing embedded credentials are not accepted.",
      400,
      "EMBEDDED_CREDENTIALS_NOT_ALLOWED"
    );
  }

  return normalizedUrl;
}


/**
 * Validate optional metadata.
 */
function validateMetadata(metadata) {
  if (
    metadata === undefined ||
    metadata === null
  ) {
    return {};
  }

  if (
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    throw new VmAgentServiceError(
      "metadata must be a JSON object.",
      400,
      "INVALID_METADATA"
    );
  }

  return metadata;
}


/**
 * Submit one URL-analysis request to the VM queue.
 */
async function submitAnalysis({
  url,
  metadata,
  orgId,
  userId,
  sourceChannel,
  idempotencyKey
}) {
  const validatedUrl =
    validateUrl(url);

  const validatedMetadata =
    validateMetadata(metadata);

  await initializeSharedDirectories();

  const sessionId =
    generateSessionId();

  const submittedAt =
    new Date().toISOString();

  const requestData = {
    session_id: sessionId,
    url: validatedUrl,
    submitted_at: submittedAt,
    source:
      sourceChannel || "email_security_host_backend",
    request_version: "2.0",
    metadata: validatedMetadata
  };

  const requestPath = path.join(
    INPUT_DIR,
    `${sessionId}.json`
  );

  /*
   * Extremely unlikely, but never overwrite an existing request.
   */
  if (
    await pathExists(requestPath)
  ) {
    throw new VmAgentServiceError(
      "A request with the generated session ID already exists.",
      409,
      "SESSION_ALREADY_EXISTS"
    );
  }

  await writeJsonAtomic(
    requestPath,
    requestData
  );

  try {
    await createAnalysis({
      sessionId,
      url: validatedUrl,
      submittedAt,
      metadata: validatedMetadata,
      orgId: orgId,
      userId: userId || null,
      sourceChannel:
        sourceChannel ||
        (validatedMetadata?.submitted_from === "email_security"
          ? "EMAIL_SECURITY"
          : "MANUAL"),
      idempotencyKey: idempotencyKey || null
    });
  } catch (dbErr) {
    console.error("[PostgreSQL createAnalysis Error]", dbErr.message);
  }

  await saveJob({
    session_id: sessionId,
    status: "queued",
    submitted_at: submittedAt,
    url: validatedUrl,
    callback_received: false
  }).catch(() => {});

  return {
    session_id: sessionId,
    status: "queued",
    url: validatedUrl,
    submitted_at: submittedAt
  };
}


/**
 * Build all paths related to a session.
 */
function getSessionPaths(
  sessionId
) {
  validateSessionId(
    sessionId
  );

  return {
    inputFile: path.join(
      INPUT_DIR,
      `${sessionId}.json`
    ),

    processingFile: path.join(
      PROCESSING_DIR,
      `${sessionId}.json`
    ),

    statusFile: path.join(
      OUTPUT_DIR,
      sessionId,
      "status.json"
    ),

    reportFile: path.join(
      REPORTS_DIR,
      sessionId,
      "report.json"
    )
  };
}


/**
 * Search a directory for files containing the session ID.
 *
 * Completed and failed requests may have suffixes such as:
 *
 * _duplicate
 * _failed_timestamp
 */
async function findMatchingFiles(
  directoryPath,
  sessionId
) {
  try {
    const entries =
      await fs.promises.readdir(
        directoryPath,
        {
          withFileTypes: true
        }
      );

    return entries
      .filter(
        (entry) =>
          entry.isFile()
      )
      .filter(
        (entry) =>
          entry.name.includes(
            sessionId
          )
      )
      .map(
        (entry) =>
          path.join(
            directoryPath,
            entry.name
          )
      );
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}


/**
 * Convert the VM report into a UI-friendly summary.
 */
function buildResultSummary(
  report
) {
  const decision =
    report.decision || {};

  const analysis =
    report.analysis || {};

  const target =
    report.target || {};

  const execution =
    report.execution || {};

  return {
    status: "completed",

    verdict:
      decision.verdict ||
      "UNKNOWN",

    recommended_action:
      decision.recommended_action ||
      "UNKNOWN",

    allow_user_access:
      decision.allow_user_access ===
      true,

    reason:
      decision.reason ||
      null,

    risk_score:
      Number(
        analysis.risk_score || 0
      ),

    risk_level:
      analysis.risk_level ||
      "unknown",

    finding_count:
      Number(
        analysis.finding_count || 0
      ),

    findings:
      Array.isArray(
        analysis.findings
      )
        ? analysis.findings
        : [],

    submitted_url:
      target.submitted_url ||
      null,

    final_url:
      target.final_url ||
      null,

    page_title:
      target.page_title ||
      null,

    execution_status:
      execution.status ||
      null,

    duration_ms:
      execution.duration_ms ??
      null,

    report_ready: true
  };
}


/**
 * Get current session status.
 */
async function getAnalysisStatus(
  sessionId
) {
  const validatedSessionId =
    validateSessionId(
      sessionId
    );

  /*
   * 1. Check PostgreSQL first
   */
  try {
    const dbAnalysis =
      await getAnalysisById(
        validatedSessionId
      );

    if (
      dbAnalysis &&
      dbAnalysis.report_ready
    ) {
      return dbAnalysis;
    }
  } catch (err) {
    console.error(
      "[PostgreSQL getAnalysisById Error]",
      err.message
    );
  }

  const paths =
    getSessionPaths(
      validatedSessionId
    );

  /*
   * 2. Final report on disk check -> persist to PostgreSQL
   */
  if (
    await pathExists(
      paths.reportFile
    )
  ) {
    const report =
      await readJsonFile(
        paths.reportFile
      );

    const shotPath = path.join(
      SCREENSHOTS_DIR,
      validatedSessionId,
      "final_page.png"
    );

    const artifacts = [];
    if (await pathExists(shotPath)) {
      try {
        const stat =
          await fs.promises.stat(
            shotPath
          );
        artifacts.push({
          artifact_type: "SCREENSHOT",
          file_name: "final_page.png",
          storage_path: shotPath,
          mime_type: "image/png",
          size_bytes: stat.size
        });
      } catch {}
    }

    try {
      await saveAnalysisResult(
        validatedSessionId,
        report,
        artifacts
      );

      // Asynchronously dispatch webhook if callback_url was registered
      const decision = report.decision || {};
      const analysis = report.analysis || {};
      const target = report.target || {};
      const updated = await getAnalysisById(validatedSessionId);
      const effectiveMetadata = {
        ...(updated?.metadata || {}),
        ...(report.metadata || {})
      };

      dispatchWebhook({
        sessionId: validatedSessionId,
        url: target.submitted_url || report.submitted_url,
        verdict: decision.verdict,
        recommendedAction: decision.recommended_action,
        allowUserAccess: decision.allow_user_access,
        riskScore: analysis.risk_score,
        riskLevel: analysis.risk_level,
        durationMs: report.execution?.duration_ms,
        findingCount: analysis.finding_count,
        findings: analysis.findings,
        metadata: effectiveMetadata
      }).catch((whErr) => {
        console.error("[Webhook Dispatch Error]", whErr.message);
      });

      if (updated) return updated;
    } catch (saveErr) {
      console.error(
        "[PostgreSQL saveAnalysisResult Error]",
        saveErr.message
      );
    }

    return {
      session_id:
        validatedSessionId,

      ...buildResultSummary(
        report
      )
    };
  }

  /*
   * 3. status.json provides detailed running state.
   */
  if (
    await pathExists(
      paths.statusFile
    )
  ) {
    const statusData =
      await readJsonFile(
        paths.statusFile
      );

    await updateAnalysisStatus(
      validatedSessionId,
      "RUNNING"
    ).catch(() => {});

    return {
      session_id:
        validatedSessionId,

      status:
        statusData.status ||
        "processing",

      browser_status:
        statusData.browser_status ??
        null,

      verdict:
        statusData.verdict ??
        null,

      updated_at:
        statusData.updated_at ??
        null,

      duration_ms:
        statusData.duration_ms ??
        null,

      report_ready: false
    };
  }

  if (
    await pathExists(
      paths.processingFile
    )
  ) {
    await updateAnalysisStatus(
      validatedSessionId,
      "RUNNING"
    ).catch(() => {});

    return {
      session_id:
        validatedSessionId,
      status: "processing",
      report_ready: false
    };
  }

  if (
    await pathExists(
      paths.inputFile
    )
  ) {
    return {
      session_id:
        validatedSessionId,
      status: "queued",
      report_ready: false
    };
  }

  try {
    const dbFallback =
      await getAnalysisById(
        validatedSessionId
      );

    if (dbFallback) {
      return dbFallback;
    }
  } catch {}

  const failedMatches =
    await findMatchingFiles(
      FAILED_DIR,
      validatedSessionId
    );

  if (
    failedMatches.length > 0
  ) {
    await updateAnalysisStatus(
      validatedSessionId,
      "FAILED",
      {
        error_message:
          "The VM Agent could not complete this analysis."
      }
    ).catch(() => {});

    return {
      session_id:
        validatedSessionId,
      status: "failed",
      report_ready: false,
      message:
        "The VM Agent could not complete this analysis."
    };
  }

  const completedMatches =
    await findMatchingFiles(
      COMPLETED_DIR,
      validatedSessionId
    );

  if (
    completedMatches.length > 0
  ) {
    return {
      session_id:
        validatedSessionId,
      status: "completed",
      report_ready: false,
      message:
        "The request was archived as completed, but the final report is unavailable."
    };
  }

  throw new VmAgentServiceError(
    "Analysis session was not found.",
    404,
    "SESSION_NOT_FOUND"
  );
}


/**
 * Return the full authoritative VM report.
 */
async function getAnalysisReport(
  sessionId
) {
  const validatedSessionId =
    validateSessionId(
      sessionId
    );

  /*
   * 1. Check PostgreSQL first
   */
  try {
    const dbReport =
      await getReportByAnalysisId(
        validatedSessionId
      );

    if (dbReport) {
      return dbReport;
    }
  } catch (err) {
    console.error(
      "[PostgreSQL getReportByAnalysisId Error]",
      err.message
    );
  }

  /*
   * 2. Fall back to disk if not yet in database
   */
  const reportPath = path.join(
    REPORTS_DIR,
    validatedSessionId,
    "report.json"
  );

  if (
    !(await pathExists(reportPath))
  ) {
    throw new VmAgentServiceError(
      "The report is not ready yet.",
      404,
      "REPORT_NOT_READY"
    );
  }

  const report =
    await readJsonFile(
      reportPath
    );

  try {
    await saveAnalysisResult(
      validatedSessionId,
      report
    );
  } catch {}

  return report;
}


/**
 * Return shared-folder information for diagnostics.
 */
function getSharedFolderInfo() {
  return {
    shared_root: SHARED_ROOT,
    input_directory: INPUT_DIR,
    processing_directory:
      PROCESSING_DIR,
    completed_directory:
      COMPLETED_DIR,
    failed_directory:
      FAILED_DIR,
    output_directory:
      OUTPUT_DIR,
    reports_directory:
      REPORTS_DIR,
    screenshots_directory:
      SCREENSHOTS_DIR
  };
}


module.exports = {
  VmAgentServiceError,
  initializeSharedDirectories,
  submitAnalysis,
  getAnalysisStatus,
  getAnalysisReport,
  getSharedFolderInfo,
  validateUrl,
  listAnalyses,
  SCREENSHOTS_DIR
};