import React from "react";

export default function PortalLanding({
  onLaunchStudio,
  onOpenEmailGateway,
  onOpenAuthModal,
  onOpenAuthModalForGateway,
  onViewHistory,
  recentScans = [],
  subscriptions = null,
  currentUser = null
}) {
  const sub1 = subscriptions?.url_scanner;
  const is1Active = sub1?.is_active ?? (currentUser?.role === "ADMIN");

  const sub2 = subscriptions?.browser_extension;
  const is2Active = sub2?.is_active ?? (currentUser?.role === "ADMIN");

  const sub3 = subscriptions?.email_gateway_api;
  const is3Active = sub3?.is_active ?? (currentUser?.role === "ADMIN");

  const handleGatewayAction = (gwKey, defaultAction) => {
    const isAct = gwKey === "url_scanner" ? is1Active : gwKey === "browser_extension" ? is2Active : is3Active;
    if (isAct) {
      defaultAction();
    } else {
      if (onOpenAuthModalForGateway) {
        onOpenAuthModalForGateway(gwKey, "profile");
      } else {
        onOpenAuthModal();
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px", paddingBottom: "40px" }}>
      {/* SaaS Hero Section */}
      <section
        className="panel"
        style={{
          padding: "48px 36px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          background: "linear-gradient(180deg, #131f37 0%, #101a30 100%)",
          border: "1px solid rgba(56, 189, 248, 0.22)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="pulse-dot" style={{ background: "#00acf5" }} />
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 800,
              color: "#38bdf8",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}
          >
            BrowseGuard Zero-Trust Threat Isolation Platform
          </span>
        </div>

        <h1
          style={{
            fontSize: "2.6rem",
            fontWeight: 850,
            margin: 0,
            lineHeight: "1.2",
            maxWidth: "920px",
            color: "#f8fafc",
            letterSpacing: "-0.02em"
          }}
        >
          Dynamic Browser Isolation & Threat Sandbox for Web & Email Security
        </h1>

        <p
          style={{
            fontSize: "1.05rem",
            color: "#94a3b8",
            maxWidth: "760px",
            margin: 0,
            lineHeight: "1.6"
          }}
        >
          Execute attacker-controlled web content, credential harvesters, and multi-hop phishing lures
          inside an isolated Chromium sandbox. Protect your enterprise across 3 independent gateways with
          strict compute quota budgeting, automated anti-cloaking, and SIEM threat intelligence.
        </p>

        {/* Hero Action CTAs */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "10px" }}>
          <button
            type="button"
            className="primary-button"
            style={{
              padding: "12px 28px",
              fontSize: "0.95rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
              boxShadow: "0 4px 18px rgba(0, 172, 245, 0.35)",
              border: "none",
              cursor: "pointer"
            }}
            onClick={() => handleGatewayAction("url_scanner", onLaunchStudio)}
          >
            🚀 Launch Sandbox Studio (ANY.RUN)
          </button>
          <button
            type="button"
            className="preset-pill"
            style={{
              padding: "12px 24px",
              fontSize: "0.95rem",
              background: "rgba(19, 31, 55, 0.85)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38bdf8",
              cursor: "pointer"
            }}
            onClick={() => handleGatewayAction("email_gateway_api", onOpenEmailGateway)}
          >
            📧 Email Gateway & API
          </button>
          <button
            type="button"
            className="preset-pill"
            style={{
              padding: "12px 24px",
              fontSize: "0.95rem",
              background: "rgba(19, 31, 55, 0.85)",
              border: "1px solid rgba(34, 197, 94, 0.4)",
              color: "#4ade80",
              cursor: "pointer"
            }}
            onClick={() => handleGatewayAction("browser_extension", onOpenAuthModal)}
          >
            🛡️ Pair Browser Extension
          </button>
        </div>

        {/* Live Architecture Status Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: "16px",
            fontSize: "0.78rem",
            color: "#64748b",
            fontFamily: "ui-monospace, monospace"
          }}
        >
          <span style={{ color: "#22c55e" }}>● Chromium 128 Sandbox: Ready</span>
          <span>•</span>
          <span style={{ color: "#38bdf8" }}>● Anti-Cloaking Engine: Active</span>
          <span>•</span>
          <span style={{ color: "#a855f7" }}>● Per-Gateway Quota: Enforced</span>
          <span>•</span>
          <span style={{ color: "#00acf5" }}>● Zero-Trust Isolation: Enforcing</span>
        </div>
      </section>

      {/* The 3 Gateway Products Grid */}
      <section>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Self-Service Defense Gateways
          </p>
          <h2 style={{ margin: 0, fontSize: "1.7rem", color: "#f8fafc", fontWeight: 800 }}>
            Choose Your Threat Defense Gateway
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "22px" }}>
          {/* PRODUCT 1: INTERACTIVE SANDBOX STUDIO */}
          <div
            className="panel"
            style={{
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "20px",
              borderTop: "3px solid #00acf5",
              background: "#131f37",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "1.8rem" }}>🖥️</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 750,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: is1Active ? "rgba(0, 172, 245, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: is1Active ? "#38bdf8" : "#f87171",
                    border: `1px solid ${is1Active ? "rgba(0, 172, 245, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                    letterSpacing: "0.04em"
                  }}
                >
                  {is1Active ? (currentUser?.role === "ADMIN" ? "GATEWAY 1 • ENTERPRISE" : `TRIAL ACTIVE (${sub1?.quota_remaining ?? 20} SCANS)`) : "GATEWAY 1 • LOCKED"}
                </span>
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem", color: "#f8fafc", fontWeight: 800 }}>
                Interactive Threat Sandbox Studio
              </h3>
              <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "0.85rem", lineHeight: "1.5" }}>
                ANY.RUN-style live URL detonation chamber with real-time browser screencasting, anti-cloaking
                CAPTCHA bypass, and deep forensic drawer.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem", color: "#cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Live Remote Browser Isolation (RBI)
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Multi-hop Visual Redirect Flowchart
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> MITRE ATT&CK Matrix & IOC 1-Click Export
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Downloadable HAR Network Stream & DOM Snapshots
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: is1Active ? "#4ade80" : "#fca5a5", marginBottom: "8px" }}>
                {is1Active ? "● Active compute quota ready for detonation" : "⚠️ Requires 14-day Free Trial or Subscription"}
              </div>
              <button
                type="button"
                className="primary-button"
                style={{
                  width: "100%",
                  padding: "11px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  background: is1Active ? "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)" : "rgba(0, 172, 245, 0.2)",
                  border: is1Active ? "none" : "1px solid #00acf5",
                  color: "#fff",
                  cursor: "pointer"
                }}
                onClick={() => handleGatewayAction("url_scanner", onLaunchStudio)}
              >
                {is1Active ? "Open Sandbox Studio ➔" : "🚀 Start 14-Day Free Trial (20 Scans)"}
              </button>
            </div>
          </div>

          {/* PRODUCT 2: ENDPOINT WEBMAIL SHIELD */}
          <div
            className="panel"
            style={{
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "20px",
              borderTop: "3px solid #22c55e",
              background: "#131f37",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "1.8rem" }}>🛡️</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 750,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: is2Active ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: is2Active ? "#4ade80" : "#f87171",
                    border: `1px solid ${is2Active ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                    letterSpacing: "0.04em"
                  }}
                >
                  {is2Active ? (currentUser?.role === "ADMIN" ? "GATEWAY 2 • ENTERPRISE" : `TRIAL ACTIVE (${sub2?.quota_remaining ?? 50} LINKS)`) : "GATEWAY 2 • LOCKED"}
                </span>
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem", color: "#f8fafc", fontWeight: 800 }}>
                Endpoint Browser Extension Shield
              </h3>
              <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "0.85rem", lineHeight: "1.5" }}>
                Manifest V3 extension protecting users inside Gmail and Outlook. Intercepts webmail links before
                they open and routes suspicious clicks into BrowseGuard isolation.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem", color: "#cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Real-Time Webmail Link Interception
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> 1-Click User Token Pairing (Self-Service)
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Automated Quarantine Warnings for Employees
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Zero Endpoint Attack Surface
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: is2Active ? "#4ade80" : "#fca5a5", marginBottom: "8px" }}>
                {is2Active ? "● Extension pairing token ready to deploy" : "⚠️ Extension access restricted to subscribed users"}
              </div>
              <button
                type="button"
                className="preset-pill"
                style={{
                  width: "100%",
                  padding: "11px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  color: "#4ade80",
                  borderColor: "rgba(34, 197, 94, 0.5)",
                  background: is2Active ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.05)",
                  cursor: "pointer"
                }}
                onClick={() => handleGatewayAction("browser_extension", onOpenAuthModal)}
              >
                {is2Active ? "Pair Extension Token ➔" : "🛡️ Start 14-Day Free Trial (50 Links)"}
              </button>
            </div>
          </div>

          {/* PRODUCT 3: EMAIL GATEWAY & API */}
          <div
            className="panel"
            style={{
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "20px",
              borderTop: "3px solid #a855f7",
              background: "#131f37",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "1.8rem" }}>📧</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 750,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: is3Active ? "rgba(168, 85, 247, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: is3Active ? "#c084fc" : "#f87171",
                    border: `1px solid ${is3Active ? "rgba(168, 85, 247, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                    letterSpacing: "0.04em"
                  }}
                >
                  {is3Active ? (currentUser?.role === "ADMIN" ? "GATEWAY 3 • ENTERPRISE" : `TRIAL ACTIVE (${sub3?.quota_remaining ?? 100} CALLS)`) : "GATEWAY 3 • LOCKED"}
                </span>
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem", color: "#f8fafc", fontWeight: 800 }}>
                Enterprise Email Security & API
              </h3>
              <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "0.85rem", lineHeight: "1.5" }}>
                Integrate BrowseGuard with Microsoft 365, Google Workspace, Postfix, or custom mail filters.
                Includes Click-Time URL Rewriting and automated webhooks.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem", color: "#cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Programmatic REST API & Self-Service API Keys
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Click-Time URL Rewriting Engine
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Bulk .EML / Raw Email Link Parser
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#22c55e" }}>✓</span> Production Python, cURL & Node.js Snippets
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: is3Active ? "#c084fc" : "#fca5a5", marginBottom: "8px" }}>
                {is3Active ? "● REST API & Click-Time rewriter ready" : "⚠️ API integration requires active subscription"}
              </div>
              <button
                type="button"
                className="preset-pill"
                style={{
                  width: "100%",
                  padding: "11px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  color: "#c084fc",
                  borderColor: "rgba(168, 85, 247, 0.5)",
                  background: is3Active ? "rgba(168, 85, 247, 0.15)" : "rgba(168, 85, 247, 0.05)",
                  cursor: "pointer"
                }}
                onClick={() => handleGatewayAction("email_gateway_api", onOpenEmailGateway)}
              >
                {is3Active ? "Configure API & Mail Gateway ➔" : "📧 Start 14-Day Free Trial (100 Calls)"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Detonation Feed Preview */}
      {recentScans.length > 0 && (
        <section className="panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800 }}>
                Recent Threat Sandbox Activity (PostgreSQL)
              </h3>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.8rem" }}>
                Live feed of intercepted links and forensic detonations across all gateways
              </p>
            </div>
            <button
              type="button"
              className="preset-pill"
              onClick={onViewHistory}
              style={{ fontSize: "0.78rem", padding: "6px 14px", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}
            >
              View Full History Database ➔
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
            {recentScans.slice(0, 3).map((item, idx) => (
              <div
                key={item.id || item.session_id || `recent_${idx}`}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 750,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: item.verdict === "MALICIOUS" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                      color: item.verdict === "MALICIOUS" ? "#f87171" : "#4ade80",
                      border: `1px solid ${item.verdict === "MALICIOUS" ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)"}`
                    }}
                  >
                    {item.verdict || "UNKNOWN"}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    Score: <strong>{item.risk_score ?? 0}/100</strong>
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#e2e8f0", wordBreak: "break-all", fontFamily: "monospace" }}>
                  {item.submitted_url ? (item.submitted_url.length > 55 ? `${item.submitted_url.slice(0, 52)}...` : item.submitted_url) : "Unknown URL"}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"} • {item.source_channel || "MANUAL"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
