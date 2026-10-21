"use strict";

const { pool } = require("../config/db");
const { URL } = require("url");

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

function extractHostname(inputUrl) {
  try {
    return new URL(inputUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Insert a newly queued analysis job.
 */
async function createAnalysis({
  sessionId,
  url,
  submittedAt = new Date().toISOString(),
  metadata = {},
  orgId = DEFAULT_ORG_ID,
  userId = null,
  sourceChannel = "MANUAL",
  idempotencyKey = null
}) {
  const hostname = extractHostname(url);

  const queryText = `
    INSERT INTO analyses (
      id,
      organization_id,
      requested_by_user_id,
      source_channel,
      idempotency_key,
      submitted_url,
      submitted_hostname,
      status,
      submitted_at,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'QUEUED', $8, $9)
    RETURNING *;
  `;

  const values = [
    sessionId,
    orgId,
    userId || null,
    sourceChannel,
    idempotencyKey,
    url,
    hostname,
    submittedAt,
    JSON.stringify(metadata)
  ];

  const res = await pool.query(queryText, values);
  return res.rows[0];
}

/**
 * Update analysis execution status.
 */
async function updateAnalysisStatus(sessionId, status, details = {}) {
  const updates = [];
  const values = [sessionId, status];
  let paramIndex = 3;

  updates.push("status = $2", "updated_at = NOW()");

  if (status === "RUNNING") {
    updates.push("started_at = NOW()");
  }

  if (details.error_message) {
    updates.push(`error_message = $${paramIndex++}`);
    values.push(details.error_message);
  }

  if (details.error_code) {
    updates.push(`error_code = $${paramIndex++}`);
    values.push(details.error_code);
  }

  const queryText = `
    UPDATE analyses
    SET ${updates.join(", ")}
    WHERE id = $1
    RETURNING *;
  `;

  const res = await pool.query(queryText, values);
  return res.rows[0];
}

/**
 * Atomically persist complete analysis report, findings, redirects, and artifacts.
 */
async function saveAnalysisResult(sessionId, report, artifacts = []) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    const target = report.target || {};
    const execution = report.execution || {};
    const decision = report.decision || {};
    const analysis = report.analysis || {};
    const evidenceSummary = report.evidence_summary || {};
    const browserBehaviour = report.browser_behaviour || {};

    const verdict = decision.verdict || "UNKNOWN";
    const riskScore = Math.min(100, Math.max(0, Number(analysis.risk_score || 0)));
    const riskLevel = analysis.risk_level || "unknown";
    const recommendedAction = decision.recommended_action || "REVIEW";
    const allowUserAccess = decision.allow_user_access === true;
    const decisionReason = decision.reason || null;

    const finalUrl = target.final_url || null;
    const finalHostname = target.final_hostname || extractHostname(finalUrl);
    const domainChanged = target.domain_changed === true;
    const pageTitle = target.page_title || null;
    const httpStatusCode = target.status_code || null;
    const serverIp = target.server_address?.ipAddress || null;

    const durationMs = execution.duration_ms || null;
    const completeness = execution.status === "completed" ? "complete" : "partial";
    const executionStatus = execution.status === "failed" ? "FAILED" : "COMPLETED";

    // 1. Update analyses master record
    const updateAnalysisSql = `
      UPDATE analyses SET
        status = $2,
        verdict = $3,
        recommended_action = $4,
        allow_user_access = $5,
        decision_reason = $6,
        risk_score = $7,
        risk_level = $8,
        final_url = $9,
        final_hostname = $10,
        domain_changed = $11,
        page_title = $12,
        http_status_code = $13,
        server_ip = $14,
        duration_ms = $15,
        completeness = $16,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    await client.query(updateAnalysisSql, [
      sessionId,
      executionStatus,
      verdict,
      recommendedAction,
      allowUserAccess,
      decisionReason,
      riskScore,
      riskLevel,
      finalUrl,
      finalHostname,
      domainChanged,
      pageTitle,
      httpStatusCode,
      serverIp,
      durationMs,
      completeness
    ]);

    // 2. Insert Findings
    await client.query("DELETE FROM findings WHERE analysis_id = $1;", [sessionId]);
    const findingsList = Array.isArray(analysis.findings) ? analysis.findings : [];

    for (const finding of findingsList) {
      const insertFindingSql = `
        INSERT INTO findings (
          analysis_id,
          rule_id,
          rule_version,
          title,
          description,
          category,
          severity,
          confidence,
          score_contribution,
          evidence,
          mitre_attack_id,
          mitre_attack_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
      `;

      const severityUpper = (finding.severity || "INFORMATIONAL").toUpperCase();
      const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
      const severity = validSeverities.includes(severityUpper) ? severityUpper : "INFORMATIONAL";

      await client.query(insertFindingSql, [
        sessionId,
        finding.id || finding.rule_id || "GEN-001",
        finding.rule_version || "1.0",
        finding.title || "Observed Finding",
        finding.description || null,
        finding.category || "general",
        severity,
        finding.confidence ?? 1.0,
        Number(finding.score || finding.score_contribution || 0),
        JSON.stringify(finding.evidence || {}),
        finding.mitre_attack_id || finding.mitre_id || null,
        finding.mitre_attack_name || finding.mitre_name || null
      ]);
    }

    // 3. Insert Redirect Events
    await client.query("DELETE FROM redirect_events WHERE analysis_id = $1;", [sessionId]);
    const redirectEvents = browserBehaviour?.http_redirects?.events || [];
    let seq = 1;
    for (const hop of redirectEvents) {
      const insertHopSql = `
        INSERT INTO redirect_events (
          analysis_id, sequence, redirect_type, source_url, target_url, status_code, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;
      await client.query(insertHopSql, [
        sessionId,
        seq++,
        hop.type || "http_redirect",
        hop.source_url || hop.from || "",
        hop.target_url || hop.to || "",
        hop.status_code || null,
        hop.timestamp || new Date().toISOString()
      ]);
    }

    // 4. Save/Upsert Full Canonical Report
    const upsertReportSql = `
      INSERT INTO reports (
        analysis_id,
        schema_version,
        evidence_summary,
        browser_behaviour,
        raw_report,
        generated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (analysis_id) DO UPDATE SET
        schema_version = EXCLUDED.schema_version,
        evidence_summary = EXCLUDED.evidence_summary,
        browser_behaviour = EXCLUDED.browser_behaviour,
        raw_report = EXCLUDED.raw_report,
        generated_at = NOW();
    `;

    await client.query(upsertReportSql, [
      sessionId,
      report.schema_version || "2.1",
      JSON.stringify(evidenceSummary),
      JSON.stringify(browserBehaviour),
      JSON.stringify(report)
    ]);

    // 5. Insert Artifacts (e.g. screenshot)
    for (const art of artifacts) {
      await client.query(`
        INSERT INTO artifact_records (
          analysis_id, artifact_type, file_name, storage_path, mime_type, size_bytes, sha256_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING;
      `, [
        sessionId,
        art.artifact_type || "SCREENSHOT",
        art.file_name || "final_page.png",
        art.storage_path,
        art.mime_type || "image/png",
        art.size_bytes || 0,
        art.sha256_hash || null
      ]);
    }

    await client.query("COMMIT;");
    return true;
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("[saveAnalysisResult Error]", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieve an analysis by ID with findings count.
 */
async function getAnalysisById(sessionId) {
  const querySql = `
    SELECT
      a.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', f.rule_id,
            'title', f.title,
            'description', f.description,
            'category', f.category,
            'severity', f.severity,
            'score', f.score_contribution,
            'evidence', f.evidence,
            'mitre_attack_id', f.mitre_attack_id,
            'mitre_attack_name', f.mitre_attack_name
          )
        ) FILTER (WHERE f.id IS NOT NULL),
        '[]'
      ) AS findings
    FROM analyses a
    LEFT JOIN findings f ON f.analysis_id = a.id
    WHERE a.id = $1
    GROUP BY a.id;
  `;

  const res = await pool.query(querySql, [sessionId]);
  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    session_id: row.id,
    organization_id: row.organization_id,
    status: row.status.toLowerCase(),
    verdict: row.verdict,
    recommended_action: row.recommended_action,
    allow_user_access: row.allow_user_access,
    reason: row.decision_reason,
    risk_score: row.risk_score,
    risk_level: row.risk_level,
    finding_count: row.findings.length,
    findings: row.findings,
    submitted_url: row.submitted_url,
    final_url: row.final_url,
    page_title: row.page_title,
    metadata: row.metadata || {},
    execution_status: row.status.toLowerCase(),
    duration_ms: row.duration_ms,
    report_ready: ["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"].includes(row.status),
    created_at: row.created_at,
    completed_at: row.completed_at
  };
}

/**
 * Retrieve the full canonical report JSON from the reports table.
 */
async function getReportByAnalysisId(sessionId) {
  const querySql = `
    SELECT raw_report FROM reports WHERE analysis_id = $1;
  `;
  const res = await pool.query(querySql, [sessionId]);
  return res.rows[0]?.raw_report || null;
}

/**
 * List past analyses for dashboard history with pagination and search.
 */
async function listAnalyses({
  orgId = DEFAULT_ORG_ID,
  limit = 50,
  offset = 0,
  verdict = null,
  status = null,
  search = null
}) {
  const whereClauses = ["a.organization_id = $1"];
  const values = [orgId];
  let paramIndex = 2;

  if (verdict) {
    whereClauses.push(`a.verdict = $${paramIndex++}`);
    values.push(verdict.toUpperCase());
  }

  if (status) {
    whereClauses.push(`a.status = $${paramIndex++}`);
    values.push(status.toUpperCase());
  }

  if (search) {
    whereClauses.push(`(a.submitted_url ILIKE $${paramIndex} OR a.id ILIKE $${paramIndex})`);
    paramIndex++;
    values.push(`%${search}%`);
  }

  const querySql = `
    SELECT
      a.id AS session_id,
      a.submitted_url,
      a.final_url,
      a.page_title,
      a.status,
      a.verdict,
      a.risk_score,
      a.risk_level,
      a.duration_ms,
      a.source_channel,
      a.submitted_at,
      a.completed_at,
      COUNT(f.id) AS finding_count
    FROM analyses a
    LEFT JOIN findings f ON f.analysis_id = a.id
    WHERE ${whereClauses.join(" AND ")}
    GROUP BY a.id
    ORDER BY a.submitted_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;

  values.push(limit, offset);
  const res = await pool.query(querySql, values);
  return res.rows;
}

/**
 * Retrieve analysis by organization and idempotency key.
 */
async function getAnalysisByIdempotencyKey(orgId, idempotencyKey) {
  if (!idempotencyKey) return null;
  const querySql = `
    SELECT id FROM analyses WHERE organization_id = $1 AND idempotency_key = $2 LIMIT 1;
  `;
  const res = await pool.query(querySql, [orgId, idempotencyKey]);
  if (!res.rows[0]) return null;
  return getAnalysisById(res.rows[0].id);
}

/**
 * Extract structured Indicators of Compromise (IOCs) for SOC blocklist & threat intelligence ingestion.
 */
async function getAnalysisIocs(sessionId) {
  const analysis = await getAnalysisById(sessionId);
  if (!analysis) return null;

  const domains = new Set();
  const ips = new Set();
  const urls = new Set([analysis.submitted_url]);
  if (analysis.final_url) urls.add(analysis.final_url);
  if (analysis.submitted_hostname) domains.add(analysis.submitted_hostname);
  if (analysis.final_hostname) domains.add(analysis.final_hostname);
  if (analysis.server_ip) ips.add(analysis.server_ip);

  // Extract from redirect events
  const redirectsRes = await pool.query(
    "SELECT source_url, target_url FROM redirect_events WHERE analysis_id = $1 ORDER BY sequence ASC",
    [sessionId]
  );
  for (const r of redirectsRes.rows) {
    if (r.source_url) urls.add(r.source_url);
    if (r.target_url) urls.add(r.target_url);
    const h1 = extractHostname(r.source_url);
    const h2 = extractHostname(r.target_url);
    if (h1) domains.add(h1);
    if (h2) domains.add(h2);
  }

  // Extract findings & MITRE techniques
  const findingsRes = await pool.query(
    "SELECT rule_id, title, category, severity, mitre_attack_id, mitre_attack_name, evidence FROM findings WHERE analysis_id = $1",
    [sessionId]
  );
  const mitreTechniques = [];
  const exfilTargets = [];

  for (const f of findingsRes.rows) {
    if (f.mitre_attack_id) {
      mitreTechniques.push({
        id: f.mitre_attack_id,
        name: f.mitre_attack_name,
        rule_id: f.rule_id,
        severity: f.severity
      });
    }
    if (f.evidence && f.evidence.webhook_url) {
      exfilTargets.push(f.evidence.webhook_url);
      urls.add(f.evidence.webhook_url);
    }
    if (f.evidence && f.evidence.action_url) {
      urls.add(f.evidence.action_url);
      const h = extractHostname(f.evidence.action_url);
      if (h) domains.add(h);
    }
  }

  // Extract artifacts
  const artifactsRes = await pool.query(
    "SELECT artifact_type, file_name, sha256_hash, mime_type FROM artifact_records WHERE analysis_id = $1",
    [sessionId]
  );

  return {
    analysis_id: sessionId,
    verdict: analysis.verdict,
    risk_score: analysis.risk_score,
    target_url: analysis.submitted_url,
    final_url: analysis.final_url,
    indicators: {
      domains: Array.from(domains),
      ipv4_addresses: Array.from(ips),
      urls: Array.from(urls),
      exfiltration_endpoints: exfilTargets,
      hashes: artifactsRes.rows.filter(a => a.sha256_hash).map(a => ({
        type: a.artifact_type,
        file: a.file_name,
        sha256: a.sha256_hash
      }))
    },
    mitre_attack_matrix: mitreTechniques,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  DEFAULT_ORG_ID,
  createAnalysis,
  updateAnalysisStatus,
  saveAnalysisResult,
  getAnalysisById,
  getReportByAnalysisId,
  getAnalysisByIdempotencyKey,
  listAnalyses,
  getAnalysisIocs
};
