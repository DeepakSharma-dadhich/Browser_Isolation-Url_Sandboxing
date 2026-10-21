import React, { useState, useEffect } from "react";

export default function AdminConsole({ currentUser, onBackToWorkspace }) {
  const [activeTab, setActiveTab] = useState("users"); // "users" | "gateways" | "analytics" | "audit"
  const [users, setUsers] = useState([]);
  const [gatewaysData, setGatewaysData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Invite/Create User Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("Password123!");
  const [newUserRole, setNewUserRole] = useState("ANALYST");
  const [submittingUser, setSubmittingUser] = useState(false);

  // Edit Gateway State
  const [maxConcurrency, setMaxConcurrency] = useState(50);
  const [editingGateway, setEditingGateway] = useState(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("bg_jwt_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "users") {
        const resp = await fetch("/api/v1/admin/users", { headers: getAuthHeader() });
        const data = await resp.json();
        if (resp.ok) setUsers(data.data || []);
        else throw new Error(data.error || "Failed to load users");
      } else if (activeTab === "gateways") {
        const resp = await fetch("/api/v1/admin/gateways", { headers: getAuthHeader() });
        const data = await resp.json();
        if (resp.ok) {
          setGatewaysData(data.data || {});
          setMaxConcurrency(data.data?.organization?.max_concurrent_scans || 50);
        } else throw new Error(data.error || "Failed to load gateways");
      } else if (activeTab === "analytics") {
        const resp = await fetch("/api/v1/admin/analytics", { headers: getAuthHeader() });
        const data = await resp.json();
        if (resp.ok) setAnalyticsData(data.data || {});
        else throw new Error(data.error || "Failed to load analytics");
      } else if (activeTab === "audit") {
        const resp = await fetch("/api/v1/admin/audit-logs", { headers: getAuthHeader() });
        const data = await resp.json();
        if (resp.ok) setAuditLogs(data.data || []);
        else throw new Error(data.error || "Failed to load audit logs");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // User Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const resp = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          email: newUserEmail,
          fullName: newUserFullName,
          password: newUserPassword,
          role: newUserRole
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to create user");

      setShowAddUserModal(false);
      setNewUserEmail("");
      setNewUserFullName("");
      showNotification(`✓ User '${data.data.email}' added successfully!`);
      fetchAdminData();
    } catch (err) {
      alert("Error creating user: " + err.message);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ role: newRole })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to update role");
      showNotification(`✓ User role updated to ${newRole}`);
      fetchAdminData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to update status");
      showNotification(`✓ User account ${!currentStatus ? "activated" : "suspended"}`);
      fetchAdminData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to permanently delete user '${email}'?`)) return;
    try {
      const resp = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeader()
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to delete user");
      showNotification(`✓ User '${email}' deleted successfully.`);
      fetchAdminData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Gateway Actions
  const handleUpdateGateway = async (gatewayId, payload) => {
    try {
      const resp = await fetch(`/api/v1/admin/gateways/${gatewayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to update gateway");
      showNotification(`✓ Gateway '${gatewayId}' updated successfully!`);
      setEditingGateway(null);
      fetchAdminData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleUpdateConcurrency = async () => {
    try {
      const resp = await fetch(`/api/v1/admin/gateways/url_scanner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ maxConcurrentScans: maxConcurrency })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to update concurrency");
      showNotification(`✓ Max concurrency limit updated to ${maxConcurrency}!`);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="admin-console-container" style={{ padding: "24px 0", maxWidth: "1520px", margin: "0 auto" }}>
      {/* Top Admin Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", boxShadow: "0 0 20px rgba(2, 132, 199, 0.4)" }}>
            ⚙️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.02em" }}>
                Enterprise Admin Console
              </h1>
              <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.4)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 800 }}>
                TENANT ADMIN
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Organization role-based access control, gateway licenses, quotas, and global threat analytics
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToWorkspace}
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(0, 172, 245, 0.4)",
            color: "#38bdf8",
            padding: "8px 18px",
            borderRadius: "8px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          ← Return to Detonation Studio
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#34d399", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.85rem", fontWeight: 700 }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#f87171", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.85rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", background: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "10px", marginBottom: "24px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
        {[
          { id: "users", label: `👥 Team & Users (${users.length || "--"})`, icon: "👥" },
          { id: "gateways", label: "🛡️ Gateway Subscriptions & Quotas", icon: "🛡️" },
          { id: "analytics", label: "📊 Security KPIs & Analytics", icon: "📊" },
          { id: "audit", label: "📜 Enterprise Audit Trail", icon: "📜" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              background: activeTab === tab.id ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "#94a3b8",
              boxShadow: activeTab === tab.id ? "0 4px 15px rgba(14, 165, 233, 0.3)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid rgba(0, 172, 245, 0.2)", borderTopColor: "#00acf5", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          Loading console data...
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: TEAM & USER MANAGEMENT                                  */}
      {/* ============================================================== */}
      {!loading && activeTab === "users" && (
        <div className="panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800 }}>Organization Members & Roles</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>Control member access levels, assigned roles, and suspension states</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)"
              }}
            >
              + Add / Invite Member
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left", color: "#94a3b8" }}>
                  <th style={{ padding: "10px 14px" }}>USER</th>
                  <th style={{ padding: "10px 14px" }}>ROLE</th>
                  <th style={{ padding: "10px 14px" }}>STATUS</th>
                  <th style={{ padding: "10px 14px" }}>SCANS RUN</th>
                  <th style={{ padding: "10px 14px" }}>EXTENSION TOKEN</th>
                  <th style={{ padding: "10px 14px" }}>JOINED</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, color: "#f8fafc" }}>{u.full_name || "Analyst"}</div>
                      <div style={{ color: "#64748b", fontSize: "0.75rem", fontFamily: "monospace" }}>{u.email}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        disabled={u.id === currentUser?.id}
                        style={{
                          background: "#0a1324",
                          border: "1px solid rgba(0, 172, 245, 0.4)",
                          color: u.role === "ADMIN" || u.role === "OWNER" ? "#38bdf8" : "#cbd5e1",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: u.id === currentUser?.id ? "not-allowed" : "pointer"
                        }}
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="ANALYST">ANALYST</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          background: u.is_active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: u.is_active ? "#10b981" : "#f87171"
                        }}
                      >
                        {u.is_active ? "ACTIVE" : "SUSPENDED"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#38bdf8" }}>
                      {u.total_scans}
                    </td>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: "0.75rem", color: "#64748b" }}>
                      {u.extension_token ? `${u.extension_token.slice(0, 14)}...` : "--"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748b", fontSize: "0.75rem" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      {u.id !== currentUser?.id ? (
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.id, u.is_active)}
                            style={{
                              background: u.is_active ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              border: `1px solid ${u.is_active ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                              color: u.is_active ? "#f87171" : "#10b981",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            {u.is_active ? "Suspend" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            style={{
                              background: "rgba(239, 68, 68, 0.2)",
                              border: "1px solid #ef4444",
                              color: "#f87171",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "0.72rem", fontStyle: "italic" }}>Current Session</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GATEWAY SUBSCRIPTIONS & LICENSES                        */}
      {/* ============================================================== */}
      {!loading && activeTab === "gateways" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Concurrency Global Setting */}
          <div className="panel" style={{ padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", color: "#f8fafc", fontWeight: 800 }}>⚡ Tenant Max Concurrent Detonation Slots</h4>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "0.8rem" }}>
                  Controls how many heavy Chromium sandboxes can run simultaneously across all organization users before queuing.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="number"
                  min="5"
                  max="150"
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                  style={{ width: "90px", background: "#0a1324", border: "1px solid rgba(0, 172, 245, 0.4)", borderRadius: "6px", padding: "6px 10px", color: "#38bdf8", fontWeight: 800, fontSize: "0.9rem" }}
                />
                <button
                  type="button"
                  onClick={handleUpdateConcurrency}
                  style={{ background: "#00acf5", border: "none", color: "#ffffff", padding: "6px 14px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Save Slots
                </button>
              </div>
            </div>
          </div>

          {/* 4 Gateway Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "18px" }}>
            {gatewaysData?.gateways?.map((gw) => (
              <div
                key={gw.id}
                style={{
                  background: "#081225",
                  border: "1px solid rgba(0, 172, 245, 0.3)",
                  borderRadius: "10px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "1.8rem" }}>{gw.icon}</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1rem", color: "#f8fafc", fontWeight: 800 }}>{gw.name}</h4>
                        <span style={{ fontSize: "0.72rem", color: gw.status === "ACTIVE" ? "#10b981" : "#f59e0b", fontWeight: 800 }}>
                          ● {gw.status} • {gw.plan_tier} TIER
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: "0 0 16px", minHeight: "40px" }}>
                    {gw.description}
                  </p>

                  <div style={{ background: "rgba(15, 23, 42, 0.6)", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                      <span style={{ color: "#64748b" }}>Allocated Quota:</span>
                      <strong style={{ color: "#38bdf8" }}>{gw.quota_total >= 999999 ? "Unlimited" : `${gw.quota_remaining} / ${gw.quota_total}`}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                      <span style={{ color: "#64748b" }}>Consumed by Team:</span>
                      <strong style={{ color: "#cbd5e1" }}>{gw.quota_used} scans</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateGateway(gw.id, { status: gw.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}
                    style={{
                      flex: 1,
                      background: gw.status === "ACTIVE" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      border: `1px solid ${gw.status === "ACTIVE" ? "#ef4444" : "#10b981"}`,
                      color: gw.status === "ACTIVE" ? "#f87171" : "#34d399",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    {gw.status === "ACTIVE" ? "Disable Gateway" : "Enable Gateway"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newQuota = prompt(`Set new scan quota for ${gw.name}:`, gw.quota_total);
                      if (newQuota !== null && !isNaN(newQuota)) {
                        handleUpdateGateway(gw.id, { quotaTotal: parseInt(newQuota, 10) });
                      }
                    }}
                    style={{
                      background: "rgba(0, 172, 245, 0.2)",
                      border: "1px solid rgba(0, 172, 245, 0.4)",
                      color: "#38bdf8",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Adjust Quota
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: GLOBAL THREAT ANALYTICS                                 */}
      {/* ============================================================== */}
      {!loading && activeTab === "analytics" && analyticsData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div className="panel" style={{ padding: "18px", borderLeft: "4px solid #00acf5" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>TOTAL DETONATIONS</span>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f8fafc", margin: "6px 0 2px" }}>
                {analyticsData.summary?.total_scans || 0}
              </div>
              <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>Across organization</span>
            </div>

            <div className="panel" style={{ padding: "18px", borderLeft: "4px solid #ef4444" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>MALICIOUS INTERCEPTIONS</span>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f87171", margin: "6px 0 2px" }}>
                {analyticsData.summary?.malicious_count || 0}
              </div>
              <span style={{ fontSize: "0.72rem", color: "#f87171" }}>High-severity threat blocked</span>
            </div>

            <div className="panel" style={{ padding: "18px", borderLeft: "4px solid #f59e0b" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>SUSPICIOUS LURES</span>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fbbf24", margin: "6px 0 2px" }}>
                {analyticsData.summary?.suspicious_count || 0}
              </div>
              <span style={{ fontSize: "0.72rem", color: "#fbbf24" }}>Flagged by threat heuristics</span>
            </div>

            <div className="panel" style={{ padding: "18px", borderLeft: "4px solid #10b981" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>BENIGN SITES VERIFIED</span>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#34d399", margin: "6px 0 2px" }}>
                {analyticsData.summary?.safe_count || 0}
              </div>
              <span style={{ fontSize: "0.72rem", color: "#34d399" }}>0 risk score verified</span>
            </div>
          </div>

          {/* Dual Split Table */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Top Threat Domains */}
            <div className="panel" style={{ padding: "20px" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: "0.95rem", color: "#f8fafc", fontWeight: 800 }}>
                🎯 Top Intercepted Threat Domains
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {analyticsData.topThreatDomains?.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(15, 23, 42, 0.6)",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}
                  >
                    <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#e2e8f0", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.domain}>
                      {d.domain}
                    </span>
                    <span style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.4)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 800 }}>
                      {d.threat_count} hits
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Scanners Leaderboard */}
            <div className="panel" style={{ padding: "20px" }}>
              <h4 style={{ margin: "0 0 14px", fontSize: "0.95rem", color: "#f8fafc", fontWeight: 800 }}>
                👤 Top Team Scanners
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {analyticsData.topScanners?.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(15, 23, 42, 0.6)",
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#f8fafc", fontSize: "0.82rem" }}>{s.full_name || s.email}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{s.role}</div>
                    </div>
                    <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: "0.85rem" }}>
                      {s.scan_count} scans
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: ENTERPRISE AUDIT TRAIL                                  */}
      {/* ============================================================== */}
      {!loading && activeTab === "audit" && (
        <div className="panel" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "1.1rem", color: "#f8fafc", fontWeight: 800 }}>
            Chronological Security Audit Log
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ background: "rgba(15, 23, 42, 0.8)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left", color: "#94a3b8" }}>
                  <th style={{ padding: "10px 14px" }}>TIMESTAMP</th>
                  <th style={{ padding: "10px 14px" }}>ACTOR</th>
                  <th style={{ padding: "10px 14px" }}>EVENT TYPE</th>
                  <th style={{ padding: "10px 14px" }}>ACTION</th>
                  <th style={{ padding: "10px 14px" }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#38bdf8" }}>
                      {log.actor_email || log.actor_name || "System"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", padding: "2px 6px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                        {log.event_type || "SECURITY"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#f8fafc" }}>
                      {log.action}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "0.72rem", color: "#94a3b8", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / INVITE USER MODAL */}
      {showAddUserModal && (
        <div className="bg-modal-overlay" style={{ zIndex: 12000 }}>
          <div className="bg-modal-card" style={{ maxWidth: "480px", width: "95%", background: "#0a1324", border: "1px solid rgba(0, 172, 245, 0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.1rem", fontWeight: 800 }}>+ Add Team Member</h3>
              <button type="button" onClick={() => setShowAddUserModal(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="analyst@organization.com"
                    style={{ width: "100%", background: "#050d1a", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "8px 12px", color: "#fff" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>FULL NAME</label>
                  <input
                    type="text"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    placeholder="Jane Doe"
                    style={{ width: "100%", background: "#050d1a", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "8px 12px", color: "#fff" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>TEMPORARY PASSWORD</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    style={{ width: "100%", background: "#050d1a", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", padding: "8px 12px", color: "#fff" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>ASSIGNED ROLE</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    style={{ width: "100%", background: "#050d1a", border: "1px solid rgba(0, 172, 245, 0.4)", borderRadius: "6px", padding: "8px 12px", color: "#38bdf8", fontWeight: 700 }}
                  >
                    <option value="ANALYST">ANALYST (Execute Scans & View Reports)</option>
                    <option value="VIEWER">VIEWER (Read-Only Reports & Threat History)</option>
                    <option value="ADMIN">ADMIN (Full Control & Team Management)</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button type="button" onClick={() => setShowAddUserModal(false)} style={{ background: "transparent", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#94a3b8", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={submittingUser} style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", color: "#fff", padding: "8px 20px", borderRadius: "6px", fontWeight: 800, cursor: "pointer" }}>
                    {submittingUser ? "Creating..." : "Provision Member"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
