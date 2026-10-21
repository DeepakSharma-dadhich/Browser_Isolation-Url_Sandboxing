"use strict";

const crypto = require("crypto");
const { pool } = require("../config/db");
const { getAnalysisById, getAnalysisIocs, DEFAULT_ORG_ID } = require("./analysisRepository");

/**
 * Generate a STIX 2.1 compliant UUIDv4 identifier.
 * @param {string} type - STIX object type (e.g. 'indicator', 'attack-pattern', 'bundle')
 */
function generateStixId(type) {
  return `${type}--${crypto.randomUUID()}`;
}

/**
 * Escape STIX pattern strings (e.g. escaping single quotes and backslashes).
 */
function escapeStixPattern(val) {
  if (!val) return "";
  return String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Convert BrowseGuard analysis findings & IOCs into an OASIS STIX 2.1 standard bundle.
 * @param {string} sessionId - The session or analysis ID
 */
async function buildStixBundleForAnalysis(sessionId) {
  const analysis = await getAnalysisById(sessionId);
  if (!analysis) {
    throw new Error(`Analysis record '${sessionId}' not found.`);
  }

  const iocs = await getAnalysisIocs(sessionId);
  const now = new Date().toISOString();
  const createdTime = analysis.created_at ? new Date(analysis.created_at).toISOString() : now;

  const objects = [];

  // 1. STIX 2.1 Identity: BrowseGuard Platform
  const identityId = generateStixId("identity");
  objects.push({
    type: "identity",
    spec_version: "2.1",
    id: identityId,
    created: createdTime,
    modified: createdTime,
    name: "BrowseGuard Enterprise Sandbox & RBI",
    description: "Automated dynamic browser isolation and behavioral sandbox analysis engine.",
    identity_class: "system",
    sectors: ["technology", "defense"]
  });

  // 2. STIX 2.1 Attack-Pattern objects from MITRE ATT&CK techniques
  const attackPatternIds = [];
  const mitreList = Array.isArray(iocs?.mitre_attack_matrix) ? iocs.mitre_attack_matrix : [];
  for (const tech of mitreList) {
    const apId = generateStixId("attack-pattern");
    attackPatternIds.push(apId);

    const externalReferences = [];
    if (tech.id) {
      const cleanId = tech.id.replace(/\./g, "/");
      externalReferences.push({
        source_name: "mitre-attack",
        external_id: tech.id,
        url: `https://attack.mitre.org/techniques/${cleanId}/`
      });
    }

    objects.push({
      type: "attack-pattern",
      spec_version: "2.1",
      id: apId,
      created: createdTime,
      modified: createdTime,
      name: tech.name || tech.id,
      description: `Triggered by BrowseGuard detection rule: ${tech.rule_id || "heuristics"}`,
      external_references: externalReferences
    });
  }

  const indicatorIds = [];

  // 3. STIX 2.1 URL Indicators
  const urlsList = (iocs?.indicators?.urls && iocs.indicators.urls.length > 0)
    ? iocs.indicators.urls
    : [analysis.submitted_url, analysis.final_url].filter(Boolean);

  for (const url of urlsList) {
    if (!url || typeof url !== "string") continue;
    const indId = generateStixId("indicator");
    indicatorIds.push(indId);

    objects.push({
      type: "indicator",
      spec_version: "2.1",
      id: indId,
      created: createdTime,
      modified: createdTime,
      name: `Malicious / Suspicious URL: ${url.slice(0, 80)}`,
      description: `Identified by BrowseGuard analysis of target '${analysis.submitted_url}' with risk score ${analysis.risk_score || 0}/100.`,
      indicator_types: ["malicious-activity", "phishing"],
      pattern: `[url:value = '${escapeStixPattern(url)}']`,
      pattern_type: "stix",
      pattern_version: "2.1",
      valid_from: createdTime,
      confidence: Math.min(100, Math.max(10, analysis.risk_score || 50)),
      created_by_ref: identityId
    });
  }

  // 4. STIX 2.1 Domain-Name Indicators
  const domainsList = (iocs?.indicators?.domains && iocs.indicators.domains.length > 0)
    ? iocs.indicators.domains
    : [analysis.submitted_hostname, analysis.final_hostname].filter(Boolean);

  for (const domain of domainsList) {
    if (!domain) continue;
    const indId = generateStixId("indicator");
    indicatorIds.push(indId);

    objects.push({
      type: "indicator",
      spec_version: "2.1",
      id: indId,
      created: createdTime,
      modified: createdTime,
      name: `Observed Threat Hostname: ${domain}`,
      description: `Target or redirect hop identified during dynamic browser execution.`,
      indicator_types: ["malicious-activity"],
      pattern: `[domain-name:value = '${escapeStixPattern(domain)}']`,
      pattern_type: "stix",
      pattern_version: "2.1",
      valid_from: createdTime,
      confidence: Math.min(100, Math.max(10, analysis.risk_score || 50)),
      created_by_ref: identityId
    });
  }

  // 5. STIX 2.1 IPv4 Indicators
  const ipsList = (iocs?.indicators?.ipv4_addresses && iocs.indicators.ipv4_addresses.length > 0)
    ? iocs.indicators.ipv4_addresses
    : (analysis.server_ip ? [analysis.server_ip] : []);

  for (const ip of ipsList) {
    if (!ip || !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) continue;
    const indId = generateStixId("indicator");
    indicatorIds.push(indId);

    objects.push({
      type: "indicator",
      spec_version: "2.1",
      id: indId,
      created: createdTime,
      modified: createdTime,
      name: `Hosting Infrastructure IP: ${ip}`,
      description: `Server IP address observed resolving threat hostname during sandboxed session.`,
      indicator_types: ["malicious-activity"],
      pattern: `[ipv4-addr:value = '${escapeStixPattern(ip)}']`,
      pattern_type: "stix",
      pattern_version: "2.1",
      valid_from: createdTime,
      confidence: Math.min(100, Math.max(10, analysis.risk_score || 50)),
      created_by_ref: identityId
    });
  }

  // 6. STIX 2.1 File Artifact Hashes (SHA-256)
  const hashesList = Array.isArray(iocs?.indicators?.hashes) ? iocs.indicators.hashes : [];
  for (const art of hashesList) {
    if (!art.sha256) continue;
    const indId = generateStixId("indicator");
    indicatorIds.push(indId);

    objects.push({
      type: "indicator",
      spec_version: "2.1",
      id: indId,
      created: createdTime,
      modified: createdTime,
      name: `Artifact Payload Hash: ${art.file || "downloaded_file"}`,
      description: `File artifact captured during detonation (${art.type || "binary"}).`,
      indicator_types: ["malicious-activity"],
      pattern: `[file:hashes.'SHA-256' = '${escapeStixPattern(art.sha256)}']`,
      pattern_type: "stix",
      pattern_version: "2.1",
      valid_from: createdTime,
      confidence: 90,
      created_by_ref: identityId
    });
  }

  // 7. STIX 2.1 Relationships (Indicators -> Attack-Patterns)
  for (const indId of indicatorIds.slice(0, 5)) {
    for (const apId of attackPatternIds) {
      objects.push({
        type: "relationship",
        spec_version: "2.1",
        id: generateStixId("relationship"),
        created: createdTime,
        modified: createdTime,
        relationship_type: "indicates",
        source_ref: indId,
        target_ref: apId,
        created_by_ref: identityId
      });
    }
  }

  // Final STIX 2.1 Bundle Object
  const bundle = {
    type: "bundle",
    id: generateStixId("bundle"),
    spec_version: "2.1",
    objects
  };

  return bundle;
}

/**
 * Generate an aggregated STIX 2.1 Threat Intel Feed for SIEM ingestion (e.g. Splunk, Sentinel, Cortex).
 * @param {string} orgId - Organization UUID
 * @param {number} limit - Maximum number of analyses to aggregate (default: 50)
 */
async function buildAggregatedStixThreatFeed(orgId = DEFAULT_ORG_ID, limit = 50) {
  const query = `
    SELECT id, submitted_url, final_url, verdict, risk_score, created_at
    FROM analyses
    WHERE organization_id = $1 AND verdict IN ('MALICIOUS', 'SUSPICIOUS')
    ORDER BY created_at DESC
    LIMIT $2;
  `;
  const result = await pool.query(query, [orgId, limit]);

  const allObjects = [];
  const now = new Date().toISOString();

  // Root Identity
  const identityId = generateStixId("identity");
  allObjects.push({
    type: "identity",
    spec_version: "2.1",
    id: identityId,
    created: now,
    modified: now,
    name: "BrowseGuard Organization Threat Feed",
    description: "Aggregated real-time threat intelligence from BrowseGuard sandbox and email security gateways.",
    identity_class: "system"
  });

  for (const row of result.rows) {
    try {
      const subBundle = await buildStixBundleForAnalysis(row.id);
      // Append non-identity objects
      for (const obj of subBundle.objects) {
        if (obj.type !== "identity") {
          obj.created_by_ref = identityId;
          allObjects.push(obj);
        }
      }
    } catch {
      // Continue to next analysis
    }
  }

  return {
    type: "bundle",
    id: generateStixId("bundle"),
    spec_version: "2.1",
    objects: allObjects
  };
}

module.exports = {
  buildStixBundleForAnalysis,
  buildAggregatedStixThreatFeed,
  generateStixId,
  escapeStixPattern
};
