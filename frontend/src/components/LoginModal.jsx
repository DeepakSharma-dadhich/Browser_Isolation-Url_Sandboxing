import React, { useState } from "react";

export default function LoginModal({ onLoginSuccess, onClose, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const payload =
        mode === "login"
          ? { email: email.trim(), password }
          : { email: email.trim(), password, fullName: fullName.trim() };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (!resp.ok) {
        const errorMsg =
          typeof data.error === "object"
            ? (data.error?.message || JSON.stringify(data.error))
            : (data.error || data.message || "Authentication failed.");
        throw new Error(errorMsg);
      }

      const { token, user } = data.data || {};
      if (token) {
        localStorage.setItem("bg_jwt_token", token);
      }
      if (user?.extension_token) {
        localStorage.setItem("bg_ext_token", user.extension_token);
      }

      const formattedUser = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        extensionToken: user.extension_token,
        organizationName: user.organization_name || "Default Organization"
      };

      onLoginSuccess(formattedUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setLoading(true);
    setError("");

    try {
      const resp = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: quickEmail, password: quickPassword })
      });

      const data = await resp.json();
      if (!resp.ok) {
        const errorMsg =
          typeof data.error === "object"
            ? (data.error?.message || JSON.stringify(data.error))
            : (data.error || data.message || "Login failed.");
        throw new Error(errorMsg);
      }

      const { token, user } = data.data || {};
      if (token) {
        localStorage.setItem("bg_jwt_token", token);
      }
      if (user?.extension_token) {
        localStorage.setItem("bg_ext_token", user.extension_token);
      }

      const formattedUser = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        extensionToken: user.extension_token,
        organizationName: user.organization_name || "Default Organization"
      };

      onLoginSuccess(formattedUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "linear-gradient(180deg, #0d1527 0%, #080d1a 100%)",
          border: "1px solid rgba(0, 172, 245, 0.35)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 172, 245, 0.15)",
          overflow: "hidden",
          color: "#f8fafc"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.6)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.3rem" }}>🔒</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                {mode === "login" ? "Sign in to BrowseGuard" : "Create SOC Account"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                Zero-Trust Browser Isolation & URL Sandboxing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#cbd5e1",
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(11, 19, 35, 0.4)"
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              background: mode === "login" ? "rgba(0, 172, 245, 0.15)" : "transparent",
              color: mode === "login" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: mode === "login" ? "2px solid #00acf5" : "2px solid transparent",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            style={{
              flex: 1,
              padding: "12px",
              background: mode === "register" ? "rgba(0, 172, 245, 0.15)" : "transparent",
              color: mode === "register" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: mode === "register" ? "2px solid #00acf5" : "2px solid transparent",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Register Account
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 14px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "8px",
                color: "#fca5a5",
                fontSize: "0.82rem",
                display: "flex",
                gap: "8px",
                alignItems: "center"
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mode === "register" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "6px" }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Alex Analyst"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(2, 6, 23, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  boxSizing: "border-box"
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="user@browseguard.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(2, 6, 23, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.85rem",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(2, 6, 23, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.85rem",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(0, 172, 245, 0.4)",
              transition: "transform 0.15s ease"
            }}
          >
            {loading ? "Authenticating..." : mode === "login" ? "Sign In ➔" : "Create Account ➔"}
          </button>

          {/* Quick Demo Credentials */}
          <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.75rem", color: "#94a3b8", textAlign: "center" }}>
              ⚡ 1-Click Fast SOC Testing Logins:
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@browseguard.local", "Password123!")}
                disabled={loading}
                style={{
                  background: "rgba(14, 165, 233, 0.12)",
                  border: "1px solid rgba(14, 165, 233, 0.3)",
                  color: "#38bdf8",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("itsdeepaksharma2003@gmail.com", "Password123!")}
                disabled={loading}
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#34d399",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🔍 Analyst
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("viewer_test_1791981644388@browseguard.local", "Password123!")
                }
                disabled={loading}
                style={{
                  background: "rgba(148, 163, 184, 0.12)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  color: "#cbd5e1",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                📄 Viewer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
