import { useState, useEffect } from "react";

export default function TrustedVendorsModal({ isOpen, onClose }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'add' | 'simulate'

  // Form State
  const [vendorName, setVendorName] = useState("");
  const [senderDomains, setSenderDomains] = useState("");
  const [allowedLinkDomains, setAllowedLinkDomains] = useState("");
  const [category, setCategory] = useState("INVOICE");
  const [enforceDkim, setEnforceDkim] = useState(true);
  const [enforceSpf, setEnforceSpf] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Simulator State
  const [simSender, setSimSender] = useState("invoices@stripe.com");
  const [simSubject, setSimSubject] = useState("Your Monthly Cloud Invoice INV-2026-09");
  const [simDkim, setSimDkim] = useState("pass");
  const [simSpf, setSimSpf] = useState("pass");
  const [simLinks, setSimLinks] = useState("https://invoice.stripe.com/i/acct_123/pay");
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVendors();
    }
  }, [isOpen]);

  async function loadVendors() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:3000/api/v1/vendors");
      const json = await res.json();
      if (json.success) {
        setVendors(json.data || []);
      } else {
        setError(json.message || "Failed to load vendors.");
      }
    } catch (err) {
      setError("Cannot connect to BrowseGuard backend: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddVendor(e) {
    e.preventDefault();
    if (!vendorName || !senderDomains) {
      setError("Vendor name and at least one sender domain are required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const domainsArr = senderDomains.split(/[,;\n]+/).map(d => d.trim()).filter(Boolean);
      const linkDomainsArr = allowedLinkDomains ? allowedLinkDomains.split(/[,;\n]+/).map(d => d.trim()).filter(Boolean) : domainsArr;

      const res = await fetch("http://localhost:3000/api/v1/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: vendorName,
          sender_domains: domainsArr,
          allowed_link_domains: linkDomainsArr,
          category,
          enforce_dkim: enforceDkim,
          enforce_spf: enforceSpf,
          notes
        })
      });

      const json = await res.json();
      if (json.success) {
        // Reset form
        setVendorName("");
        setSenderDomains("");
        setAllowedLinkDomains("");
        setNotes("");
        setActiveTab("list");
        await loadVendors();
      } else {
        setError(json.message || "Failed to add vendor.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVendor(vendor) {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/vendors/${vendor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !vendor.is_active })
      });
      const json = await res.json();
      if (json.success) {
        setVendors(vendors.map(v => v.id === vendor.id ? { ...v, is_active: !v.is_active } : v));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteVendor(id) {
    if (!window.confirm("Remove this trusted vendor policy?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/v1/vendors/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setVendors(vendors.filter(v => v.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRunSimulation(e) {
    e.preventDefault();
    try {
      setSimulating(true);
      setSimResult(null);
      const linksArr = simLinks.split(/[,;\n]+/).map(l => l.trim()).filter(Boolean);

      const res = await fetch("http://localhost:3000/api/v1/vendors/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: simSender,
          subject: simSubject,
          authResults: { dkim: simDkim, spf: simSpf },
          links: linksArr
        })
      });

      const json = await res.json();
      setSimResult(json.evaluation);
    } catch (err) {
      setSimResult({ fastPass: false, reason: "Simulation request failed: " + err.message });
    } finally {
      setSimulating(false);
    }
  }

  if (!isOpen) return null;

  const totalFastpasses = vendors.reduce((acc, v) => acc + (v.total_fastpasses || 0), 0);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(2, 6, 23, 0.85)",
      backdropFilter: "blur(8px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "#0b1329",
        border: "1px solid rgba(0, 172, 245, 0.3)",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "960px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 172, 245, 0.15)",
        overflow: "hidden"
      }}>
        {/* Top Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(90deg, rgba(14, 165, 233, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.6rem" }}>🏢</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.01em" }}>
                Trusted Partners & Invoicing Fast-Pass Engine
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                Cryptographically authenticated B2B bypass: eliminates sandbox wait & saves API quotas for verified clients.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#94a3b8",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Metric Bar */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          padding: "14px 24px",
          background: "rgba(15, 23, 42, 0.5)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
        }}>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Vendors</span>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
              {vendors.filter(v => v.is_active).length} / {vendors.length}
            </div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Fast-Passes Granted</span>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>
              {totalFastpasses} Invoices
            </div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Security Enforcement</span>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c084fc", marginTop: "6px" }}>
              🔒 SPF + DKIM Cryptographic Guard
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 24px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              padding: "8px 16px",
              background: activeTab === "list" ? "rgba(0, 172, 245, 0.2)" : "transparent",
              color: activeTab === "list" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "list" ? "2px solid #00acf5" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem"
            }}
          >
            📋 Partner Registry ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab("add")}
            style={{
              padding: "8px 16px",
              background: activeTab === "add" ? "rgba(0, 172, 245, 0.2)" : "transparent",
              color: activeTab === "add" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "add" ? "2px solid #00acf5" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem"
            }}
          >
            ➕ Register New Partner
          </button>
          <button
            onClick={() => setActiveTab("simulate")}
            style={{
              padding: "8px 16px",
              background: activeTab === "simulate" ? "rgba(0, 172, 245, 0.2)" : "transparent",
              color: activeTab === "simulate" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "simulate" ? "2px solid #00acf5" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem"
            }}
          >
            ⚡ Fast-Pass Simulator & Rule Tester
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {error && (
            <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "10px 14px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* TAB: LIST */}
          {activeTab === "list" && (
            <div>
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading trusted vendor policies...</div>
              ) : vendors.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No trusted vendors registered yet.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "rgba(255, 255, 255, 0.04)", textAlign: "left", color: "#94a3b8", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <th style={{ padding: "10px 12px" }}>Vendor / Partner</th>
                        <th style={{ padding: "10px 12px" }}>Category</th>
                        <th style={{ padding: "10px 12px" }}>Sender Domains</th>
                        <th style={{ padding: "10px 12px" }}>Cryptographic Guard</th>
                        <th style={{ padding: "10px 12px" }}>Fast-Passes</th>
                        <th style={{ padding: "10px 12px" }}>Status</th>
                        <th style={{ padding: "10px 12px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v) => (
                        <tr key={v.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <td style={{ padding: "12px", fontWeight: 700, color: "#f1f5f9" }}>
                            {v.vendor_name}
                            {v.notes && <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 400, marginTop: "2px" }}>{v.notes}</div>}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "3px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                              {v.category}
                            </span>
                          </td>
                          <td style={{ padding: "12px", fontFamily: "monospace", color: "#cbd5e1" }}>
                            {v.sender_domains.join(", ")}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              {v.enforce_dkim && <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 6px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>DKIM</span>}
                              {v.enforce_spf && <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 6px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>SPF</span>}
                            </div>
                          </td>
                          <td style={{ padding: "12px", fontWeight: 800, color: "#10b981" }}>
                            {v.total_fastpasses}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button
                              onClick={() => handleToggleVendor(v)}
                              style={{
                                background: v.is_active ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                color: v.is_active ? "#10b981" : "#f87171",
                                border: "none",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              {v.is_active ? "ACTIVE" : "PAUSED"}
                            </button>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button
                              onClick={() => handleDeleteVendor(v.id)}
                              style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.85rem" }}
                              title="Delete Vendor Policy"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: ADD */}
          {activeTab === "add" && (
            <form onSubmit={handleAddVendor} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px", margin: "0 auto" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  Partner / Vendor Organization Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp Invoicing, AWS Billing, Vendor XYZ"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 14px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#f8fafc", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  Authorized Sender Domains (comma separated) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. acme.com, billing.acme.com, vendor-portal.com"
                  value={senderDomains}
                  onChange={(e) => setSenderDomains(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 14px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#f8fafc", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  Allowed Link Destination Domains (optional, comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. acme.com, invoice.stripe.com, rzp.io (leave blank to mirror sender domains)"
                  value={allowedLinkDomains}
                  onChange={(e) => setAllowedLinkDomains(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#f8fafc", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#f8fafc", fontSize: "0.88rem" }}
                  >
                    <option value="INVOICE">B2B Invoice & Billing</option>
                    <option value="PAYMENT_GATEWAY">Payment Gateway & Settlement</option>
                    <option value="INFRASTRUCTURE_BILLING">Cloud & Infrastructure Statement</option>
                    <option value="ACCOUNTING">Accounting / ERP Dispatch</option>
                    <option value="PARTNER_PORTAL">Trusted Client Operations</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px", paddingTop: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer" }}>
                    <input type="checkbox" checked={enforceDkim} onChange={(e) => setEnforceDkim(e.target.checked)} />
                    <span>Enforce DKIM Cryptographic Pass (Prevents Spoofing)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer" }}>
                    <input type="checkbox" checked={enforceSpf} onChange={(e) => setEnforceSpf(e.target.checked)} />
                    <span>Enforce SPF IP Authorization</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>Notes / Internal Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Monthly cloud compute invoices for Finance Department"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "8px", color: "#f8fafc", fontSize: "0.88rem" }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "#00acf5",
                  color: "#fff",
                  border: "none",
                  padding: "12px",
                  borderRadius: "8px",
                  fontWeight: 800,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  marginTop: "8px"
                }}
              >
                {saving ? "Registering..." : "Register Trusted Vendor Policy"}
              </button>
            </form>
          )}

          {/* TAB: SIMULATE */}
          {activeTab === "simulate" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "24px" }}>
              <form onSubmit={handleRunSimulation} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "0.95rem", color: "#38bdf8" }}>Test Email Against Vendor Policies</h3>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>From Address / Sender Header</label>
                  <input
                    type="text"
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", color: "#fff", fontSize: "0.82rem" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>DKIM Result</label>
                    <select
                      value={simDkim}
                      onChange={(e) => setSimDkim(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", color: "#fff", fontSize: "0.82rem" }}
                    >
                      <option value="pass">PASS (Verified Cryptographic Key)</option>
                      <option value="fail">FAIL (Spoofed / Missing Signature)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>SPF Result</label>
                    <select
                      value={simSpf}
                      onChange={(e) => setSimSpf(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", color: "#fff", fontSize: "0.82rem" }}
                    >
                      <option value="pass">PASS (Authorized Sender IP)</option>
                      <option value="softfail">SOFTFAIL / FAIL (Unauthorized IP)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#94a3b8", marginBottom: "4px" }}>Embedded Payment / Invoice Link</label>
                  <input
                    type="text"
                    value={simLinks}
                    onChange={(e) => setSimLinks(e.target.value)}
                    placeholder="e.g. https://invoice.stripe.com/pay"
                    style={{ width: "100%", padding: "8px 12px", background: "#060d1b", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "6px", color: "#fff", fontSize: "0.82rem" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulating}
                  style={{
                    background: "rgba(0, 172, 245, 0.2)",
                    border: "1px solid #00acf5",
                    color: "#38bdf8",
                    padding: "10px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    cursor: "pointer",
                    marginTop: "6px"
                  }}
                >
                  {simulating ? "Evaluating Policy..." : "⚡ Run Fast-Pass Decision Simulation"}
                </button>
              </form>

              {/* Simulation Result Box */}
              <div style={{
                background: "#060d1b",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
              }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Simulation Verdict</span>
                {simResult ? (
                  <div style={{ marginTop: "12px" }}>
                    <div style={{
                      display: "inline-block",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      background: simResult.fastPass ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: simResult.fastPass ? "#10b981" : "#f87171",
                      border: `1px solid ${simResult.fastPass ? "#10b981" : "#ef4444"}`
                    }}>
                      {simResult.fastPass ? "⚡ FAST-PASS GRANTED (0ms Bypassed)" : "🛡️ DETENTION REQUIRED"}
                    </div>

                    <div style={{ marginTop: "14px", fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                      <strong>Decision Reason:</strong><br />
                      {simResult.reason}
                    </div>

                    {simResult.vendor_name && (
                      <div style={{ marginTop: "10px", fontSize: "0.78rem", color: "#38bdf8" }}>
                        Matched Policy: {simResult.vendor_name} ({simResult.category})
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "10px", fontStyle: "italic" }}>
                    Click "Run Fast-Pass Decision Simulation" to see if this invoice qualifies for instant bypass or requires sandbox detention.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
