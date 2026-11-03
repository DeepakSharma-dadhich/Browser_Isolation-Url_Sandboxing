import React, { useState } from "react";

export default function RedirectTimeline({ analysisId, reportData, onLaunchRbi }) {
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [showSubresources, setShowSubresources] = useState(false);
  const [subresourceFilter, setSubresourceFilter] = useState("all");

  if (!reportData) return null;

  const browserBehaviour = reportData?.browser_behaviour || reportData?.evidence_summary || {};
  const httpRedirects = browserBehaviour?.http_redirects?.events || [];
  const clientRedirects = browserBehaviour?.client_redirects?.events || [];
  const subresourceRedirects =
    browserBehaviour?.http_redirects?.subresource_events ||
    reportData?.evidence?.redirects?.subresource_redirects ||
    [];
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

  const getResourceTypeBadge = (type) => {
    const t = (type || "").toLowerCase();
    switch (t) {
      case "stylesheet":
      case "css":
        return { bg: "rgba(56, 189, 248, 0.15)", text: "#38bdf8", border: "rgba(56, 189, 248, 0.4)" };
      case "script":
      case "js":
        return { bg: "rgba(250, 204, 21, 0.15)", text: "#facc15", border: "rgba(250, 204, 21, 0.4)" };
      case "image":
      case "img":
        return { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.4)" };
      case "font":
        return { bg: "rgba(244, 114, 182, 0.15)", text: "#f472b6", border: "rgba(244, 114, 182, 0.4)" };
      default:
        return { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.4)" };
    }
  };

  const filteredSubresources = subresourceFilter === "all"
    ? subresourceRedirects
    : subresourceRedirects.filter((s) => (s.resource_type || "other").toLowerCase() === subresourceFilter);

  return (
    <article className="panel redirect-timeline-panel" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <div>
          <p className="section-label" style={{ margin: 0, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.08em", color: "var(--brand-sky)", fontWeight: 750 }}>
            Network Stream & Redirect Flowchart
          </p>
          <h3 style={{ margin: "4px 0 0 0", fontSize: "1.2rem", color: "var(--text-primary)", fontWeight: 800 }}>
            Visual Redirect Hop Timeline ({hops.length} Navigation {hops.length === 1 ? "Hop" : "Hops"}
            {subresourceRedirects.length > 0 ? ` + ${subresourceRedirects.length} Asset Redirects` : ""})
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
                  border: "1px solid var(--border-subtle)",
                  color: "var(--brand-sky)",
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
                  border: "1px solid var(--border-subtle)",
                  color: "var(--brand-purple)",
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
            <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
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
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
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
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 750, textTransform: "uppercase" }}>
                Target Submitted for Analysis
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(initialUrl)}
                style={{
                  background: "none",
                  border: "none",
                  color: copiedUrl === initialUrl ? "#4ade80" : "var(--text-muted)",
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
                color: "var(--brand-blue)",
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
                <div style={{ width: "2px", height: "16px", background: "var(--brand-blue)" }} />
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--brand-sky)",
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
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
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
                      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>{hop.type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(hop.to)}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedUrl === hop.to ? "#4ade80" : "var(--text-muted)",
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
                      color: "var(--brand-blue)",
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

      {/* Sub-Resource & Static Asset Redirects Section */}
      {subresourceRedirects.length > 0 && (
        <div
          style={{
            marginTop: "24px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "16px 20px"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>📦</span>
                <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "0.98rem", fontWeight: 700 }}>
                  Sub-Resource & Asset HTTP Redirects ({subresourceRedirects.length})
                </h4>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--brand-emerald)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700
                  }}
                >
                  Benign Static Media
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.8rem", lineHeight: "1.4" }}>
                The web server issued HTTP 301 redirects for {subresourceRedirects.length} background assets (CSS stylesheets, images, scripts, fonts) to enforce canonical domain / CDN paths. These are internal asset fetches, not user-facing page navigation hops.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSubresources((prev) => !prev)}
              className="preset-pill"
              style={{
                background: showSubresources ? "rgba(56, 189, 248, 0.2)" : "var(--bg-panel-header)",
                border: "1px solid var(--border-subtle)",
                color: "var(--brand-sky)",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {showSubresources ? `Hide Asset Details ▲` : `Inspect All ${subresourceRedirects.length} Assets ▼`}
            </button>
          </div>

          {showSubresources && (
            <div style={{ marginTop: "14px", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
              {/* Filter pills */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                {["all", "stylesheet", "image", "script", "font", "other"].map((fType) => {
                  const count = fType === "all"
                    ? subresourceRedirects.length
                    : subresourceRedirects.filter((s) => (s.resource_type || "other").toLowerCase() === fType).length;
                  if (fType !== "all" && count === 0) return null;
                  return (
                    <button
                      key={fType}
                      type="button"
                      onClick={() => setSubresourceFilter(fType)}
                      style={{
                        background: subresourceFilter === fType ? "rgba(0, 172, 245, 0.2)" : "var(--bg-panel)",
                        border: `1px solid ${subresourceFilter === fType ? "var(--brand-blue)" : "var(--border-subtle)"}`,
                        color: subresourceFilter === fType ? "var(--brand-sky)" : "var(--text-secondary)",
                        padding: "3px 10px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize"
                      }}
                    >
                      {fType} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Asset list */}
              <div
                style={{
                  maxHeight: "340px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  paddingRight: "4px"
                }}
              >
                {filteredSubresources.map((item, sIdx) => {
                  const badge = getResourceTypeBadge(item.resource_type);
                  return (
                    <div
                      key={sIdx}
                      style={{
                        background: "var(--bg-panel-header)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            flexShrink: 0
                          }}
                        >
                          {item.resource_type || "asset"}
                        </span>
                        <span
                          style={{
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#60a5fa",
                            border: "1px solid rgba(59, 130, 246, 0.4)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          HTTP {item.status_code || 301}
                        </span>
                        <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: "var(--text-secondary)", fontFamily: "ui-monospace, monospace" }}>
                            {item.source_url}
                          </span>
                          <span style={{ color: "var(--brand-sky)", margin: "0 6px" }}>➔</span>
                          <span style={{ color: "var(--text-primary)", fontFamily: "ui-monospace, monospace" }}>
                            {item.target_url}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.target_url)}
                        style={{
                          background: "none",
                          border: "none",
                          color: copiedUrl === item.target_url ? "#4ade80" : "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        {copiedUrl === item.target_url ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
