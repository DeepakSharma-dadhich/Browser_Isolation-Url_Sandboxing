"use strict";

const path = require("path");
const fs = require("fs");
const { pool } = require("../config/db");
const { DEFAULT_ORG_ID } = require("../services/analysisRepository");
const { getUserGatewaySubscriptions } = require("../services/subscription.service");

/**
 * Verify extension pairing credentials and subscription status.
 * Accepts X-Extension-Token (bg_ext_...) or X-API-Key (bg_live_...).
 * GET /api/v1/extension/verify
 */
async function verifyExtensionPairing(req, res) {
  try {
    // If request reached here without req.user and without req.apiClient
    if (!req.user && !req.apiClient) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "No valid extension pairing token or API key provided. Include 'X-Extension-Token: bg_ext_...' or 'X-API-Key: bg_live_...'."
      });
    }

    let targetUserId = req.user?.id;
    let userEmail = req.user?.email;
    let fullName = req.user?.fullName;
    let organizationId = req.orgId || DEFAULT_ORG_ID;

    // If authenticated via API Client
    if (!targetUserId && req.apiClient) {
      organizationId = req.apiClient.organization_id || DEFAULT_ORG_ID;
      const orgOwner = await pool.query(
        `SELECT u.id, u.email, u.full_name 
         FROM organization_members om 
         JOIN users u ON u.id = om.user_id 
         WHERE om.organization_id = $1 
         ORDER BY CASE om.role WHEN 'OWNER' THEN 1 WHEN 'ADMIN' THEN 2 ELSE 3 END 
         LIMIT 1;`,
        [organizationId]
      );
      if (orgOwner.rows.length > 0) {
        targetUserId = orgOwner.rows[0].id;
        userEmail = orgOwner.rows[0].email;
        fullName = orgOwner.rows[0].full_name;
      }
    }

    // Lookup organization name
    const orgRes = await pool.query(
      "SELECT id, name FROM organizations WHERE id = $1 LIMIT 1;",
      [organizationId]
    );
    const orgName = orgRes.rows[0]?.name || "Default Organization";

    // Lookup gateway subscription for browser_extension
    const subs = targetUserId ? await getUserGatewaySubscriptions(targetUserId) : null;
    const extSub = subs ? subs["browser_extension"] : null;

    return res.status(200).json({
      success: true,
      message: "Extension pairing verified successfully.",
      user: {
        id: targetUserId,
        email: userEmail,
        fullName: fullName
      },
      organization: {
        id: organizationId,
        name: orgName
      },
      gateway: {
        gateway: "browser_extension",
        status: extSub?.status || "ACTIVE",
        is_active: extSub?.is_active ?? true,
        plan_tier: extSub?.plan_tier || "ENTERPRISE",
        quota_used: extSub?.quota_used ?? 0,
        quota_total: extSub?.quota_total ?? 999999,
        quota_remaining: extSub?.quota_remaining ?? 999999,
        expires_at: extSub?.expires_at || null
      },
      endpoints: {
        api_url: "http://localhost:3000",
        dashboard_url: "http://localhost:5173",
        analyses_endpoint: "/api/v1/analyses",
        rbi_template: "http://localhost:5173/?isolate={URL}"
      }
    });
  } catch (err) {
    console.error("[Extension Verify Error]", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message
    });
  }
}

/**
 * Download the packaged extension zip file.
 * GET /api/v1/extension/download
 */
async function downloadExtensionZip(req, res) {
  try {
    const zipPath = path.resolve(__dirname, "../../../frontend/public/downloads/browseguard-extension.zip");
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Extension package archive has not been generated yet."
      });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="browseguard-extension.zip"');
    const stream = fs.createReadStream(zipPath);
    return stream.pipe(res);
  } catch (err) {
    console.error("[Extension Download Error]", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message
    });
  }
}

/**
 * Ultra-fast (< 25ms) URL threat evaluation for the browser extension.
 * Eliminates long sandbox waits for safe or cached URLs.
 * POST /api/v1/extension/fast-check
 */
async function fastCheckUrl(req, res) {
  const startTime = Date.now();
  try {
    const rawUrl = (req.body?.url || req.query?.url || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    let parsed;
    try {
      parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    } catch {
      return res.status(200).json({
        success: true,
        verdict: "SAFE",
        risk_score: 0,
        bypass: true,
        reason: "Invalid URL syntax, skipping inspection.",
        execution_time_ms: Date.now() - startTime
      });
    }

    const hostname = parsed.hostname.toLowerCase();
    const dashboardBase = process.env.DASHBOARD_URL || "http://localhost:5173";
    const rbiUrl = `${dashboardBase.replace(/\/+$/, "")}/?isolate=${encodeURIComponent(rawUrl)}`;

    // 1. Static Heuristics (Immediate Flagging)
    // Disallow userinfo (e.g. http://google.com@phishing.com)
    if (parsed.username || parsed.password) {
      return res.status(200).json({
        success: true,
        verdict: "MALICIOUS",
        risk_score: 95,
        recommended_action: "BLOCK",
        reason: "Deceptive credential userinfo in URL structure (@ symbol injection).",
        rbi_url: rbiUrl,
        execution_time_ms: Date.now() - startTime
      });
    }

    // Punycode Homoglyph check
    if (hostname.includes("xn--")) {
      return res.status(200).json({
        success: true,
        verdict: "MALICIOUS",
        risk_score: 85,
        recommended_action: "BLOCK",
        reason: "Internationalized Domain Name (IDN) Punycode homoglyph detected.",
        rbi_url: rbiUrl,
        execution_time_ms: Date.now() - startTime
      });
    }

    // Executable / Script Dropper Detection (e.g. /bin.sh, malware.exe, trojan.elf)
    const pathname = (parsed.pathname || "").toLowerCase();
    const port = parsed.port;
    const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes("[");
    const executableExts = [".sh", ".bin", ".elf", ".exe", ".bat", ".ps1", ".apk", ".vbs", ".dll", ".scr", ".msi", ".iso", ".cmd", ".hta"];
    const hasExecutablePayload = executableExts.some((ext) => pathname.endsWith(ext) || pathname.includes(ext + "?") || pathname.includes(ext + "/"));
    const isAbnormalPort = port && port !== "80" && port !== "443";

    if (hasExecutablePayload) {
      return res.status(200).json({
        success: true,
        verdict: "MALICIOUS",
        risk_score: 98,
        recommended_action: "BLOCK",
        reason: `Malware dropper payload detected (${pathname}): Direct execution of shell script or binary payload from untrusted host ${hostname}${port ? `:${port}` : ""}.`,
        rbi_url: rbiUrl,
        execution_time_ms: Date.now() - startTime
      });
    }

    // Raw IPv4/IPv6 address check with botnet / C2 port detection
    if (isIpHost) {
      const isMaliciousIp = isAbnormalPort; // Non-standard ports on raw IPs (e.g. 42284) are overwhelmingly C2 / botnet payloads
      return res.status(200).json({
        success: true,
        verdict: isMaliciousIp ? "MALICIOUS" : "SUSPICIOUS",
        risk_score: isMaliciousIp ? 95 : 75,
        recommended_action: isMaliciousIp ? "BLOCK" : "ISOLATE",
        reason: isMaliciousIp
          ? `High-risk botnet C2 / malware infrastructure: Raw IP address using non-standard high port (:${port}).`
          : "Raw IP address host navigation without domain reputation.",
        rbi_url: rbiUrl,
        execution_time_ms: Date.now() - startTime
      });
    }

    // Known Phishing Brand Keyword Mimicry in hostname
    const brandChecks = [
      { brand: "paypal", legit: ["paypal.com", "paypal.me"] },
      { brand: "microsoft", legit: ["microsoft.com", "live.com", "office.com", "office365.com", "azure.com"] },
      { brand: "micros0ft", legit: [] },
      { brand: "apple", legit: ["apple.com", "icloud.com"] },
      { brand: "netflix", legit: ["netflix.com"] },
      { brand: "binance", legit: ["binance.com"] },
      { brand: "metamask", legit: ["metamask.io"] },
      { brand: "chase", legit: ["chase.com"] },
      { brand: "wellsfargo", legit: ["wellsfargo.com"] },
      { brand: "bank-secure", legit: [] },
      { brand: "account-update", legit: [] },
      { brand: "login-appleid", legit: [] }
    ];

    for (const b of brandChecks) {
      if (hostname.includes(b.brand)) {
        const isLegit = b.legit.some((legitDomain) => hostname === legitDomain || hostname.endsWith("." + legitDomain));
        if (!isLegit) {
          return res.status(200).json({
            success: true,
            verdict: "MALICIOUS",
            risk_score: 92,
            recommended_action: "BLOCK",
            reason: `High-risk brand impersonation detected ('${b.brand}' mimicry on non-official domain '${hostname}').`,
            rbi_url: rbiUrl,
            execution_time_ms: Date.now() - startTime
          });
        }
      }
    }

    // 2. Check Database Recent Analyses Cache (Cache Hit < 5ms)
    const cacheResult = await pool.query(
      `SELECT id, verdict, risk_score, recommended_action, error_message, created_at
       FROM analyses
       WHERE submitted_url = $1 OR final_url = $1
       ORDER BY created_at DESC LIMIT 1;`,
      [rawUrl]
    );

    if (cacheResult.rows.length > 0) {
      const row = cacheResult.rows[0];
      const isHighRisk = row.verdict === "MALICIOUS" || (row.risk_score || 0) >= 60;
      return res.status(200).json({
        success: true,
        verdict: row.verdict || "SAFE",
        risk_score: row.risk_score || 0,
        recommended_action: row.recommended_action || "ALLOW",
        bypass: !isHighRisk,
        analysis_id: row.id,
        rbi_url: rbiUrl,
        cached: true,
        execution_time_ms: Date.now() - startTime
      });
    }

    // 3. Check Domain Threat History in Database
    const domainThreatResult = await pool.query(
      `SELECT id, verdict, risk_score, recommended_action
       FROM analyses
       WHERE (submitted_hostname = $1 OR final_hostname = $1 OR submitted_url ILIKE $2)
         AND verdict IN ('MALICIOUS', 'SUSPICIOUS')
       ORDER BY created_at DESC LIMIT 1;`,
      [hostname, `%${hostname}%`]
    );

    if (domainThreatResult.rows.length > 0) {
      const threatRow = domainThreatResult.rows[0];
      return res.status(200).json({
        success: true,
        verdict: threatRow.verdict,
        risk_score: threatRow.risk_score,
        recommended_action: threatRow.recommended_action || "ISOLATE",
        reason: "Domain has known historical threat detections in tenant security database.",
        rbi_url: rbiUrl,
        execution_time_ms: Date.now() - startTime
      });
    }

    // 4. Suspicious TLD Heuristic Check
    const suspiciousTlds = [".top", ".work", ".click", ".buzz", ".fit", ".gq", ".cf", ".ml", ".tk", ".mov", ".zip"];
    const hasSuspiciousTld = suspiciousTlds.some((tld) => hostname.endsWith(tld));
    if (hasSuspiciousTld) {
      return res.status(200).json({
        success: true,
        verdict: "SUSPICIOUS",
        risk_score: 65,
        recommended_action: "ISOLATE",
        reason: "High-abuse top-level domain without established reputation.",
        rbi_url: rbiUrl,
        requires_sandbox: true,
        execution_time_ms: Date.now() - startTime
      });
    }

    // 5. Clean / Trusted Fast-Path Bypass
    return res.status(200).json({
      success: true,
      verdict: "SAFE",
      risk_score: 0,
      bypass: true,
      reason: "Clean domain reputation and safe static heuristics.",
      execution_time_ms: Date.now() - startTime
    });
  } catch (err) {
    console.error("[Fast-Check Error]", err);
    return res.status(200).json({
      success: true,
      verdict: "SAFE",
      risk_score: 0,
      bypass: true,
      error: err.message,
      execution_time_ms: Date.now() - startTime
    });
  }
}

module.exports = {
  verifyExtensionPairing,
  downloadExtensionZip,
  fastCheckUrl
};
