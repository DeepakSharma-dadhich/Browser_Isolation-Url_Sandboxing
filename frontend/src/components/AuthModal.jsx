import React, { useState, useEffect } from "react";

export default function AuthModal({
  currentUser,
  onUpdateUser,
  onClose,
  initialTab = "profile",
  initialGateway = null,
  onLaunchRbi,
  onOpenApiTerminal
}) {
  const [tab, setTab] = useState(initialTab); // "profile" | "login" | "register" | "subscriptions" | "api_keys" | "extension"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedGateway, setSelectedGateway] = useState(initialGateway || "url_scanner");
  const [targetLoginGateway, setTargetLoginGateway] = useState(initialGateway || "url_scanner");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [subscriptions, setSubscriptions] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKeyData, setCreatedKeyData] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [byokInputs, setByokInputs] = useState({
    virustotal: "",
    abuseipdb: "",
    urlscan: "",
    otx: "",
    webhook: "",
    slack: ""
  });
  const [webhookConfigs, setWebhookConfigs] = useState({
    webhook: { secret: "bg_wh_sec_prod_9921a8c4", min_score: 60, alert_on_all: false },
    slack: { min_score: 60, alert_on_all: false }
  });
  const [webhookCodeTab, setWebhookCodeTab] = useState("payload"); // "payload" | "node" | "python"
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState(false);
  const [codeTab, setCodeTab] = useState("curl");
  const [testingProvider, setTestingProvider] = useState(null);
  const [copiedKeyText, setCopiedKeyText] = useState(false);
  const [copiedExtToken, setCopiedExtToken] = useState(false);
  const [revealedExtToken, setRevealedExtToken] = useState(false);
  const [verifyingExtension, setVerifyingExtension] = useState(false);
  const [extensionVerifyResult, setExtensionVerifyResult] = useState(null);
  const [simScanState, setSimScanState] = useState("idle"); // "idle" | "scanning" | "alert"
  const [copiedEndpointUrl, setCopiedEndpointUrl] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem("bg_jwt_token");
      if (!token) return;
      const resp = await fetch("/api/v1/auth/subscriptions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const payload = await resp.json();
        setSubscriptions(payload.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchApiKeysAndIntegrations = async () => {
    try {
      const token = localStorage.getItem("bg_jwt_token");
      const [keysRes, integRes] = await Promise.all([
        fetch("/api/v1/api-keys", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }),
        fetch("/api/v1/integrations", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      ]);
      if (keysRes.ok) {
        const payload = await keysRes.json();
        setApiKeys(payload.data || []);
      }
      if (integRes.ok) {
        const payload = await integRes.json();
        const items = payload.data || [];
        setIntegrations(items);
        const loadedInputs = {};
        const loadedConfigs = {};
        items.forEach((item) => {
          if (["webhook", "slack"].includes(item.provider)) {
            loadedInputs[item.provider] = item.endpoint_url || item.masked_key || "";
            if (item.config) loadedConfigs[item.provider] = item.config;
          }
        });
        setByokInputs((prev) => ({ ...prev, ...loadedInputs }));
        setWebhookConfigs((prev) => ({ ...prev, ...loadedConfigs }));
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    if (tab === "api_keys") {
      fetchApiKeysAndIntegrations();
    }
  }, [tab, currentUser]);

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: newKeyName || "SIEM Integration Key" })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to create API key");
      setCreatedKeyData(data.data);
      setNewKeyName("");
      setSuccessMessage("API Key generated successfully! Save your client secret now.");
      fetchApiKeysAndIntegrations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeApiKey = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this API key? Applications using it will lose access.")) return;
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch(`/api/v1/api-keys/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to revoke API key");
      setSuccessMessage("API Key revoked successfully.");
      fetchApiKeysAndIntegrations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveByok = async (provider) => {
    const keyVal = byokInputs[provider]?.trim();
    if (!keyVal) {
      setError(`Please enter a valid ${provider === "webhook" || provider === "slack" ? "URL" : "API key"} for ${provider.toUpperCase()}`);
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          provider,
          api_key: keyVal,
          config: webhookConfigs[provider] || {},
          is_enabled: true
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to save integration");
      setSuccessMessage(data.message || `Saved ${provider.toUpperCase()} configuration!`);
      if (!["webhook", "slack"].includes(provider)) {
        setByokInputs({ ...byokInputs, [provider]: "" });
      }
      fetchApiKeysAndIntegrations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestByok = async (provider) => {
    const keyVal = byokInputs[provider]?.trim();
    if (!keyVal) {
      setError(`Enter a ${provider === "webhook" || provider === "slack" ? "URL" : "API key"} for ${provider.toUpperCase()} before testing.`);
      return;
    }
    try {
      setTestingProvider(provider);
      setError("");
      setSuccessMessage("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/integrations/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          provider,
          api_key: keyVal,
          config: webhookConfigs[provider] || {}
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Validation/Ping test failed");
      setSuccessMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleDeleteByok = async (provider) => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch(`/api/v1/integrations/${provider}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to delete integration");
      setSuccessMessage(`Removed ${provider.toUpperCase()} integration.`);
      fetchApiKeysAndIntegrations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [currentUser]);

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
      setSuccessMessage("");
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
      setSuccessMessage("Extension pairing token successfully rotated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyExtensionToken = async () => {
    try {
      setVerifyingExtension(true);
      setError("");
      setSuccessMessage("");
      const token = currentUser?.extensionToken || "bg_ext_admin_live_token_777";
      const resp = await fetch("/api/v1/extension/verify", {
        headers: { "X-Extension-Token": token }
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.message || data.error || "Extension pairing verification failed");
      }
      setExtensionVerifyResult(data);
      setSuccessMessage("Extension token validated! Authorized to intercept webmail links and launch live isolation.");
    } catch (err) {
      setError(err.message);
      setExtensionVerifyResult(null);
    } finally {
      setVerifyingExtension(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      const resp = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, targetGateway: targetLoginGateway })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("bg_jwt_token", data.data.token);
      onUpdateUser(data.data.user);
      setSubscriptions(data.data.subscriptions);
      setTab("profile");
      setSuccessMessage(`Logged in successfully!`);
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
      setSuccessMessage("");
      const resp = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          gateway: selectedGateway
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Registration failed");

      localStorage.setItem("bg_jwt_token", data.data.token);
      onUpdateUser(data.data.user);
      setSubscriptions(data.data.subscriptions);
      setTab("profile");
      setSuccessMessage(`Account created with 14-day Free Trial for ${selectedGateway}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTrial = async (gwKey) => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/activate-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ gateway: gwKey })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || data.message || "Failed to activate trial");

      setSubscriptions(data.data.allSubscriptions);
      setSuccessMessage(`Free trial activated for ${gwKey}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeSubscription = async (gwKey, tier = "ENTERPRISE") => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/upgrade-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ gateway: gwKey, planTier: tier })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to upgrade subscription");

      setSubscriptions(data.data.allSubscriptions);
      setSuccessMessage(`Upgraded ${gwKey} to ${tier} tier!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const gatewaysMeta = [
    {
      key: "url_scanner",
      icon: "🖥️",
      title: "Gateway 1: Sandbox Studio & RBI",
      desc: "Live VM browser isolation, interactive screencasting & MITRE ATT&CK",
      trialLimit: "20 Free VM Scans"
    },
    {
      key: "browser_extension",
      icon: "🛡️",
      title: "Gateway 2: Browser Extension Shield",
      desc: "Client-side Gmail & Outlook webmail link click-time defense",
      trialLimit: "50 Free URL Interceptions"
    },
    {
      key: "email_gateway_api",
      icon: "📧",
      title: "Gateway 3: Email Security API",
      desc: "Mail server MTA integration, EML parser & Click-Time URL Rewriter",
      trialLimit: "100 Free API Detonations"
    }
  ];

  return (
    <div className="rbi-modal-overlay">
      <div className="rbi-window" style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(59, 130, 246, 0.4)" }}>
        <header className="rbi-header">
          <div className="rbi-title-group">
            <span style={{ fontSize: "1.5rem" }}>🛡️</span>
            <div>
              <div className="rbi-heading">BrowseGuard Identity & Gateway Subscriptions</div>
              <div className="rbi-subheading">Independent Product Gateways, Free Trials & Compute Quotas</div>
            </div>
          </div>
          <button type="button" className="rbi-close-btn" onClick={onClose}>✕ Close</button>
        </header>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", padding: "8px 16px", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`preset-pill ${tab === "profile" ? "threat" : ""}`}
            style={{ background: tab === "profile" ? "#00acf5" : "transparent", color: "#fff" }}
            onClick={() => setTab("profile")}
          >
            👤 Gateway Subscriptions & Quotas
          </button>
          <button
            type="button"
            className={`preset-pill ${tab === "api_keys" ? "threat" : ""}`}
            style={{ background: tab === "api_keys" ? "#00acf5" : "transparent", color: "#fff" }}
            onClick={() => setTab("api_keys")}
          >
            🔑 API Keys & BYOK Feeds
          </button>
          <button
            type="button"
            className={`preset-pill ${tab === "extension" ? "threat" : ""}`}
            style={{ background: tab === "extension" ? "#00acf5" : "transparent", color: "#fff" }}
            onClick={() => setTab("extension")}
          >
            🛡️ Extension Shield (Manifest V3)
          </button>
          <button
            type="button"
            className={`preset-pill ${tab === "login" ? "threat" : ""}`}
            style={{ background: tab === "login" ? "#00acf5" : "transparent", color: "#fff" }}
            onClick={() => setTab("login")}
          >
            🔐 Switch Account
          </button>
          <button
            type="button"
            className={`preset-pill ${tab === "register" ? "threat" : ""}`}
            style={{ background: tab === "register" ? "#00acf5" : "transparent", color: "#fff" }}
            onClick={() => setTab("register")}
          >
            ➕ Register & Choose Gateway Trial
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {error && (
            <div style={{ background: "rgba(220, 38, 38, 0.2)", border: "1px solid #dc2626", color: "#fca5a5", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem" }}>
              ⚠️ {error}
            </div>
          )}

          {successMessage && (
            <div style={{ background: "rgba(34, 197, 94, 0.2)", border: "1px solid #16a34a", color: "#86efac", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem" }}>
              ✓ {successMessage}
            </div>
          )}

          {/* TAB 1: PROFILE & GATEWAYS SUBSCRIPTION MATRIX */}
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

              {/* Subscriptions Matrix Notice */}
              <div style={{ marginBottom: "12px", fontSize: "0.8rem", color: "#94a3b8" }}>
                Live VMs and Chromium browser sandboxes require dedicated compute infrastructure. Each gateway maintains independent access control and budget quotas:
              </div>

              {/* Gateway Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {gatewaysMeta.map((gw) => {
                  const sub = subscriptions ? subscriptions[gw.key] : null;
                  const isActive = sub?.is_active ?? (currentUser?.role === "ADMIN");
                  const isTrial = sub?.is_trial;
                  const isLocked = sub?.status === "LOCKED";
                  const isExhausted = sub?.is_quota_exhausted;
                  const quotaTotal = sub?.quota_total ?? (currentUser?.role === "ADMIN" ? 999999 : 0);
                  const quotaUsed = sub?.quota_used ?? 0;
                  const quotaRemaining = sub?.quota_remaining ?? (currentUser?.role === "ADMIN" ? 999999 : 0);

                  return (
                    <div
                      key={gw.key}
                      style={{
                        background: "rgba(19, 31, 55, 0.75)",
                        border: `1px solid ${isActive ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.3)"}`,
                        borderRadius: "8px",
                        padding: "14px 16px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "1.4rem" }}>{gw.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc" }}>
                              {gw.title}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{gw.desc}</div>
                          </div>
                        </div>

                        <div>
                          {isActive ? (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 750,
                                padding: "3px 8px",
                                borderRadius: "4px",
                                background: isTrial ? "rgba(0, 172, 245, 0.2)" : "rgba(34, 197, 94, 0.2)",
                                color: isTrial ? "#38bdf8" : "#4ade80",
                                border: `1px solid ${isTrial ? "rgba(0, 172, 245, 0.4)" : "rgba(34, 197, 94, 0.4)"}`
                              }}
                            >
                              {currentUser?.role === "ADMIN" ? "ENTERPRISE UNLIMITED" : isTrial ? "ACTIVE FREE TRIAL" : "ACTIVE SUBSCRIBED"}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 750,
                                padding: "3px 8px",
                                borderRadius: "4px",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.4)"
                              }}
                            >
                              {isExhausted ? "QUOTA EXHAUSTED" : "LOCKED / NOT SUBSCRIBED"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quota bar & actions */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", pt: "6px", borderTop: "1px solid rgba(51, 65, 85, 0.4)" }}>
                        <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                          {currentUser?.role === "ADMIN" ? (
                            <span style={{ color: "#4ade80" }}>Unlimited Enterprise Compute</span>
                          ) : isActive ? (
                            <span>
                              Compute Quota: <strong>{quotaRemaining}</strong> / {quotaTotal} remaining
                              {sub?.days_remaining ? ` • ${sub.days_remaining} days left` : ""}
                            </span>
                          ) : (
                            <span style={{ color: "#f87171" }}>Access restricted to this gateway.</span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          {isLocked && (
                            <button
                              type="button"
                              onClick={() => handleActivateTrial(gw.key)}
                              disabled={loading}
                              style={{
                                background: "#00acf5",
                                color: "#fff",
                                border: "none",
                                padding: "5px 12px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              🚀 Activate 14-Day Free Trial
                            </button>
                          )}
                          {(isExhausted || isActive) && currentUser?.role !== "ADMIN" && (
                            <button
                              type="button"
                              onClick={() => handleUpgradeSubscription(gw.key, "ENTERPRISE")}
                              disabled={loading}
                              style={{
                                background: "rgba(34, 197, 94, 0.2)",
                                color: "#4ade80",
                                border: "1px solid rgba(34, 197, 94, 0.4)",
                                padding: "5px 10px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              ⚡ Upgrade Plan
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Extension Token specific display */}
                      {gw.key === "browser_extension" && isActive && (
                        <div style={{ marginTop: "10px", background: "rgba(15, 23, 42, 0.7)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8" }}>Extension Pairing Token:</span>
                            <button
                              type="button"
                              onClick={handleRegenerateToken}
                              disabled={loading}
                              style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
                            >
                              Rotate Token
                            </button>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input
                              type="text"
                              readOnly
                              value={currentUser?.extensionToken || "bg_ext_admin_live_token_777"}
                              style={{ flex: 1, padding: "6px 10px", background: "#0b1329", border: "1px solid #334155", color: "#38bdf8", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.8rem" }}
                            />
                            <button
                              type="button"
                              onClick={handleCopyToken}
                              style={{ background: copiedToken ? "#10b981" : "#2563eb", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                            >
                              {copiedToken ? "✓ Copied" : "📋 Copy"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: API KEYS & BYOK FEEDS */}
          {tab === "api_keys" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* TOP HEADER */}
              <div style={{ background: "rgba(15, 23, 42, 0.7)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(0, 172, 245, 0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#00acf5", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    API GATEWAY & THREAT ENRICHMENT
                  </span>
                  <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "999px", background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
                    REST API v1 Active
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.84rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Submit URLs, detonate emails, and query threat verdicts programmatically from SIEM, SOAR, or mail filters.
                  Connect optional third-party Threat Intelligence keys (BYOK) for multi-engine correlation.
                </p>
              </div>

              {/* SECTION 1: BROWSEGUARD PLATFORM API KEYS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🔑</span> BrowseGuard API Keys ({apiKeys.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenApiTerminal?.();
                    }}
                    className="preset-pill"
                    style={{ background: "rgba(0, 172, 245, 0.15)", border: "1px solid rgba(0, 172, 245, 0.4)", color: "#38bdf8", fontWeight: 750 }}
                    title="Open Live API & Gateway Test Terminal"
                  >
                    ⚡ Open API Test Terminal
                  </button>
                </div>

                {/* Form to create a new key */}
                <form onSubmit={handleCreateApiKey} style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key Label (e.g., 'Splunk SOAR Feed', 'MTA Mail Filter')"
                    style={{ flex: 1, padding: "9px 14px", background: "#0b1329", border: "1px solid #334155", color: "#f8fafc", borderRadius: "6px", fontSize: "0.85rem" }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-anyrun-primary"
                    style={{ padding: "9px 18px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                  >
                    + Generate API Key
                  </button>
                </form>

                {/* Newly generated secret banner */}
                {createdKeyData && (
                  <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid #10b981", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <strong style={{ color: "#34d399", fontSize: "0.9rem" }}>
                        🎉 New API Key Generated: {createdKeyData.name}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setCreatedKeyData(null)}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem" }}
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "#cbd5e1" }}>
                      Copy your client secret now. For security purposes, this secret cannot be shown again.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#070e1c", padding: "10px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <span style={{ color: "#94a3b8" }}>Client ID (x-api-key):</span>
                        <code style={{ color: "#38bdf8" }}>{createdKeyData.client_id}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <span style={{ color: "#94a3b8" }}>Client Secret:</span>
                        <code style={{ color: "#4ade80" }}>{createdKeyData.client_secret}</code>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`Client ID: ${createdKeyData.client_id}\nClient Secret: ${createdKeyData.client_secret}`);
                          setCopiedKeyText(true);
                          setTimeout(() => setCopiedKeyText(false), 2000);
                        }}
                        className="preset-pill"
                        style={{ background: "#10b981", color: "#061325", fontWeight: 800, border: "none" }}
                      >
                        {copiedKeyText ? "✓ Copied Key Pair" : "📋 Copy Credentials"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose?.();
                          onOpenApiTerminal?.();
                        }}
                        className="preset-pill"
                        style={{ background: "rgba(0, 172, 245, 0.2)", border: "1px solid #00acf5", color: "#38bdf8", fontWeight: 800 }}
                      >
                        ⚡ Test In API Playground ➔
                      </button>
                    </div>
                  </div>
                )}

                {/* API Keys Table */}
                <div style={{ background: "#0b1329", border: "1px solid #1e293b", borderRadius: "8px", overflow: "hidden" }}>
                  {apiKeys.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                      No active API keys found. Generate one above to connect external services.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {apiKeys.map((k) => (
                        <div
                          key={k.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                            flexWrap: "wrap",
                            gap: "8px"
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{k.name}</strong>
                              <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "4px", background: k.is_active ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)", color: k.is_active ? "#4ade80" : "#f87171" }}>
                                {k.is_active ? "ACTIVE" : "REVOKED"}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: "12px", marginTop: "3px", fontSize: "0.75rem", color: "#94a3b8" }}>
                              <span>ID: <code style={{ color: "#38bdf8" }}>{k.client_id}</code></span>
                              <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                              {k.last_used_at && <span>Last Used: {new Date(k.last_used_at).toLocaleDateString()}</span>}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="preset-pill"
                              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                              onClick={() => {
                                navigator.clipboard.writeText(k.client_id);
                                alert(`Copied API Client ID: ${k.client_id}`);
                              }}
                            >
                              📋 Copy ID
                            </button>
                            {k.is_active && (
                              <button
                                type="button"
                                className="preset-pill threat"
                                style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                                onClick={() => handleRevokeApiKey(k.id)}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Developer Integration Quickstart */}
                <div style={{ marginTop: "14px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8" }}>DEVELOPER QUICKSTART (HTTP REST API)</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {["curl", "python", "node"].map((ct) => (
                        <button
                          key={ct}
                          type="button"
                          className="preset-pill"
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            background: codeTab === ct ? "#00acf5" : "transparent",
                            color: codeTab === ct ? "#fff" : "#94a3b8",
                            border: "1px solid rgba(255, 255, 255, 0.1)"
                          }}
                          onClick={() => setCodeTab(ct)}
                        >
                          {ct.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <pre style={{ margin: 0, padding: "10px", background: "#030712", borderRadius: "6px", fontSize: "0.75rem", color: "#38bdf8", overflowX: "auto", fontFamily: "ui-monospace, monospace" }}>
                    {codeTab === "curl" && `# Option A: API Key + Client Secret Headers
curl -X POST http://localhost:3000/api/v1/analyses \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKeys[0]?.client_id || "bg_live_your_key_here"}" \\
  -H "x-client-secret: bg_sec_your_secret_here" \\
  -d '{"url": "https://suspicious-target.com/login"}'

# Option B: HTTP Basic Auth (RFC 7617)
curl -u "${apiKeys[0]?.client_id || "bg_live_your_key_here"}:bg_sec_your_secret_here" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://suspicious-target.com/login"}' \\
  http://localhost:3000/api/v1/analyses`}
                    {codeTab === "python" && `import requests

# Authenticate with x-api-key and x-client-secret (or HTTP Basic Auth auth=(client_id, secret))
resp = requests.post(
    "http://localhost:3000/api/v1/analyses",
    headers={
        "x-api-key": "${apiKeys[0]?.client_id || "bg_live_your_key_here"}",
        "x-client-secret": "bg_sec_your_secret_here"
    },
    json={"url": "https://suspicious-target.com/login"}
)
print(resp.json())`}
                    {codeTab === "node" && `const response = await fetch("http://localhost:3000/api/v1/analyses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKeys[0]?.client_id || "bg_live_your_key_here"}",
    "x-client-secret": "bg_sec_your_secret_here"
  },
  body: JSON.stringify({ url: "https://suspicious-target.com/login" })
});
const data = await response.json();`}
                  </pre>
                </div>
              </div>

              {/* SECTION 2: BRING YOUR OWN KEY (BYOK) FEEDS */}
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🌐</span>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 800 }}>
                      Bring Your Own Key (BYOK) Threat Intelligence
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", lineHeight: "1.5" }}>
                    Connect your existing enterprise threat intelligence subscriptions. When dynamic sandboxing runs, BrowseGuard will cross-verify detections with these external feeds.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                  {[
                    {
                      provider: "virustotal",
                      name: "VirusTotal Enterprise",
                      desc: "Multi-engine malware and URL scanner (70+ AV vendors)",
                      placeholder: "64-character hexadecimal API Key",
                      icon: "🛡️"
                    },
                    {
                      provider: "abuseipdb",
                      name: "AbuseIPDB Threat Feed",
                      desc: "IP address reputation, malicious hosting & spam confidence",
                      placeholder: "AbuseIPDB v2 API Key",
                      icon: "🔍"
                    },
                    {
                      provider: "urlscan",
                      name: "URLScan.io Web Intelligence",
                      desc: "Historical DOM snapshots, automated scanner & IP graphs",
                      placeholder: "URLScan.io API Key",
                      icon: "🌐"
                    },
                    {
                      provider: "otx",
                      name: "AlienVault OTX (Open Threat Exchange)",
                      desc: "Crowdsourced cyber threat pulses, IOCs and malware hashes",
                      placeholder: "OTX API Key",
                      icon: "⬡"
                    }
                  ].map((item) => {
                    const activeInteg = integrations.find((i) => i.provider === item.provider);
                    const isConfigured = Boolean(activeInteg);

                    return (
                      <div
                        key={item.provider}
                        style={{
                          background: "#0c1527",
                          border: `1px solid ${isConfigured ? "rgba(34, 197, 94, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                          borderRadius: "8px",
                          padding: "14px 16px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{item.icon}</span>
                            <div>
                              <strong style={{ fontSize: "0.88rem", color: "#f8fafc" }}>{item.name}</strong>
                              <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{item.desc}</div>
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 750,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: isConfigured ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.1)",
                              color: isConfigured ? "#4ade80" : "#94a3b8",
                              border: `1px solid ${isConfigured ? "rgba(34, 197, 94, 0.3)" : "rgba(148, 163, 184, 0.2)"}`
                            }}
                          >
                            {isConfigured ? `CONNECTED (${activeInteg.masked_key})` : "NOT CONFIGURED"}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          <input
                            type="password"
                            placeholder={isConfigured ? "Enter new key to update..." : item.placeholder}
                            value={byokInputs[item.provider] || ""}
                            onChange={(e) => setByokInputs({ ...byokInputs, [item.provider]: e.target.value })}
                            style={{ flex: 1, padding: "8px 12px", background: "#060d1b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace" }}
                          />
                          <button
                            type="button"
                            className="preset-pill"
                            style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                            disabled={testingProvider === item.provider}
                            onClick={() => handleTestByok(item.provider)}
                          >
                            {testingProvider === item.provider ? "Verifying..." : "⚡ Test Key"}
                          </button>
                          <button
                            type="button"
                            className="btn-anyrun-primary"
                            style={{ fontSize: "0.75rem", padding: "6px 14px", whiteSpace: "nowrap" }}
                            onClick={() => handleSaveByok(item.provider)}
                          >
                            Save Key
                          </button>
                          {isConfigured && (
                            <button
                              type="button"
                              className="preset-pill threat"
                              style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                              onClick={() => handleDeleteByok(item.provider)}
                              title="Delete this integration"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: ENTERPRISE WEBHOOKS & REAL-TIME SIEM DISPATCHER */}
              <div style={{ marginTop: "8px" }}>
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🔔</span>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#f8fafc", fontWeight: 800 }}>
                      Enterprise Webhooks & Real-Time SIEM Dispatcher
                    </h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", lineHeight: "1.5" }}>
                    Automatically dispatch cryptographically signed HMAC-SHA256 payloads to Splunk, Microsoft Sentinel, Elastic, or incoming Slack channels whenever suspicious or malicious threats are detected across any gateway.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                  {/* CARD 1: SIEM / SOAR WEBHOOK */}
                  {(() => {
                    const activeHook = integrations.find((i) => i.provider === "webhook");
                    const isHookConfigured = Boolean(activeHook);

                    return (
                      <div
                        style={{
                          background: "#0c1527",
                          border: `1px solid ${isHookConfigured ? "rgba(0, 172, 245, 0.45)" : "rgba(255, 255, 255, 0.08)"}`,
                          borderRadius: "8px",
                          padding: "16px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "0.9rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>⚡</span> Generic SIEM / SOAR Endpoint
                            </strong>
                            <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "2px" }}>
                              Signed JSON delivery with <code style={{ color: "#38bdf8" }}>X-BrowseGuard-Signature</code>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 750,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: isHookConfigured ? "rgba(0, 172, 245, 0.15)" : "rgba(148, 163, 184, 0.1)",
                              color: isHookConfigured ? "#38bdf8" : "#94a3b8",
                              border: `1px solid ${isHookConfigured ? "rgba(0, 172, 245, 0.3)" : "rgba(148, 163, 184, 0.2)"}`
                            }}
                          >
                            {isHookConfigured ? "ACTIVE (HMAC-SHA256)" : "NOT CONFIGURED"}
                          </span>
                        </div>

                        {/* Endpoint URL Input */}
                        <div style={{ marginBottom: "10px" }}>
                          <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>WEBHOOK RECEIVER URL</label>
                          <input
                            type="text"
                            placeholder="https://siem.enterprise.corp/api/v1/alerts"
                            value={byokInputs.webhook || ""}
                            onChange={(e) => setByokInputs({ ...byokInputs, webhook: e.target.value })}
                            style={{ width: "100%", padding: "8px 12px", background: "#060d1b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace" }}
                          />
                        </div>

                        {/* Signing Secret Input */}
                        <div style={{ marginBottom: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label style={{ fontSize: "0.75rem", color: "#94a3b8" }}>HMAC SHA256 SIGNING SECRET</label>
                            <button
                              type="button"
                              onClick={() => {
                                const newSec = "bg_wh_sec_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
                                setWebhookConfigs({
                                  ...webhookConfigs,
                                  webhook: { ...webhookConfigs.webhook, secret: newSec }
                                });
                              }}
                              style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
                            >
                              Generate New
                            </button>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input
                              type={revealedWebhookSecret ? "text" : "password"}
                              value={webhookConfigs.webhook?.secret || "bg_wh_sec_prod_9921a8c4"}
                              onChange={(e) => setWebhookConfigs({
                                ...webhookConfigs,
                                webhook: { ...webhookConfigs.webhook, secret: e.target.value }
                              })}
                              style={{ flex: 1, padding: "7px 10px", background: "#060d1b", border: "1px solid #334155", color: "#4ade80", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace" }}
                            />
                            <button
                              type="button"
                              onClick={() => setRevealedWebhookSecret(!revealedWebhookSecret)}
                              style={{ background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", padding: "7px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                            >
                              {revealedWebhookSecret ? "🙈" : "👁"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(webhookConfigs.webhook?.secret || "bg_wh_sec_prod_9921a8c4");
                                setCopiedWebhookSecret(true);
                                setTimeout(() => setCopiedWebhookSecret(false), 2000);
                              }}
                              style={{ background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", padding: "7px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                            >
                              {copiedWebhookSecret ? "✓" : "Copy"}
                            </button>
                          </div>
                        </div>

                        {/* Severity Filter */}
                        <div style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>DISPATCH THRESHOLD</label>
                          <select
                            value={webhookConfigs.webhook?.min_score || 60}
                            onChange={(e) => setWebhookConfigs({
                              ...webhookConfigs,
                              webhook: { ...webhookConfigs.webhook, min_score: Number(e.target.value) }
                            })}
                            style={{ width: "100%", padding: "7px 10px", background: "#060d1b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "4px", fontSize: "0.8rem" }}
                          >
                            <option value={40}>Moderate & Above (Risk Score ≥ 40)</option>
                            <option value={60}>High Threat Only (Risk Score ≥ 60)</option>
                            <option value={80}>Critical Malicious Only (Risk Score ≥ 80)</option>
                            <option value={0}>All Link Analyses (Including Safe 0/100)</option>
                          </select>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="preset-pill"
                            style={{ flex: 1, fontSize: "0.78rem", padding: "7px 10px" }}
                            disabled={testingProvider === "webhook"}
                            onClick={() => handleTestByok("webhook")}
                          >
                            {testingProvider === "webhook" ? "Pinging..." : "⚡ Send Test Ping"}
                          </button>
                          <button
                            type="button"
                            className="btn-anyrun-primary"
                            style={{ flex: 1, fontSize: "0.78rem", padding: "7px 12px", whiteSpace: "nowrap" }}
                            onClick={() => handleSaveByok("webhook")}
                          >
                            Save Webhook
                          </button>
                          {isHookConfigured && (
                            <button
                              type="button"
                              className="preset-pill threat"
                              style={{ fontSize: "0.78rem", padding: "7px 10px" }}
                              onClick={() => handleDeleteByok("webhook")}
                              title="Delete webhook"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* CARD 2: SLACK INCOMING WEBHOOK */}
                  {(() => {
                    const activeSlack = integrations.find((i) => i.provider === "slack");
                    const isSlackConfigured = Boolean(activeSlack);

                    return (
                      <div
                        style={{
                          background: "#0c1527",
                          border: `1px solid ${isSlackConfigured ? "rgba(74, 222, 128, 0.45)" : "rgba(255, 255, 255, 0.08)"}`,
                          borderRadius: "8px",
                          padding: "16px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "0.9rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>💬</span> Slack Incoming Webhook
                            </strong>
                            <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "2px" }}>
                              Rich Block Kit alert cards directly in SOC / SecOps channel
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 750,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: isSlackConfigured ? "rgba(74, 222, 128, 0.15)" : "rgba(148, 163, 184, 0.1)",
                              color: isSlackConfigured ? "#4ade80" : "#94a3b8",
                              border: `1px solid ${isSlackConfigured ? "rgba(74, 222, 128, 0.3)" : "rgba(148, 163, 184, 0.2)"}`
                            }}
                          >
                            {isSlackConfigured ? "CONNECTED" : "NOT CONFIGURED"}
                          </span>
                        </div>

                        {/* Slack Webhook URL Input */}
                        <div style={{ marginBottom: "10px" }}>
                          <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>SLACK INCOMING WEBHOOK URL</label>
                          <input
                            type="text"
                            placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                            value={byokInputs.slack || ""}
                            onChange={(e) => setByokInputs({ ...byokInputs, slack: e.target.value })}
                            style={{ width: "100%", padding: "8px 12px", background: "#060d1b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace" }}
                          />
                        </div>

                        {/* Severity Filter */}
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>ALERT DISPATCH THRESHOLD</label>
                          <select
                            value={webhookConfigs.slack?.min_score || 60}
                            onChange={(e) => setWebhookConfigs({
                              ...webhookConfigs,
                              slack: { ...webhookConfigs.slack, min_score: Number(e.target.value) }
                            })}
                            style={{ width: "100%", padding: "7px 10px", background: "#060d1b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "4px", fontSize: "0.8rem" }}
                          >
                            <option value={40}>Moderate & Above (Risk Score ≥ 40)</option>
                            <option value={60}>High Threat Only (Risk Score ≥ 60)</option>
                            <option value={80}>Critical Malicious Only (Risk Score ≥ 80)</option>
                            <option value={0}>All Link Analyses (Including Safe 0/100)</option>
                          </select>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "32px" }}>
                          <button
                            type="button"
                            className="preset-pill"
                            style={{ flex: 1, fontSize: "0.78rem", padding: "7px 10px" }}
                            disabled={testingProvider === "slack"}
                            onClick={() => handleTestByok("slack")}
                          >
                            {testingProvider === "slack" ? "Pinging..." : "⚡ Test Slack Ping"}
                          </button>
                          <button
                            type="button"
                            className="btn-anyrun-primary"
                            style={{ flex: 1, fontSize: "0.78rem", padding: "7px 12px", whiteSpace: "nowrap" }}
                            onClick={() => handleSaveByok("slack")}
                          >
                            Save Slack Hook
                          </button>
                          {isSlackConfigured && (
                            <button
                              type="button"
                              className="preset-pill threat"
                              style={{ fontSize: "0.78rem", padding: "7px 10px" }}
                              onClick={() => handleDeleteByok("slack")}
                              title="Delete slack hook"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* SIGNATURE VERIFICATION CODE TABS */}
                <div style={{ background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8" }}>WEBHOOK RECEIVER VERIFICATION EXAMPLES</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[
                        { key: "payload", label: "PAYLOAD SCHEMA" },
                        { key: "node", label: "NODE.JS" },
                        { key: "python", label: "PYTHON" }
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          className="preset-pill"
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            background: webhookCodeTab === t.key ? "#00acf5" : "transparent",
                            color: webhookCodeTab === t.key ? "#fff" : "#94a3b8",
                            border: "1px solid rgba(255, 255, 255, 0.1)"
                          }}
                          onClick={() => setWebhookCodeTab(t.key)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <pre style={{ margin: 0, padding: "10px", background: "#030712", borderRadius: "6px", fontSize: "0.74rem", color: "#38bdf8", overflowX: "auto", fontFamily: "ui-monospace, monospace", maxHeight: "180px" }}>
                    {webhookCodeTab === "payload" && `{
  "event": "threat.alert",
  "event_id": "evt_1728710400000_a1b2c3d4",
  "timestamp": "2026-10-12T06:20:00.000Z",
  "organization_id": "00000000-0000-0000-0000-000000000001",
  "alert": {
    "session_id": "session_20261012061911_c41173aa",
    "url": "https://login.microsoftonline.com.tenant-harvest.phish-net.org",
    "verdict": "MALICIOUS",
    "recommended_action": "BLOCK",
    "risk_score": 96,
    "risk_level": "critical",
    "finding_count": 3,
    "isolation_url": "http://localhost:5173/?isolate=https%3A%2F%2Flogin.microsoftonline.com...",
    "report_url": "/api/v1/analyses/session_20261012061911_c41173aa"
  }
}`}
                    {webhookCodeTab === "node" && `const crypto = require("crypto");

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-browseguard-signature"];
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.BROWSEGUARD_WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  if (signature !== expected) return res.status(401).send("Invalid HMAC Signature");
  const event = JSON.parse(req.body.toString());
  console.log("Threat Alert Received:", event.alert.url, event.alert.verdict);
  res.status(200).send("OK");
});`}
                    {webhookCodeTab === "python" && `import hmac, hashlib
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-BrowseGuard-Signature', '')
    expected = 'sha256=' + hmac.new(
        SECRET.encode(), request.data, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        abort(401)
    event = request.get_json()
    print(f"Threat alert: {event['alert']['url']} - Score: {event['alert']['risk_score']}")
    return ('OK', 200)`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BROWSER EXTENSION SHIELD (GATEWAY 3) */}
          {tab === "extension" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* HERO BANNER & DOWNLOAD */}
              <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "20px", borderRadius: "10px", border: "1px solid rgba(0, 229, 255, 0.35)", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", position: "relative", zIndex: 1 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🛡️</span>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#f8fafc", fontWeight: 800 }}>
                        BrowseGuard Zero-Trust Browser Extension Shield
                      </h3>
                      <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "999px", background: "rgba(0, 229, 255, 0.15)", color: "#00e5ff", border: "1px solid rgba(0, 229, 255, 0.3)", fontWeight: 700 }}>
                        Manifest V3 Ready
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.86rem", color: "#94a3b8", maxWidth: "680px", lineHeight: "1.5" }}>
                      Lightweight endpoint shield for Google Chrome, Microsoft Edge, and Brave. Intercepts untrusted link clicks in Gmail, Outlook Web, and Microsoft 365, inspecting target pages in real-time or routing suspicious traffic into safe Isolated Chromium containers.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                    <a
                      href="/downloads/browseguard-extension.zip"
                      download="browseguard-extension.zip"
                      className="btn-anyrun-primary"
                      style={{
                        padding: "10px 20px",
                        fontSize: "0.86rem",
                        fontWeight: 800,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 14px rgba(0, 172, 245, 0.4)"
                      }}
                    >
                      <span>📥</span> Download Extension (.zip)
                    </a>
                    <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                      v1.0.0 Package (14.5 KB) • Chrome / Edge / Brave
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-STEP INSTALLATION WORKFLOW */}
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "0.92rem", color: "#e2e8f0", fontWeight: 700, letterSpacing: "0.03em" }}>
                  QUICK DEPLOYMENT GUIDE (CHROME & EDGE)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                  <div style={{ background: "#070e1c", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#00acf5", marginBottom: "4px" }}>STEP 1</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>Extract Package</div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.4" }}>
                      Unzip <code style={{ color: "#38bdf8" }}>browseguard-extension.zip</code> into a local folder (e.g., <code style={{ color: "#cbd5e1" }}>Downloads\extension</code>).
                    </p>
                  </div>

                  <div style={{ background: "#070e1c", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#00acf5", marginBottom: "4px" }}>STEP 2</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>Open Extensions Manager</div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.4" }}>
                      Navigate to <code style={{ color: "#38bdf8" }}>chrome://extensions</code> or <code style={{ color: "#38bdf8" }}>edge://extensions</code> in your browser.
                    </p>
                  </div>

                  <div style={{ background: "#070e1c", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#00acf5", marginBottom: "4px" }}>STEP 3</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>Enable Developer Mode</div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.4" }}>
                      Toggle <strong>Developer mode</strong> ON in the top right, then click <strong>Load unpacked</strong> and pick the unzipped folder.
                    </p>
                  </div>

                  <div style={{ background: "#070e1c", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#00acf5", marginBottom: "4px" }}>STEP 4</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#f8fafc", marginBottom: "6px" }}>Pair Credentials</div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: "1.4" }}>
                      Click the extension settings icon, paste your Pairing Token below, and click <strong>Test Connection</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* PAIRING CREDENTIALS & ENDPOINTS CARD */}
              <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "8px", padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#f8fafc", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🔑</span> Extension Pairing Credentials & Endpoints
                  </h4>
                  <button
                    type="button"
                    onClick={handleVerifyExtensionToken}
                    disabled={verifyingExtension}
                    className="preset-pill"
                    style={{ background: "#0284c7", color: "#fff", fontWeight: 700, fontSize: "0.76rem" }}
                  >
                    {verifyingExtension ? "Verifying..." : "⚡ Verify Pairing Token with Backend"}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Extension Token */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>YOUR EXTENSION PAIRING TOKEN</label>
                      <button
                        type="button"
                        onClick={handleRegenerateToken}
                        disabled={loading}
                        style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Rotate Pairing Token
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type={revealedExtToken ? "text" : "password"}
                        readOnly
                        value={currentUser?.extensionToken || "bg_ext_admin_live_token_777"}
                        style={{ flex: 1, padding: "8px 12px", background: "#070e1c", border: "1px solid #334155", color: "#38bdf8", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.85rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => setRevealedExtToken(!revealedExtToken)}
                        style={{ background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
                      >
                        {revealedExtToken ? "🙈 Mask" : "👁 Reveal"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentUser?.extensionToken || "bg_ext_admin_live_token_777");
                          setCopiedExtToken(true);
                          setTimeout(() => setCopiedExtToken(false), 2000);
                        }}
                        style={{ background: copiedExtToken ? "#10b981" : "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                      >
                        {copiedExtToken ? "✓ Copied" : "📋 Copy Token"}
                      </button>
                    </div>
                  </div>

                  {/* Endpoints Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                    <div>
                      <label style={{ fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: "4px" }}>CONTROL PLANE API URL</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          readOnly
                          value="http://localhost:3000"
                          style={{ flex: 1, padding: "7px 10px", background: "#070e1c", border: "1px solid #334155", color: "#cbd5e1", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace" }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("http://localhost:3000");
                            setCopiedEndpointUrl(true);
                            setTimeout(() => setCopiedEndpointUrl(false), 1500);
                          }}
                          style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", padding: "7px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                        >
                          {copiedEndpointUrl ? "✓" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: "4px" }}>WEB STUDIO & RBI STREAM URL</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          readOnly
                          value="http://localhost:5173"
                          style={{ flex: 1, padding: "7px 10px", background: "#070e1c", border: "1px solid #334155", color: "#cbd5e1", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace" }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("http://localhost:5173");
                          }}
                          style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", padding: "7px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Verification result badge */}
                  {extensionVerifyResult && (
                    <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "6px", padding: "10px 14px", marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ color: "#34d399", fontSize: "0.82rem" }}>✓ Token Verified & Active</strong>
                        <div style={{ fontSize: "0.76rem", color: "#cbd5e1", marginTop: "2px" }}>
                          Account: {extensionVerifyResult.user.email} • Org: {extensionVerifyResult.organization.name} • Status: {extensionVerifyResult.gateway.status}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.76rem", color: "#4ade80", fontWeight: 700, background: "rgba(16, 185, 129, 0.2)", padding: "4px 8px", borderRadius: "4px" }}>
                        Quota Remaining: {extensionVerifyResult.gateway.quota_remaining} links
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* INTERACTIVE WEBMAIL SHIELD TESTBED */}
              <div style={{ background: "#070e1c", border: "1px solid rgba(0, 172, 245, 0.3)", borderRadius: "8px", padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#f8fafc", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>🧪</span> Interactive Webmail Link Interception Simulator
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Simulate how the BrowseGuard extension protects employees inside Microsoft Outlook & Google Gmail.
                    </p>
                  </div>
                  {simScanState !== "idle" && (
                    <button
                      type="button"
                      onClick={() => setSimScanState("idle")}
                      style={{ background: "#1e293b", border: "1px solid #334155", color: "#cbd5e1", padding: "4px 10px", borderRadius: "4px", fontSize: "0.74rem", cursor: "pointer" }}
                    >
                      Reset Simulator
                    </button>
                  )}
                </div>

                {/* Simulated Email Message View */}
                <div style={{ background: "#0b1329", border: "1px solid #1e293b", borderRadius: "6px", padding: "16px", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>FROM:</div>
                      <strong style={{ fontSize: "0.85rem", color: "#f8fafc" }}>Microsoft 365 Security Team &lt;alert@microsoft-tenant-verify.xyz&gt;</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                        Untrusted External Sender
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.86rem", color: "#cbd5e1", lineHeight: "1.5", marginBottom: "14px" }}>
                    <strong>Subject: Urgent - Re-authentication Required for Corporate Tenant</strong>
                    <p style={{ margin: "8px 0 12px 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                      We detected an unauthorized sign-in attempt on your account from a new geographical region. To prevent suspension, verify your account credentials within 2 hours:
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSimScanState("scanning");
                          setTimeout(() => setSimScanState("alert"), 800);
                        }}
                        style={{
                          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                          color: "#fff",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span>🔗</span> Verify Microsoft 365 Account (Click to Test Shield)
                      </button>
                      <span style={{ fontSize: "0.74rem", color: "#64748b", fontFamily: "monospace" }}>
                        https://login.microsoftonline.com.tenant-verify.phish-net.org
                      </span>
                    </div>
                  </div>

                  {/* Scanning in progress indicator */}
                  {simScanState === "scanning" && (
                    <div style={{ background: "rgba(15, 23, 42, 0.95)", border: "1px solid #00e5ff", borderRadius: "8px", padding: "12px 18px", display: "flex", alignItems: "center", gap: "12px", animation: "bgFadeIn 0.2s ease-out" }}>
                      <div className="bg-spinner" style={{ width: "18px", height: "18px", border: "2px solid rgba(0, 229, 255, 0.2)", borderTopColor: "#00e5ff", borderRadius: "50%", animation: "bgSpin 0.8s linear infinite" }} />
                      <div>
                        <div style={{ fontWeight: 700, color: "#00e5ff", fontSize: "0.85rem" }}>BrowseGuard Zero-Trust Shield Intercepting...</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Inspecting link in isolated Chromium sandbox VM...</div>
                      </div>
                    </div>
                  )}

                  {/* Live Simulation Alert Modal Overlay */}
                  {simScanState === "alert" && (
                    <div style={{ background: "#0f172a", border: "1px solid #ef4444", borderRadius: "10px", padding: "20px", marginTop: "14px", boxShadow: "0 10px 25px rgba(0,0,0,0.6)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                          🛡️
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#fff", fontWeight: 800 }}>Malicious Phishing Link Blocked</h4>
                          <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#94a3b8" }}>
                            BrowseGuard active isolation prevented one-click local endpoint compromise.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "inline-block", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "3px 10px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 800, marginBottom: "12px" }}>
                        ● MALICIOUS • Risk Score: 95/100
                      </div>

                      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "6px", padding: "8px 12px", fontFamily: "monospace", fontSize: "0.78rem", color: "#38bdf8", marginBottom: "14px", wordBreak: "break-all" }}>
                        https://login.microsoftonline.com.tenant-verify.phish-net.org
                      </div>

                      <div style={{ background: "rgba(15, 23, 42, 0.6)", borderLeft: "3px solid #ef4444", padding: "10px 12px", borderRadius: "4px", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "16px", lineHeight: "1.4" }}>
                        <strong>Detected Threat Indicators:</strong> Targeted Microsoft 365 credential harvester • Homoglyph subdomain abuse • Deceptive form destination.
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onLaunchRbi) {
                              onLaunchRbi("https://login.microsoftonline.com.tenant-verify.phish-net.org");
                            } else {
                              alert("Opening Live Isolated Browser...");
                            }
                          }}
                          style={{
                            background: "linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)",
                            color: "#071020",
                            border: "none",
                            padding: "9px 18px",
                            borderRadius: "6px",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            boxShadow: "0 2px 10px rgba(0, 229, 255, 0.3)"
                          }}
                        >
                          ⚡ Open in Isolated Browser (Zero Risk)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimScanState("idle")}
                          style={{ background: "#ef4444", color: "#fff", border: "none", padding: "9px 16px", borderRadius: "6px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                        >
                          Abort & Close (Recommended)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

              <div>
                <label style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>Gateway you are logging into:</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {gatewaysMeta.map((gw) => (
                    <button
                      key={gw.key}
                      type="button"
                      onClick={() => setTargetLoginGateway(gw.key)}
                      style={{
                        padding: "8px 6px",
                        textAlign: "center",
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        border: targetLoginGateway === gw.key ? "1px solid #00acf5" : "1px solid #334155",
                        background: targetLoginGateway === gw.key ? "rgba(0, 172, 245, 0.15)" : "#0f172a",
                        color: targetLoginGateway === gw.key ? "#38bdf8" : "#94a3b8",
                        fontWeight: targetLoginGateway === gw.key ? 750 : 500
                      }}
                    >
                      <div style={{ fontSize: "1.1rem" }}>{gw.icon}</div>
                      <div>{gw.key === "url_scanner" ? "Sandbox Studio" : gw.key === "browser_extension" ? "Extension" : "Email API"}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", marginTop: "8px" }}
              >
                {loading ? "Authenticating..." : "Sign In to Gateway"}
              </button>
            </form>
          )}

          {/* TAB 3: REGISTER NEW USER & CHOOSE GATEWAY TRIAL */}
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

              <div>
                <label style={{ fontSize: "0.82rem", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Select Initial 14-Day Free Trial Gateway:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {gatewaysMeta.map((gw) => (
                    <div
                      key={gw.key}
                      onClick={() => setSelectedGateway(gw.key)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        border: selectedGateway === gw.key ? "1px solid #00acf5" : "1px solid #334155",
                        background: selectedGateway === gw.key ? "rgba(0, 172, 245, 0.12)" : "rgba(15, 23, 42, 0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.2rem" }}>{gw.icon}</span>
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: selectedGateway === gw.key ? "#38bdf8" : "#f1f5f9" }}>
                            {gw.title}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{gw.desc}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700, padding: "2px 8px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "4px" }}>
                        {gw.trialLimit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ background: "#16a34a", color: "#fff", border: "none", padding: "11px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", marginTop: "8px" }}
              >
                {loading ? "Creating Account..." : "Create Account & Start Gateway Free Trial"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
