import React, { useState } from "react";
import EmlDetonationModal from "./EmlDetonationModal";

export default function SocPortalHub({
  onSubmitUrl,
  onOpenEmailGateway,
  onLaunchRbi,
  onOpenHistory,
  onOpenAuthModal,
  onNavigateToLanding,
  onOpenApiTerminal,
  subscriptions,
  currentUser,
  activeSubTab = "hub"
}) {
  const [quickUrl, setQuickUrl] = useState("https://example.com");
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showEmlModal, setShowEmlModal] = useState(false);
  const [osChoice, setOsChoice] = useState("linux_chromium"); // "linux_chromium" | "win10" | "android"
  const [antiCloak, setAntiCloak] = useState(true);

  const sub1 = subscriptions?.url_scanner;
  const is1Active = sub1?.is_active ?? (currentUser?.role === "ADMIN");

  const handleLaunchDetonation = (target) => {
    const finalUrl = (target || quickUrl).trim();
    if (!finalUrl) return;
    setShowQuickModal(false);
    onSubmitUrl(finalUrl);
  };

  const testPresets = [
    { label: "⚡ ClickFix Win+R Lure (T1204.002)", url: "http://127.0.0.1:3000/api/v1/simulations/clickfix-captcha" },
    { label: "🔑 OAuth Device Phish (T1528)", url: "http://127.0.0.1:3000/api/v1/simulations/oauth-device-login" },
    { label: "🛡️ Scareware Lockout (T1204.001)", url: "http://127.0.0.1:3000/api/v1/simulations/scareware-lockout" },
    { label: "🌐 Fake Chrome Update (T1189)", url: "http://127.0.0.1:3000/api/v1/simulations/fake-chrome-update" },
    { label: "🎯 Microsoft Typosquatting", url: "https://micros0ft-verify.com/login.html" },
    { label: "🟢 Benign Control (example.com)", url: "https://example.com" }
  ];

  return (
    <div className="soc-app-layout">
      {/* Left Persistent SOC Sidebar (Image 1) */}
      <aside className="soc-sidebar">
        <div className="soc-sidebar-top">
          {/* Logo with ANY.RUN Play Polygon */}
          <div
            className="soc-brand-logo"
            onClick={onNavigateToLanding}
            title="View Commercial Landing Page"
            style={{ cursor: "pointer" }}
          >
            <div className="soc-brand-icon">▶</div>
            <span>BROWSE<span style={{ color: "#00acf5" }}>GUARD</span></span>
          </div>

          {/* "+ New analysis" prominent cyan button (Image 1) */}
          <button
            type="button"
            className="soc-new-analysis-btn"
            onClick={() => setShowQuickModal(true)}
          >
            <span style={{ fontSize: "1.1rem" }}>+</span> New analysis
          </button>

          {/* Navigation Items (Image 1) */}
          <nav className="soc-nav-menu">
            <button
              type="button"
              className={`soc-nav-item ${activeSubTab === "hub" ? "active" : ""}`}
              onClick={() => {}}
            >
              <span>🌐</span> Start Analysis
            </button>
            <button
              type="button"
              className={`soc-nav-item ${activeSubTab === "studio" ? "active" : ""}`}
              onClick={() => onSubmitUrl(quickUrl)}
            >
              <span>🖥️</span> Analysis Studio
            </button>
            <button
              type="button"
              className={`soc-nav-item ${activeSubTab === "history" ? "active" : ""}`}
              onClick={onOpenHistory}
            >
              <span>📄</span> Reports & History
            </button>
            <button
              type="button"
              className={`soc-nav-item ${activeSubTab === "email_gateway" ? "active" : ""}`}
              onClick={() => setShowEmlModal(true)}
            >
              <span>📧</span> Email Gateway & .EML
            </button>
            <button
              type="button"
              className="soc-nav-item"
              onClick={() => onOpenAuthModal("extension")}
            >
              <span>🛡️</span> Extension Shield
            </button>
            <button
              type="button"
              className="soc-nav-item"
              onClick={onOpenHistory}
            >
              <span>⬡</span> Threat Intelligence
            </button>
            <button
              type="button"
              className="soc-nav-item"
              onClick={() => onOpenAuthModal("api_keys")}
            >
              <span>🔑</span> API Keys & BYOK
            </button>
            <button
              type="button"
              className="soc-nav-item"
              onClick={onOpenApiTerminal}
              style={{ color: "#38bdf8" }}
              title="Interactive API & Gateway Test Terminal"
            >
              <span>⚡</span> API Test Terminal
            </button>
            <button
              type="button"
              className="soc-nav-item"
              onClick={onNavigateToLanding}
              style={{ marginTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}
            >
              <span>🏠</span> Commercial Site ↗
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom (Image 1) */}
        <div className="soc-sidebar-bottom">
          <button
            type="button"
            className="soc-nav-item"
            onClick={() => onOpenAuthModal("profile")}
          >
            <span>🛒</span> Subscriptions & Quota
          </button>
          <button
            type="button"
            className="soc-nav-item"
            onClick={() => onOpenAuthModal("profile")}
          >
            <span>👤</span> {currentUser?.fullName || "Analyst"} ({currentUser?.role || "ADMIN"})
          </button>
        </div>
      </aside>

      {/* Main SOC Investigation Workspace (Image 1) */}
      <main className="soc-workspace-main">
        {/* Subtle Cyber World Map SVG Overlay */}
        <div className="soc-worldmap-bg" />

        <div className="soc-workspace-content">
          {/* Top Header */}
          <div className="soc-workspace-header">
            <h2>Start your analysis</h2>
            <p>
              Interact with cyber threats inside Windows, Linux, macOS, and Android VMs to trigger full attack execution.
            </p>
          </div>

          {/* Section: Deep interactive investigation */}
          <div className="soc-section-heading">
            Deep interactive investigation in full environment
          </div>

          {/* The 3 Big ANY.RUN Cards (Image 1) */}
          <div className="anyrun-cards-grid">
            {/* CARD 1: SUBMIT FILE / EMAIL */}
            <div
              className="anyrun-submission-card"
              onClick={() => setShowEmlModal(true)}
            >
              <div className="anyrun-card-icon-wrap" style={{ borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.1)" }}>
                <span>📄</span>
              </div>
              <h3 className="anyrun-card-title">Submit File / Email (.EML)</h3>
              <p className="anyrun-card-desc">
                Drop raw RFC822 / .EML emails to parse headers, SPF/DKIM spoofing, and detonate links.
              </p>
            </div>

            {/* CARD 2: SUBMIT URL */}
            <div
              className="anyrun-submission-card"
              onClick={() => setShowQuickModal(true)}
              style={{ borderColor: "#00acf5", boxShadow: "0 4px 18px rgba(0, 172, 245, 0.15)" }}
            >
              <div className="anyrun-card-icon-wrap" style={{ borderColor: "#00acf5", background: "rgba(0, 172, 245, 0.15)" }}>
                <span>🔗</span>
              </div>
              <h3 className="anyrun-card-title">Submit URL</h3>
              <p className="anyrun-card-desc">
                Investigate malicious and phishing activity and inspect downloaded files.
              </p>
            </div>

            {/* CARD 3: SAFEBROWSING / LIVE RBI */}
            <div
              className="anyrun-submission-card featured"
              onClick={() => onLaunchRbi(quickUrl)}
            >
              <span className="anyrun-card-badge">Beta</span>
              <div className="anyrun-card-icon-wrap" style={{ borderColor: "rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.1)" }}>
                <span>🌐</span>
              </div>
              <h3 className="anyrun-card-title">Check Suspicious Links</h3>
              <p className="anyrun-card-desc">
                Open any URL to verify its content fast and easily in zero-trust isolation.
              </p>
            </div>
          </div>

          {/* Section: Power your SOC with BrowseGuard */}
          <div className="soc-section-heading">
            Power your SOC with BrowseGuard solutions
          </div>

          {/* Solutions bottom row (Image 1) */}
          <div className="soc-solutions-grid">
            <div
              className="soc-solution-card"
              onClick={onOpenHistory}
            >
              <div>
                <div className="soc-solution-title">
                  <span>[=]</span> TI Feeds & IOC Streams
                </div>
                <p className="soc-solution-desc">
                  Prevent attacks with actionable IOC streams and automated detection in SIEM.
                </p>
              </div>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>↗</span>
            </div>

            <div
              className="soc-solution-card"
              onClick={onOpenEmailGateway}
            >
              <div>
                <div className="soc-solution-title">
                  <span>⬡</span> TI Lookup & Mail Gateway API
                </div>
                <p className="soc-solution-desc">
                  Enrich investigations and respond faster with IOCs, IOAs, and click-time isolation.
                </p>
              </div>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>↗</span>
            </div>

            <div
              className="soc-solution-card"
              onClick={onOpenApiTerminal}
              style={{ borderColor: "rgba(0, 172, 245, 0.3)" }}
            >
              <div>
                <div className="soc-solution-title" style={{ color: "#38bdf8" }}>
                  <span>⚡</span> API Terminal & Swagger Playground
                </div>
                <p className="soc-solution-desc">
                  Live test REST endpoints, OASIS STIX 2.1 TAXII feeds, and sliding-window rate limit counters.
                </p>
              </div>
              <span style={{ color: "#38bdf8", fontSize: "0.85rem" }}>➔</span>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar (Image 1) */}
        <footer className="soc-bottom-bar">
          <div>
            Your current status:{" "}
            <span className="soc-status-badge">
              {currentUser?.role === "ADMIN" ? "Administrator" : is1Active ? "Trial Active" : "Guest / Unlimited"}
            </span>
          </div>
          <div>•</div>
          <div>
            Access Period:{" "}
            <strong style={{ color: "#38bdf8" }}>
              {currentUser?.role === "ADMIN" ? "unlimited" : `${sub1?.days_remaining ?? 14} days`}
            </strong>
          </div>
          <div>•</div>
          <div>
            Compute Quota:{" "}
            <strong style={{ color: is1Active ? "#22c55e" : "#f87171" }}>
              {currentUser?.role === "ADMIN" ? "unlimited" : `${sub1?.quota_remaining ?? 20} Scans Left`}
            </strong>
          </div>
        </footer>
      </main>

      {/* ANY.RUN Task Configuration Modal */}
      {showQuickModal && (
        <div className="rbi-modal-overlay" onClick={() => setShowQuickModal(false)}>
          <div
            className="rbi-window"
            style={{ maxWidth: "680px", background: "#0b1528", border: "1px solid rgba(0, 172, 245, 0.4)", borderRadius: "12px", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rbi-header" style={{ background: "#060d1a", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.2rem", color: "#00acf5" }}>🚀</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 800 }}>
                    New Sandbox Analysis Task
                  </h3>
                  <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                    Configure isolated VM environment & threat heuristics
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="rbi-ctrl-btn"
                onClick={() => setShowQuickModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* URL Input */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 750, color: "#cbd5e1", marginBottom: "8px" }}>
                  Target URL to Detonate:
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="url"
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    placeholder="https://malicious-domain.com/phish.html"
                    className="history-search-input"
                    style={{ flex: 1, padding: "12px 16px", fontSize: "0.95rem" }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLaunchDetonation();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-anyrun-primary"
                    onClick={() => handleLaunchDetonation()}
                    style={{ padding: "12px 24px", whiteSpace: "nowrap" }}
                  >
                    Detonate ➔
                  </button>
                </div>
              </div>

              {/* Fast Presets */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 750, color: "#94a3b8", marginBottom: "6px" }}>
                  Fast Security Vectors:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {testPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="preset-pill"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => {
                        setQuickUrl(preset.url);
                        handleLaunchDetonation(preset.url);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Environment Options */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", flexDirection: "column", gap: "12px" }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#00acf5", textTransform: "uppercase" }}>
                  Sandbox Environment
                </span>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="osChoice"
                      checked={osChoice === "linux_chromium"}
                      onChange={() => setOsChoice("linux_chromium")}
                    />
                    🐧 Linux VM (Chromium 128)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="osChoice"
                      checked={osChoice === "win10"}
                      onChange={() => setOsChoice("win10")}
                    />
                    🪟 Windows 10 Pro (x64)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="osChoice"
                      checked={osChoice === "android"}
                      onChange={() => setOsChoice("android")}
                    />
                    🤖 Android 13 VM
                  </label>
                </div>

                <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={antiCloak}
                      onChange={(e) => setAntiCloak(e.target.checked)}
                    />
                    Traverse Anti-Cloaking Click Walls
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8" }}>
                    <input type="checkbox" defaultChecked disabled />
                    Capture Full Network HAR Log
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="btn-anyrun-secondary"
                  onClick={() => setShowQuickModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-anyrun-primary"
                  onClick={() => handleLaunchDetonation()}
                >
                  Launch Detonation Task ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EML / RFC822 FORENSICS & DETONATION STUDIO MODAL */}
      <EmlDetonationModal
        isOpen={showEmlModal}
        onClose={() => setShowEmlModal(false)}
        onLaunchRbi={onLaunchRbi}
        onStartSandboxScan={(sessId) => {
          setShowEmlModal(false);
          if (sessId && onSubmitUrl) {
            onSubmitUrl(sessId);
          }
        }}
      />
    </div>
  );
}
