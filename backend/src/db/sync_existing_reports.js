"use strict";

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const {
  createAnalysis,
  saveAnalysisResult
} = require("../services/analysisRepository");

const SHARED_ROOT =
  process.env.SANDBOX_SHARED_ROOT ||
  path.resolve(__dirname, "..", "..", "..", "vm-agent", "shared");

const REPORTS_DIR = path.join(SHARED_ROOT, "reports");
const SCREENSHOTS_DIR = path.join(SHARED_ROOT, "screenshots");

async function syncReports() {
  console.log(`[Backfill] Reading reports from: ${REPORTS_DIR}`);

  if (!fs.existsSync(REPORTS_DIR)) {
    console.log("[Backfill] Reports directory does not exist.");
    return;
  }

  const sessionDirs = fs
    .readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`[Backfill] Found ${sessionDirs.length} session directories.`);

  let synced = 0;
  for (const sessionId of sessionDirs) {
    const reportPath = path.join(REPORTS_DIR, sessionId, "report.json");
    if (!fs.existsSync(reportPath)) continue;

    try {
      const rawContent = fs.readFileSync(reportPath, "utf8");
      if (!rawContent.trim()) continue;
      const report = JSON.parse(rawContent);

      const submittedUrl =
        report.target?.submitted_url ||
        report.target?.final_url ||
        "https://unknown.invalid";

      // 1. Ensure master row exists
      await createAnalysis({
        sessionId,
        url: submittedUrl,
        submittedAt: report.generated_at || new Date().toISOString(),
        metadata: { backfilled: true }
      }).catch(() => {
        // May already exist
      });

      // 2. Prepare artifacts
      const artifacts = [];
      const shotPath = path.join(SCREENSHOTS_DIR, sessionId, "final_page.png");
      if (fs.existsSync(shotPath)) {
        const stat = fs.statSync(shotPath);
        artifacts.push({
          artifact_type: "SCREENSHOT",
          file_name: "final_page.png",
          storage_path: shotPath,
          mime_type: "image/png",
          size_bytes: stat.size
        });
      }

      // 3. Ingest into PostgreSQL
      await saveAnalysisResult(sessionId, report, artifacts);
      synced++;
      console.log(`[Backfill] Successfully synced: ${sessionId}`);
    } catch (err) {
      console.error(`[Backfill Error] Failed to sync ${sessionId}:`, err.message);
    }
  }

  console.log(`[Backfill] Done! Successfully synced ${synced} historical sessions into PostgreSQL.`);
  process.exit(0);
}

syncReports().catch((err) => {
  console.error("[Fatal Backfill Error]", err);
  process.exit(1);
});
