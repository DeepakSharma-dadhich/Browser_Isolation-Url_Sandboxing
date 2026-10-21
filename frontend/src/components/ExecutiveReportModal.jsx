import React, { useState, useEffect, useMemo } from "react";

// Defang a URL for safe incident reports (e.g. https://bad.com -> hxxps://bad[.]com)
function defangUrl(url) {
  if (!url || typeof url !== "string") return "";
  return url
    .replace(/^http:/i, "hxxp:")
    .replace(/^https:/i, "hxxps:")
    .replace(/\./g, "[.]");
}

function defangDomain(domain) {
  if (!domain || typeof domain !== "string") return "";
  return domain.replace(/\./g, "[.]");
}

export default function ExecutiveReportModal({
  isOpen,
  onClose,
  analysisId,
  reportData = null,
  iocsData = null,
  currentUser = null
}) {
  const [activeTlp, setActiveTlp] = useState("TLP:AMBER+STRICT");
  const [internalReport, setInternalReport] = useState(reportData);
  const [internalIocs, setInternalIocs] = useState(iocsData);
  const [loading, setLoading] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedIocs, setCopiedIocs] = useState(false);

  // SIEM Dispatch State
  const [showSiemDrawer, setShowSiemDrawer] = useState(false);
  const [siemTargetUrl, setSiemTargetUrl] = useState("");
  const [siemNotes, setSiemNotes] = useState("");
  const [isDispatchingSiem, setIsDispatchingSiem] = useState(false);
  const [siemDispatchResult, setSiemDispatchResult] = useState(null);
  const [siemDispatchError, setSiemDispatchError] = useState("");
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);

  // Containment Checklist State
  const [checklist, setChecklist] = useState({
    blockPerimeter: true,
    quarantineMail: true,
    revokeTokens: false,
    ingestSiem: true,
    threatHuntEdr: false
  });

  // Fetch report and IOCs if not passed in props (e.g. opened from history table)
  useEffect(() => {
    if (!analysisId || !isOpen) return;

    let isMounted = true;
    const fetchFullReport = async () => {
      if (reportData && iocsData) {
        setInternalReport(reportData);
        setInternalIocs(iocsData);
        return;
      }

      setLoading(true);
      try {
        const [repRes, iocRes] = await Promise.all([
          fetch(`/api/v1/analyses/${encodeURIComponent(analysisId)}`),
          fetch(`/api/v1/analyses/${encodeURIComponent(analysisId)}/iocs`)
        ]);

        if (isMounted) {
          if (repRes.ok) {
            const payload = await repRes.json();
            setInternalReport(payload.data || payload);
          }
          if (iocRes.ok) {
            const payload = await iocRes.json();
            setInternalIocs(payload.data || payload);
          }
        }
      } catch (err) {
        console.error("Failed to load executive report details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullReport();
    return () => {
      isMounted = false;
    };
  }, [analysisId, isOpen, reportData, iocsData]);

  // Load configured SIEM & Webhook Integrations
  useEffect(() => {
    if (!isOpen) return;
    const fetchIntegrations = async () => {
      try {
        const token = localStorage.getItem("bg_jwt_token");
        const res = await fetch("/api/v1/integrations", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const payload = await res.json();
          const items = payload.data || [];
          const whs = items.filter((i) => ["webhook", "slack"].includes(i.provider) && i.is_enabled);
          setAvailableIntegrations(whs);
          if (whs.length > 0) {
            setSiemTargetUrl(whs[0].endpoint_url || whs[0].api_key || "");
          }
        }
      } catch {}
    };
    fetchIntegrations();
  }, [isOpen]);

  // Derived Normalized Incident Data
  const incident = useMemo(() => {
    const rawData = internalReport?.data || internalReport || {};
    const rep = rawData;
    const target = rep.target || {};
    const decision = rep.decision || {};
    const analysisSection = rep.analysis || {};
    const summary = rep.summary || {};
    const network = rep.network || rep.evidence_summary?.network || target.network || {};
    const iocData = internalIocs?.data || internalIocs || {};
    const iocIndicators = iocData.indicators || rep.threat_indicators || {};

    const findings = (rep.findings && rep.findings.length > 0) ? rep.findings
      : (analysisSection.findings && analysisSection.findings.length > 0) ? analysisSection.findings
      : (summary.findings && summary.findings.length > 0) ? summary.findings
      : [];

    const verdict = (rep.verdict || decision.verdict || summary.verdict || iocData.verdict || "UNKNOWN").toUpperCase();
    const score = typeof rep.risk_score === "number" ? rep.risk_score
      : typeof decision.risk_score === "number" ? decision.risk_score
      : typeof summary.risk_score === "number" ? summary.risk_score
      : typeof iocData.risk_score === "number" ? iocData.risk_score : 0;
    const riskLevel = rep.risk_level || decision.risk_level || summary.risk_level || (score >= 70 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW");

    const submittedUrl = rep.submitted_url || target.submitted_url || summary.submitted_url || network.initial_url || iocData.target_url || "N/A";
    const finalUrl = rep.final_url || target.final_url || summary.final_url || network.final_url || iocData.final_url || (submittedUrl !== "N/A" ? submittedUrl : "N/A");
    const pageTitle = rep.page_title || target.page_title || summary.page_title || "Untitled Webpage";
    const domainChanged = Boolean(rep.domain_changed ?? target.domain_changed ?? summary.domain_changed ?? network.domain_changed);
    const durationMs = rep.duration_ms || rep.execution?.duration_ms || summary.duration_ms || 12400;

    // Detect targeted brand if any
    let detectedBrand = null;
    const brandFinding = findings.find((f) => f.category === "BRAND_IMPERSONATION" || f.id?.includes("BRAND"));
    if (brandFinding) {
      detectedBrand = brandFinding.evidence?.brand_name || brandFinding.title?.replace("Brand Impersonation:", "").trim();
    }
    if (!detectedBrand && (submittedUrl.toLowerCase().includes("microsoft") || submittedUrl.toLowerCase().includes("office365"))) {
      detectedBrand = "Microsoft 365";
    }

    // Extract MITRE techniques from findings and IOCs
    const mitreList = [];
    findings.forEach((f) => {
      if (f.mitre_attack_id) {
        mitreList.push({
          id: f.mitre_attack_id,
          name: f.mitre_attack_name || f.title,
          severity: (f.severity || "HIGH").toUpperCase(),
          category: f.category || "ATTACK",
          rule: f.id || f.title
        });
      }
    });

    const iocMitre = iocData.mitre_attack_matrix || iocData.mitre_attack || [];
    if (Array.isArray(iocMitre)) {
      iocMitre.forEach((m) => {
        if (!mitreList.some((x) => x.id === m.id)) {
          mitreList.push({
            id: m.id,
            name: m.name,
            severity: (m.severity || "HIGH").toUpperCase(),
            category: "IOC Matrix",
            rule: m.rule_id || m.id
          });
        }
      });
    }

    // Extract Redirect Chain
    const redirects = network.redirects || rep.redirect_chain || [];

    // Extract IOCs (strictly filter out null/undefined/"N/A")
    const domains = (iocIndicators.domains || []).filter((d) => d && d !== "N/A");
    const ips = (iocIndicators.ips || iocIndicators.ipv4_addresses || []).filter((ip) => ip && ip !== "N/A");
    const rawUrls = iocIndicators.urls || [];
    const urlsSet = new Set(rawUrls.filter((u) => u && u !== "N/A"));
    if (submittedUrl && submittedUrl !== "N/A") urlsSet.add(submittedUrl);
    if (finalUrl && finalUrl !== "N/A") urlsSet.add(finalUrl);
    const urls = Array.from(urlsSet);

    // Check specifically for RFC 3986 Userinfo / '@' injection trick
    const hasUserInfoTrick = (submittedUrl && submittedUrl.includes("@")) || findings.some((f) => f.id === "USERINFO-001" || (f.category === "phishing" && f.title?.toLowerCase().includes("userinfo")));

    // Auto-generate Executive Narrative
    let attackVector = "Generic Suspicious Web Activity";
    if (hasUserInfoTrick) {
      attackVector = "Deceptive URL / Embedded Userinfo '@' Obfuscation";
    } else if (score >= 70) {
      if (detectedBrand) {
        attackVector = `Credential Phishing & Brand Impersonation (${detectedBrand})`;
      } else if (submittedUrl.includes("169.254.169.254") || submittedUrl.includes("127.0.0.1")) {
        attackVector = "Cloud Infrastructure Metadata SSRF Probe";
      } else if (findings.some((f) => f.category === "EVILGINX" || f.category === "REVERSE_PROXY")) {
        attackVector = "Adversary-in-the-Middle (AiTM) Reverse Proxy Phishing";
      } else {
        attackVector = "Malicious Hyperlink / High-Risk Web Threat";
      }
    } else if (score >= 30) {
      attackVector = "Suspicious Redirection & Potential Deceptive Lure";
    } else {
      attackVector = "Benign Web Activity";
    }

    let narrative = "";
    if (hasUserInfoTrick) {
      const destHost = target.submitted_hostname || target.final_hostname || "destination host";
      narrative = `The submitted target '${submittedUrl}' contains embedded userinfo credentials ('@' trick). In internet standards (RFC 3986), web browsers completely ignore whatever is in front of '@' and connect directly to the host '${destHost}'. Threat actors weaponize this in email campaigns to make malicious hyperlinks look like innocent email addresses or trusted company names. Chromium sandbox detonation verified anti-cloaking telemetry and isolated execution, mapping this threat to MITRE ATT&CK T1566.002.`;
    } else if (score >= 50) {
      narrative = `During isolated sandbox detonation, the target URL was executed within an instrumented Chromium sandbox VM with network isolation and anti-cloaking heuristics active. The session initiated ${redirects.length > 0 ? redirects.length + " HTTP redirection hop(s)" : "direct connection"}, resulting in a final landing destination of '${finalUrl}'. Threat analysis identified ${findings.length} security finding(s), confirming the presence of ${attackVector.toLowerCase()}. Indicators of compromise have been extracted and mapped to the MITRE ATT&CK framework for automated SOC blocking.`;
    } else {
      narrative = `The target URL was detonated in an isolated Chromium container. Network inspection confirmed legitimate redirection flow with no malicious payloads, credential harvesting forms, or deceptive brand assets observed. The final verdict is classified as ${verdict}.`;
    }

    return {
      caseId: `BG-IR-${analysisId ? analysisId.toUpperCase().replace(/^SESSION_/, "") : "LIVE"}`,
      analysisId,
      verdict,
      score,
      riskLevel,
      submittedUrl,
      finalUrl,
      pageTitle,
      domainChanged,
      durationMs,
      detectedBrand,
      attackVector,
      narrative,
      findings,
      mitreList,
      redirects,
      domains,
      ips,
      urls,
      hasUserInfoTrick,
      timestamp: rep.created_at || rep.submitted_at || new Date().toISOString()
    };
  }, [internalReport, internalIocs, analysisId]);

  // Color Coding Helper
  const verdictTheme = useMemo(() => {
    switch (incident.verdict) {
      case "MALICIOUS":
      case "HIGH_RISK":
        return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)", text: "CRITICAL THREAT" };
      case "SUSPICIOUS":
        return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)", text: "SUSPICIOUS" };
      case "SAFE":
        return { color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.4)", text: "BENIGN / SAFE" };
      default:
        return { color: "#00acf5", bg: "rgba(0, 172, 245, 0.15)", border: "rgba(0, 172, 245, 0.4)", text: "EVALUATED" };
    }
  }, [incident.verdict]);

  // Generate Formatted Markdown Incident Response Brief
  const generateMarkdownReport = () => {
    const md = [
      `# 🛡️ BROWSEGUARD INCIDENT RESPONSE THREAT BRIEF`,
      `**Case ID:** ${incident.caseId} | **Classification:** ${activeTlp}`,
      `**Date / Time:** ${new Date(incident.timestamp).toUTCString()} | **Analyst:** ${currentUser?.fullName || "Security Administrator"}`,
      `**Overall Verdict:** ${incident.verdict} (${incident.score}/100 Risk Score)`,
      ``,
      `---`,
      ``,
      `## 1. Executive Summary`,
      `- **Primary Attack Vector:** ${incident.attackVector}`,
      `- **Targeted Entity / Brand:** ${incident.detectedBrand || "None Observed"}`,
      `- **Target URL:** \`${defangUrl(incident.submittedUrl)}\``,
      `- **Final Landing URL:** \`${defangUrl(incident.finalUrl)}\``,
      `- **Domain Transition:** ${incident.domainChanged ? "⚠️ DOMAIN CHANGED (Redirection across host boundaries)" : "Same Domain"}`,
      `- **Execution Duration:** ${(incident.durationMs / 1000).toFixed(2)} seconds inside isolated Chromium sandbox`,
      ``,
      `> **Incident Synopsis:**  `,
      `> ${incident.narrative}`,
      ...(incident.hasUserInfoTrick ? [
        ``,
        `> **💡 Plain-English Threat Breakdown:**  `,
        `> This link contains an '@' character in the web address. Under RFC 3986 URL standards, web browsers ignore everything before '@' and silently navigate to the server after '@'. Attackers exploit this in phishing emails so a link looks like a harmless email address or trusted entity while secretly directing the victim to an external server. BrowseGuard blocked this link to protect users against credential harvesting and redirection scams.`
      ] : []),
      ``,
      `---`,
      ``,
      `## 2. MITRE ATT&CK® Matrix Mapping`,
      incident.mitreList.length > 0
        ? incident.mitreList.map((m) => `- **[${m.id}] ${m.name}** (Severity: ${m.severity})`).join("\n")
        : `- *No formal MITRE techniques observed during this execution.*`,
      ``,
      `---`,
      ``,
      `## 3. Indicators of Compromise (IOCs - Defanged)`,
      `### Malicious URLs (${incident.urls.length})`,
      incident.urls.map((u) => `- \`${defangUrl(u)}\``).join("\n"),
      ``,
      `### Associated Domains (${incident.domains.length})`,
      incident.domains.length > 0
        ? incident.domains.map((d) => `- \`${defangDomain(d)}\``).join("\n")
        : `- *None extracted*`,
      ``,
      `### Destination IPs (${incident.ips.length})`,
      incident.ips.length > 0
        ? incident.ips.map((ip) => `- \`${ip}\``).join("\n")
        : `- *Direct resolution bypassed or internal*`,
      ``,
      `---`,
      ``,
      `## 4. Recommended Incident Containment Actions`,
      `- [${checklist.blockPerimeter ? "x" : " "}] Perimeter Firewall & Secure Web Gateway (SWG) block rule applied for domain \`${incident.domains[0] || "destination"}\``,
      `- [${checklist.quarantineMail ? "x" : " "}] Email gateway search-and-quarantine executed across mailboxes`,
      `- [${checklist.revokeTokens ? "x" : " "}] Revoke active cloud authentication refresh tokens for exposed credentials`,
      `- [${checklist.ingestSiem ? "x" : " "}] Ingest defanged IOC bundle into SIEM / SOAR detection rules`,
      `- [${checklist.threatHuntEdr ? "x" : " "}] Execute enterprise EDR threat hunting query across managed endpoints`,
      ``,
      `_Generated automatically by BrowseGuard Enterprise Browser Isolation & URL Sandboxing Engine._`
    ].join("\n");

    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleCopyDefangedIocs = () => {
    const lines = [
      ...incident.urls.map(defangUrl),
      ...incident.domains.map(defangDomain),
      ...incident.ips
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedIocs(true);
    setTimeout(() => setCopiedIocs(false), 2000);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadStix = () => {
    const url = `/api/v1/analyses/${encodeURIComponent(incident.analysisId)}/stix?download=true`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `browseguard_stix_${incident.analysisId}.json`;
    a.click();
  };

  // Dispatch Security Incident Alert to SIEM / SOAR / Webhooks
  const handleDispatchSiem = async () => {
    setIsDispatchingSiem(true);
    setSiemDispatchError("");
    setSiemDispatchResult(null);

    try {
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch(`/api/v1/analyses/${encodeURIComponent(incident.analysisId)}/dispatch-siem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          target_url: siemTargetUrl.trim() || undefined,
          tlp: activeTlp,
          containment_checklist: checklist,
          notes: siemNotes.trim()
        })
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to deliver SIEM incident alert.");
      }

      setSiemDispatchResult(data);
    } catch (err) {
      setSiemDispatchError(err.message);
    } finally {
      setIsDispatchingSiem(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(3, 7, 18, 0.92)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div
        className="executive-ir-printable"
        style={{
          width: "min(1240px, 98vw)",
          maxHeight: "92vh",
          background: "#081022",
          border: "1px solid rgba(0, 172, 245, 0.35)",
          borderRadius: "14px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 40px rgba(0, 172, 245, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Top Control Bar (Hidden during printing) */}
        <div
          className="no-print"
          style={{
            padding: "14px 24px",
            background: "#050b18",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                color: "#fff",
                boxShadow: "0 0 15px rgba(0, 172, 245, 0.4)"
              }}
            >
              📄
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                  Executive Incident Response Threat Brief
                </h3>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(0, 172, 245, 0.15)",
                    color: "#38bdf8",
                    border: "1px solid rgba(0, 172, 245, 0.3)"
                  }}
                >
                  OFFICIAL SOC REPORT
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>
                Case ID: <strong style={{ color: "#f8fafc" }}>{incident.caseId}</strong> • Target: <code style={{ color: "#38bdf8" }}>{incident.submittedUrl}</code>
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* TLP Selector */}
            <select
              value={activeTlp}
              onChange={(e) => setActiveTlp(e.target.value)}
              style={{
                background: "#0c182e",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: activeTlp.includes("RED") ? "#ef4444" : activeTlp.includes("AMBER") ? "#f59e0b" : "#10b981",
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 750,
                cursor: "pointer"
              }}
              title="Information Sharing Classification"
            >
              <option value="TLP:CLEAR">TLP:CLEAR (Public)</option>
              <option value="TLP:GREEN">TLP:GREEN (Community)</option>
              <option value="TLP:AMBER">TLP:AMBER (Organization)</option>
              <option value="TLP:AMBER+STRICT">TLP:AMBER+STRICT (Restricted)</option>
              <option value="TLP:RED">TLP:RED (Named Recipients Only)</option>
            </select>

            {/* Print / Save to PDF */}
            <button
              type="button"
              onClick={handlePrintPdf}
              style={{
                background: "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
                border: "none",
                color: "#fff",
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 750,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 15px rgba(0, 172, 245, 0.35)"
              }}
              title="Print cleanly or save to PDF"
            >
              <span>🖨️</span> Print / Save PDF
            </button>

            {/* Copy Markdown */}
            <button
              type="button"
              onClick={handleCopyMarkdown}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                padding: "7px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              title="Copy formatted Markdown for Jira / ServiceNow / TheHive"
            >
              <span>{copiedMarkdown ? "✓" : "📋"}</span>
              {copiedMarkdown ? "Copied Markdown!" : "Copy Markdown"}
            </button>

            {/* Dispatch to SIEM Button */}
            <button
              type="button"
              onClick={() => setShowSiemDrawer(!showSiemDrawer)}
              style={{
                background: showSiemDrawer
                  ? "rgba(16, 185, 129, 0.25)"
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: showSiemDrawer ? "1px solid #10b981" : "none",
                color: "#fff",
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 750,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)"
              }}
              title="Dispatch real-time Incident Alert to Splunk / Elastic / Sentinel / Slack"
            >
              <span>🔔</span> {showSiemDrawer ? "Hide SIEM Panel" : "Dispatch to SIEM"}
            </button>

            {/* Export STIX 2.1 */}
            <button
              type="button"
              onClick={handleDownloadStix}
              style={{
                background: "rgba(147, 51, 234, 0.15)",
                border: "1px solid rgba(147, 51, 234, 0.4)",
                color: "#c084fc",
                padding: "7px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              title="Download OASIS STIX 2.1 Threat Intel Bundle JSON"
            >
              <span>📦</span> STIX 2.1
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Collapsible SIEM Alert Dispatch Panel */}
        {showSiemDrawer && (
          <div
            className="no-print"
            style={{
              padding: "16px 24px",
              background: "#060d1b",
              borderBottom: "1px solid rgba(16, 185, 129, 0.3)",
              boxShadow: "inset 0 4px 15px rgba(0, 0, 0, 0.4)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <strong style={{ color: "#34d399", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🔔</span> Automated SIEM Incident Alert Dispatcher
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                  Pushes an HMAC-signed security incident webhook with forensic IOCs, TTPs, and containment directives directly to Splunk, Elastic, Microsoft Sentinel, or Slack.
                </p>
              </div>

              {availableIntegrations.length > 0 && (
                <div style={{ display: "flex", gap: "6px" }}>
                  {availableIntegrations.map((i) => (
                    <button
                      key={i.provider}
                      type="button"
                      onClick={() => setSiemTargetUrl(i.endpoint_url || i.api_key)}
                      style={{
                        fontSize: "0.72rem",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#34d399",
                        cursor: "pointer"
                      }}
                    >
                      Use {i.provider.toUpperCase()} Destination
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                  WEBHOOK DESTINATION URL (Splunk HEC / Elastic Alert / Sentinel / Slack)
                </label>
                <input
                  type="text"
                  value={siemTargetUrl}
                  onChange={(e) => setSiemTargetUrl(e.target.value)}
                  placeholder="https://splunk-hec.corp.local/services/collector/raw or webhook URL..."
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    background: "#0c182e",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontFamily: "monospace"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                  ANALYST ACTION NOTES (Embedded in Incident Payload)
                </label>
                <input
                  type="text"
                  value={siemNotes}
                  onChange={(e) => setSiemNotes(e.target.value)}
                  placeholder="e.g. Critical credential phishing verified by Tier 2 SOC. Domain quarantined."
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    background: "#0c182e",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "0.78rem"
                  }}
                />
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleDispatchSiem}
                  disabled={isDispatchingSiem}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: isDispatchingSiem ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)"
                  }}
                >
                  {isDispatchingSiem ? "⏳ Delivering Alert..." : "🚀 Confirm & Dispatch Incident Alert"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    cursor: "pointer"
                  }}
                >
                  {showPayloadPreview ? "Hide JSON" : "Preview Payload"}
                </button>
              </div>

              {/* Status Results */}
              {siemDispatchResult && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.78rem" }}>
                  <span style={{ color: "#34d399", fontWeight: 800 }}>
                    ✓ {siemDispatchResult.message}
                  </span>
                  {siemDispatchResult.dispatches?.[0]?.latency_ms && (
                    <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                      ⏱️ {siemDispatchResult.dispatches[0].latency_ms}ms
                    </span>
                  )}
                  {siemDispatchResult.dispatches?.[0]?.signature && (
                    <span
                      style={{
                        color: "#a7f3d0",
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                        background: "rgba(16, 185, 129, 0.15)",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                      title={siemDispatchResult.dispatches[0].signature}
                    >
                      HMAC: {siemDispatchResult.dispatches[0].signature.slice(0, 16)}...
                    </span>
                  )}
                </div>
              )}

              {siemDispatchError && (
                <span style={{ color: "#f87171", fontSize: "0.78rem", fontWeight: 700 }}>
                  ⚠️ {siemDispatchError}
                </span>
              )}
            </div>

            {/* Payload Preview Viewer */}
            {showPayloadPreview && (
              <pre
                style={{
                  marginTop: "12px",
                  background: "#030712",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  padding: "12px",
                  color: "#a7f3d0",
                  fontFamily: "monospace",
                  fontSize: "0.74rem",
                  maxHeight: "160px",
                  overflowY: "auto",
                  margin: "12px 0 0"
                }}
              >
                {JSON.stringify(
                  {
                    event: "incident.security_alert",
                    timestamp: new Date().toISOString(),
                    tlp: activeTlp,
                    incident: {
                      case_id: incident.caseId,
                      verdict: incident.verdict,
                      risk_score: incident.score,
                      target_url: defangUrl(incident.submittedUrl),
                      attack_vector: incident.attackVector,
                      mitre_attack: incident.mitreList.map((m) => m.id),
                      containment_checklist: checklist
                    }
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        )}


        {/* Scrollable Report Document Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px", background: "#071020" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
              Generating comprehensive forensic brief...
            </div>
          ) : (
            <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Document Header & Classification Banner */}
              <div
                style={{
                  borderBottom: "2px solid rgba(0, 172, 245, 0.3)",
                  paddingBottom: "18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "16px"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
                      BROWSE<span style={{ color: "#00acf5" }}>GUARD</span>
                    </span>
                    <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#cbd5e1", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Cyber Defense & Sandboxing Unit
                    </span>
                  </div>
                  <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
                    Security Incident Response Threat Brief
                  </h1>
                </div>

                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontWeight: 900,
                      fontSize: "0.82rem",
                      letterSpacing: "0.05em",
                      background: activeTlp.includes("RED") ? "rgba(239, 68, 68, 0.2)" : activeTlp.includes("AMBER") ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                      color: activeTlp.includes("RED") ? "#ef4444" : activeTlp.includes("AMBER") ? "#f59e0b" : "#10b981",
                      border: `1px solid ${activeTlp.includes("RED") ? "#ef4444" : activeTlp.includes("AMBER") ? "#f59e0b" : "#10b981"}`
                    }}
                  >
                    {activeTlp}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace" }}>
                    REF: {incident.caseId}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {new Date(incident.timestamp).toUTCString()}
                  </span>
                </div>
              </div>

              {/* SECTION 1: Executive Threat Overview Card */}
              <div
                className="print-avoid-break"
                style={{
                  background: "#0c182e",
                  border: `1px solid ${verdictTheme.border}`,
                  borderRadius: "10px",
                  padding: "20px 24px",
                  boxShadow: `0 0 25px ${verdictTheme.bg}`
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "24px", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 900,
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: verdictTheme.bg,
                          color: verdictTheme.color,
                          border: `1px solid ${verdictTheme.border}`
                        }}
                      >
                        VERDICT: {incident.verdict}
                      </span>
                      {incident.detectedBrand && (
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: "rgba(147, 51, 234, 0.2)",
                            color: "#c084fc",
                            border: "1px solid rgba(147, 51, 234, 0.4)"
                          }}
                        >
                          TARGETED BRAND: {incident.detectedBrand.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h2 style={{ margin: "4px 0 10px", fontSize: "1.25rem", color: "#fff", fontWeight: 800 }}>
                      {incident.attackVector}
                    </h2>

                    <p style={{ margin: 0, fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                      {incident.narrative}
                    </p>

                    {incident.hasUserInfoTrick && (
                      <div
                        style={{
                          marginTop: "14px",
                          padding: "12px 14px",
                          borderRadius: "8px",
                          background: "rgba(245, 158, 11, 0.12)",
                          border: "1px solid rgba(245, 158, 11, 0.35)",
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start"
                        }}
                      >
                        <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>💡</span>
                        <div style={{ fontSize: "0.82rem", color: "#fef3c7", lineHeight: 1.55 }}>
                          <strong style={{ color: "#fbbf24", display: "block", marginBottom: "3px" }}>
                            Why was this link blocked? (Plain-English Threat Breakdown)
                          </strong>
                          This link uses an <code>@</code> trick in the web address. Under internet URL standards (RFC 3986), web browsers completely ignore anything before the <code>@</code> symbol and silently connect to the server after it. Threat actors exploit this in phishing emails so a link looks like a harmless email address or a trusted company, while secretly directing you to a completely different destination. BrowseGuard quarantined this link in sandbox isolation to protect users from deceptive credential harvesting.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Risk Contribution Meter */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "16px",
                      background: "#081022",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px"
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>
                      THREAT RISK SCORE
                    </span>
                    <div style={{ fontSize: "2.6rem", fontWeight: 900, color: verdictTheme.color, lineHeight: 1.1, margin: "6px 0 2px" }}>
                      {incident.score}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>OUT OF 100</span>
                    <span
                      style={{
                        marginTop: "8px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        color: verdictTheme.color,
                        letterSpacing: "0.05em"
                      }}
                    >
                      {verdictTheme.text}
                    </span>
                  </div>
                </div>

                {/* Key Target Metadata Strip */}
                <div
                  style={{
                    marginTop: "18px",
                    paddingTop: "14px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    fontSize: "0.8rem"
                  }}
                >
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Submitted Target:</span>
                    <code style={{ color: "#38bdf8", wordBreak: "break-all" }}>{defangUrl(incident.submittedUrl)}</code>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Final Landing Destination:</span>
                    <code style={{ color: incident.domainChanged ? "#f59e0b" : "#4ade80", wordBreak: "break-all" }}>
                      {defangUrl(incident.finalUrl)}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Domain Boundary:</span>
                    <strong style={{ color: incident.domainChanged ? "#f59e0b" : "#10b981" }}>
                      {incident.domainChanged ? "⚠️ CROSS-DOMAIN REDIRECTION" : "SAME DOMAIN"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8", display: "block" }}>Sandbox Execution Time:</span>
                    <span style={{ color: "#cbd5e1" }}>{(incident.durationMs / 1000).toFixed(2)} seconds</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: MITRE ATT&CK Matrix Alignment */}
              <div className="print-avoid-break">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.1rem" }}>🎯</span>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#fff", fontWeight: 800 }}>
                    MITRE ATT&CK® Enterprise Matrix Mapping
                  </h3>
                </div>

                {incident.mitreList.length > 0 ? (
                  <div style={{ background: "#0c182e", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#060d1b", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                          <th style={{ padding: "10px 14px", color: "#94a3b8" }}>Technique ID</th>
                          <th style={{ padding: "10px 14px", color: "#94a3b8" }}>Technique Name</th>
                          <th style={{ padding: "10px 14px", color: "#94a3b8" }}>Category / Rule</th>
                          <th style={{ padding: "10px 14px", color: "#94a3b8" }}>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incident.mitreList.map((m, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontWeight: 800,
                                  color: "#c084fc",
                                  background: "rgba(147, 51, 234, 0.2)",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(147, 51, 234, 0.4)"
                                }}
                              >
                                {m.id}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#f8fafc" }}>
                              {m.name}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                              {m.rule || m.category}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: m.severity === "CRITICAL" || m.severity === "HIGH" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                  color: m.severity === "CRITICAL" || m.severity === "HIGH" ? "#f87171" : "#fbbf24"
                                }}
                              >
                                {m.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "16px", background: "#0c182e", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", color: "#94a3b8", fontSize: "0.85rem" }}>
                    No specific MITRE ATT&CK techniques triggered during this execution.
                  </div>
                )}
              </div>

              {/* SECTION 3: Visual Sandbox Evidence (Screenshot) */}
              <div className="print-avoid-break">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.1rem" }}>📷</span>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#fff", fontWeight: 800 }}>
                      Sandbox Viewport Execution Snapshot
                    </h3>
                  </div>
                  <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                    Captured inside Isolated Chromium Container (1366x768)
                  </span>
                </div>

                <div
                  style={{
                    background: "#030712",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    textAlign: "center"
                  }}
                >
                  <img
                    src={`/api/analyze/${encodeURIComponent(incident.analysisId)}/screenshot`}
                    alt="Sandbox execution capture"
                    style={{
                      width: "100%",
                      maxHeight: "380px",
                      objectFit: "contain",
                      display: "block",
                      background: "#050b18"
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div
                    style={{
                      padding: "8px 16px",
                      background: "#060d1b",
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.74rem",
                      color: "#94a3b8"
                    }}
                  >
                    <span>PAGE TITLE: <strong>{incident.pageTitle}</strong></span>
                    <span>ANTI-CLOAKING: <strong>BYPASS ACTIVE</strong></span>
                    <span>ARTIFACT ID: <code>{incident.caseId}</code></span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Indicators of Compromise (Defanged IOC Blocklist) */}
              <div className="print-avoid-break">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.1rem" }}>⬡</span>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#fff", fontWeight: 800 }}>
                      Extracted Indicators of Compromise (Defanged IOCs)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyDefangedIocs}
                    className="no-print"
                    style={{
                      background: "rgba(0, 172, 245, 0.15)",
                      border: "1px solid rgba(0, 172, 245, 0.4)",
                      color: "#38bdf8",
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {copiedIocs ? "✓ Copied Defanged IOCs" : "📋 Copy All Defanged IOCs"}
                  </button>
                </div>

                <div
                  style={{
                    background: "#0c182e",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "16px"
                  }}
                >
                  {/* Defanged URLs */}
                  <div>
                    <strong style={{ fontSize: "0.78rem", color: "#38bdf8", display: "block", marginBottom: "6px" }}>
                      🔗 DEFANGED URLS ({incident.urls.length})
                    </strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {incident.urls.map((u, idx) => (
                        <code
                          key={idx}
                          style={{
                            fontSize: "0.74rem",
                            background: "#060d1b",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            color: "#e2e8f0",
                            wordBreak: "break-all"
                          }}
                        >
                          {defangUrl(u)}
                        </code>
                      ))}
                    </div>
                  </div>

                  {/* Defanged Domains */}
                  <div>
                    <strong style={{ fontSize: "0.78rem", color: "#a855f7", display: "block", marginBottom: "6px" }}>
                      🌐 MALICIOUS DOMAINS ({incident.domains.length})
                    </strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {incident.domains.length > 0 ? (
                        incident.domains.map((d, idx) => (
                          <code
                            key={idx}
                            style={{
                              fontSize: "0.74rem",
                              background: "#060d1b",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              color: "#e2e8f0"
                            }}
                          >
                            {defangDomain(d)}
                          </code>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.74rem", color: "#64748b" }}>None extracted</span>
                      )}
                    </div>
                  </div>

                  {/* Destination IPs */}
                  <div>
                    <strong style={{ fontSize: "0.78rem", color: "#10b981", display: "block", marginBottom: "6px" }}>
                      🖥️ DESTINATION HOST IPS ({incident.ips.length})
                    </strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {incident.ips.length > 0 ? (
                        incident.ips.map((ip, idx) => (
                          <code
                            key={idx}
                            style={{
                              fontSize: "0.74rem",
                              background: "#060d1b",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              color: "#e2e8f0"
                            }}
                          >
                            {ip}
                          </code>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.74rem", color: "#64748b" }}>Direct host IP withheld or loopback</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: SOC Incident Response & Containment Checklist */}
              <div
                className="print-avoid-break"
                style={{
                  background: "#060d1b",
                  border: "1px solid rgba(0, 172, 245, 0.25)",
                  borderRadius: "10px",
                  padding: "20px 24px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "1.1rem" }}>🛡️</span>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#fff", fontWeight: 800 }}>
                    SOC Incident Containment & Remediation Checklist
                  </h3>
                </div>
                <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "#94a3b8" }}>
                  Standard operating procedure checklist for SOC Tier 2/3 and Incident Responders. Check off completed containment actions:
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    {
                      id: "blockPerimeter",
                      title: "Block Domain & Host IP at Perimeter Firewall / Secure Web Gateway (SWG)",
                      desc: "Prevents internal enterprise endpoints from establishing outbound connections to the malicious infrastructure."
                    },
                    {
                      id: "quarantineMail",
                      title: "Execute Microsoft 365 / Google Workspace Mailbox Search & Quarantine",
                      desc: "Purge incoming phishing messages from employee inboxes across the entire tenant using Graph API / PowerShell."
                    },
                    {
                      id: "revokeTokens",
                      title: "Revoke Active OAuth Refresh Tokens & Force Password Reset",
                      desc: "Invalidate tokens for any employee identity that may have submitted credentials on this deceptive form."
                    },
                    {
                      id: "ingestSiem",
                      title: "Push Defanged IOC Bundle to SIEM (Splunk, Elastic, Sentinel) & SOAR Playbooks",
                      desc: "Enable real-time detection rules and auto-tag incidents associated with this threat campaign."
                    },
                    {
                      id: "threatHuntEdr",
                      title: "Initiate Enterprise EDR Fleet Sweep for Lateral Movement",
                      desc: "Execute Falcon / Defender / SentinelOne queries for host DNS resolution or browser process execution."
                    }
                  ].map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "10px 14px",
                        background: checklist[item.id] ? "rgba(0, 172, 245, 0.08)" : "rgba(255, 255, 255, 0.02)",
                        border: checklist[item.id] ? "1px solid rgba(0, 172, 245, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checklist[item.id]}
                        onChange={(e) =>
                          setChecklist((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        style={{ marginTop: "3px", cursor: "pointer" }}
                      />
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: checklist[item.id] ? "#38bdf8" : "#cbd5e1" }}>
                          {item.title}
                        </strong>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                          {item.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                    Selected actions will be synchronized with enterprise SIEM & SOAR playbooks.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSiemDrawer(true);
                      handleDispatchSiem();
                    }}
                    disabled={isDispatchingSiem}
                    className="no-print"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      color: "#fff",
                      padding: "7px 16px",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)"
                    }}
                  >
                    <span>⚡</span> Push Containment Directives to SIEM
                  </button>
                </div>
              </div>

              {/* Document Sign-Off Footer */}
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.75rem",
                  color: "#64748b"
                }}
              >
                <div>
                  Certified by: <strong style={{ color: "#94a3b8" }}>{currentUser?.fullName || "Security Administrator"}</strong> ({currentUser?.role || "ADMIN"})
                </div>
                <div>
                  BrowseGuard Enterprise Forensic Sandbox Engine • Version 2.1
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
