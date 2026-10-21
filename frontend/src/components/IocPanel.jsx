import React, { useState } from "react";

/**
 * ANY.RUN-inspired Indicators of Compromise (IOC) & MITRE ATT&CK Matrix Panel.
 * Provides SOC analysts with 1-click exportable threat intelligence.
 */
export default function IocPanel({ analysisId, iocsData }) {
  const [copied, setCopied] = useState(false);

  if (!iocsData) return null;

  const indicators = iocsData.indicators || {};
  const mitreList = iocsData.mitre_attack_matrix || [];
  const domains = indicators.domains || [];
  const urls = indicators.urls || [];
  const ips = indicators.ipv4_addresses || [];

  const [copiedStix, setCopiedStix] = useState(false);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(iocsData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `IOCs_${analysisId || "scan"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadStix = () => {
    window.open(`/api/v1/analyses/${analysisId}/stix?download=true`, "_blank");
  };

  const handleCopyStix = async () => {
    try {
      const resp = await fetch(`/api/v1/analyses/${analysisId}/stix`);
      if (resp.ok) {
        const bundle = await resp.json();
        navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
        setCopiedStix(true);
        setTimeout(() => setCopiedStix(false), 2000);
      }
    } catch {}
  };

  const handleCopyBlocklist = () => {
    const lines = [...domains, ...ips].filter(Boolean);
    if (lines.length === 0 && iocsData.target_url) {
      try {
        lines.push(new URL(iocsData.target_url).hostname);
      } catch {}
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="panel" style={{ marginTop: "16px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <p className="section-label" style={{ color: "#38bdf8", marginBottom: "4px" }}>Threat Intelligence & TTPs (ANY.RUN Standard)</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Indicators of Compromise (IOCs) & MITRE ATT&CK</h2>
            <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "999px", background: "rgba(168, 85, 247, 0.2)", color: "#d8b4fe", border: "1px solid rgba(168, 85, 247, 0.4)", fontWeight: 700 }}>
              STIX 2.1 Ready
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="preset-pill"
            onClick={handleCopyBlocklist}
            style={{ background: copied ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.9)", color: copied ? "#34d399" : "#e2e8f0" }}
          >
            {copied ? "✓ Blocklist Copied" : "📋 Copy Blocklist"}
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={handleCopyStix}
            style={{ background: copiedStix ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.9)", color: copiedStix ? "#34d399" : "#cbd5e1" }}
          >
            {copiedStix ? "✓ STIX 2.1 Copied" : "📋 Copy STIX JSON"}
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={handleDownloadStix}
            style={{ background: "#7c3aed", color: "#fff", border: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
            title="Download OASIS STIX 2.1 Cyber Threat Intelligence bundle"
          >
            <span>📦</span> Export STIX 2.1 (.json)
          </button>
          <button
            type="button"
            className="preset-pill"
            onClick={handleExportJson}
            style={{ background: "#2563eb", color: "#fff", border: "none", fontWeight: 700 }}
          >
            📥 Export IOCs (JSON)
          </button>
        </div>
      </div>

      {/* MITRE ATT&CK Techniques Grid */}
      {mitreList.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: "8px" }}>
            OBSERVED MITRE ATT&CK TECHNIQUES ({mitreList.length})
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {mitreList.map((m, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: "0.8rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(147, 51, 234, 0.2)",
                  color: "#d8b4fe",
                  border: "1px solid rgba(147, 51, 234, 0.5)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <strong>🎯 {m.id}</strong> {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Extracted IOC Summary Lists */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "12px" }}>
        {/* Domains & Hostnames */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
            🌐 DOMAINS ({domains.length})
          </div>
          {domains.length === 0 ? (
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>None recorded</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.85rem", wordBreak: "break-all" }}>
              {domains.map((d, i) => (
                <li key={i}><code>{d}</code></li>
              ))}
            </ul>
          )}
        </div>

        {/* Target & Redirect URLs */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
            🔗 NETWORK URL CHAIN ({urls.length})
          </div>
          {urls.length === 0 ? (
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>None recorded</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.85rem", wordBreak: "break-all" }}>
              {urls.map((u, i) => (
                <li key={i}><code>{u}</code></li>
              ))}
            </ul>
          )}
        </div>

        {/* IP Addresses */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
            📡 RESOLVED SERVERS / IPS ({ips.length})
          </div>
          {ips.length === 0 ? (
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>None recorded</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.85rem" }}>
              {ips.map((ip, i) => (
                <li key={i}><code>{ip}</code></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
