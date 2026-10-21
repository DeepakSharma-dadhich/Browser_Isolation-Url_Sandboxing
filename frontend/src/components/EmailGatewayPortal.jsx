import React, { useState, useEffect } from "react";

export default function EmailGatewayPortal({ onLaunchRbi, onBackToPortal }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKeyData, setCreatedKeyData] = useState(null);
  const [keyError, setKeyError] = useState("");

  // Code snippet language tab
  const [activeLang, setActiveLang] = useState("python");
  const [copySuccess, setCopySuccess] = useState("");

  // Click-time URL Rewriting simulator
  const [testRewriteUrl, setTestRewriteUrl] = useState("https://phish-test.example.com/invoice-login");

  // Email link detonation tester
  const [emailSender, setEmailSender] = useState("billing-alert@spoofed-service.net");
  const [emailRecipient, setEmailRecipient] = useState("cfo@company.local");
  const [emailSubject, setEmailSubject] = useState("URGENT: Outstanding Vendor Invoice #88492");
  const [emailContent, setEmailContent] = useState(
    `Dear Accounting Team,\n\nPlease review your updated remittance statement immediately at:\nhttps://phish-test.example.com/invoice-login\n\nAlso verify the vendor wire details here:\nhttps://invoice.example.com/doc.pdf\n\nFailure to verify within 24 hours will suspend your account.`
  );
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractResults, setExtractResults] = useState(null);
  const [extractError, setExtractError] = useState("");

  // Fetch API keys
  async function fetchApiKeys() {
    setLoadingKeys(true);
    setKeyError("");
    try {
      const token = localStorage.getItem("bg_jwt_token");
      const res = await fetch("/api/v1/api-keys", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : { "X-API-Key": "bg_live_email_gateway_default" })
        }
      });
      const payload = await res.json();
      if (payload.success) {
        setApiKeys(payload.data || []);
      } else {
        const errMsg = payload.error?.message || payload.error || "Failed to load API keys.";
        setKeyError(errMsg);
      }
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setLoadingKeys(false);
    }
  }

  useEffect(() => {
    fetchApiKeys();
  }, []);

  async function handleActivateEmailTrial() {
    try {
      setLoadingKeys(true);
      const token = localStorage.getItem("bg_jwt_token");
      const res = await fetch("/api/v1/auth/activate-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ gateway: "email_gateway_api" })
      });
      const data = await res.json();
      if (res.ok) {
        setKeyError("");
        setExtractError("");
        fetchApiKeys();
      } else {
        alert(data.error || "Failed to activate trial");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingKeys(false);
    }
  }

  // Create new API Key
  async function handleCreateKey(e) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setKeyError("");
    setCreatedKeyData(null);

    try {
      const token = localStorage.getItem("bg_jwt_token");
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : { "X-API-Key": "bg_live_email_gateway_default" })
        },
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      const payload = await res.json();
      if (payload.success) {
        setCreatedKeyData(payload.data);
        setNewKeyName("");
        fetchApiKeys();
      } else {
        const errMsg = payload.error?.message || payload.error || "Failed to create API key.";
        setKeyError(errMsg);
      }
    } catch (err) {
      setKeyError(err.message);
    }
  }

  // Revoke API Key
  async function handleRevokeKey(id) {
    if (!window.confirm("Are you sure you want to revoke this API key? Systems using it will lose access.")) {
      return;
    }
    try {
      const token = localStorage.getItem("bg_jwt_token");
      const res = await fetch(`/api/v1/api-keys/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : { "X-API-Key": "bg_live_email_gateway_default" })
        }
      });
      const payload = await res.json();
      if (payload.success) {
        fetchApiKeys();
      } else {
        alert(payload.error?.message || payload.error || "Failed to revoke key.");
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Extract & Detonate email links
  async function handleExtractAndDetonate(e) {
    e.preventDefault();
    setExtractLoading(true);
    setExtractError("");
    setExtractResults(null);

    try {
      const token = localStorage.getItem("bg_jwt_token");
      const res = await fetch("/api/v1/email-gateway/extract-and-detonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : { "X-API-Key": "bg_live_email_gateway_default" })
        },
        body: JSON.stringify({
          email_content: emailContent,
          sender: emailSender,
          recipient: emailRecipient,
          subject: emailSubject
        })
      });
      const payload = await res.json();
      if (payload.success) {
        setExtractResults(payload);
      } else {
        const errMsg = payload.error?.message || payload.error || "Failed to process email content.";
        setExtractError(errMsg);
      }
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtractLoading(false);
    }
  }

  function handleCopy(text, label) {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(""), 2000);
  }

  const activeClientId = apiKeys.find((k) => k.is_active)?.client_id || "bg_live_email_gateway_default";
  const rewriteTemplate = `${window.location.origin}/isolate?url={ORIGINAL_URL}&api_key=${activeClientId}`;

  // Code Snippets for various languages
  const pythonSnippet = `import requests

# BrowseGuard Email Security URL Inspection & Detonation Client
BROWSEGUARD_URL = "${window.location.origin}"
API_KEY = "${activeClientId}"

def inspect_email_links(email_body, sender, recipient, subject):
    """
    Extracts all links from email and detonates them in BrowseGuard sandbox.
    Returns verdict and rewritten Click-Time Browser Isolation links.
    """
    endpoint = f"{BROWSEGUARD_URL}/api/v1/email-gateway/extract-and-detonate"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }
    payload = {
        "email_content": email_body,
        "sender": sender,
        "recipient": recipient,
        "subject": subject
    }
    
    response = requests.post(endpoint, json=payload, headers=headers)
    result = response.json()
    
    print(f"[BrowseGuard] Extracted {result.get('extracted_count')} links.")
    for link in result.get('analyses', []):
        print(f"-> Target: {link['url']}")
        print(f"   Safe Isolation URL: {link['isolation_url']}")
        
    return result

# Example Execution
# inspect_email_links(email_text, "spammer@evil.com", "user@company.com", "Verify Account")`;

  const curlSnippet = `curl -X POST "${window.location.origin}/api/v1/email-gateway/extract-and-detonate" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeClientId}" \\
  -d '{
    "sender": "${emailSender}",
    "recipient": "${emailRecipient}",
    "subject": "${emailSubject}",
    "email_content": "Please verify your credentials at: https://phish-test.example.com/invoice-login"
  }'`;

  const nodeSnippet = `// Node.js / Express Email Gateway Middleware
const axios = require('axios');

async function checkEmailWithBrowseGuard(emailText, sender, recipient) {
  const response = await axios.post(
    '${window.location.origin}/api/v1/email-gateway/extract-and-detonate',
    {
      email_content: emailText,
      sender: sender,
      recipient: recipient
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': '${activeClientId}'
      }
    }
  );

  return response.data;
}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Hero Header */}
      <div className="panel" style={{ borderLeft: "4px solid #00acf5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "1.2rem" }}>📧</span>
              <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#f8fafc" }}>
                Enterprise Email Security & API Gateway (Gateway 3)
              </h2>
            </div>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.88rem", maxWidth: "800px", lineHeight: "1.5" }}>
              Integrate BrowseGuard's Zero-Trust Browser Isolation & Threat Sandbox directly into your Mail Transfer
              Agents (Microsoft 365, Google Workspace, Postfix, Sendmail, SpamTitan). Protect mailboxes with automated URL
              detonation and click-time browser isolation.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {onBackToPortal && (
              <button
                type="button"
                className="preset-pill"
                onClick={onBackToPortal}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                ← Back to Portal Hub
              </button>
            )}
            <span className="preset-pill" style={{ color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.4)", background: "rgba(34, 197, 94, 0.1)" }}>
              ● API Engine: Active
            </span>
            <span className="preset-pill" style={{ color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.4)", background: "rgba(56, 189, 248, 0.1)" }}>
              🔒 Zero-Trust RBI Egress Filter
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Card 1 (API Keys) & Card 2 (URL Rewriting) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "20px" }}>
        {/* Card 1: API Keys Management */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔑</span> API Keys & Authentication
            </h3>
            <button
              type="button"
              className="preset-pill"
              onClick={fetchApiKeys}
              style={{ fontSize: "0.74rem", padding: "4px 8px" }}
              title="Refresh API keys list"
            >
              🔄 Refresh
            </button>
          </div>

          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.82rem" }}>
            Use these keys in your email server scripts via header: <code>X-API-Key: bg_live_...</code>
          </p>

          {keyError && (
            <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", borderRadius: "6px", fontSize: "0.82rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <span>⚠️ {keyError}</span>
              {(keyError.toLowerCase().includes("access denied") || keyError.toLowerCase().includes("trial")) && (
                <button
                  type="button"
                  onClick={handleActivateEmailTrial}
                  className="primary-button"
                  style={{ padding: "5px 12px", fontSize: "0.75rem", background: "#a855f7", border: "none", cursor: "pointer", borderRadius: "4px" }}
                >
                  🚀 Activate 14-Day Free Trial
                </button>
              )}
            </div>
          )}

          {/* Form to create new key */}
          <form onSubmit={handleCreateKey} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Client Name (e.g., M365 Mail Flow Server)"
              style={{
                flex: 1,
                background: "#050811",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#f8fafc",
                fontSize: "0.82rem"
              }}
            />
            <button
              type="submit"
              className="primary-button"
              style={{ padding: "8px 14px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
            >
              + Generate Key
            </button>
          </form>

          {/* Newly created key banner */}
          {createdKeyData && (
            <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.5)", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#6ee7b7", marginBottom: "6px" }}>
                ✓ New API Key Provisioned! Save this secret now:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}>
                <div>Client ID: <span style={{ color: "#38bdf8" }}>{createdKeyData.client_id}</span></div>
                <div>Client Secret: <span style={{ color: "#f59e0b" }}>{createdKeyData.client_secret}</span></div>
              </div>
              <button
                type="button"
                className="preset-pill"
                onClick={() => handleCopy(createdKeyData.client_id, "id")}
                style={{ marginTop: "8px", fontSize: "0.74rem" }}
              >
                {copySuccess === "id" ? "✓ Copied Client ID!" : "📋 Copy Client ID"}
              </button>
            </div>
          )}

          {/* API Keys Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="history-table" style={{ fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Client ID</th>
                  <th>Status</th>
                  <th>Last Used</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingKeys ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>Loading API keys...</td></tr>
                ) : apiKeys.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>No active API keys found.</td></tr>
                ) : (
                  apiKeys.map((k) => (
                    <tr key={k.id} className="history-row">
                      <td style={{ fontWeight: 600, color: "#e2e8f0" }}>{k.name}</td>
                      <td>
                        <code style={{ color: "#00e5ff", cursor: "pointer" }} onClick={() => handleCopy(k.client_id, k.id)} title="Click to copy">
                          {k.client_id.slice(0, 16)}...
                        </code>
                      </td>
                      <td>
                        <span style={{ color: k.is_active ? "#00f59b" : "#f87171", fontWeight: 700 }}>
                          {k.is_active ? "● ACTIVE" : "REVOKED"}
                        </span>
                      </td>
                      <td style={{ color: "#94a3b8" }}>
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                      </td>
                      <td>
                        {k.is_active && (
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id)}
                            style={{ background: "transparent", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", borderRadius: "4px", padding: "2px 6px", fontSize: "0.72rem", cursor: "pointer" }}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Click-Time URL Rewriting Engine */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#00e5ff", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🛡️</span> Click-Time URL Rewriting Engine
          </h3>

          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.82rem", lineHeight: "1.5" }}>
            Configure your email gateway to automatically rewrite incoming links to BrowseGuard's zero-trust isolation
            link. When recipients click the link in their mail client, it opens in a remote, isolated sandbox container
            rather than their workstation.
          </p>

          <div style={{ background: "#050811", border: "1px solid rgba(0, 229, 255, 0.25)", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Rewriting URL Template
            </div>
            <code style={{ color: "#38bdf8", wordBreak: "break-all", fontSize: "0.78rem" }}>
              {rewriteTemplate}
            </code>
            <div style={{ marginTop: "8px" }}>
              <button
                type="button"
                className="preset-pill"
                onClick={() => handleCopy(rewriteTemplate, "template")}
                style={{ fontSize: "0.74rem" }}
              >
                {copySuccess === "template" ? "✓ Copied Template!" : "📋 Copy Rewriting Template"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600 }}>
              Test Rewritten Isolation Link (Live Sandbox Simulator):
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={testRewriteUrl}
                onChange={(e) => setTestRewriteUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  flex: 1,
                  background: "#050811",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#f8fafc",
                  fontSize: "0.82rem"
                }}
              />
              <button
                type="button"
                className="preset-pill"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #00e5ff)",
                  color: "#0b1220",
                  fontWeight: 800,
                  border: "none",
                  whiteSpace: "nowrap"
                }}
                onClick={() => {
                  if (onLaunchRbi) {
                    onLaunchRbi(testRewriteUrl);
                  }
                }}
              >
                🖥️ Test Isolation ↗
              </button>
            </div>
            <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
              Clicking will immediately stream safe JPEG pixels from the remote Chromium container.
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Multi-Language Integration Snippets */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚡</span> Developer Integration Code Snippets
          </h3>

          <div style={{ display: "flex", gap: "6px" }}>
            {["python", "curl", "node"].map((lang) => (
              <button
                key={lang}
                type="button"
                className={`preset-pill ${activeLang === lang ? "active" : ""}`}
                onClick={() => setActiveLang(lang)}
                style={{
                  textTransform: "uppercase",
                  fontSize: "0.74rem",
                  borderColor: activeLang === lang ? "#00e5ff" : undefined
                }}
              >
                {lang}
              </button>
            ))}
            <button
              type="button"
              className="preset-pill"
              onClick={() => {
                const text =
                  activeLang === "python"
                    ? pythonSnippet
                    : activeLang === "curl"
                    ? curlSnippet
                    : nodeSnippet;
                handleCopy(text, "code");
              }}
              style={{ fontSize: "0.74rem", color: "#00f59b", borderColor: "rgba(0, 245, 155, 0.4)" }}
            >
              {copySuccess === "code" ? "✓ Copied!" : "📋 Copy Code"}
            </button>
          </div>
        </div>

        <pre
          className="json-viewer"
          style={{
            maxHeight: "260px",
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: "0.8rem",
            color: activeLang === "python" ? "#6ee7b7" : activeLang === "curl" ? "#38bdf8" : "#fcd34d"
          }}
        >
          {activeLang === "python" ? pythonSnippet : activeLang === "curl" ? curlSnippet : nodeSnippet}
        </pre>
      </div>

      {/* Card 4: Live Email & Link Detonation Playground */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🧪</span> Live Email Link Detonation Playground
        </h3>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.82rem" }}>
          Test raw email message processing. BrowseGuard parses all embedded links, submits them to the sandbox queue,
          and generates Click-Time isolation URLs.
        </p>

        <form onSubmit={handleExtractAndDetonate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "0.76rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Sender (From)
              </label>
              <input
                type="text"
                value={emailSender}
                onChange={(e) => setEmailSender(e.target.value)}
                style={{
                  width: "100%",
                  background: "#050811",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: "#f8fafc",
                  fontSize: "0.8rem"
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.76rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Recipient (To)
              </label>
              <input
                type="text"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                style={{
                  width: "100%",
                  background: "#050811",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: "#f8fafc",
                  fontSize: "0.8rem"
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.76rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={{
                  width: "100%",
                  background: "#050811",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  color: "#f8fafc",
                  fontSize: "0.8rem"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.76rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
              Email Body Content (Plain text or HTML with URLs)
            </label>
            <textarea
              rows={4}
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              style={{
                width: "100%",
                background: "#050811",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#e2e8f0",
                fontSize: "0.82rem",
                fontFamily: "ui-monospace, monospace"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="submit"
              disabled={extractLoading}
              className="primary-button"
              style={{ padding: "8px 18px", fontSize: "0.85rem" }}
            >
              {extractLoading ? "⚡ Detonating Links in Sandbox..." : "⚡ Extract & Detonate All Links"}
            </button>
            <button
              type="button"
              className="preset-pill"
              onClick={() => {
                setEmailContent(
                  `URGENT: Review Google Doc here: https://15g9g.mjt.lu/lnk/EAAACX2kwNwAAc6rWr4ABIYxdeoAAYKLJykAolkTADahGwBqx4SxYOfUmbkBRhadVnKt7aftXwAxVYw/1/xaDbYxqNye-v8u2hCzBrcA/aHR0cHM6Ly9jb2RpbmdleGFtLnJ5ZXJzb25pdHNvbHV0aW9ucy5jb20vZS9qdnIz\n\nDirect payroll portal: https://login.microsoftonline.com.phish-portal.pages.dev/signin`
                );
              }}
              style={{ fontSize: "0.76rem" }}
            >
              Load Phishing Preset
            </button>
          </div>
        </form>

        {extractError && (
          <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", borderRadius: "6px", fontSize: "0.82rem" }}>
            ⚠️ {extractError}
          </div>
        )}

        {extractResults && (
          <div style={{ marginTop: "12px", background: "#050811", border: "1px solid rgba(0, 245, 155, 0.3)", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#00f59b", fontWeight: 700, fontSize: "0.9rem" }}>
                ✓ {extractResults.message}
              </span>
              <span className="preset-pill" style={{ color: "#38bdf8", fontSize: "0.75rem" }}>
                Extracted: {extractResults.extracted_count} links
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {extractResults.analyses?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(13, 21, 38, 0.7)",
                    border: "1px solid rgba(71, 85, 105, 0.4)",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "600px" }}>
                    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.82rem", color: "#f8fafc", wordBreak: "break-all" }}>
                      🔗 {item.url}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                      Queue Session: <code>{item.session_id}</code> • Status: <span style={{ color: "#f59e0b" }}>{item.status}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="preset-pill"
                      style={{
                        background: "rgba(0, 229, 255, 0.15)",
                        border: "1px solid rgba(0, 229, 255, 0.4)",
                        color: "#00e5ff",
                        fontSize: "0.75rem"
                      }}
                      onClick={() => {
                        if (onLaunchRbi) {
                          onLaunchRbi(item.url);
                        }
                      }}
                    >
                      🖥️ Live Isolation (RBI) ↗
                    </button>
                    <button
                      type="button"
                      className="preset-pill"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => handleCopy(item.isolation_url, `iso_${idx}`)}
                    >
                      {copySuccess === `iso_${idx}` ? "✓ Copied!" : "📋 Copy Rewritten Link"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
