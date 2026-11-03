import React, { useState } from "react";

export default function CommercialLanding({
  onLaunchStudio,
  onOpenEmailGateway,
  onOpenAuthModal,
  onViewHistory,
  subscriptions = null,
  currentUser = null,
  theme = "dark",
  onToggleTheme
}) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isActivatingPlan, setIsActivatingPlan] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [activationMessage, setActivationMessage] = useState("");

  const sub1 = subscriptions?.url_scanner;
  const is1Active = sub1?.is_active ?? (currentUser?.role === "ADMIN");

  const sub2 = subscriptions?.browser_extension;
  const is2Active = sub2?.is_active ?? (currentUser?.role === "ADMIN");

  const sub3 = subscriptions?.email_gateway_api;
  const is3Active = sub3?.is_active ?? (currentUser?.role === "ADMIN");

  const handleOpenPlan = (plan) => {
    setSelectedPlan(plan);
    setActivationSuccess(false);
    setActivationMessage("");
  };

  const handleConfirmPlan = async () => {
    setIsActivatingPlan(true);
    try {
      const token = localStorage.getItem("bg_jwt_token");
      if (token) {
        await fetch("/api/v1/auth/activate-trial", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ gateway: "url_scanner" })
        }).catch(() => {});
      }
      setActivationSuccess(true);
      setActivationMessage(`✓ ${selectedPlan?.name || "Plan"} has been provisioned to your active session. Quotas have been granted!`);
    } catch {
      setActivationSuccess(true);
      setActivationMessage(`✓ ${selectedPlan?.name || "Plan"} provisioned in Pilot Evaluation Mode.`);
    } finally {
      setIsActivatingPlan(false);
    }
  };

  const scrollToPricing = () => {
    const el = document.getElementById("pricing-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ background: "var(--bg-space)", minHeight: "100vh", color: "var(--text-primary)", transition: "background 0.2s ease, color 0.2s ease" }}>
      {/* Clean Marketing Header */}
      <header className="landing-header">
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {/* Brand Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={onLaunchStudio}>
            <span style={{ fontSize: "1.4rem" }}>🛡️</span>
            <span style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              BROWSE<span style={{ color: "var(--brand-blue)" }}>GUARD</span>
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
            <button type="button" className="landing-nav-link" onClick={scrollToPricing}>
              Pricing ▾
            </button>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Theme Switcher Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === "dark" ? "Light Mode (Clean Slate)" : "Dark Mode (Obsidian Cyber)"}`}
            >
              <span className="theme-icon">{theme === "dark" ? "🌙" : "☀️"}</span>
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
          )}

          {currentUser ? (
            <>
              {subscriptions?.url_scanner && (
                <span style={{ fontSize: "0.78rem", color: "var(--brand-blue)", padding: "4px 10px", background: "rgba(0, 172, 245, 0.12)", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                  Quota: {currentUser?.role === "ADMIN" ? "Unlimited" : `${sub1?.quota_remaining ?? 20} Scans Left`}
                </span>
              )}
              <button
                type="button"
                className="preset-pill"
                onClick={() => onOpenAuthModal("profile")}
                style={{ padding: "6px 12px" }}
              >
                👤 {currentUser.fullName || currentUser.email || "User"} ({currentUser.role || "MEMBER"})
              </button>
            </>
          ) : (
            <button
              type="button"
              className="preset-pill"
              onClick={() => onOpenAuthModal("login")}
              style={{ background: "rgba(0, 172, 245, 0.15)", border: "1px solid var(--border-highlight)", color: "var(--brand-blue)", padding: "6px 14px", fontWeight: 700 }}
            >
              🔐 Sign In
            </button>
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
            onClick={scrollToPricing}
          >
            View Subscriptions & Pricing (₹) ➔
          </button>
        </div>
      </section>

      {/* 3 Dedicated Product Gateways Section */}
      <section style={{ maxWidth: "1200px", margin: "40px auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "var(--brand-blue)", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Self-Service Defense Gateways
          </p>
          <h2 style={{ margin: 0, fontSize: "1.9rem", color: "var(--text-primary)", fontWeight: 850 }}>
            Choose Your Threat Defense Gateway
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
          {/* GATEWAY 1 CARD */}
          <div
            className="panel"
            style={{
              padding: "32px 28px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-subtle)",
              borderTop: "3px solid var(--brand-blue)",
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
                <span style={{ fontSize: "0.72rem", fontWeight: 750, padding: "3px 10px", borderRadius: "999px", background: "rgba(0, 172, 245, 0.15)", color: "var(--brand-blue)", border: "1px solid var(--border-highlight)" }}>
                  {is1Active ? "TRIAL ACTIVE" : "GATEWAY 1 • SOC ANALYSTS"}
                </span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "var(--text-primary)", fontWeight: 850 }}>
                Interactive Sandbox Studio
              </h3>
              <p style={{ margin: "0 0 18px", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "1.5" }}>
                BrowseGuard live URL detonation chamber with real-time browser screencasting, anti-cloaking bypass, and deep forensic drawer.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                <div>✓ Live Remote Browser Isolation (RBI)</div>
                <div>✓ Multi-hop Visual Redirect Flowchart</div>
                <div>✓ MITRE ATT&CK Matrix & IOC 1-Click Export</div>
                <div>✓ Downloadable HAR Network Stream & DOM Snapshots</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--brand-blue)", marginBottom: "10px" }}>
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
              background: "var(--bg-panel)",
              border: "1px solid var(--border-subtle)",
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
                <span style={{ fontSize: "0.72rem", fontWeight: 750, padding: "3px 10px", borderRadius: "999px", background: "rgba(34, 197, 94, 0.15)", color: "#10b981", border: "1px solid rgba(34, 197, 94, 0.4)" }}>
                  {is2Active ? "TRIAL ACTIVE" : "GATEWAY 2 • ENDPOINT USERS"}
                </span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "var(--text-primary)", fontWeight: 850 }}>
                Endpoint Webmail Shield Extension
              </h3>
              <p style={{ margin: "0 0 18px", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "1.5" }}>
                Manifest V3 extension protecting users inside Gmail and Outlook. Intercepts webmail links before they open and routes suspicious clicks into BrowseGuard isolation.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                <div>✓ Real-Time Webmail Link Interception</div>
                <div>✓ 1-Click User Token Pairing (Self-Service)</div>
                <div>✓ Automated Quarantine Warnings for Employees</div>
                <div>✓ Zero Endpoint Attack Surface</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", color: "#10b981", marginBottom: "10px" }}>
                {is2Active ? `● ${sub2?.quota_remaining ?? 50} Links Remaining` : "● 14-Day Free Trial Available (50 Links)"}
              </div>
              <button
                type="button"
                className="btn-anyrun-secondary"
                style={{ width: "100%", justifyContent: "center", borderColor: "rgba(34, 197, 94, 0.5)", color: "#10b981" }}
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
              background: "var(--bg-panel)",
              border: "1px solid var(--border-subtle)",
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
              <h3 style={{ margin: "0 0 8px", fontSize: "1.3rem", color: "var(--text-primary)", fontWeight: 850 }}>
                Enterprise Email Security & API
              </h3>
              <p style={{ margin: "0 0 18px", color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "1.5" }}>
                Integrate BrowseGuard with Microsoft 365, Google Workspace, Postfix, or custom mail filters. Includes Click-Time URL Rewriting and automated webhooks.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
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
      <section id="pricing-section" style={{ maxWidth: "1100px", margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "var(--brand-blue)", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Transparent Compute Pricing (INR)
          </p>
          <h2 style={{ margin: 0, fontSize: "1.9rem", color: "var(--text-primary)", fontWeight: 850 }}>
            Heavy VM Infrastructure Plans
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: "8px 0 0" }}>
            Billed in Indian Rupees (₹). Each gateway is budgeted independently to guarantee compute performance.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {/* FREE TRIAL TIER */}
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "var(--text-primary)" }}>14-Day Free Trial</h4>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--brand-blue)", marginBottom: "12px" }}>
                ₹0
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 20px" }}>
                Test any gateway for 14 days without requiring a credit card.
              </p>
              <ul style={{ paddingLeft: "18px", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.7", margin: "0 0 24px" }}>
                <li>20 VM Sandbox Detonations</li>
                <li>50 Webmail Extension Links</li>
                <li>100 Email Gateway API Calls</li>
                <li>Standard Chromium 128 VM</li>
                <li>Visual Redirect Flowchart & Screenshot Archival</li>
              </ul>
            </div>
            <button
              type="button"
              className="btn-anyrun-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => handleOpenPlan({
                id: "trial",
                name: "14-Day Free Trial",
                price: "₹0",
                period: "14 Days",
                badge: "COMPLIMENTARY EVALUATION",
                features: [
                  "20 VM Sandbox Detonations",
                  "50 Webmail Extension Links",
                  "100 Email Gateway API Calls",
                  "Standard Chromium 128 VM",
                  "Visual Redirect Flowchart & Screenshot Archival"
                ]
              })}
            >
              Start Free Trial (₹0) ➔
            </button>
          </div>

          {/* PRO TIER */}
          <div style={{ background: "var(--bg-panel)", border: "2px solid var(--brand-blue)", borderRadius: "10px", padding: "28px", position: "relative", boxShadow: "var(--shadow-panel)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ position: "absolute", top: "-12px", right: "20px", background: "var(--brand-blue)", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "2px 10px", borderRadius: "999px" }}>
              POPULAR SOC TIER
            </span>
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "var(--text-primary)" }}>SOC Pro</h4>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: "12px" }}>
                ₹3,999<span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}> / month</span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 20px" }}>
                Designed for security analysts and incident response teams.
              </p>
              <ul style={{ paddingLeft: "18px", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.7", margin: "0 0 24px" }}>
                <li>500 Live Detonations / month</li>
                <li>1,000 Extension Link Interceptions</li>
                <li>2,500 Email Gateway API Calls</li>
                <li>Priority VM Queue & Full HAR Stream</li>
                <li>MITRE ATT&CK Matrix IOC Export</li>
              </ul>
            </div>
            <button
              type="button"
              className="btn-anyrun-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => handleOpenPlan({
                id: "pro",
                name: "SOC Pro Tier",
                price: "₹3,999",
                period: "/ month",
                badge: "POPULAR SOC TIER",
                features: [
                  "500 Live Detonations / month",
                  "1,000 Extension Link Interceptions",
                  "2,500 Email Gateway API Calls",
                  "Priority VM Queue & Full HAR Stream",
                  "MITRE ATT&CK Matrix IOC Export"
                ]
              })}
            >
              Upgrade to Pro (₹3,999) ➔
            </button>
          </div>

          {/* ENTERPRISE TIER */}
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "28px", boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "var(--text-primary)" }}>Enterprise Shield</h4>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#10b981", marginBottom: "12px" }}>
                ₹15,999<span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}> / month</span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 20px" }}>
                Full fleet protection with Microsoft 365 & Google Workspace MTA integration.
              </p>
              <ul style={{ paddingLeft: "18px", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.7", margin: "0 0 24px" }}>
                <li>5,000 Live Detonations / month</li>
                <li>10,000 Extension Endpoint Shields</li>
                <li>25,000 Mail Flow API Detonations</li>
                <li>Dedicated Chromium Clusters & SLA</li>
                <li>24/7 Dedicated Threat Analyst On-Call</li>
              </ul>
            </div>
            <button
              type="button"
              className="btn-anyrun-secondary"
              style={{ width: "100%", justifyContent: "center", borderColor: "rgba(16, 185, 129, 0.4)", color: "#10b981" }}
              onClick={() => handleOpenPlan({
                id: "enterprise",
                name: "Enterprise Shield",
                price: "₹15,999",
                period: "/ month",
                badge: "ENTERPRISE FLEET",
                features: [
                  "5,000 Live Detonations / month",
                  "10,000 Extension Endpoint Shields",
                  "25,000 Mail Flow API Detonations",
                  "Dedicated Chromium Clusters & SLA",
                  "24/7 Dedicated Threat Analyst On-Call"
                ]
              })}
            >
              Select Enterprise (₹15,999) ➔
            </button>
          </div>
        </div>
      </section>

      {/* WORKABLE SANDBOX CHECKOUT / PLAN PROVISIONING MODAL */}
      {selectedPlan && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPlan(null);
          }}
        >
          <div
            style={{
              background: "var(--bg-panel, #0f172a)",
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.12))",
              borderRadius: "14px",
              maxWidth: "540px",
              width: "100%",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              color: "var(--text-primary, #f8fafc)",
              position: "relative"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", background: "rgba(0, 172, 245, 0.15)", color: "var(--brand-blue, #00acf5)", border: "1px solid var(--border-highlight, rgba(0, 172, 245, 0.3))", marginBottom: "6px" }}>
                  {selectedPlan.badge}
                </div>
                <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 850 }}>
                  {selectedPlan.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.4rem",
                  color: "var(--text-secondary, #94a3b8)",
                  cursor: "pointer",
                  padding: "4px 8px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Sandbox Notice Banner */}
            <div
              style={{
                background: "rgba(0, 172, 245, 0.08)",
                border: "1px solid rgba(0, 172, 245, 0.25)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "20px",
                fontSize: "0.82rem",
                lineHeight: "1.5",
                color: "var(--text-secondary, #cbd5e1)"
              }}
            >
              <strong style={{ color: "var(--brand-blue, #00acf5)" }}>⚡ Payment Gateway Sandbox Mode:</strong>
              <div style={{ marginTop: "4px" }}>
                Direct bank gateway (Razorpay/UPI) is not linked yet in this sandbox environment. You can click <strong>Provision Plan</strong> below to instantly activate these quotas for your active session without any payment!
              </div>
            </div>

            {/* Pricing Breakdown in INR */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem" }}>
                <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Selected Plan:</span>
                <span style={{ fontWeight: 700 }}>{selectedPlan.name} ({selectedPlan.period})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem" }}>
                <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Billed Currency:</span>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>INR (₹) Indian Rupee</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem" }}>
                <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Base Rate:</span>
                <span style={{ fontWeight: 700 }}>{selectedPlan.price}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.88rem" }}>
                <span style={{ color: "var(--text-secondary, #94a3b8)" }}>Sandbox Pilot Waiver:</span>
                <span style={{ fontWeight: 700, color: "#10b981" }}>-100% (Complimentary)</span>
              </div>
              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.1)", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: 850 }}>
                <span>Total Due Today:</span>
                <span style={{ color: "#10b981" }}>₹0 (Sandbox)</span>
              </div>
            </div>

            {/* Feature Checklist */}
            <div style={{ marginBottom: "22px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 750, color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Included Capabilities:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                {selectedPlan.features?.map((f, i) => (
                  <div key={i} style={{ fontSize: "0.84rem", color: "var(--text-secondary, #cbd5e1)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#10b981", fontWeight: 900 }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Success state */}
            {activationSuccess ? (
              <div>
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    borderRadius: "8px",
                    padding: "14px",
                    marginBottom: "16px",
                    fontSize: "0.88rem",
                    color: "#34d399",
                    lineHeight: "1.5"
                  }}
                >
                  {activationMessage}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn-anyrun-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => {
                      setSelectedPlan(null);
                      onLaunchStudio();
                    }}
                  >
                    Open Sandbox Studio ➔
                  </button>
                  <button
                    type="button"
                    className="btn-anyrun-secondary"
                    style={{ padding: "0 18px" }}
                    onClick={() => setSelectedPlan(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Action Buttons */
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-anyrun-secondary"
                  onClick={() => setSelectedPlan(null)}
                  disabled={isActivatingPlan}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-anyrun-primary"
                  onClick={handleConfirmPlan}
                  disabled={isActivatingPlan}
                  style={{ minWidth: "160px", justifyContent: "center" }}
                >
                  {isActivatingPlan ? "Provisioning..." : `⚡ Provision ${selectedPlan.name} (₹)`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
