import React from "react";

export default function ThreatRiskDial({
  score = 0,
  verdict = "SAFE",
  riskLevel = "low",
  findings = [],
  action = "ALLOW"
}) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score || 0)));

  // SVG Gauge calculations
  // Radius 70, circumference = 2 * PI * 70 ≈ 440
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  // Arc angle: 260 degrees (semi-circle + sweep)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * normalizedScore) / 100;

  let gaugeColor = "#00f59b"; // Green
  let verdictClass = "safe";
  if (normalizedScore > 50 || verdict === "MALICIOUS" || verdict === "HIGH_RISK") {
    gaugeColor = "#ff3366"; // Crimson
    verdictClass = "danger";
  } else if (normalizedScore > 25 || verdict === "SUSPICIOUS") {
    gaugeColor = "#ffb700"; // Amber
    verdictClass = "suspicious";
  }

  // Derive categories from findings
  const categories = [
    {
      name: "Network & Redirects",
      icon: "🌐",
      val: findings.some((f) => f.category === "network" || f.category === "redirect" || f.category === "network_ssrf") ? 85 : 15,
      color: "#00acf5"
    },
    {
      name: "Social Engineering & Lures",
      icon: "⚡",
      val: findings.some((f) => f.category === "social_engineering_lure" || f.category === "evasion" || f.category === "obfuscation") ? 95 : 10,
      color: "#ec4899"
    },
    {
      name: "Phishing & Credential Theft",
      icon: "🎣",
      val: findings.some((f) => f.category === "credential_phishing" || f.category === "phishing" || f.category === "credentials" || f.category === "brand_impersonation") ? 90 : 20,
      color: "#ff3366"
    },
    {
      name: "Malware & Clipboard Evasion",
      icon: "🛡️",
      val: findings.some((f) => f.category === "malware_evasion" || f.category === "anti_analysis" || f.category === "download" || f.category === "executable") ? 85 : 15,
      color: "#ffb700"
    }
  ];

  // Extract MITRE ATT&CK techniques
  const mitreTechniques = findings
    .filter((f) => f.mitre_attack_id)
    .map((f) => ({
      id: f.mitre_attack_id,
      name: f.mitre_attack_name || f.title || "Technique"
    }))
    .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

  return (
    <div className="soc-threat-dial-card">
      <div className="soc-dial-header">
        <div>
          <span className="soc-dial-eyebrow">HEURISTIC VERDICT ENGINE</span>
          <h3 className="soc-dial-title">Threat Risk Score</h3>
        </div>
        <span className={`soc-verdict-pill ${verdictClass}`}>
          {verdict || "UNKNOWN"}
        </span>
      </div>

      {/* SVG Circular Dial Gauge */}
      <div className="soc-gauge-wrap">
        <svg
          className="soc-gauge-svg"
          width="170"
          height="170"
          viewBox="0 0 160 160"
        >
          {/* Background circle track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--border-strong, rgba(148, 163, 184, 0.25))"
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            transform="rotate(135 80 80)"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="12"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(135 80 80)"
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: `drop-shadow(0 0 8px ${gaugeColor}66)`
            }}
          />
        </svg>

        {/* Center score readout */}
        <div className="soc-gauge-readout">
          <span className="soc-score-num" style={{ color: gaugeColor }}>
            {normalizedScore}
          </span>
          <span className="soc-score-scale">/ 100</span>
          <span className="soc-score-level" style={{ color: gaugeColor }}>
            {riskLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Policy decision pill */}
      <div className="soc-policy-row">
        <span className="soc-policy-label">Policy Action:</span>
        <span
          className="soc-policy-value"
          style={{
            color: action === "ALLOW" ? "#00f59b" : "#ff3366",
            background: action === "ALLOW" ? "rgba(0, 245, 155, 0.12)" : "rgba(255, 51, 102, 0.12)",
            borderColor: action === "ALLOW" ? "rgba(0, 245, 155, 0.3)" : "rgba(255, 51, 102, 0.3)"
          }}
        >
          {action === "ALLOW" ? "✓ ALLOW ACCESS" : "⛔ BLOCK & QUARANTINE"}
        </span>
      </div>

      {/* Categorical Threat Breakdown Bars */}
      <div className="soc-breakdown-section">
        <div className="soc-breakdown-title">Categorical Risk Signals</div>
        <div className="soc-breakdown-list">
          {categories.map((cat) => (
            <div key={cat.name} className="soc-breakdown-item">
              <div className="soc-breakdown-label">
                <span>{cat.icon} {cat.name}</span>
                <span style={{ color: cat.color }}>{cat.val}%</span>
              </div>
              <div className="soc-breakdown-bar-bg">
                <div
                  className="soc-breakdown-bar-fill"
                  style={{
                    width: `${cat.val}%`,
                    backgroundColor: cat.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MITRE ATT&CK Matrix Techniques */}
      {mitreTechniques.length > 0 && (
        <div className="soc-mitre-section">
          <div className="soc-mitre-title">MITRE ATT&CK® Techniques</div>
          <div className="soc-mitre-tags">
            {mitreTechniques.map((t) => (
              <span key={t.id} className="soc-mitre-tag" title={t.name}>
                <span className="soc-mitre-id">{t.id}</span>
                <span className="soc-mitre-name">{t.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
