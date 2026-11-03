import React, { useState, useEffect } from "react";

export default function UserManagementModal({
  currentUser,
  onUpdateUser,
  onClose,
  initialTab = "profile" // "profile" | "team" | "switcher" | "quotas"
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });

  // Profile Form State
  const [fullName, setFullName] = useState(currentUser?.fullName || "");

  useEffect(() => {
    setFullName(currentUser?.fullName || "");
  }, [currentUser]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [revealedExtToken, setRevealedExtToken] = useState(false);
  const [copiedExtToken, setCopiedExtToken] = useState(false);
  const [regeneratingToken, setRegeneratingToken] = useState(false);

  // Team Directory State
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("ALL");
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Add User Drawer State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("ANALYST");
  const [newUserPassword, setNewUserPassword] = useState("Password123!");
  const [creatingUser, setCreatingUser] = useState(false);

  // Quotas State
  const [subscriptions, setSubscriptions] = useState(null);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  // Fast Switcher State
  const [switchingUser, setSwitchingUser] = useState(false);
  const [customLoginEmail, setCustomLoginEmail] = useState("");
  const [customLoginPassword, setCustomLoginPassword] = useState("");

  const notify = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 4000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("bg_jwt_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 1. Fetch live team members
  const fetchTeamUsers = async () => {
    setLoadingTeam(true);
    try {
      const resp = await fetch("/api/v1/admin/users", {
        headers: getAuthHeaders()
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setTeamUsers(data.data || []);
      } else {
        // If 401 or 403, user may not be admin, or unauthenticated
        setTeamUsers([]);
      }
    } catch (err) {
      console.warn("Failed to load team users:", err.message);
    } finally {
      setLoadingTeam(false);
    }
  };

  // 2. Fetch live subscriptions
  const fetchSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const resp = await fetch("/api/v1/auth/subscriptions", {
        headers: getAuthHeaders()
      });
      const data = await resp.json();
      if (resp.ok) {
        setSubscriptions(data.data || {});
      }
    } catch (err) {
      console.warn("Failed to load subscriptions:", err.message);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  useEffect(() => {
    if (activeTab === "team") {
      fetchTeamUsers();
    } else if (activeTab === "quotas") {
      fetchSubscriptions();
    }
  }, [activeTab]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const resp = await fetch("/api/v1/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ fullName })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to update profile");

      const updated = {
        ...currentUser,
        fullName: data.data?.full_name || fullName
      };
      onUpdateUser(updated);
      notify("Profile name updated successfully.");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      notify("New password must be at least 8 characters long.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify("New passwords do not match.", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const resp = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to change password");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Password changed successfully.");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Regenerate Extension Token
  const handleRegenerateToken = async () => {
    if (!window.confirm("Regenerating this token will disconnect your browser extension until updated. Continue?")) return;
    setRegeneratingToken(true);
    try {
      const resp = await fetch("/api/v1/auth/extension-token/regenerate", {
        method: "POST",
        headers: getAuthHeaders()
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to regenerate token");

      const updated = {
        ...currentUser,
        extensionToken: data.data?.extension_token
      };
      onUpdateUser(updated);
      notify("Browser extension pairing token refreshed.");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setRegeneratingToken(false);
    }
  };

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const resp = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          email: newEmail,
          fullName: newName,
          password: newUserPassword,
          role: newRole
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to create user");

      notify(`User ${newEmail} created successfully.`);
      setNewEmail("");
      setNewName("");
      setNewUserPassword("Password123!");
      setShowAddUser(false);
      fetchTeamUsers();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle Update User Role
  const handleUpdateRole = async (userId, targetRole) => {
    try {
      const resp = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ role: targetRole })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to update role");

      notify("User role updated.");
      fetchTeamUsers();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  // Handle Toggle User Status
  const handleToggleStatus = async (userId, currentActive) => {
    try {
      const resp = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ isActive: !currentActive })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to update status");

      notify(`User ${currentActive ? "deactivated" : "activated"}.`);
      fetchTeamUsers();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) return;
    try {
      const resp = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to delete user");

      notify(`User ${userEmail} removed.`);
      fetchTeamUsers();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  // Perform Real 1-Click Login & Account Switch
  const executeLoginSwitch = async (emailToLogin, passwordToLogin) => {
    setSwitchingUser(true);
    try {
      const resp = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToLogin, password: passwordToLogin })
      });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error(payload.error || "Authentication failed.");
      }

      const { token, user } = payload.data || {};
      if (token) {
        localStorage.setItem("bg_jwt_token", token);
        localStorage.removeItem("bg_signed_out");
      }
      if (user?.extension_token) {
        localStorage.setItem("bg_ext_token", user.extension_token);
      }

      const formattedUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.full_name,
        role: user.role,
        extensionToken: user.extensionToken || user.extension_token,
        organizationName: user.organizationName || user.organization_name || "Default Organization"
      };

      if (onUpdateUser) onUpdateUser(formattedUser);
      notify(`Switched session to ${user.full_name || user.fullName} (${user.role}).`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSwitchingUser(false);
    }
  };

  // Sign out cleanly
  const handleSignOut = () => {
    localStorage.removeItem("bg_jwt_token");
    localStorage.removeItem("bg_ext_token");
    localStorage.removeItem("bg_current_user");
    localStorage.setItem("bg_signed_out", "true");
    if (onUpdateUser) onUpdateUser(null);
    notify("Signed out successfully. Active session terminated.");
    setTimeout(() => {
      onClose();
    }, 450);
  };

  // Filter team users
  const filteredTeam = teamUsers.filter((u) => {
    const matchSearch =
      !teamSearch ||
      u.email.toLowerCase().includes(teamSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(teamSearch.toLowerCase()));
    const matchRole = teamRoleFilter === "ALL" || u.role === teamRoleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
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
          maxWidth: "960px",
          maxHeight: "90vh",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-panel)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--text-primary)"
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-panel-header)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                boxShadow: "0 4px 12px rgba(0, 172, 245, 0.4)"
              }}
            >
              👤
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.01em" }}>
                Identity & Access Management
              </h2>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                BrowseGuard SOC Enterprise Profile, RBAC Roles & Team Directory
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {currentUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                title="Sign out of active session"
              >
                ⎋ Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("switcher")}
                style={{
                  background: "rgba(14, 165, 233, 0.2)",
                  border: "1px solid rgba(14, 165, 233, 0.4)",
                  color: "#38bdf8",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                ⚡ Fast Sign In
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                fontSize: "1.1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {notification.message && (
          <div
            style={{
              padding: "10px 24px",
              background:
                notification.type === "error"
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(16, 185, 129, 0.2)",
              borderBottom: `1px solid ${
                notification.type === "error" ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"
              }`,
              color: notification.type === "error" ? "#fca5a5" : "#6ee7b7",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>{notification.type === "error" ? "⚠️" : "✓"}</span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "12px 24px 0 24px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-card)"
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            style={{
              background: activeTab === "profile" ? "rgba(0, 172, 245, 0.15)" : "transparent",
              color: activeTab === "profile" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "profile" ? "2px solid #00acf5" : "2px solid transparent",
              padding: "10px 18px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>👤</span> My Profile & Security
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("team")}
            style={{
              background: activeTab === "team" ? "rgba(0, 172, 245, 0.15)" : "transparent",
              color: activeTab === "team" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "team" ? "2px solid #00acf5" : "2px solid transparent",
              padding: "10px 18px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>👥</span> Team Directory & Roles
            {teamUsers.length > 0 && (
              <span
                style={{
                  background: "rgba(0, 172, 245, 0.25)",
                  color: "#38bdf8",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontSize: "0.72rem"
                }}
              >
                {teamUsers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("switcher")}
            style={{
              background: activeTab === "switcher" ? "rgba(168, 85, 247, 0.15)" : "transparent",
              color: activeTab === "switcher" ? "#c084fc" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "switcher" ? "2px solid #a855f7" : "2px solid transparent",
              padding: "10px 18px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>⚡</span> Fast Account Switcher
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quotas")}
            style={{
              background: activeTab === "quotas" ? "rgba(16, 185, 129, 0.15)" : "transparent",
              color: activeTab === "quotas" ? "#34d399" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "quotas" ? "2px solid #10b981" : "2px solid transparent",
              padding: "10px 18px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🛡️</span> Quotas & Subscriptions
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
          {/* TAB 1: MY PROFILE & SECURITY */}
          {activeTab === "profile" &&
            (!currentUser ? (
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "14px",
                  padding: "40px 24px",
                  textAlign: "center",
                  maxWidth: "520px",
                  margin: "30px auto"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔒</div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                  Signed Out (Guest Session)
                </h3>
                <p style={{ margin: "0 0 20px 0", fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5 }}>
                  You have successfully signed out of BrowseGuard. To access your enterprise profile, pair your extension shield, or manage team members, sign in or select a role.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("switcher")}
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                    border: "none",
                    color: "#fff",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)"
                  }}
                >
                  ⚡ Open 1-Click Fast Switcher / Sign In ➔
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Left Column: Account Details & Extension Token */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* User Info Card */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "20px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background:
                          currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                            ? "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)"
                            : currentUser?.role === "VIEWER"
                            ? "linear-gradient(135deg, #64748b 0%, #475569 100%)"
                            : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "1.3rem",
                        color: "#fff"
                      }}
                    >
                      {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                          {currentUser?.fullName || "Authenticated User"}
                        </h3>
                        <span
                          style={{
                            background:
                              currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                                ? "rgba(14, 165, 233, 0.2)"
                                : currentUser?.role === "VIEWER"
                                ? "rgba(148, 163, 184, 0.2)"
                                : "rgba(16, 185, 129, 0.2)",
                            color:
                              currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                                ? "#38bdf8"
                                : currentUser?.role === "VIEWER"
                                ? "#cbd5e1"
                                : "#34d399",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            border: `1px solid ${
                              currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                                ? "rgba(14, 165, 233, 0.4)"
                                : "rgba(16, 185, 129, 0.4)"
                            }`
                          }}
                        >
                          {currentUser?.role || "GUEST"}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                        {currentUser?.email || "No email linked"}
                      </p>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.6 }}>
                    <div>
                      <strong>Organization:</strong>{" "}
                      <span style={{ color: "#38bdf8" }}>{currentUser?.organizationName || "Default Organization"}</span>
                    </div>
                    <div>
                      <strong>Session Security:</strong>{" "}
                      <span style={{ color: "#34d399" }}>● JWT Cryptographically Verified</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      Active JWT session linked to this browser.
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "#f87171",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)")}
                      title="Terminate session and sign out"
                    >
                      <span>⎋</span> Terminate Session & Sign Out
                    </button>
                  </div>
                </div>

                {/* Edit Profile Form */}
                <form
                  onSubmit={handleUpdateProfile}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "20px"
                  }}
                >
                  <h4 style={{ margin: "0 0 14px 0", fontSize: "0.92rem", fontWeight: 700, color: "#e2e8f0" }}>
                    Edit Display Profile
                  </h4>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
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
                    disabled={updatingProfile}
                    style={{
                      background: "#00acf5",
                      border: "none",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: updatingProfile ? "not-allowed" : "pointer"
                    }}
                  >
                    {updatingProfile ? "Updating..." : "Save Name"}
                  </button>
                </form>

                {/* Browser Extension Pairing Token */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "20px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#e2e8f0" }}>
                      🧩 Browser Extension Shield Token
                    </h4>
                    <button
                      type="button"
                      onClick={handleRegenerateToken}
                      disabled={regeneratingToken}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f59e0b",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                      title="Invalidate old token and issue a fresh one"
                    >
                      {regeneratingToken ? "Regenerating..." : "↻ Regenerate Token"}
                    </button>
                  </div>
                  <p style={{ margin: "0 0 12px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                    Pair your Chrome extension to route clicks through isolated sandboxing automatically.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "rgba(2, 6, 23, 0.8)",
                      border: "1px solid rgba(0, 172, 245, 0.25)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      gap: "8px"
                    }}
                  >
                    <code
                      style={{
                        flex: 1,
                        fontSize: "0.82rem",
                        color: "#38bdf8",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {revealedExtToken
                        ? currentUser?.extensionToken || "Not paired"
                        : "••••••••••••••••••••••••••••••••••••••••••••"}
                    </code>

                    <button
                      type="button"
                      onClick={() => setRevealedExtToken(!revealedExtToken)}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#cbd5e1",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
                    >
                      {revealedExtToken ? "Hide" : "Reveal"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser?.extensionToken || "");
                        setCopiedExtToken(true);
                        setTimeout(() => setCopiedExtToken(false), 2000);
                      }}
                      style={{
                        background: copiedExtToken ? "#10b981" : "#0284c7",
                        border: "none",
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {copiedExtToken ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Password Change Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <form
                  onSubmit={handleChangePassword}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "20px"
                  }}
                >
                  <h4 style={{ margin: "0 0 14px 0", fontSize: "0.92rem", fontWeight: 700, color: "#e2e8f0" }}>
                    🔐 Change Account Password
                  </h4>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(2, 6, 23, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "0.85rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                      New Password (min. 8 characters)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(2, 6, 23, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "0.85rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "18px" }}>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "6px" }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
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
                    disabled={changingPassword}
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                      border: "none",
                      color: "#fff",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: changingPassword ? "not-allowed" : "pointer"
                    }}
                  >
                    {changingPassword ? "Updating Password..." : "Update Password"}
                  </button>
                </form>

                {/* Enterprise Identity Specs Info Card */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.4)",
                    border: "1px dashed rgba(255, 255, 255, 0.15)",
                    borderRadius: "12px",
                    padding: "16px",
                    fontSize: "0.8rem",
                    color: "#94a3b8",
                    lineHeight: 1.5
                  }}
                >
                  <strong style={{ color: "#38bdf8" }}>🛡️ Enterprise Zero-Trust Governance:</strong>
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: "18px" }}>
                    <li>Authentication claims are verified at the gateway using asymmetric JWT tokens.</li>
                    <li>Passwords are salted and cryptographically hashed with non-blocking bcrypt rounds.</li>
                    <li>Browser extension tokens permit headless analysis without exposing primary passwords.</li>
                  </ul>
                </div>
              </div>
            </div>
          ))}

          {/* TAB 2: TEAM DIRECTORY & ROLES */}
          {activeTab === "team" && (() => {
            const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "OWNER";
            return (
            <div>
              {!isAdmin && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px 16px",
                    background: "rgba(148, 163, 184, 0.08)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "10px",
                    fontSize: "0.82rem",
                    color: "#cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>🔒</span>
                  <div>
                    <strong style={{ color: "#38bdf8" }}>Read-Only Member Directory:</strong> You are currently viewing as <strong>{currentUser?.role || "GUEST"}</strong>. Modifying member roles, toggling account suspension, or provisioning new members requires <strong>Security Administrator (ADMIN)</strong> privileges.
                  </div>
                </div>
              )}

              {/* Team Top Action Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="🔍 Search users by name or email..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    style={{
                      padding: "8px 14px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.82rem",
                      minWidth: "260px"
                    }}
                  />

                  <select
                    value={teamRoleFilter}
                    onChange={(e) => setTeamRoleFilter(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.82rem"
                    }}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={fetchTeamUsers}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#cbd5e1",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                    title="Refresh user list"
                  >
                    ↻ Refresh
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddUser(!showAddUser)}
                      style={{
                        background: showAddUser ? "#475569" : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                        border: "none",
                        color: "#fff",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(14, 165, 233, 0.3)"
                      }}
                    >
                      {showAddUser ? "✕ Cancel" : "+ Add Member"}
                    </button>
                  )}
                </div>
              </div>

              {/* Add User Drawer / Form */}
              {showAddUser && (
                <form
                  onSubmit={handleCreateUser}
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(14, 165, 233, 0.4)",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "20px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                    gap: "12px",
                    alignItems: "end"
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex SOC Analyst"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(2, 6, 23, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "0.82rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="analyst@company.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(2, 6, 23, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "0.82rem",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Initial Password
                    </label>
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "rgba(2, 6, 23, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                      Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "rgba(2, 6, 23, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "0.82rem",
                        boxSizing: "border-box"
                      }}
                    >
                      <option value="ANALYST">ANALYST (Standard SOC)</option>
                      <option value="ADMIN">ADMIN (Full Control)</option>
                      <option value="VIEWER">VIEWER (Read-Only)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingUser}
                    style={{
                      background: "#10b981",
                      border: "none",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: creatingUser ? "not-allowed" : "pointer",
                      height: "36px"
                    }}
                  >
                    {creatingUser ? "Saving..." : "Create"}
                  </button>
                </form>
              )}

              {/* Team Members Table */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  overflow: "hidden"
                }}
              >
                {loadingTeam ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                    Loading organization team members...
                  </div>
                ) : filteredTeam.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                    No users found matching current filters.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr
                        style={{
                          background: "rgba(2, 6, 23, 0.6)",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "#94a3b8",
                          textAlign: "left"
                        }}
                      >
                        <th style={{ padding: "12px 16px" }}>Member</th>
                        <th style={{ padding: "12px 16px" }}>Role</th>
                        <th style={{ padding: "12px 16px" }}>Scans Executed</th>
                        <th style={{ padding: "12px 16px" }}>Status</th>
                        <th style={{ padding: "12px 16px" }}>Created</th>
                        <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeam.map((u) => {
                        const isSelf = u.id === currentUser?.id || u.email === currentUser?.email;
                        return (
                          <tr
                            key={u.id}
                            style={{
                              borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                              background: isSelf ? "rgba(0, 172, 245, 0.04)" : "transparent"
                            }}
                          >
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    background:
                                      u.role === "ADMIN" || u.role === "OWNER"
                                        ? "#0ea5e9"
                                        : u.role === "VIEWER"
                                        ? "#64748b"
                                        : "#10b981",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.85rem",
                                    fontWeight: 700
                                  }}
                                >
                                  {u.full_name ? u.full_name.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                                    {u.full_name || "Analyst"}
                                    {isSelf && (
                                      <span style={{ marginLeft: "6px", fontSize: "0.72rem", color: "#38bdf8" }}>
                                        (You)
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{u.email}</div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              <select
                                value={u.role}
                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                disabled={!isAdmin || isSelf}
                                style={{
                                  background: "rgba(2, 6, 23, 0.7)",
                                  border: "1px solid rgba(255, 255, 255, 0.15)",
                                  borderRadius: "6px",
                                  color:
                                    u.role === "ADMIN" || u.role === "OWNER"
                                      ? "#38bdf8"
                                      : u.role === "VIEWER"
                                      ? "#94a3b8"
                                      : "#34d399",
                                  padding: "4px 8px",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: (!isAdmin || isSelf) ? "not-allowed" : "pointer",
                                  opacity: (!isAdmin || isSelf) ? 0.7 : 1
                                }}
                                title={!isAdmin ? "Requires ADMIN role to modify member roles" : isSelf ? "Cannot change your own role" : "Modify assigned role"}
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="ANALYST">ANALYST</option>
                                <option value="VIEWER">VIEWER</option>
                              </select>
                            </td>

                            <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>
                              <strong>{u.total_scans || 0}</strong> scans
                            </td>

                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  background: u.is_active ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                  color: u.is_active ? "#34d399" : "#f87171",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  fontSize: "0.72rem",
                                  fontWeight: 700
                                }}
                              >
                                {u.is_active ? "ACTIVE" : "DISABLED"}
                              </span>
                            </td>

                            <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "0.78rem" }}>
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                            </td>

                            <td style={{ padding: "12px 16px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u.id, u.is_active)}
                                  disabled={!isAdmin || isSelf}
                                  style={{
                                    background: "rgba(255, 255, 255, 0.06)",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    color: u.is_active ? "#fca5a5" : "#86efac",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    cursor: (!isAdmin || isSelf) ? "not-allowed" : "pointer",
                                    opacity: (!isAdmin || isSelf) ? 0.5 : 1
                                  }}
                                  title={!isAdmin ? "Requires ADMIN role to suspend members" : isSelf ? "Cannot deactivate own account" : u.is_active ? "Deactivate user" : "Activate user"}
                                >
                                  {u.is_active ? "Disable" : "Enable"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  disabled={!isAdmin || isSelf}
                                  style={{
                                    background: "rgba(239, 68, 68, 0.12)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    color: "#f87171",
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    cursor: (!isAdmin || isSelf) ? "not-allowed" : "pointer",
                                    opacity: (!isAdmin || isSelf) ? 0.5 : 1
                                  }}
                                  title={!isAdmin ? "Requires ADMIN role to delete members" : isSelf ? "Cannot delete own account" : "Delete user"}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            );
          })()}

          {/* TAB 3: FAST ACCOUNT SWITCHER */}
          {activeTab === "switcher" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", fontWeight: 700 }}>
                  ⚡ Fast SOC Role Switcher (Instant Authentication)
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                  Seamlessly toggle between security roles with 1 click to test RBAC enforcement, scan permissions, and dashboard controls.
                </p>
              </div>

              {/* Pre-configured Demo/Enterprise Roles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                {/* Admin Card */}
                <div
                  style={{
                    background:
                      currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                        ? "rgba(14, 165, 233, 0.12)"
                        : "rgba(15, 23, 42, 0.6)",
                    border: `1px solid ${
                      currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                        ? "rgba(14, 165, 233, 0.5)"
                        : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🛡️</span>
                      <span
                        style={{
                          background: "rgba(14, 165, 233, 0.2)",
                          color: "#38bdf8",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.7rem",
                          fontWeight: 800
                        }}
                      >
                        ADMIN
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>Security Administrator</h4>
                    <p style={{ margin: "0 0 12px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      admin@browseguard.local
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                      Full organizational privileges: User management, trusted vendor bypass policies, webhook HMAC secrets, and unlimited scan quota.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => executeLoginSwitch("admin@browseguard.local", "Password123!")}
                    disabled={switchingUser || currentUser?.email === "admin@browseguard.local"}
                    style={{
                      marginTop: "16px",
                      background:
                        currentUser?.email === "admin@browseguard.local"
                          ? "rgba(14, 165, 233, 0.2)"
                          : "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                      color: currentUser?.email === "admin@browseguard.local" ? "#38bdf8" : "#fff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: currentUser?.email === "admin@browseguard.local" ? "default" : "pointer"
                    }}
                  >
                    {currentUser?.email === "admin@browseguard.local" ? "● Currently Active" : "Switch to Admin"}
                  </button>
                </div>

                {/* Analyst Card */}
                <div
                  style={{
                    background:
                      currentUser?.role === "ANALYST" ? "rgba(16, 185, 129, 0.12)" : "rgba(15, 23, 42, 0.6)",
                    border: `1px solid ${
                      currentUser?.role === "ANALYST" ? "rgba(16, 185, 129, 0.5)" : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>🔍</span>
                      <span
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          color: "#34d399",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.7rem",
                          fontWeight: 800
                        }}
                      >
                        ANALYST
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>SOC Analyst (Deepak)</h4>
                    <p style={{ margin: "0 0 12px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      itsdeepaksharma2003@gmail.com
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                      Standard SOC operational level: Submit URLs for detonation, inspect live HAR traffic, interactive screencast control, and IOC download.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => executeLoginSwitch("itsdeepaksharma2003@gmail.com", "Password123!")}
                    disabled={switchingUser || currentUser?.email === "itsdeepaksharma2003@gmail.com"}
                    style={{
                      marginTop: "16px",
                      background:
                        currentUser?.email === "itsdeepaksharma2003@gmail.com"
                          ? "rgba(16, 185, 129, 0.2)"
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: currentUser?.email === "itsdeepaksharma2003@gmail.com" ? "#34d399" : "#fff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: currentUser?.email === "itsdeepaksharma2003@gmail.com" ? "default" : "pointer"
                    }}
                  >
                    {currentUser?.email === "itsdeepaksharma2003@gmail.com" ? "● Currently Active" : "Switch to Analyst"}
                  </button>
                </div>

                {/* Auditor / Viewer Card */}
                <div
                  style={{
                    background:
                      currentUser?.role === "VIEWER" ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.6)",
                    border: `1px solid ${
                      currentUser?.role === "VIEWER" ? "rgba(148, 163, 184, 0.5)" : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.4rem" }}>📄</span>
                      <span
                        style={{
                          background: "rgba(148, 163, 184, 0.2)",
                          color: "#cbd5e1",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.7rem",
                          fontWeight: 800
                        }}
                      >
                        VIEWER
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 700 }}>Compliance Auditor</h4>
                    <p style={{ margin: "0 0 12px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      viewer_test_1791981644388@browseguard.local
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                      Read-only audit privileges: Review completed executive reports, search historical threat data, without detonation or policy creation rights.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      executeLoginSwitch("viewer_test_1791981644388@browseguard.local", "Password123!")
                    }
                    disabled={switchingUser || currentUser?.email?.includes("viewer_test")}
                    style={{
                      marginTop: "16px",
                      background: currentUser?.email?.includes("viewer_test")
                        ? "rgba(148, 163, 184, 0.2)"
                        : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                      color: currentUser?.email?.includes("viewer_test") ? "#cbd5e1" : "#fff",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: currentUser?.email?.includes("viewer_test") ? "default" : "pointer"
                    }}
                  >
                    {currentUser?.email?.includes("viewer_test") ? "● Currently Active" : "Switch to Viewer"}
                  </button>
                </div>
              </div>

              {/* Custom Login Form */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "20px"
                }}
              >
                <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", fontWeight: 700, color: "#e2e8f0" }}>
                  Sign in to Another Custom Account
                </h4>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <input
                    type="email"
                    placeholder="Enter email address..."
                    value={customLoginEmail}
                    onChange={(e) => setCustomLoginEmail(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: "rgba(2, 6, 23, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.82rem"
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Enter password..."
                    value={customLoginPassword}
                    onChange={(e) => setCustomLoginPassword(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: "rgba(2, 6, 23, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.82rem"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => executeLoginSwitch(customLoginEmail, customLoginPassword)}
                    disabled={switchingUser || !customLoginEmail || !customLoginPassword}
                    style={{
                      background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {switchingUser ? "Authenticating..." : "Log In"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUOTAS & SUBSCRIPTIONS */}
          {activeTab === "quotas" && (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", fontWeight: 700 }}>
                  🛡️ Gateway Entitlements & Scan Quotas
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
                  Real-time compute scan limits and subscription tiers enforced per account.
                </p>
              </div>

              {loadingSubscriptions ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  Loading gateway subscriptions...
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                  {/* Gateway 1 */}
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(0, 172, 245, 0.3)",
                      borderRadius: "12px",
                      padding: "20px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "1.3rem" }}>🌐</span>
                      <span
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          color: "#34d399",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.72rem",
                          fontWeight: 700
                        }}
                      >
                        {subscriptions?.url_scanner?.status || "ACTIVE"}
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 700 }}>
                      URL Scanner & Studio
                    </h4>
                    <p style={{ margin: "0 0 14px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Tier: <strong>{subscriptions?.url_scanner?.plan_tier || "PRO"}</strong>
                    </p>
                    <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                      Remaining Quota:{" "}
                      <strong style={{ color: "#38bdf8" }}>
                        {currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                          ? "Unlimited"
                          : `${subscriptions?.url_scanner?.quota_remaining ?? 50} / ${
                              subscriptions?.url_scanner?.quota_total ?? 50
                            }`}
                      </strong>
                    </div>
                  </div>

                  {/* Gateway 2 */}
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      borderRadius: "12px",
                      padding: "20px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "1.3rem" }}>🧩</span>
                      <span
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          color: "#34d399",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.72rem",
                          fontWeight: 700
                        }}
                      >
                        {subscriptions?.browser_extension?.status || "ACTIVE"}
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 700 }}>
                      Browser Extension Shield
                    </h4>
                    <p style={{ margin: "0 0 14px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Tier: <strong>{subscriptions?.browser_extension?.plan_tier || "PRO"}</strong>
                    </p>
                    <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                      Pairing Token:{" "}
                      <strong style={{ color: "#c084fc" }}>
                        {currentUser?.extensionToken ? "Paired" : "Ready to Pair"}
                      </strong>
                    </div>
                  </div>

                  {/* Gateway 3 */}
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: "12px",
                      padding: "20px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "1.3rem" }}>📧</span>
                      <span
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          color: "#34d399",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.72rem",
                          fontWeight: 700
                        }}
                      >
                        {subscriptions?.email_gateway_api?.status || "ACTIVE"}
                      </span>
                    </div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 700 }}>
                      Email Gateway API
                    </h4>
                    <p style={{ margin: "0 0 14px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                      Tier: <strong>{subscriptions?.email_gateway_api?.plan_tier || "ENTERPRISE"}</strong>
                    </p>
                    <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                      Remaining Quota:{" "}
                      <strong style={{ color: "#fbbf24" }}>
                        {currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
                          ? "Unlimited"
                          : `${subscriptions?.email_gateway_api?.quota_remaining ?? 500} Left`}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
