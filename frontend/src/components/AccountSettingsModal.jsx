import React, { useState, useEffect } from "react";

export default function AccountSettingsModal({ currentUser, onUpdateUser, onClose, onLogout }) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "quotas" | "security" | "extension"
  const [fullName, setFullName] = useState(currentUser?.fullName || "");
  const [email] = useState(currentUser?.email || "");
  const [role] = useState(currentUser?.role || "ANALYST");
  const [orgName] = useState(currentUser?.organizationName || "Default Organization");
  const [extensionToken, setExtensionToken] = useState(currentUser?.extensionToken || "");
  const [tokenCopied, setTokenCopied] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState({ text: "", isError: false });
  const [profileMsg, setProfileMsg] = useState({ text: "", isError: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscriptions & Quota state
  const [subscriptions, setSubscriptions] = useState(null);
  const [loadingSubs, setLoadingSubs] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoadingSubs(true);
    try {
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/subscriptions", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (resp.ok) {
        const data = await resp.json();
        setSubscriptions(data.data || {});
      }
    } catch (e) {
      console.warn("Failed to fetch subscriptions:", e);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setProfileMsg({ text: "", isError: false });

    try {
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ fullName })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      const updated = {
        ...currentUser,
        fullName: data.data?.full_name || fullName
      };
      if (onUpdateUser) onUpdateUser(updated);
      setProfileMsg({ text: "✓ Profile updated successfully!", isError: false });
    } catch (err) {
      setProfileMsg({ text: err.message, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "New passwords do not match.", isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: "Password must be at least 6 characters.", isError: true });
      return;
    }

    setIsSubmitting(true);
    setPasswordMsg({ text: "", isError: false });

    try {
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordMsg({ text: "✓ Password updated successfully!", isError: false });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMsg({ text: err.message, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!window.confirm("Regenerating your extension token will require re-pairing your browser extension. Continue?")) {
      return;
    }
    try {
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/extension-token/regenerate", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await resp.json();
      if (resp.ok && data.data?.extensionToken) {
        setExtensionToken(data.data.extensionToken);
        if (onUpdateUser) {
          onUpdateUser({ ...currentUser, extensionToken: data.data.extensionToken });
        }
      }
    } catch (e) {
      alert("Failed to regenerate extension token: " + e.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  return (
    <div className="bg-modal-overlay" style={{ zIndex: 11000 }}>
      <div
        className="bg-modal-card"
        style={{
          maxWidth: "680px",
          width: "95%",
          background: "#081225",
          border: "1px solid rgba(0, 172, 245, 0.35)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 172, 245, 0.15)"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.8rem" }}>👤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#f8fafc", fontWeight: 800 }}>Account & Profile Settings</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>Manage user identity, security credentials, and gateway quotas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "8px", background: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "8px", marginBottom: "20px" }}>
          {[
            { id: "profile", label: "👤 Profile" },
            { id: "quotas", label: "📊 Gateway Quotas" },
            { id: "extension", label: "🛡️ Browser Extension" },
            { id: "security", label: "🔒 Security & Password" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                background: activeTab === tab.id ? "#00acf5" : "transparent",
                color: activeTab === tab.id ? "#ffffff" : "#94a3b8",
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: PROFILE */}
        {activeTab === "profile" && (
          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                  EMAIL ADDRESS (LOGIN IDENTITY)
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{
                    width: "100%",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    color: "#94a3b8",
                    fontFamily: "monospace",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name..."
                  style={{
                    width: "100%",
                    background: "#0a1324",
                    border: "1px solid rgba(0, 172, 245, 0.4)",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: "0.88rem"
                  }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                    ORGANIZATION
                  </label>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#cbd5e1", fontSize: "0.85rem" }}>
                    🏢 {orgName}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                    ASSIGNED ROLE
                  </label>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#38bdf8", fontWeight: 800, fontSize: "0.85rem" }}>
                    👑 {role}
                  </div>
                </div>
              </div>

              {profileMsg.text && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "0.8rem", background: profileMsg.isError ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", color: profileMsg.isError ? "#f87171" : "#34d399", border: `1px solid ${profileMsg.isError ? "#ef4444" : "#10b981"}` }}>
                  {profileMsg.text}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={onLogout}
                  style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "8px 16px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  🚪 Sign Out
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #00e5ff 100%)", border: "none", color: "#07101e", padding: "8px 20px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 800, cursor: isSubmitting ? "wait" : "pointer" }}
                >
                  {isSubmitting ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: GATEWAY QUOTAS */}
        {activeTab === "quotas" && (
          <div>
            <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "0.82rem" }}>
              Your account's assigned monthly compute and detonation quotas per gateway.
            </p>

            {loadingSubs ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>Loading quotas...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { id: "url_scanner", name: "Heavy URL Detonation Sandbox", icon: "🖥️", key: "url_scanner" },
                  { id: "browser_extension", name: "Zero-Trust Browser Extension", icon: "🛡️", key: "browser_extension" },
                  { id: "email_gateway", name: "Email Gateway Ingestion API", icon: "📧", key: "email_gateway_api" }
                ].map((gw) => {
                  const sub = subscriptions?.[gw.key] || {};
                  const total = sub.quota_total || (role === "ADMIN" ? 999999 : 500);
                  const used = sub.quota_used || 0;
                  const remaining = Math.max(0, total - used);
                  const pct = Math.min(100, Math.round((used / total) * 100));

                  return (
                    <div
                      key={gw.id}
                      style={{
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        padding: "14px 16px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.2rem" }}>{gw.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "0.85rem" }}>{gw.name}</div>
                            <span style={{ fontSize: "0.72rem", color: sub.status === "ACTIVE" ? "#10b981" : "#f59e0b" }}>
                              ● {sub.status || "ACTIVE"} • {sub.plan_tier || (role === "ADMIN" ? "ENTERPRISE" : "PRO")}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#38bdf8" }}>
                            {role === "ADMIN" ? "Unlimited" : `${remaining} left`}
                          </span>
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            {used} used / {total} total
                          </div>
                        </div>
                      </div>

                      {role !== "ADMIN" && (
                        <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct > 80 ? "#ef4444" : "#00acf5" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BROWSER EXTENSION */}
        {activeTab === "extension" && (
          <div>
            <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "0.82rem" }}>
              Use your personal extension pairing token to link the BrowseGuard Chrome/Edge extension to your account.
            </p>

            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(0, 172, 245, 0.3)", borderRadius: "8px", padding: "16px" }}>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#38bdf8", fontWeight: 800, marginBottom: "8px" }}>
                YOUR EXTENSION PAIRING TOKEN
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  readOnly
                  value={extensionToken || "bg_ext_admin_live_token_777"}
                  style={{
                    flex: 1,
                    background: "#050d1a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontFamily: "monospace",
                    fontSize: "0.82rem",
                    color: "#34d399"
                  }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(extensionToken || "bg_ext_admin_live_token_777")}
                  style={{
                    background: tokenCopied ? "#10b981" : "rgba(0, 172, 245, 0.25)",
                    border: "1px solid #00acf5",
                    color: tokenCopied ? "#fff" : "#38bdf8",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {tokenCopied ? "✓ Copied" : "Copy Token"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Compromised token? Rotate it anytime.
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  style={{ background: "transparent", border: "1px dashed rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "4px 10px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                >
                  🔄 Rotate Extension Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & PASSWORD */}
        {activeTab === "security" && (
          <form onSubmit={handleChangePassword}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                  CURRENT PASSWORD
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  style={{ width: "100%", background: "#0a1324", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "10px 14px", color: "#ffffff", fontSize: "0.88rem" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                  NEW PASSWORD
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)..."
                  style={{ width: "100%", background: "#0a1324", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "10px 14px", color: "#ffffff", fontSize: "0.88rem" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                  CONFIRM NEW PASSWORD
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password..."
                  style={{ width: "100%", background: "#0a1324", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "10px 14px", color: "#ffffff", fontSize: "0.88rem" }}
                  required
                />
              </div>

              {passwordMsg.text && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "0.8rem", background: passwordMsg.isError ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", color: passwordMsg.isError ? "#f87171" : "#34d399", border: `1px solid ${passwordMsg.isError ? "#ef4444" : "#10b981"}` }}>
                  {passwordMsg.text}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #00e5ff 100%)", border: "none", color: "#07101e", padding: "8px 20px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 800, cursor: isSubmitting ? "wait" : "pointer" }}
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
