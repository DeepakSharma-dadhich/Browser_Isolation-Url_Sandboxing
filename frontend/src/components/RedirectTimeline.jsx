import React, { useState } from "react";

export default function RedirectTimeline({ analysisId, reportData, onLaunchRbi }) {
  const [copiedUrl, setCopiedUrl] = useState(null);

  if (!reportData) return null;

  const browserBehaviour = reportData?.browser_behaviour || reportData?.evidence_summary || {};
  const httpRedirects = browserBehaviour?.http_redirects?.events || [];
  const clientRedirects = browserBehaviour?.client_redirects?.events || [];
  const autoInteraction = reportData?.evidence?.auto_interaction || browserBehaviour?.auto_interaction || reportData?.auto_interaction;

  // Build unified hops array
  const hops = [];

  // Initial requested target
  const initialUrl =
    reportData?.target?.submitted_url ||
    reportData?.submitted_url ||
    reportData?.execution?.requested_url ||
    (httpRedirects.length > 0 ? httpRedirects[0].source_url || httpRedirects[0].from : "Initial URL");

  // Push HTTP hops
  httpRedirects.forEach((ev, idx) => {
    hops.push({
      step: idx + 1,
      type: ev.type || ev.redirect_type || "HTTP Redirect",
      from: ev.source_url || ev.from || "",
      to: ev.target_url || ev.to || "",
      statusCode: ev.status_code || 302,
      durationMs: ev.duration_ms || null,
      isClient: false
    });
  });

  // Push Client-side hops if any
  clientRedirects.forEach((cev, idx) => {
    hops.push({
      step: hops.length + 1,
      type: cev.redirect_type || cev.type || "Client-Side Redirect",
      from: cev.from_url || cev.source_url || cev.from || "",
      to: cev.to_url || cev.target_url || cev.to || "",
      statusCode: "DOM / JS",
      durationMs: null,
      isClient: true
    });
  });

  const finalUrl =
    reportData?.target?.final_url ||
    reportData?.final_url ||
    (hops.length > 0 ? hops[hops.length - 1].to : initialUrl);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getStatusBadgeStyle = (status) => {
    if (status === 200 || status === "200") {
      return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.4)" };
    }
    if (status >= 300 && status < 400) {
      return { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.4)" };
    }
    if (status >= 400) {
      return { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.4)" };
    }
    return { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.4)" };
  };

  return (
    <article className="panel redirect-timeline-panel" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <div>
          <p className="section-label" style={{ margin: 0, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.08em", color: "#00e5ff", fontWeight: 750 }}>
            Network Stream & Redirect Flowchart
          </p>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "1.2rem", color: "#f8fafc", fontWeight: 800 }}>
            Visual Redirect Hop Timeline ({hops.length} {hops.length === 1 ? "Hop" : "Hops"})
          </h3>
        </div>

        {/* Forensic Artifact Export Actions */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {analysisId && (
            <>
              <a
                href={`/api/analyze/${encodeURIComponent(analysisId)}/har`}
                download={`browseguard_${analysisId}.har`}
                className="preset-pill"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(0, 229, 255, 0.12)",
                  border: "1px solid rgba(0, 229, 255, 0.35)",
                  color: "#00e5ff",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  textDecoration: "none",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                title="Download standard HTTP Archive (.har) recording all network requests, responses and timing"
              >
                📥 Download HAR Log
              </a>

              <a
                href={`/api/analyze/${encodeURIComponent(analysisId)}/dom`}
                target="_blank"
                rel="noopener noreferrer"
                className="preset-pill"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(176, 38, 255, 0.12)",
                  border: "1px solid rgba(176, 38, 255, 0.35)",
                  color: "#c084fc",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  textDecoration: "none",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                title="View rendered post-execution DOM HTML snapshot in a new tab"
              >
                📄 Rendered DOM HTML ↗
              </a>
            </>
          )}
        </div>
      </div>

      {/* Anti-Cloaking & Automated Interaction Banner */}
      {autoInteraction?.interacted && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(234, 88, 12, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)",
            border: "1px solid rgba(249, 115, 22, 0.4)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>🛡️</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ color: "#fb923c", fontSize: "0.92rem" }}>
                Anti-Cloaking Engine Triggered: Click-Wall Traversed
              </strong>
              <span
                style={{
                  background: "rgba(234, 88, 12, 0.3)",
                  color: "#fdba74",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 700
                }}
              >
                MITRE T1027
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", color: "#cbd5e1", fontSize: "0.82rem" }}>
              The sandbox detected and clicked a human-verification / lure gate button{" "}
              {autoInteraction.actions?.map((a, i) => (
                <code
                  key={i}
                  style={{
                    color: "#fef08a",
                    background: "rgba(0,0,0,0.3)",
                    padding: "1px 6px",
                    borderRadius: "4px"
                  }}
                >
                  "{a.button_text}"
                </code>
              ))}{" "}
              to uncover the true final landing payload.
            </p>
          </div>
        </div>
      )}

      {/* Timeline Visualization */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Origin Hop */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(71, 85, 105, 0.4)",
            borderRadius: "10px",
            padding: "12px 16px"
          }}
        >
          <div
            style={{
              background: "#0284c7",
              color: "#fff",
              borderRadius: "50%",
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            0
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 750, textTransform: "uppercase" }}>
                Target Submitted for Analysis
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(initialUrl)}
                style={{
                  background: "none",
                  border: "none",
                  color: copiedUrl === initialUrl ? "#4ade80" : "#64748b",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600
                }}
              >
                {copiedUrl === initialUrl ? "✓ Copied" : "Copy URL"}
              </button>
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "0.85rem",
                color: "#38bdf8",
                wordBreak: "break-all",
                marginTop: "4px",
                fontWeight: 600
              }}
            >
              {initialUrl}
            </div>
          </div>
        </div>

        {/* Intermediate Hops */}
        {hops.map((hop) => {
          const badge = getStatusBadgeStyle(hop.statusCode);
          return (
            <div key={hop.step} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* Hop Connector Line */}
              <div style={{ display: "flex", alignItems: "center", paddingLeft: "12px", gap: "8px" }}>
                <div style={{ width: "2px", height: "16px", background: "#0284c7" }} />
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#38bdf8",
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    background: "rgba(2, 132, 199, 0.15)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    fontWeight: 700
                  }}
                >
                  ↓ {hop.type} ({hop.statusCode})
                </span>
              </div>

              {/* Hop Card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(71, 85, 105, 0.4)",
                  borderRadius: "10px",
                  padding: "12px 16px"
                }}
              >
                <div
                  style={{
                    background: "#0284c7",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "26px",
                    height: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  {hop.step}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700
                        }}
                      >
                        HTTP {hop.statusCode}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>{hop.type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(hop.to)}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedUrl === hop.to ? "#4ade80" : "#64748b",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600
                      }}
                    >
                      {copiedUrl === hop.to ? "✓ Copied" : "Copy URL"}
                    </button>
                  </div>
                  <div
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      fontSize: "0.85rem",
                      color: "#38bdf8",
                      wordBreak: "break-all",
                      marginTop: "6px",
                      fontWeight: 600
                    }}
                  >
                    {hop.to}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Final Landing Hop Indicator if multiple */}
        {hops.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", paddingLeft: "12px", gap: "8px" }}>
            <div style={{ width: "2px", height: "14px", background: "rgba(16, 185, 129, 0.4)" }} />
            <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>
              🎯 Final Landing Destination Reached
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
