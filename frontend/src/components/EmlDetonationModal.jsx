import React, { useState, useRef } from "react";

// PRESET 1: Microsoft 365 Credential Harvester (SPF Spoof + Anchor Mismatch)
const PRESET_M365 = `From: "Microsoft Security Team" <security-alert@micros0ft-365-verify.com>
To: victim-analyst@enterprise-corp.local
Subject: [CRITICAL ACTION REQUIRED] Microsoft 365 Password Expiring Today
Date: Mon, 12 Oct 2026 09:14:22 +0000
Message-ID: <20261012.891244@micros0ft-365-verify.com>
Return-Path: <bounce-daemon@evil-spammer-bulletproof.ru>
Authentication-Results: spf=fail (sender IP 198.51.100.77); dkim=fail; dmarc=fail action=quarantine
Content-Type: multipart/mixed; boundary="----=_Part_8921_1982736"

------=_Part_8921_1982736
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px;">
  <div style="background: #0078d4; color: #ffffff; padding: 15px; border-radius: 6px;">
    <h2 style="margin: 0;">Microsoft Security Alert</h2>
  </div>
  <p>Dear Employee,</p>
  <p>Your corporate Microsoft 365 password expires in <strong>3 hours</strong>. Failure to confirm your identity will cause immediate account suspension.</p>
  <p>Please click below to retain your current password:</p>
  <p>
    <a href="https://attacker-credential-harvester.xyz/login/m365?session=99812" style="color: #38bdf8; font-weight: bold;">https://login.microsoftonline.com/common/oauth2/authorize</a>
  </p>
  <p>Secondary authentication link: <a href="https://192.168.1.55/backup-auth" style="color: #38bdf8;">https://192.168.1.55/backup-auth</a></p>
</body>
</html>
------=_Part_8921_1982736
Content-Type: application/octet-stream; name="Urgent_Invoice_Doc.pdf.exe"
Content-Disposition: attachment; filename="Urgent_Invoice_Doc.pdf.exe"

TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAA==
------=_Part_8921_1982736--
`;

// PRESET 2: Urgent Vendor Invoice Wire Fraud (.PDF.EXE Malware Attachment)
const PRESET_INVOICE = `From: "Accounts Payable Department" <remittance@vendor-supply-chain-billing.net>
To: accounts-team@global-finance.com
Subject: URGENT OVERDUE INVOICE: Statement #INV-99410 - Final Legal Notice
Date: Mon, 12 Oct 2026 11:05:00 +0000
Message-ID: <msg.legal.882109@vendor-supply-chain-billing.net>
Return-Path: <mail-outbound@bulletproof-relay.cc>
Authentication-Results: spf=fail; dkim=none; dmarc=fail
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
  <h2 style="color: #c00;">FINAL OVERDUE REMITTANCE NOTICE</h2>
  <p>Dear Accounts Team,</p>
  <p>Invoice #INV-99410 is 45 days past due. Immediate wire transfer required to prevent legal filing.</p>
  <p>Please download and review the updated wire coordinates: <a href="https://malicious-doc-host.top/invoices/wire-instructions.html">https://trusted-bank-portal.com/wire-transfer</a></p>
  <p>Alternatively access our secure billing portal: <a href="https://phish-test.example.com/invoice-login">https://phish-test.example.com/invoice-login</a></p>
</body>
</html>
`;

// PRESET 3: Quishing (QR Code MFA Bypass)
const PRESET_QUISHING = `From: "IT Support Desk" <helpdesk@corporate-mfa-security.org>
To: target-employee@enterprise.com
Subject: Action Required: Mandatory Microsoft Authenticator QR Code Sync
Date: Mon, 12 Oct 2026 13:20:10 +0000
Message-ID: <auth-sync-20261012@corporate-mfa-security.org>
Authentication-Results: spf=fail; dkim=fail; dmarc=fail
Content-Type: text/html; charset="UTF-8"

<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h3>Mandatory 2FA Certificate Update</h3>
  <p>To prevent unauthorized access, scan the authenticator app QR code below with your personal mobile camera to register your hardware token immediately:</p>
  <p><a href="https://qr-quishing-harvest-server.live/mfa/enroll?user=target">https://company-it-portal.com/mfa-enroll</a></p>
  <p>Do not forward this message. Security session valid for 15 minutes.</p>
</body>
</html>
`;

export default function EmlDetonationModal({ isOpen, onClose, onLaunchRbi, onStartSandboxScan }) {
  const [activeInputTab, setActiveInputTab] = useState("upload"); // "upload" | "raw_text"
  const [rawText, setRawText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [detonatingLinks, setDetonatingLinks] = useState({}); // { [url]: { status, sessionId } }
  const [bulkDetonating, setBulkDetonating] = useState(false);
  const [viewBodyTab, setViewBodyTab] = useState("preview"); // "preview" | "links" | "indicators" | "raw"
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Process raw EML string through backend API
  const handleParseEml = async (emlContent) => {
    try {
      setLoading(true);
      setError("");
      setParsedData(null);
      setDetonatingLinks({});

      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/email-gateway/parse-eml", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : { "X-API-Key": "bg_live_email_gateway_default" })
        },
        body: JSON.stringify({ raw_eml: emlContent })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error?.message || data.error || "Failed to parse .EML file.");
      }

      setParsedData(data);
      setViewBodyTab("links");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      handleParseEml(content);
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        handleParseEml(content);
      };
      reader.readAsText(file);
    }
  };

  // Detonate a single extracted link
  const handleDetonateSingle = async (linkObj) => {
    const targetUrl = linkObj.url;
    setDetonatingLinks((prev) => ({ ...prev, [targetUrl]: { status: "QUEUED" } }));

    try {
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/email-gateway/detonate-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : { "X-API-Key": "bg_live_email_gateway_default" })
        },
        body: JSON.stringify({
          links: [targetUrl],
          email_metadata: parsedData?.email_summary
        })
      });

      const payload = await resp.json();
      if (resp.ok && payload.analyses?.[0]?.session_id) {
        const sessId = payload.analyses[0].session_id;
        setDetonatingLinks((prev) => ({
          ...prev,
          [targetUrl]: { status: "ACTIVE", sessionId: sessId }
        }));
      } else {
        setDetonatingLinks((prev) => ({
          ...prev,
          [targetUrl]: { status: "FAILED", error: payload.error || "Queue failed" }
        }));
      }
    } catch (err) {
      setDetonatingLinks((prev) => ({
        ...prev,
        [targetUrl]: { status: "FAILED", error: err.message }
      }));
    }
  };

  // Detonate all extracted links in parallel
  const handleDetonateAll = async () => {
    if (!parsedData?.extracted_links?.length) return;
    try {
      setBulkDetonating(true);
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/email-gateway/detonate-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : { "X-API-Key": "bg_live_email_gateway_default" })
        },
        body: JSON.stringify({
          links: parsedData.extracted_links.map((l) => l.url),
          email_metadata: parsedData.email_summary
        })
      });

      const payload = await resp.json();
      if (resp.ok && payload.analyses) {
        const updated = { ...detonatingLinks };
        payload.analyses.forEach((item) => {
          updated[item.url] = { status: "ACTIVE", sessionId: item.session_id };
        });
        setDetonatingLinks(updated);
      }
    } catch (err) {
      alert("Bulk detonation failed: " + err.message);
    } finally {
      setBulkDetonating(false);
    }
  };

  const handleExportEmlStix = () => {
    if (!parsedData) return;
    const now = new Date().toISOString();
    const identityId = "identity--" + Math.random().toString(36).substring(2, 11);
    const objects = [
      {
        type: "identity",
        spec_version: "2.1",
        id: identityId,
        created: now,
        modified: now,
        name: "BrowseGuard Email Gateway",
        identity_class: "system"
      }
    ];

    parsedData.extracted_links.forEach((l) => {
      objects.push({
        type: "indicator",
        spec_version: "2.1",
        id: `indicator--${Math.random().toString(36).substring(2, 11)}`,
        created: now,
        modified: now,
        name: `Phishing Link: ${l.url.slice(0, 80)}`,
        indicator_types: ["phishing", "malicious-activity"],
        pattern: `[url:value = '${l.url.replace(/'/g, "\\'")}']`,
        pattern_type: "stix",
        pattern_version: "2.1",
        valid_from: now,
        confidence: 90
      });
    });

    const bundle = {
      type: "bundle",
      id: `bundle--${Math.random().toString(36).substring(2, 11)}`,
      spec_version: "2.1",
      objects
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `STIX21_${(parsedData.email_summary?.subject || "email").replace(/[^a-zA-Z0-9]/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const emailSummary = parsedData?.email_summary;
  const isMalicious = emailSummary?.verdict === "MALICIOUS";
  const isSuspicious = emailSummary?.verdict === "SUSPICIOUS";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "92vh",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-panel)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* HEADER BAR */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-panel-header)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem"
              }}
            >
              📧
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "1.18rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Email Forensics & Sandbox Detonation Studio
                </h2>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 750,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(0, 172, 245, 0.15)",
                    color: "#00acf5",
                    border: "1px solid rgba(0, 172, 245, 0.3)"
                  }}
                >
                  Gateway 2 • RFC822 Engine
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                Analyze raw .EML/.MSG files, inspect SPF/DKIM authentication, detect quishing, and detonate extracted links in isolated browsers.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {parsedData && (
              <button
                type="button"
                onClick={() => {
                  setParsedData(null);
                  setError("");
                }}
                className="preset-pill"
                style={{ fontSize: "0.75rem", padding: "6px 12px" }}
              >
                🔄 Load Another Email
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: "1.3rem",
                cursor: "pointer",
                padding: "4px 8px"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* BODY CONTAINER */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "12px", borderRadius: "8px", fontSize: "0.85rem" }}>
              ⚠️ {error}
            </div>
          )}

          {/* VIEW A: NO EMAIL PARSED YET (INPUT / DROPZONE) */}
          {!parsedData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* SUB-TABS: DRAG DROP VS RAW TEXT */}
              <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", paddingBottom: "12px" }}>
                <button
                  type="button"
                  className={`preset-pill ${activeInputTab === "upload" ? "threat" : ""}`}
                  style={{ background: activeInputTab === "upload" ? "#00acf5" : "transparent", color: "#fff" }}
                  onClick={() => setActiveInputTab("upload")}
                >
                  📥 Upload .EML / .MSG File
                </button>
                <button
                  type="button"
                  className={`preset-pill ${activeInputTab === "raw_text" ? "threat" : ""}`}
                  style={{ background: activeInputTab === "raw_text" ? "#00acf5" : "transparent", color: "#fff" }}
                  onClick={() => setActiveInputTab("raw_text")}
                >
                  📝 Paste Raw MIME / RFC822 Source
                </button>
              </div>

              {activeInputTab === "upload" && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? "#00acf5" : "rgba(71, 85, 105, 0.6)"}`,
                    borderRadius: "12px",
                    padding: "40px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: isDragging ? "rgba(0, 172, 245, 0.08)" : "rgba(11, 23, 48, 0.5)",
                    transition: "all 0.2s ease",
                    position: "relative"
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".eml,.msg,.txt"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />

                  <div style={{ fontSize: "2.6rem", marginBottom: "12px" }}>📁</div>
                  <h3 style={{ margin: "0 0 6px 0", color: "#f8fafc", fontSize: "1.1rem", fontWeight: 700 }}>
                    {loading ? "Processing and extracting email components..." : "Drag and drop your .EML or .MSG email file here"}
                  </h3>
                  <p style={{ margin: "0 0 16px 0", color: "#94a3b8", fontSize: "0.85rem", maxWidth: "480px", marginInline: "auto" }}>
                    BrowseGuard will parse RFC822 headers, inspect SPF/DKIM verification, identify quishing threats, and extract all embedded hyperlinks.
                  </p>

                  <button
                    type="button"
                    className="btn-anyrun-primary"
                    disabled={loading}
                    style={{ padding: "8px 20px", fontSize: "0.85rem" }}
                  >
                    {loading ? "Inspecting File..." : "Browse Local File (.eml)"}
                  </button>
                </div>
              )}

              {activeInputTab === "raw_text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste raw email headers and body starting with From:, Subject:, Content-Type:..."
                    style={{
                      width: "100%",
                      height: "220px",
                      background: "#030712",
                      border: "1px solid #334155",
                      color: "#f8fafc",
                      borderRadius: "8px",
                      padding: "12px",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "0.82rem",
                      resize: "vertical"
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      disabled={loading || !rawText.trim()}
                      onClick={() => handleParseEml(rawText)}
                      className="btn-anyrun-primary"
                      style={{ padding: "8px 22px", fontSize: "0.85rem" }}
                    >
                      {loading ? "Parsing..." : "⚡ Parse & Inspect Raw Email"}
                    </button>
                  </div>
                </div>
              )}

              {/* QUICK LOAD PHISHING TEST PRESETS */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(51, 65, 85, 0.4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "1rem" }}>⚡</span>
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#e2e8f0" }}>
                    OR LOAD PRE-CONFIGURED REALISTIC PHISHING SAMPLES (1-CLICK TEST):
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => handleParseEml(PRESET_M365)}
                    style={{
                      background: "#091224",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", fontWeight: 800 }}>
                        SAMPLE 1
                      </span>
                      <strong style={{ fontSize: "0.85rem", color: "#f8fafc" }}>Microsoft 365 Password Expiry</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#94a3b8", lineHeight: "1.4" }}>
                      SPF Spoofed envelope, deceptive anchor link mismatch, and executable payload (.pdf.exe).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleParseEml(PRESET_INVOICE)}
                    style={{
                      background: "#091224",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", fontWeight: 800 }}>
                        SAMPLE 2
                      </span>
                      <strong style={{ fontSize: "0.85rem", color: "#f8fafc" }}>Overdue Vendor Invoice Lure</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#94a3b8", lineHeight: "1.4" }}>
                      Wire transfer social engineering pressure, suspicious .TOP domain link, and fake billing portal.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleParseEml(PRESET_QUISHING)}
                    style={{
                      background: "#091224",
                      border: "1px solid rgba(168, 85, 247, 0.35)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontWeight: 800 }}>
                        SAMPLE 3
                      </span>
                      <strong style={{ fontSize: "0.85rem", color: "#f8fafc" }}>Executive Quishing (QR Code)</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#94a3b8", lineHeight: "1.4" }}>
                      Mobile 2FA authentication bypass tactic steering victims away from managed endpoints.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: EMAIL SUCCESSFULLY PARSED (FORENSICS & DETONATION HUB) */}
          {parsedData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* TOP VERDICT & RISK SCORE BANNER */}
              <div
                style={{
                  background: isMalicious
                    ? "linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)"
                    : isSuspicious
                    ? "linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)"
                    : "linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)",
                  border: `1px solid ${isMalicious ? "#ef4444" : isSuspicious ? "#f59e0b" : "#22c55e"}`,
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: isMalicious ? "#ef4444" : isSuspicious ? "#f59e0b" : "#22c55e",
                      color: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      boxShadow: `0 0 20px ${isMalicious ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 197, 94, 0.4)"}`
                    }}
                  >
                    <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{emailSummary?.threat_score}</span>
                    <span style={{ fontSize: "0.62rem", textTransform: "uppercase" }}>/ 100</span>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 850,
                          padding: "2px 10px",
                          borderRadius: "4px",
                          background: isMalicious ? "#ef4444" : isSuspicious ? "#f59e0b" : "#22c55e",
                          color: "#fff"
                        }}
                      >
                        {emailSummary?.verdict}
                      </span>
                      <strong style={{ fontSize: "1.05rem", color: "#f8fafc" }}>
                        {emailSummary?.subject}
                      </strong>
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "#cbd5e1" }}>
                      From: <code style={{ color: "#38bdf8" }}>{emailSummary?.from?.raw}</code>
                      {emailSummary?.return_path && emailSummary?.return_path !== emailSummary?.from?.address && (
                        <span style={{ marginLeft: "10px", color: "#f87171" }}>
                          ⚠️ Envelope Spoofed: Return-Path is <code style={{ color: "#fca5a5" }}>{emailSummary.return_path}</code>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleExportEmlStix}
                    className="preset-pill"
                    style={{
                      padding: "8px 14px",
                      fontSize: "0.78rem",
                      fontWeight: 750,
                      background: "rgba(147, 51, 234, 0.2)",
                      color: "#d8b4fe",
                      border: "1px solid rgba(147, 51, 234, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    title="Export STIX 2.1 Threat Intel Bundle for this Email"
                  >
                    <span>📦</span> Export STIX 2.1
                  </button>
                  <button
                    type="button"
                    onClick={handleDetonateAll}
                    disabled={bulkDetonating || parsedData.extracted_links.length === 0}
                    className="btn-anyrun-primary"
                    style={{
                      padding: "9px 18px",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      background: "#ef4444",
                      boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
                    }}
                  >
                    {bulkDetonating ? "Queuing VM Sandboxes..." : `🚀 Detonate All (${parsedData.extracted_links.length}) Links in VMs`}
                  </button>
                </div>
              </div>

              {/* AUTHENTICATION MATRIX & THREAT SIGNALS ROW */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* CARD 1: EMAIL AUTHENTICATION RESULTS */}
                <div style={{ background: "#0b1426", padding: "14px 16px", borderRadius: "8px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    RFC822 DOMAIN AUTHENTICATION
                  </span>
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    {["spf", "dkim", "dmarc"].map((authKey) => {
                      const val = emailSummary?.auth_results?.[authKey] || "UNKNOWN";
                      const isPass = val === "PASS";
                      const isFail = val === "FAIL";
                      return (
                        <div
                          key={authKey}
                          style={{
                            flex: 1,
                            padding: "8px",
                            borderRadius: "6px",
                            background: isPass ? "rgba(34, 197, 94, 0.15)" : isFail ? "rgba(239, 68, 68, 0.15)" : "rgba(100, 116, 139, 0.15)",
                            border: `1px solid ${isPass ? "#22c55e" : isFail ? "#ef4444" : "#64748b"}`,
                            textAlign: "center"
                          }}
                        >
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                            {authKey.toUpperCase()}
                          </div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: isPass ? "#4ade80" : isFail ? "#f87171" : "#cbd5e1" }}>
                            {val}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CARD 2: ATTACHMENTS & TELEMETRY */}
                <div style={{ background: "#0b1426", padding: "14px 16px", borderRadius: "8px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ATTACHMENTS & ARTIFACTS ({emailSummary?.attachments_count || 0})
                  </span>
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {emailSummary?.attachments_count === 0 ? (
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>No binary file attachments included in MIME stream.</span>
                    ) : (
                      emailSummary?.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: att.is_risky ? "rgba(239, 68, 68, 0.12)" : "rgba(15, 23, 42, 0.5)",
                            border: `1px solid ${att.is_risky ? "rgba(239, 68, 68, 0.4)" : "rgba(51, 65, 85, 0.4)"}`,
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "0.8rem"
                          }}
                        >
                          <span style={{ color: att.is_risky ? "#f87171" : "#cbd5e1", fontWeight: 700 }}>
                            📎 {att.filename}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: att.is_risky ? "#ef4444" : "#94a3b8", fontWeight: 800 }}>
                            {att.is_risky ? "⚠️ HIGH-RISK PAYLOAD" : `${att.size_bytes} bytes`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* DETAILED WORKBENCH TABS */}
              <div>
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", paddingBottom: "8px" }}>
                  <button
                    type="button"
                    className={`preset-pill ${viewBodyTab === "links" ? "threat" : ""}`}
                    style={{ background: viewBodyTab === "links" ? "#00acf5" : "transparent", color: "#fff" }}
                    onClick={() => setViewBodyTab("links")}
                  >
                    🔗 Extracted Links ({parsedData.extracted_links.length})
                  </button>
                  <button
                    type="button"
                    className={`preset-pill ${viewBodyTab === "indicators" ? "threat" : ""}`}
                    style={{ background: viewBodyTab === "indicators" ? "#00acf5" : "transparent", color: "#fff" }}
                    onClick={() => setViewBodyTab("indicators")}
                  >
                    🛡️ Attack Signals ({emailSummary?.phishing_indicators?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`preset-pill ${viewBodyTab === "preview" ? "threat" : ""}`}
                    style={{ background: viewBodyTab === "preview" ? "#00acf5" : "transparent", color: "#fff" }}
                    onClick={() => setViewBodyTab("preview")}
                  >
                    👁️ Sanitized Email Preview
                  </button>
                  <button
                    type="button"
                    className={`preset-pill ${viewBodyTab === "raw" ? "threat" : ""}`}
                    style={{ background: viewBodyTab === "raw" ? "#00acf5" : "transparent", color: "#fff" }}
                    onClick={() => setViewBodyTab("raw")}
                  >
                    ⚙️ Raw HTML / MIME Body
                  </button>
                </div>

                <div style={{ marginTop: "14px" }}>
                  {/* TAB 1: EXTRACTED HYPERLINKS (THE CORE INTERACTIVE DETONATION LIST) */}
                  {viewBodyTab === "links" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {parsedData.extracted_links.length === 0 ? (
                        <div style={{ padding: "24px", textAlign: "center", color: "#64748b", background: "#08101e", borderRadius: "8px" }}>
                          No hyperlinks were found in this email message.
                        </div>
                      ) : (
                        parsedData.extracted_links.map((linkObj, index) => {
                          const state = detonatingLinks[linkObj.url];
                          return (
                            <div
                              key={index}
                              style={{
                                background: linkObj.is_mismatched ? "rgba(239, 68, 68, 0.08)" : "#091224",
                                border: `1px solid ${linkObj.is_mismatched ? "rgba(239, 68, 68, 0.4)" : "rgba(51, 65, 85, 0.5)"}`,
                                borderRadius: "8px",
                                padding: "14px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "12px"
                              }}
                            >
                              <div style={{ flex: 1, minWidth: "300px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                  <span style={{ fontSize: "0.75rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(0, 172, 245, 0.15)", color: "#38bdf8", fontWeight: 700 }}>
                                    DESTINATION
                                  </span>
                                  <code style={{ fontSize: "0.85rem", color: "#f8fafc", wordBreak: "break-all" }}>
                                    {linkObj.url}
                                  </code>
                                </div>

                                {linkObj.is_mismatched && (
                                  <div style={{ fontSize: "0.78rem", color: "#f87171", marginTop: "4px" }}>
                                    ⚠️ <strong>Deceptive Anchor Mismatch:</strong> In-text link claims to be{" "}
                                    <code style={{ color: "#fca5a5" }}>{linkObj.display_text}</code>
                                  </div>
                                )}

                                {linkObj.is_ip_address && (
                                  <div style={{ fontSize: "0.78rem", color: "#fbbf24", marginTop: "2px" }}>
                                    ⚠️ <strong>Direct IP Address Host:</strong> Points to raw IP ({linkObj.hostname})
                                  </div>
                                )}
                              </div>

                              {/* ACTIONS FOR THIS LINK */}
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => onLaunchRbi(linkObj.url)}
                                  className="preset-pill"
                                  style={{
                                    fontSize: "0.76rem",
                                    padding: "6px 12px",
                                    background: "#00acf5",
                                    color: "#fff",
                                    fontWeight: 700,
                                    border: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                  }}
                                  title="Open immediately in secure Remote Browser Isolation container"
                                >
                                  <span>⚡</span> Isolated Browser (RBI)
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDetonateSingle(linkObj)}
                                  disabled={state?.status === "ACTIVE" || state?.status === "QUEUED"}
                                  className="preset-pill"
                                  style={{
                                    fontSize: "0.76rem",
                                    padding: "6px 12px",
                                    background: state?.status === "ACTIVE" ? "#10b981" : "transparent",
                                    color: state?.status === "ACTIVE" ? "#061325" : "#e2e8f0",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    fontWeight: 700
                                  }}
                                >
                                  {state?.status === "ACTIVE"
                                    ? `✓ Enqueued (${state.sessionId?.slice(0, 10)}...)`
                                    : state?.status === "QUEUED"
                                    ? "⏳ Submitting..."
                                    : "🔬 Detonate in VM"}
                                </button>

                                {state?.sessionId && onStartSandboxScan && (
                                  <button
                                    type="button"
                                    onClick={() => onStartSandboxScan(state.sessionId)}
                                    className="preset-pill"
                                    style={{
                                      fontSize: "0.74rem",
                                      padding: "6px 10px",
                                      background: "rgba(168, 85, 247, 0.2)",
                                      color: "#c084fc",
                                      border: "1px solid rgba(168, 85, 247, 0.4)",
                                      fontWeight: 700
                                    }}
                                  >
                                    View Live Report ↗
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 2: PHISHING INDICATORS / MITRE SIGNALS */}
                  {viewBodyTab === "indicators" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {emailSummary?.phishing_indicators?.map((ind, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: "#091224",
                            border: `1px solid ${ind.severity === "CRITICAL" ? "#ef4444" : ind.severity === "HIGH" ? "#f97316" : "#eab308"}`,
                            borderRadius: "8px",
                            padding: "12px 16px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{ind.title}</strong>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: 800,
                                background: ind.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.2)" : "rgba(249, 115, 22, 0.2)",
                                color: ind.severity === "CRITICAL" ? "#f87171" : "#fb923c"
                              }}
                            >
                              {ind.severity}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                            {ind.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 3: SANITIZED PREVIEW */}
                  {viewBodyTab === "preview" && (
                    <div
                      style={{
                        background: "#030712",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        padding: "16px",
                        maxHeight: "360px",
                        overflowY: "auto",
                        color: "#f8fafc",
                        fontSize: "0.86rem",
                        lineHeight: "1.6"
                      }}
                      dangerouslySetInnerHTML={{
                        __html: parsedData.raw_body_preview || "<p>No body text available.</p>"
                      }}
                    />
                  )}

                  {/* TAB 4: RAW BODY */}
                  {viewBodyTab === "raw" && (
                    <pre
                      style={{
                        margin: 0,
                        padding: "14px",
                        background: "#030712",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        color: "#38bdf8",
                        fontSize: "0.78rem",
                        maxHeight: "360px",
                        overflowX: "auto",
                        fontFamily: "ui-monospace, monospace"
                      }}
                    >
                      {parsedData.raw_body_preview}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
