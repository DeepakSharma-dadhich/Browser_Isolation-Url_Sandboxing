# BrowseGuard Zero-Trust Browser Extension Guide

## 1. Overview

The **BrowseGuard Zero-Trust URL Shield** is a Manifest V3 browser extension for Google Chrome, Microsoft Edge, and Brave. It intercepts links clicked inside webmail interfaces (Gmail, Outlook 365) and regular web browsing, queries the BrowseGuard sandbox API, and prevents one-click execution of credential phishing or drive-by malware.

---

## 2. Installation (Developer / Sideload Mode)

1. Open your Chromium-based browser (Chrome, Edge, Brave).
2. Navigate to the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **Developer mode** (toggle switch in top-right or left sidebar).
4. Click **Load unpacked**.
5. Select the `extension/` directory from this repository:
   ```
   Email-URL-Sandbox/extension
   ```
6. The BrowseGuard shield icon will appear in your browser toolbar!

---

## 3. Configuration & Options

1. Right-click the BrowseGuard shield icon and select **Options** (or click Settings in the popup).
2. Configure settings:
   - **Control Plane API Endpoint**: `http://localhost:3000` (or your company's server URL)
   - **Enterprise API Key**: `bg_live_email_gateway_default`
   - **Quarantine Risk Threshold**: `60` (Default)
   - **Auto-Shield Webmail Links**: Checked
3. Click **Test Connection** to confirm connectivity to the BrowseGuard backend.
4. Click **Save Settings**.

---

## 4. How It Works in Action

### 4.1 In-Page Link Interception
- When an employee clicks a link in Gmail (`mail.google.com`) or Outlook Web (`outlook.office.com`):
  1. An animated toast displays: *"BrowseGuard Zero-Trust Shield: Inspecting link in isolated Chromium sandbox..."*
  2. If the link is evaluated as **SAFE**: navigation proceeds smoothly without user interruption.
  3. If the link is evaluated as **SUSPICIOUS**, **HIGH_RISK**, or **MALICIOUS**:
     - The page displays a security modal overlay.
     - Displays the Threat Level and Risk Score (e.g., `Score: 100/100 - Critical Threat`).
     - Offers:
       - **Abort & Close (Recommended)**: Cancels navigation.
       - **Inspect Canonical Forensic Report**: Opens the full report in BrowseGuard's web dashboard.

### 4.2 Right-Click In-Page Link Safety Check (Zero Redirection)
- On any webpage, right-click any link and select:
  - **`🛡️ Check Link Safety (In-Page)`**:
    1. Inspects destination without navigating away or opening new tabs.
    2. **🟢 Safe:** Displays a floating emerald card with risk score `0/100`, verified destination preview, and 1-click open or dismiss (auto-closes in 6s).
    3. **🟡 Suspicious / 🔴 Malicious:** Displays in-page threat modal with risk score, deceptive indicators, and options to detonate in safe isolation or abort.
  - **`⚡ Open in Isolated Sandbox (New Tab)`**:
    - Power user shortcut to launch a remote container for the link immediately in a new tab.

### 4.3 Toolbar Popup Quick Scanner
- Click the shield icon in the browser toolbar:
  - View real-time protection statistics: **Links Scanned** and **Threats Blocked**.
  - Paste any suspicious URL directly into the **Quick Threat Scanner** to inspect without leaving the popup.
