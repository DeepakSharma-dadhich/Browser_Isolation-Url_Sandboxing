/**
 * Safe In-Lab Cyber Threat Simulation Scenarios.
 * 
 * Provides live, isolated detonation targets for security analysts to observe
 * BrowseGuard's advanced heuristics in real-time:
 * - ClickFix Fake CAPTCHA / PowerShell Paste Lure (MITRE T1204.002)
 * - OAuth 2.0 Device Authorization Phishing (MITRE T1528)
 * - Tech Support Scareware Lockout (MITRE T1204.001)
 * - Fake Browser Update Lure (MITRE T1189)
 */
"use strict";

const express = require("express");
const router = express.Router();

// 1. Simulation Directory Index
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BrowseGuard In-Lab Behavioral Cyber Threat Scenarios",
    simulations: [
      {
        id: "clickfix-captcha",
        name: "ClickFix Fake CAPTCHA / PowerShell Paste Lure",
        path: "/api/v1/simulations/clickfix-captcha",
        mitre_attack_id: "T1204.002",
        category: "social_engineering_lure",
        severity: "CRITICAL",
        description: "Deceptive Cloudflare Turnstile prompt instructing user to open Run dialog (Win+R) and paste clipboard command."
      },
      {
        id: "oauth-device-login",
        name: "OAuth 2.0 Device Authorization Phishing",
        path: "/api/v1/simulations/oauth-device-login",
        mitre_attack_id: "T1528",
        category: "credential_phishing",
        severity: "CRITICAL",
        description: "Encrypted SharePoint lure coercing user to visit microsoft.com/devicelogin and enter an attacker pairing code."
      },
      {
        id: "scareware-lockout",
        name: "Tech Support Scam / Fake Security Lockout",
        path: "/api/v1/simulations/scareware-lockout",
        mitre_attack_id: "T1204.001",
        category: "social_engineering_lure",
        severity: "HIGH",
        description: "Simulated Windows Defender infection lockout demanding immediate call to a fraud helpline."
      },
      {
        id: "fake-chrome-update",
        name: "Fake Browser Update Lure (SocGholish Vector)",
        path: "/api/v1/simulations/fake-chrome-update",
        mitre_attack_id: "T1189",
        category: "social_engineering_lure",
        severity: "HIGH",
        description: "Outdated Google Chrome warning urging installation of an untrusted browser patch package."
      }
    ]
  });
});

// 2. Scenario A: ClickFix Fake Turnstile / PowerShell Paste Lure
router.get("/clickfix-captcha", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cloudflare Human Verification Required</title>
  <style>
    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .cf-box {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 36px 40px;
      max-width: 520px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.6);
      text-align: center;
    }
    .cf-logo {
      color: #f6821f;
      font-weight: 800;
      font-size: 1.4rem;
      letter-spacing: 1px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    h2 {
      color: #f0f6fc;
      margin-top: 0;
      font-size: 1.35rem;
    }
    .step-list {
      text-align: left;
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 6px;
      padding: 18px 22px;
      margin: 20px 0;
      line-height: 1.7;
      font-size: 0.95rem;
    }
    .key-badge {
      background: #30363d;
      color: #58a6ff;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: bold;
      border: 1px solid #484f58;
    }
    .btn-verify {
      background: #238636;
      color: #ffffff;
      border: none;
      padding: 12px 28px;
      font-size: 1rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
    }
    .btn-verify:hover { background: #2ea043; }
    .footer-note { font-size: 0.75rem; color: #8b949e; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="cf-box">
    <div class="cf-logo">☁️ CLOUDFLARE</div>
    <h2>Verify You Are Human</h2>
    <p style="color: #8b949e; font-size: 0.9rem;">Please complete the security check to continue navigating to protected resources.</p>
    
    <div class="step-list">
      <strong>Verification steps:</strong><br>
      1. Press <span class="key-badge">Windows + R</span> to open the Run dialog.<br>
      2. Press <span class="key-badge">Ctrl + V</span> to paste the verification string.<br>
      3. Hit <span class="key-badge">Enter</span> to complete human verification.
    </div>

    <button type="button" class="btn-verify" id="verifyBtn" onclick="runLure()">I am not a robot</button>
    <div class="footer-note">Ray ID: 893c4f92d8102a9b • Performance & security by Cloudflare</div>
  </div>

  <script>
    function runLure() {
      // Simulate clipboard write of benign demo powershell cradle
      if (navigator.clipboard) {
        navigator.clipboard.writeText("powershell -w hidden -enc JAB3AGUAYgA=")
          .catch(function(){});
      }
      alert("Verification sequence initiated. Press Win+R and Ctrl+V to confirm.");
    }
  </script>
</body>
</html>`);
});

// 3. Scenario B: OAuth 2.0 Device Code Authorization Phishing
router.get("/oauth-device-login", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Microsoft SharePoint - Secured Document Verification</title>
  <style>
    body {
      background: #f3f4f6;
      color: #1f2937;
      font-family: "Segoe UI", -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .ms-card {
      background: #ffffff;
      border-radius: 8px;
      padding: 40px;
      max-width: 480px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
    }
    .ms-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.25rem;
      font-weight: 700;
      color: #0078d4;
      margin-bottom: 24px;
    }
    .file-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .code-box {
      background: #e0f2fe;
      border: 1px solid #7dd3fc;
      border-radius: 6px;
      padding: 14px;
      font-size: 1.4rem;
      letter-spacing: 2px;
      font-weight: 800;
      text-align: center;
      color: #0369a1;
      margin: 16px 0;
    }
    ol { padding-left: 20px; font-size: 0.95rem; line-height: 1.6; color: #4b5563; }
    .disclaimer { font-size: 0.75rem; color: #9ca3af; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="ms-card">
    <div class="ms-logo">
      <span>📄</span> Microsoft SharePoint
    </div>
    <h3 style="margin-top: 0; color: #111827;">Encrypted Corporate Report</h3>
    <p style="font-size: 0.9rem; color: #4b5563;">
      The document <strong>Q3_Financial_Audit_Spreadsheet.xlsx</strong> is protected by organizational device authentication policy.
    </p>

    <div class="file-box">
      <span style="font-size: 2rem;">📊</span>
      <div>
        <div style="font-weight: 600;">Q3_Financial_Audit.xlsx</div>
        <div style="font-size: 0.8rem; color: #64748b;">4.8 MB • Encrypted with Azure IRM</div>
      </div>
    </div>

    <ol>
      <li>In a browser, go to <strong>https://microsoft.com/devicelogin</strong></li>
      <li>Enter the device authorization pairing code shown below:</li>
    </ol>

    <div class="code-box">B7X8-K9M2</div>

    <p style="font-size: 0.85rem; color: #6b7280; text-align: center;">
      After entering the code, authorize the Enterprise Data Viewer application to unlock file contents.
    </p>

    <div class="disclaimer">Microsoft 365 Security & Compliance Center • Device Flow Protocol</div>
  </div>
</body>
</html>`);
});

// 4. Scenario C: Tech Support Scam Scareware Lockout
router.get("/scareware-lockout", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Windows Defender Security Warning: Threat Detected</title>
  <style>
    body {
      background: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .alert-dialog {
      background: #180000;
      border: 2px solid #dc2626;
      border-radius: 8px;
      padding: 36px 44px;
      max-width: 580px;
      text-align: center;
      box-shadow: 0 0 50px rgba(220, 38, 38, 0.5);
    }
    .shield-icon { font-size: 3.5rem; margin-bottom: 12px; }
    h1 { color: #ef4444; font-size: 1.6rem; margin: 0 0 14px 0; }
    p { font-size: 0.95rem; line-height: 1.6; color: #fca5a5; }
    .tel-banner {
      background: #dc2626;
      color: #ffffff;
      padding: 16px;
      border-radius: 6px;
      font-size: 1.4rem;
      font-weight: 800;
      margin: 24px 0;
      letter-spacing: 1px;
    }
    .details {
      background: #2b0b0b;
      border: 1px solid #7f1d1d;
      padding: 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #fecaca;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="alert-dialog">
    <div class="shield-icon">🛡️</div>
    <h1>CRITICAL SECURITY ALERT: Threat Detected</h1>
    <p>
      Windows Defender Security Center has detected <strong>Trojan:Win32/Spyware.Stealer</strong> on your computer.
      Access to this PC has been blocked. Do not restart or shut down your PC.
    </p>

    <div class="tel-banner">
      Call Microsoft Support Toll-Free:<br>
      1-800-555-0199
    </div>

    <div class="details">
      Security ID: SEC-DEF-9914<br>
      Status: Computer Locked<br>
      Infection: Trojan Spyware Data Exfiltration<br>
      Error code: #0x268D3
    </div>

    <p style="font-size: 0.8rem; color: #991b1b; margin-top: 20px;">
      Immediate assistance required to prevent permanent system damage or financial data compromise.
    </p>
  </div>
</body>
</html>`);
});

// 5. Scenario D: Fake Browser Update Lure (SocGholish)
router.get("/fake-chrome-update", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Update Google Chrome to Continue</title>
  <style>
    body {
      background: #202124;
      color: #e8eaed;
      font-family: "Google Sans", Roboto, Arial, sans-serif;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #292a2d;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    }
    .chrome-logo { font-size: 3.5rem; margin-bottom: 16px; }
    h2 { margin: 0 0 12px 0; font-size: 1.45rem; color: #ffffff; }
    p { font-size: 0.95rem; line-height: 1.6; color: #9aa0a6; }
    .btn-update {
      background: #1a73e8;
      color: #ffffff;
      border: none;
      border-radius: 24px;
      padding: 12px 32px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      margin-top: 24px;
    }
    .btn-update:hover { background: #1765cc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="chrome-logo">🌐</div>
    <h2>Your Chrome is out of date</h2>
    <p>
      An important security update is recommended. Please update your browser to continue navigating to this webpage safely.
    </p>
    <button class="btn-update" onclick="initUpdate()">Download Update Now</button>
  </div>
  <script>
    function initUpdate() {
      alert("Downloading chrome_patch_v128.js...");
    }
  </script>
</body>
</html>`);
});

module.exports = router;
