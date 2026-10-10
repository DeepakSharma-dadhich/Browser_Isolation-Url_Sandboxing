import React, { useState } from "react";

export default function AuthModal({ currentUser, onUpdateUser, onClose }) {
  const [tab, setTab] = useState("profile"); // "profile" | "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleCopyToken = () => {
    if (currentUser?.extensionToken) {
      navigator.clipboard.writeText(currentUser.extensionToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleRegenerateToken = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/extension-token/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to regenerate token");
      const updated = { ...currentUser, extensionToken: data.data.extensionToken };
      onUpdateUser(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const resp = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("bg_jwt_token", data.data.token);
      onUpdateUser(data.data.user);
      setTab("profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const resp = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Registration failed");

      localStorage.setItem("bg_jwt_token", data.data.token);
      onUpdateUser(data.data.user);
      setTab("profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rbi-modal-overlay">
      <div className="rbi-window" style={{ maxWidth: "620px", maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(59, 130, 246, 0.4)" }}>
        <header className="rbi-header">
          <div className="rbi-title-group">
            <span style={{ fontSize: "1.5rem" }}>🛡️</span>
            <div>
              <div className="rbi-heading">BrowseGuard Identity & Gateways</div>
              <div className="rbi-subheading">User Accounts, Organization Scoping & Extension Tokens</div>
            </div>
          </div>
          <button type="button" className="rbi-close-btn" onClick={onClose}>✕ Close</button>
        </header>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", padding: "8px 16px", gap: "8px" }}>
          <button
            type="button"
            className={`preset-pill ${tab === "profile" ? "threat" : ""}`}
            style={{ background: tab === "profile" ? "#2563eb" : "transparent", color: "#fff" }}
            onClick={() => setTab("profile")}
          >
            👤 Profile & Extension Token
          </button>
          <button
            type="button"
            className={`preset-pill ${tab === "login" ? "threat" : ""}`}
            style={{ background: tab === "login" ? "#2563eb" : "transparent", color: "#fff" }}
            onClick={() => setTab("login")}
          >
            🔐 Switch Account
          </button>
          <button
            type="button"
            className={`preset-pill ${tab === "register" ? "threat" : ""}`}
            style={{ background: tab === "register" ? "#2563eb" : "transparent", color: "#fff" }}
            onClick={() => setTab("register")}
          >
            ➕ Register New User
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {error && (
            <div style={{ background: "rgba(220, 38, 38, 0.2)", border: "1px solid #dc2626", color: "#fca5a5", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem" }}>
              ⚠️ {error}
            </div>
          )}

          {/* TAB 1: PROFILE & EXTENSION TOKEN */}
          {tab === "profile" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>ACCOUNT EMAIL</span>
                  <strong style={{ fontSize: "0.95rem", color: "#e2e8f0" }}>{currentUser?.email || "admin@browseguard.local"}</strong>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>ROLE & WORKSPACE</span>
                  <strong style={{ fontSize: "0.95rem", color: "#38bdf8" }}>{currentUser?.role || "ADMIN"} • {currentUser?.organizationName || "Default Org"}</strong>
                </div>
              </div>

              {/* Extension Pairing Token Card */}
              <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#38bdf8" }}>
                    BROWSER EXTENSION PAIRING TOKEN (GATEWAY 2)
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={loading}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    🔄 Regenerate
                  </button>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#cbd5e1", margin: "0 0 10px 0" }}>
                  Use this dedicated token in your BrowseGuard Chrome / Firefox extension options to automatically stamp your URL scans with this account.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={currentUser?.extensionToken || "bg_ext_admin_live_token_777"}
                    style={{ flex: 1, padding: "8px 12px", background: "#0f172a", border: "1px solid #334155", color: "#38bdf8", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.85rem" }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    style={{ background: copiedToken ? "#10b981" : "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}
                  >
                    {copiedToken ? "✓ Copied!" : "📋 Copy Token"}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", background: "rgba(15, 23, 42, 0.4)", padding: "12px", borderRadius: "6px" }}>
                <strong>🚀 Quick Extension Setup:</strong>
                <ol style={{ margin: "6px 0 0 0", paddingLeft: "18px", lineHeight: "1.5" }}>
                  <li>Open Chrome Extensions menu and click <strong>BrowseGuard</strong> → <strong>Options</strong>.</li>
                  <li>Paste your pairing token into the <strong>User Token</strong> field.</li>
                  <li>Click <strong>Save Configuration</strong>. Webmail links and right-click scans will now flow straight to your dashboard!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: LOGIN */}
          {tab === "login" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@browseguard.local"
                  required
                  style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", marginTop: "8px" }}
              >
                {loading ? "Authenticating..." : "Sign In to Account"}
              </button>
            </form>
          )}

          {/* TAB 3: REGISTER */}
          {tab === "register" && (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  required
                  style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@enterprise.corp"
                  required
                  style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>Password (min 6 characters)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: "100%", padding: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", marginTop: "8px" }}
              >
                {loading ? "Creating Account..." : "Create Account & Generate Extension Token"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
