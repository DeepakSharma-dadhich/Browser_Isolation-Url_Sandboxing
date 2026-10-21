import React from "react";

export default function CommercialLanding({
  onLaunchStudio,
  onOpenEmailGateway,
  onOpenAuthModal,
  onViewHistory,
  subscriptions = null,
  currentUser = null
}) {
  const sub1 = subscriptions?.url_scanner;
  const is1Active = sub1?.is_active ?? (currentUser?.role === "ADMIN");

  const sub2 = subscriptions?.browser_extension;
  const is2Active = sub2?.is_active ?? (currentUser?.role === "ADMIN");

  const sub3 = subscriptions?.email_gateway_api;
  const is3Active = sub3?.is_active ?? (currentUser?.role === "ADMIN");

  return (
    <div style={{ background: "#0b1329", minHeight: "100vh", color: "#f8fafc" }}>
      {/* Top Event Announcement Banner (Image 2) */}
      <div className="landing-top-banner">
        <span>MEET BROWSEGUARD AT CYBERDEFENSE SUMMIT, OCTOBER 27–29. Let's talk SOC efficiency.</span>
        <span className="badge-pill">📍 Hall 9, Stand 9-114</span>
        <button
          type="button"
          onClick={onLaunchStudio}
          style={{ background: "transparent", border: "none", color: "#00acf5", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
        >
          Get a free ticket ➔
        </button>
      </div>

      {/* Clean Marketing Header (Image 2) */}
      <header className="landing-header">
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {/* Brand Logo with ANY.RUN style geometry */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={onLaunchStudio}>
            <span style={{ fontSize: "1.4rem" }}>🛡️</span>
            <span style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.03em", color: "#ffffff" }}>
              BROWSE<span style={{ color: "#00acf5" }}>GUARD</span>
            </span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" className="landing-nav-link" onClick={onLaunchStudio}>
              Products ▾
            </button>
            <button type="button" className="landing-nav-link" onClick={onOpenEmailGateway}>
              Solutions ▾
            </button>
            <button type="button" className="landing-nav-link" onClick={onOpenEmailGateway}>
              Integrations
            </button>
            <button type="button" className="landing-nav-link" onClick={() => onOpenAuthModal("profile")}>
              Trial
            </button>
            <button type="button" className="landing-nav-link" onClick={() => onOpenAuthModal("profile")}>
              Pricing ▾
            </button>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {subscriptions?.url_scanner && (
            <span style={{ fontSize: "0.78rem", color: "#38bdf8", padding: "4px 10px", background: "rgba(0, 172, 245, 0.12)", borderRadius: "6px", border: "1px solid rgba(0, 172, 245, 0.3)" }}>
              Quota: {currentUser?.role === "ADMIN" ? "Unlimited" : `${sub1?.quota_remaining ?? 20} Scans Left`}
            </span>
          )}
          <button
            type="button"
            className="btn-anyrun-primary"
            style={{ padding: "9px 22px", fontSize: "0.88rem" }}
            onClick={onLaunchStudio}
          >
            Get started ➔
          </button>
        </div>
      </header>

      {/* Clean Hero Section (Image 2) */}
      <section className="landing-hero">
        <span className="landing-hero-eyebrow">MALWARE & PHISHING SANDBOX</span>
        <h1 className="landing-hero-title">
          Analyze malware and phishing<br />in a safe environment
        </h1>
        <p className="landing-hero-sub">
          Easy to use. Disposable Chromium VM sandboxes. Quick to deliver the verdict.
          BrowseGuard's zero-trust dynamic isolation accelerates your malware research. Now with multi-gateway defense.
        </p>

        <div className="landing-hero-ctas">
          <button
            type="button"
            className="btn-anyrun-primary"
            onClick={onLaunchStudio}
          >
            Get started ➔
          </button>
          <button
            type="button"
            className="btn-anyrun-secondary"
            onClick={() => onOpenAuthModal("profile")}
          >
            View Subscriptions & Pricing ➔
          </button>
        </div>
      </section>

      {/* 3 Dedicated Product Gateways Section */}
      <section style={{ maxWidth: "1200px", margin: "40px auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "#00acf5", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Self-Service Defense Gateways
          </p>
          <h2 style={{ margin: 0, fontSize: "1.9rem", color: "#f8fafc", fontWeight: 850 }}>
            Choose Your Threat Defense Gateway
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
          {/* GATEWAY 1 CARD */}
          <div
            className="panel"
            style={{
              padding: "32px 28px",
              background: "#101d36",
              border: "1px solid rgba(0, 172, 245, 0.3)",
              borderTop: "3px solid #00acf5",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "24px"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "2rem" }}>🖥️</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 750, padding: "3px 10px", borderRadius: "999px", background: "rgba(0, 172, 245, 0.15)", color: "#38bdf8", border: "1px solid rgba(0, 172, 245, 0.4)" }}>
                  {is1Active ? "TRIAL ACTIVE" : "GATEWAY 1 • SOC ANALYSTS"}
                </span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "#f8fafc", fontWeight: 850 }}>
                Interactive Sandbox Studio
              </h3>
              <p style={{ margin: "0 0 18px", color: "#94a3b8", fontSize: "0.88rem", lineHeight: "1.5" }}>
                ANY.RUN-style live URL detonation chamber with real-time browser screencasting, anti-cloaking bypass, and deep forensic drawer.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem", color: "#cbd5e1" }}>
                <div>✓ Live Remote Browser Isolation (RBI)</div>
                <div>✓ Multi-hop Visual Redirect Flowchart</div>
                <div>✓ MITRE ATT&CK Matrix & IOC 1-Click Export</div>
                <div>✓ Downloadable HAR Network Stream & DOM Snapshots</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginBottom: "10px" }}>
                {is1Active ? `● ${sub1?.quota_remaining ?? 20} Scans Remaining` : "● 14-Day Free Trial Available (20 Scans)"}
              </div>
              <button
                type="button"
                className="btn-anyrun-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={onLaunchStudio}
              >
                Launch Sandbox Studio ➔
              </button>
            </div>
          </div>

          {/* GATEWAY 2 CARD */}
          <div
            className="panel"
            style={{
              padding: "32px 28px",
              background: "#101d36",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderTop: "3px solid #22c55e",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "24px"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "2rem" }}>🛡️</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 750, padding: "3px 10px", borderRadius: "999px", background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.4)" }}>
                  {is2Active ? "TRIAL ACTIVE" : "GATEWAY 2 • ENDPOINT USERS"}
                </span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "#f8fafc", fontWeight: 850 }}>
                Endpoint Webmail Shield Extension
              </h3>
              <p style={{ margin: "0 0 18px", color: "#94a3b8", fontSize: "0.88rem", lineHeight: "1.5" }}>
                Manifest V3 extension protecting users inside Gmail and Outlook. Intercepts webmail links before they open and routes suspicious clicks into BrowseGuard isolation.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem", color: "#cbd5e1" }}>
                <div>✓ Real-Time Webmail Link Interception</div>
                <div>✓ 1-Click User Token Pairing (Self-Service)</div>
                <div>✓ Automated Quarantine Warnings for Employees</div>
                <div>✓ Zero Endpoint Attack Surface</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: "#4ade80", marginBottom: "10px" }}>
                {is2Active ? `● ${sub2?.quota_remaining ?? 50} Links Remaining` : "● 14-Day Free Trial Available (50 Links)"}
              </div>
              <button
                type="button"
                className="btn-anyrun-secondary"
                style={{ width: "100%", justifyContent: "center", borderColor: "rgba(34, 197, 94, 0.5)", color: "#4ade80" }}
                onClick={() => onOpenAuthModal("extension")}
              >
                Deploy Extension Shield ➔
              </button>
            </div>
          </div>

          {/* GATEWAY 3 CARD */}
          <div
            className="panel"
            style={{
              padding: "32px 28px",
              background: "#101d36",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              borderTop: "3px solid #a855f7",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "24px"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "2rem" }}>📧</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 750, padding: "3px 10px", borderRadius: "999px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.4)" }}>
                  {is3Active ? "TRIAL ACTIVE" : "GATEWAY 3 • MAIL SERVERS & SIEM"}
                </span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "#f8fafc", fontWeight: 850 }}>
                Enterprise Email Security & API
              </h3>
              <p style={{ margin: "0 0 18px", color: "#94a3b8", fontSize: "0.88rem", lineHeight: "1.5" }}>
                Integrate BrowseGuard with Microsoft 365, Google Workspace, Postfix, or custom mail filters. Includes Click-Time URL Rewriting and automated webhooks.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem", color: "#cbd5e1" }}>
                <div>✓ Programmatic REST API & Self-Service API Keys</div>
                <div>✓ Click-Time URL Rewriting Engine</div>
                <div>✓ Bulk .EML / Raw Email Link Parser</div>
                <div>✓ Production Python, cURL & Node.js Snippets</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: "#c084fc", marginBottom: "10px" }}>
                {is3Active ? `● ${sub3?.quota_remaining ?? 100} Calls Remaining` : "● 14-Day Free Trial Available (100 Calls)"}
              </div>
              <button
                type="button"
                className="btn-anyrun-secondary"
                style={{ width: "100%", justifyContent: "center", borderColor: "rgba(168, 85, 247, 0.5)", color: "#c084fc" }}
                onClick={onOpenEmailGateway}
              >
                Configure API & Mail Gateway ➔
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Compute Quotas Matrix */}
      <section style={{ maxWidth: "1100px", margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "#00acf5", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Transparent Compute Pricing
          </p>
          <h2 style={{ margin: 0, fontSize: "1.9rem", color: "#f8fafc", fontWeight: 850 }}>
            Heavy VM Infrastructure Plans
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "8px 0 0" }}>
            Each gateway is budgeted independently to guarantee compute performance.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {/* FREE TRIAL TIER */}
          <div style={{ background: "#0e1a32", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "28px" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#fff" }}>14-Day Free Trial</h4>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#00acf5", marginBottom: "12px" }}>$0</div>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 20px" }}>
              Test any gateway for 14 days without a credit card.
            </p>
            <ul style={{ paddingLeft: "18px", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: "1.7", margin: "0 0 24px" }}>
              <li>20 VM Sandbox Detonations</li>
              <li>50 Webmail Extension Links</li>
              <li>100 Email Gateway API Calls</li>
              <li>Standard Chromium 128 VM</li>
            </ul>
            <button
              type="button"
              className="btn-anyrun-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => onOpenAuthModal("register")}
            >
              Start Free Trial ➔
            </button>
          </div>

          {/* PRO TIER */}
          <div style={{ background: "#112242", border: "2px solid #00acf5", borderRadius: "10px", padding: "28px", position: "relative" }}>
            <span style={{ position: "absolute", top: "-12px", right: "20px", background: "#00acf5", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "2px 10px", borderRadius: "999px" }}>
              POPULAR SOC TIER
            </span>
            <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#fff" }}>SOC Pro</h4>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", marginBottom: "12px" }}>
              $49<span style={{ fontSize: "0.9rem", color: "#94a3b8" }}> / month</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 20px" }}>
              Designed for security analysts and incident response teams.
            </p>
            <ul style={{ paddingLeft: "18px", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: "1.7", margin: "0 0 24px" }}>
              <li>500 Live Detonations / month</li>
              <li>1,000 Extension Link Interceptions</li>
              <li>2,500 Email Gateway API Calls</li>
              <li>Priority VM Queue & Full HAR Stream</li>
            </ul>
            <button
              type="button"
              className="btn-anyrun-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => onOpenAuthModal("profile")}
            >
              Upgrade to Pro ➔
            </button>
          </div>

          {/* ENTERPRISE TIER */}
          <div style={{ background: "#0e1a32", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", padding: "28px" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#fff" }}>Enterprise Shield</h4>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#22c55e", marginBottom: "12px" }}>
              $199<span style={{ fontSize: "0.9rem", color: "#94a3b8" }}> / month</span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 20px" }}>
              Full fleet protection with Microsoft 365 & Google Workspace MTA integration.
            </p>
            <ul style={{ paddingLeft: "18px", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: "1.7", margin: "0 0 24px" }}>
              <li>5,000 Live Detonations / month</li>
              <li>10,000 Extension Endpoint Shields</li>
              <li>25,000 Mail Flow API Detonations</li>
              <li>Dedicated Chromium Clusters & SLA</li>
            </ul>
            <button
              type="button"
              className="btn-anyrun-secondary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => onOpenAuthModal("profile")}
            >
              Contact Enterprise Sales ➔
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", padding: "32px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", color: "#64748b", flexWrap: "wrap", gap: "16px" }}>
        <div>
          © 2026 BrowseGuard Cyber Security. Zero-Trust Dynamic Browser Isolation.
        </div>
        <div style={{ display: "flex", gap: "20px" }}>
          <span style={{ cursor: "pointer" }} onClick={onLaunchStudio}>Sandbox Studio</span>
          <span style={{ cursor: "pointer" }} onClick={onOpenEmailGateway}>API Gateway</span>
          <span style={{ cursor: "pointer" }} onClick={onViewHistory}>Past Scans</span>
          <span style={{ cursor: "pointer" }} onClick={() => onOpenAuthModal("profile")}>Documentation</span>
        </div>
      </footer>
    </div>
  );
}
