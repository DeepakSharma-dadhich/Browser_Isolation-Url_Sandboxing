import React, { useState } from "react";

export default function ScanVerdictBanner({
  result = {},
  findings = [],
  onLaunchRbi,
  onOpenReport
}) {
  const [perspective, setPerspective] = useState("user"); // "user" | "soc"

  const verdict = (result.verdict || "UNKNOWN").toUpperCase();
  const score = typeof result.risk_score === "number" ? result.risk_score : 0;
  const submittedUrl = result.submitted_url || "";
  const finalUrl = result.final_url || submittedUrl;

  // Detect specific threat signatures
  const hasUserinfo =
    submittedUrl.includes("@") ||
    findings.some(
      (f) =>
        f.id === "USERINFO-001" ||
        (f.category === "phishing" && f.title?.toLowerCase().includes("userinfo"))
    );

  const brandFinding = findings.find(
    (f) =>
      f.category === "BRAND_IMPERSONATION" ||
      f.category === "brand_impersonation" ||
      f.id?.includes("BRAND")
  );
  const detectedBrand = brandFinding?.evidence?.brand_name || null;

  const hasMalware = findings.some(
    (f) =>
      f.category === "malware_evasion" ||
      f.category === "download" ||
      f.id?.includes("CLICKFIX")
  );

  // Verdict Theme Palette
  let bannerBg = "rgba(16, 185, 129, 0.08)";
  let bannerBorder = "rgba(16, 185, 129, 0.35)";
  let accentColor = "#10b981";
  let statusIcon = "✅";
  let statusTitle = "Benign Web Activity — Verified Clean";

  if (verdict === "MALICIOUS" || verdict === "HIGH_RISK" || score >= 50) {
    bannerBg = "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)";
    bannerBorder = "rgba(239, 68, 68, 0.4)";
    accentColor = "#ef4444";
    statusIcon = "⛔";
    statusTitle = "High-Risk Threat Detected — Access Blocked";
  } else if (verdict === "SUSPICIOUS" || score >= 25) {
    bannerBg = "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)";
    bannerBorder = "rgba(245, 158, 11, 0.4)";
    accentColor = "#f59e0b";
    statusIcon = "⚠️";
    statusTitle = "Suspicious Behavior Observed — Caution Required";
  }

  // Plain-English Explanation derivation
  let plainEnglishText = "";
  let userAdvice = "";

  if (hasUserinfo) {
    plainEnglishText =
      "This link uses an '@' trick in the address. Under standard web protocols (RFC 3986), your browser completely ignores any text before '@' and quietly takes you to the website after '@'. Threat actors commonly send these in emails to disguise malicious destinations as familiar email addresses or trusted services.";
    userAdvice =
      "Do NOT click this link or reply to the email sender. BrowseGuard has safely quarantined this link in sandbox isolation.";
  } else if (detectedBrand) {
    plainEnglishText = `This webpage attempts to visually impersonate ${detectedBrand} using spoofed logos and layout to deceive you into logging in.`;
    userAdvice =
      "Never enter your corporate email, passwords, or multi-factor authentication (MFA) codes on this page.";
  } else if (hasMalware) {
    plainEnglishText =
      "The sandbox detected scripts or clipboard triggers attempting to bypass verification or initiate unauthorized downloads.";
    userAdvice =
      "Do not run any commands prompted by this website or open downloaded files.";
  } else if (score >= 50) {
    plainEnglishText =
      result.reason ||
      "Automated inspection identified deceptive forms and redirection behavior consistent with credential harvesting campaigns.";
    userAdvice =
      "Internal access to this destination is blocked by enterprise policy.";
  } else if (score >= 25) {
    plainEnglishText =
      result.reason ||
      "The destination exhibited irregular redirection hops or non-standard server headers.";
    userAdvice =
      "Exercise caution. If you must inspect this website, open it inside the isolated interactive sandbox.";
  } else {
    plainEnglishText =
      "The target URL detonated without detecting credential harvesting forms, deceptive redirects, or unauthorized payloads. Standard SSL/TLS certificates and legitimate domain boundaries observed.";
    userAdvice =
      "Safe to browse. You may open this URL directly or explore safely inside the sandbox container.";
  }

  return (
    <div
      style={{
        background: bannerBg,
        border: `1px solid ${bannerBorder}`,
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "18px",
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.25)`,
        backdropFilter: "blur(10px)"
      }}
    >
      {/* Top Bar: Verdict & Perspective Toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem" }}>{statusIcon}</span>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 800,
                color: accentColor
              }}
            >
              VERDICT: {verdict} • THREAT RISK SCORE {score}/100
            </span>
            <h3
              style={{
                margin: "2px 0 0",
                fontSize: "1.05rem",
                color: "#f8fafc",
                fontWeight: 800
              }}
            >
              {statusTitle}
            </h3>
          </div>
        </div>

        {/* Dual-Perspective Mode Switcher */}
        <div
          style={{
            display: "flex",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "3px"
          }}
        >
          <button
            type="button"
            onClick={() => setPerspective("user")}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              background:
                perspective === "user"
                  ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                  : "transparent",
              color: perspective === "user" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease"
            }}
          >
            👤 Plain-English User View
          </button>
          <button
            type="button"
            onClick={() => setPerspective("soc")}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              background:
                perspective === "soc"
                  ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                  : "transparent",
              color: perspective === "soc" ? "#ffffff" : "#94a3b8",
              transition: "all 0.15s ease"
            }}
          >
            🛡️ SOC Analyst Technical View
          </button>
        </div>
      </div>

      {/* Perspective Content */}
      {perspective === "user" ? (
        // END-USER PERSPECTIVE
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "20px",
            alignItems: "center"
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: "0.86rem",
                color: "#cbd5e1",
                lineHeight: 1.55
              }}
            >
              {plainEnglishText}
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0, 0, 0, 0.25)",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>💡</span>
              <span style={{ fontSize: "0.8rem", color: "#e2e8f0", fontWeight: 600 }}>
                <strong>Recommendation:</strong> {userAdvice}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            {onLaunchRbi && (
              <button
                type="button"
                onClick={onLaunchRbi}
                style={{
                  background: "linear-gradient(135deg, #0ea5e9 0%, #00e5ff 100%)",
                  color: "#0b1220",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 12px rgba(0, 229, 255, 0.25)"
                }}
              >
                🖥️ Open in Safe Container
              </button>
            )}
            {onOpenReport && (
              <button
                type="button"
                onClick={onOpenReport}
                style={{
                  background: "rgba(30, 41, 59, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                📄 Threat Brief
              </button>
            )}
          </div>
        </div>
      ) : (
        // SOC ANALYST TECHNICAL VIEW
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            fontSize: "0.8rem",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)"
          }}
        >
          <div>
            <span style={{ color: "#94a3b8", display: "block", marginBottom: "2px" }}>
              Target Host & Destination:
            </span>
            <code style={{ color: "#38bdf8", wordBreak: "break-all" }}>
              {submittedUrl || "N/A"}
            </code>
            {result.domain_changed && (
              <span
                style={{
                  display: "block",
                  color: "#f59e0b",
                  fontSize: "0.72rem",
                  marginTop: "3px"
                }}
              >
                ⚠️ Cross-Domain Redirection to: {finalUrl}
              </span>
            )}
          </div>

          <div>
            <span style={{ color: "#94a3b8", display: "block", marginBottom: "2px" }}>
              MITRE ATT&CK® Techniques:
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
              {findings.some((f) => f.mitre_attack_id) ? (
                findings
                  .filter((f) => f.mitre_attack_id)
                  .map((f, i) => (
                    <span
                      key={i}
                      style={{
                        background: "rgba(239, 68, 68, 0.18)",
                        color: "#f87171",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.72rem",
                        fontFamily: "monospace"
                      }}
                      title={f.title}
                    >
                      {f.mitre_attack_id}
                    </span>
                  ))
              ) : (
                <span style={{ color: "#64748b", fontSize: "0.74rem" }}>
                  None triggered
                </span>
              )}
            </div>
          </div>

          <div>
            <span style={{ color: "#94a3b8", display: "block", marginBottom: "2px" }}>
              Policy Decision & Heuristics:
            </span>
            <span
              style={{
                color: result.allow_user_access ? "#10b981" : "#ef4444",
                fontWeight: 700
              }}
            >
              {result.allow_user_access ? "PASS (Allowed)" : "BLOCK (Quarantine Enforced)"}
            </span>
            <span
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: "0.72rem",
                marginTop: "2px"
              }}
            >
              {findings.length} rule evaluation(s) recorded
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: "8px" }}>
            {onOpenReport && (
              <button
                type="button"
                onClick={onOpenReport}
                style={{
                  background: "rgba(16, 185, 129, 0.18)",
                  border: "1px solid rgba(16, 185, 129, 0.5)",
                  color: "#34d399",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                📋 Official SOC IR Brief (PDF)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
