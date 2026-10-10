import { useEffect, useRef, useState } from "react";
import LiveIsolationModal from "./components/LiveIsolationModal";
import IocPanel from "./components/IocPanel";
import AuthModal from "./components/AuthModal";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 180;

const FINAL_STATUSES = new Set([
  "completed",
  "failed",
  "rejected",
  "duplicate"
]);

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}

async function readApiResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `The server returned an invalid response. HTTP ${response.status}`
    );
  }

  if (!response.ok || payload.success === false) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function getVerdictClass(verdict) {
  switch (verdict) {
    case "SAFE":
      return "verdict-safe";
    case "SUSPICIOUS":
      return "verdict-suspicious";
    case "HIGH_RISK":
    case "MALICIOUS":
      return "verdict-danger";
    case "ERROR":
      return "verdict-error";
    default:
      return "verdict-neutral";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "queued":
      return "Waiting for VM Agent queue";
    case "created":
      return "Session initialized";
    case "running":
      return "Executing inside isolated Chromium sandbox";
    case "analyzing":
      return "Evaluating evidence in threat engine";
    case "completed_with_errors":
      return "Completed with minor browser exceptions";
    case "completed":
      return "Analysis completed";
    case "failed":
      return "Analysis failed";
    case "rejected":
      return "Request rejected by policy";
    case "duplicate":
      return "Cached analysis retrieved";
    default:
      return status || "Preparing analysis";
  }
}

function FindingCard({ finding }) {
  return (
    <article className="finding-card">
      <div className="finding-heading">
        <h4>{finding.title || "Security finding"}</h4>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {finding.mitre_attack_id && (
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "rgba(147, 51, 234, 0.2)",
                color: "#c084fc",
                border: "1px solid rgba(147, 51, 234, 0.4)",
                fontWeight: 700
              }}
              title={finding.mitre_attack_name || "MITRE ATT&CK Technique"}
            >
              🎯 MITRE {finding.mitre_attack_id}
            </span>
          )}
          <span className={`severity severity-${finding.severity?.toLowerCase() || "informational"}`}>
            {finding.severity || "INFORMATIONAL"}
          </span>
        </div>
      </div>
      <p>{finding.description || "No description provided."}</p>
      <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {finding.category && (
          <span className="finding-meta">Category: <strong>{finding.category}</strong></span>
        )}
        {typeof finding.score === "number" && (
          <span className="finding-meta">Risk contribution: <strong>+{finding.score} pts</strong></span>
        )}
        {finding.id && (
          <span className="finding-meta">Rule ID: <code>{finding.id}</code></span>
        )}
        {finding.mitre_attack_name && (
          <span className="finding-meta" style={{ color: "#c084fc" }}>TTP: <strong>{finding.mitre_attack_name}</strong></span>
        )}
      </div>
    </article>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("scanner"); // "scanner" | "history"
  const [url, setUrl] = useState("https://example.com");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [rawReport, setRawReport] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);

  // User & Gateway Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("bg_current_user");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      email: "admin@browseguard.local",
      fullName: "Security Administrator",
      role: "ADMIN",
      extensionToken: "bg_ext_admin_live_token_777",
      organizationName: "Default Organization"
    };
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [iocsData, setIocsData] = useState(null);

  const handleUpdateUser = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("bg_current_user", JSON.stringify(user));
    } catch {}
  };

  async function fetchIocs(targetSessionId) {
    try {
      const res = await fetch(`/api/v1/analyses/${encodeURIComponent(targetSessionId)}/iocs`);
      if (res.ok) {
        const payload = await res.json();
        setIocsData(payload.data);
      }
    } catch {
      // Non-blocking
    }
  }

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [liveFeed, setLiveFeed] = useState(true);
  const [rbiActive, setRbiActive] = useState(false);
  const [rbiTargetUrl, setRbiTargetUrl] = useState("");

  const pollTimerRef = useRef(null);
  const activeSessionRef = useRef("");

  function clearPollingTimer() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearPollingTimer();
    };
  }, []);

  // Fetch past analyses from PostgreSQL
  async function loadHistory(silent = false) {
    if (!silent) setHistoryLoading(true);
    try {
      let query = "/api/analyze/history?limit=100";
      if (historyFilter !== "ALL") {
        query += `&verdict=${encodeURIComponent(historyFilter)}`;
      }
      if (historySearch.trim()) {
        query += `&search=${encodeURIComponent(historySearch.trim())}`;
      }
      const response = await fetch(query);
      const payload = await readApiResponse(response);
      setHistoryList(payload.data || []);
    } catch (err) {
      if (!silent) console.error("Failed to load history:", err);
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory(false);
  }, [activeTab, historyFilter]);

  // Real-time live polling interval
  useEffect(() => {
    if (!liveFeed) return;
    const interval = setInterval(() => {
      loadHistory(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [liveFeed, historyFilter, historySearch, activeTab]);

  async function fetchStatus(currentSessionId, attemptNumber = 1) {
    if (!currentSessionId || activeSessionRef.current !== currentSessionId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/analyze/${encodeURIComponent(currentSessionId)}/status`,
        {
          method: "GET",
          headers: { Accept: "application/json" }
        }
      );

      const payload = await readApiResponse(response);
      const statusData = payload.data || {};

      setStatus(statusData.status || "processing");
      setPollAttempt(attemptNumber);

      if (statusData.report_ready || statusData.status === "completed") {
        setResult(statusData);
        setIsSubmitting(false);
        clearPollingTimer();
        fetchRawReport(currentSessionId);
        fetchIocs(currentSessionId);
        return;
      }

      if (FINAL_STATUSES.has(statusData.status)) {
        setResult(statusData);
        setIsSubmitting(false);
        clearPollingTimer();
        fetchIocs(currentSessionId);
        return;
      }

      if (attemptNumber >= MAX_POLL_ATTEMPTS) {
        throw new Error(
          "Analysis is taking longer than expected. Check the VM Agent worker."
        );
      }

      pollTimerRef.current = setTimeout(() => {
        fetchStatus(currentSessionId, attemptNumber + 1);
      }, POLL_INTERVAL_MS);
    } catch (statusError) {
      setError(normalizeError(statusError));
      setIsSubmitting(false);
      setStatus("failed");
      clearPollingTimer();
    }
  }

  async function fetchRawReport(targetSessionId) {
    try {
      const res = await fetch(`/api/analyze/${encodeURIComponent(targetSessionId)}/report`);
      const payload = await readApiResponse(res);
      setRawReport(payload.data);
    } catch {
      // Non-blocking
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedUrl = url.trim();

    if (!normalizedUrl) {
      setError("Enter a URL before starting the analysis.");
      return;
    }

    clearPollingTimer();
    setError("");
    setResult(null);
    setRawReport(null);
    setSessionId("");
    setStatus("submitting");
    setPollAttempt(0);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          url: normalizedUrl,
          metadata: {
            submitted_from: "browseguard_web"
          }
        })
      });

      const payload = await readApiResponse(response);
      const newSessionId = payload?.data?.session_id;

      if (!newSessionId) {
        throw new Error("The backend did not return a session ID.");
      }

      activeSessionRef.current = newSessionId;
      setSessionId(newSessionId);
      setStatus(payload?.data?.status || "queued");

      fetchStatus(newSessionId, 1);
    } catch (submitError) {
      setError(normalizeError(submitError));
      setStatus("failed");
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    clearPollingTimer();
    activeSessionRef.current = "";
    setUrl("https://example.com");
    setSessionId("");
    setStatus("idle");
    setResult(null);
    setRawReport(null);
    setIocsData(null);
    setError("");
    setIsSubmitting(false);
    setPollAttempt(0);
  }

  async function openPastScan(selectedSessionId) {
    setActiveTab("scanner");
    setSessionId(selectedSessionId);
    setStatus("loading");
    setResult(null);
    setIocsData(null);
    setError("");
    setIsSubmitting(false);

    try {
      const res = await fetch(`/api/analyze/${encodeURIComponent(selectedSessionId)}/status`);
      const payload = await readApiResponse(res);
      setResult(payload.data);
      setUrl(payload.data.submitted_url || "");
      setStatus("completed");
      fetchRawReport(selectedSessionId);
      fetchIocs(selectedSessionId);
    } catch (err) {
      setError(normalizeError(err));
      setStatus("failed");
    }
  }

  const isProcessing = isSubmitting && !FINAL_STATUSES.has(status);
  const findings = Array.isArray(result?.findings) ? result.findings : [];

  const stats = {
    total: historyList.length,
    safe: historyList.filter((r) => r.verdict === "SAFE").length,
    suspicious: historyList.filter((r) => r.verdict === "SUSPICIOUS").length,
    malicious: historyList.filter((r) => ["MALICIOUS", "HIGH_RISK"].includes(r.verdict)).length,
  };

  return (
    <main className="app-shell">
      {/* Brand Hero */}
      <section className="hero">
        <div>
          <p className="eyebrow">BrowseGuard Platform</p>
          <h1>Browser Isolation & Threat Sandbox</h1>
          <p className="hero-description">
            Zero-trust dynamic URL analysis. Attacker-controlled web content is executed
            inside an isolated Chromium sandbox. Telemetry and forensic reports are stored in PostgreSQL.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
          <div className="architecture-pill">
            PostgreSQL Connected • Isolated Sandbox
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="preset-pill"
              onClick={() => setShowAuthModal(true)}
              style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(59, 130, 246, 0.5)", display: "flex", alignItems: "center", gap: "6px" }}
              title="Click to view and copy your browser extension token (Gateway 2)"
            >
              <span>🔑 Extension:</span>
              <code style={{ color: "#38bdf8" }}>
                {currentUser?.extensionToken ? `${currentUser.extensionToken.slice(0, 12)}...` : "Pair Token"}
              </code>
            </button>
            <button
              type="button"
              className="preset-pill"
              onClick={() => setShowAuthModal(true)}
              style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(16, 185, 129, 0.5)" }}
              title="Click to view user profile, manage organization, or switch accounts"
            >
              👤 {currentUser?.fullName || "Admin"} ({currentUser?.role || "ADMIN"})
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          type="button"
          className={`nav-tab ${activeTab === "scanner" ? "active" : ""}`}
          onClick={() => setActiveTab("scanner")}
        >
          🔍 URL Scanner
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📜 Past Scans ({historyList.length > 0 ? historyList.length : "Database"})
        </button>
      </nav>

      {/* TAB 1: SCANNER */}
      {activeTab === "scanner" && (
        <>
          <section className="panel">
            <form className="url-form" onSubmit={handleSubmit}>
              <label htmlFor="url">Target URL to inspect in isolation</label>
              <div className="url-input-row">
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoComplete="off"
                  spellCheck="false"
                  disabled={isSubmitting}
                  required
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Dispatching..." : "Scan with BrowseGuard"}
                </button>
                <button
                  type="button"
                  className="rbi-launch-btn"
                  onClick={() => {
                    setRbiTargetUrl(url);
                    setRbiActive(true);
                  }}
                  title="Launch zero-trust interactive browser isolation stream"
                >
                  🖥️ Launch Live Isolation (RBI)
                </button>
              </div>

              {/* Security Test Presets */}
              <div className="preset-bar">
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>Test Vectors:</span>
                <button
                  type="button"
                  className="preset-pill"
                  onClick={() => setUrl("https://example.com")}
                  disabled={isSubmitting}
                >
                  🟢 Benign (example.com)
                </button>
                <button
                  type="button"
                  className="preset-pill threat"
                  onClick={() => setUrl("http://169.254.169.254/latest/meta-data/")}
                  disabled={isSubmitting}
                >
                  🔴 Cloud Metadata SSRF
                </button>
                <button
                  type="button"
                  className="preset-pill threat"
                  onClick={() => setUrl("http://127.0.0.1:8888")}
                  disabled={isSubmitting}
                >
                  🔴 Loopback Intranet Scan
                </button>
                <button
                  type="button"
                  className="preset-pill"
                  onClick={() => setUrl("http://google.com")}
                  disabled={isSubmitting}
                >
                  🔄 HTTP Redirect Chain
                </button>
                <button
                  type="button"
                  className="preset-pill threat"
                  onClick={() => setUrl("https://micros0ft-verify.com/login.html")}
                  disabled={isSubmitting}
                >
                  🎯 Typosquatting Lure
                </button>
                <button
                  type="button"
                  className="preset-pill threat"
                  onClick={() => setUrl("https://secure-payroll-auth.pages.dev/login")}
                  disabled={isSubmitting}
                >
                  ☁️ SaaS Hosted Phish
                </button>
              </div>
            </form>
          </section>

          {error && (
            <section className="alert alert-error" style={{ marginTop: "20px" }}>
              <strong>Analysis Error</strong>
              <p>{error}</p>
              <button type="button" className="secondary-button" onClick={handleReset}>
                Reset
              </button>
            </section>
          )}

          {status !== "idle" && !error && (
            <section className="panel status-panel" style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
                <div>
                  <p className="section-label">Execution Pipeline</p>
                  <h2>{getStatusLabel(status)}</h2>
                  {sessionId && <p className="session-id">Analysis ID: <code>{sessionId}</code></p>}
                </div>

                {isProcessing && (
                  <div className="processing-indicator">
                    <span className="spinner" />
                    <span>Polling round {pollAttempt || 1}...</span>
                  </div>
                )}
              </div>

              <div className="stepper-container">
                <div className={`step-card ${status !== "idle" ? (status === "submitting" ? "active" : "completed") : ""}`}>
                  <span>1. Ingestion & Quota</span>
                </div>
                <div className={`step-card ${["created", "running", "analyzing", "completed"].includes(status) ? (status === "running" ? "active" : (status === "analyzing" || status === "completed" ? "completed" : "")) : ""}`}>
                  <span>2. Chromium Sandbox</span>
                </div>
                <div className={`step-card ${["analyzing", "completed"].includes(status) ? (status === "analyzing" ? "active" : "completed") : ""}`}>
                  <span>3. Forensic Collectors</span>
                </div>
                <div className={`step-card ${status === "completed" ? "completed active" : ""}`}>
                  <span>4. Threat Verdict</span>
                </div>
              </div>
            </section>
          )}

          {result && (
            <section className="results-layout" style={{ marginTop: "24px" }}>
              {/* Decision Panel */}
              <article className="panel result-summary">
                <p className="section-label">Automated Verdict</p>
                <div className={`verdict-badge ${getVerdictClass(result.verdict)}`}>
                  {result.verdict || "UNKNOWN"}
                </div>

                <div className="metric-grid">
                  <div className="metric">
                    <span>Risk Score</span>
                    <strong style={{ color: result.risk_score > 40 ? "#dc2626" : "#2563eb" }}>
                      {result.risk_score ?? 0}/100
                    </strong>
                  </div>
                  <div className="metric">
                    <span>Risk Level</span>
                    <strong style={{ textTransform: "capitalize" }}>{result.risk_level || "unknown"}</strong>
                  </div>
                  <div className="metric">
                    <span>Recommended Action</span>
                    <strong>{result.recommended_action || "REVIEW"}</strong>
                  </div>
                  <div className="metric">
                    <span>User Access</span>
                    <strong style={{ color: result.allow_user_access ? "#16a34a" : "#dc2626" }}>
                      {result.allow_user_access ? "ALLOW ACCESS" : "BLOCK ACCESS"}
                    </strong>
                  </div>
                </div>

                {result.reason && (
                  <div className="decision-reason">
                    <strong>Decision Policy Reason:</strong>
                    <p>{result.reason}</p>
                  </div>
                )}
              </article>

              {/* Page & Target Details */}
              <article className="panel page-details">
                <p className="section-label">Target & Execution Telemetry</p>
                <dl>
                  <div>
                    <dt>Submitted URL</dt>
                    <dd title={result.submitted_url || url}>{result.submitted_url || url}</dd>
                  </div>
                  <div>
                    <dt>Final URL</dt>
                    <dd title={result.final_url || "Not available"}>{result.final_url || "Not available"}</dd>
                  </div>
                  <div>
                    <dt>Page Title</dt>
                    <dd>{result.page_title || "None extracted"}</dd>
                  </div>
                  <div>
                    <dt>Sandbox Execution</dt>
                    <dd>{result.execution_status || result.status || "completed"}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>
                      {typeof result.duration_ms === "number"
                        ? `${(result.duration_ms / 1000).toFixed(2)} seconds`
                        : "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt>Analysis Record ID</dt>
                    <dd><code>{sessionId}</code></dd>
                  </div>
                </dl>
              </article>

              {/* Security Findings */}
              <article className="panel findings-panel">
                <div className="findings-header">
                  <div>
                    <p className="section-label">Observed Security Findings</p>
                    <h2>
                      {findings.length === 0
                        ? "No suspicious behavior detected"
                        : `${findings.length} signal${findings.length === 1 ? "" : "s"} identified`}
                    </h2>
                  </div>
                  <span className="finding-count">{result.finding_count ?? findings.length}</span>
                </div>

                {findings.length === 0 ? (
                  <p className="empty-findings">
                    The rule engine detected no high-risk redirects, credential lures, or dangerous downloads.
                  </p>
                ) : (
                  <div className="findings-list">
                    {findings.map((finding, idx) => (
                      <FindingCard key={finding.id || idx} finding={finding} />
                    ))}
                  </div>
                )}
              </article>

              {/* ANY.RUN-inspired IOCs & MITRE ATT&CK Matrix */}
              <IocPanel analysisId={sessionId} iocsData={iocsData} />

              {/* Page Screenshot Preview */}
              {sessionId && (
                <article className="panel screenshot-panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p className="section-label">Visual Evidence</p>
                      <h3>Isolated Browser Page Screenshot</h3>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="filter-btn"
                        style={{ background: "#0ea5e9", color: "#fff", borderColor: "#0ea5e9" }}
                        onClick={() => {
                          setRbiTargetUrl(result.final_url || result.submitted_url || url);
                          setRbiActive(true);
                        }}
                      >
                        🖥️ Live Interactive RBI Session
                      </button>
                      <a
                        href={`/api/analyze/${encodeURIComponent(sessionId)}/screenshot`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="filter-btn"
                      >
                        Open Full Size ↗
                      </a>
                    </div>
                  </div>
                  <div className="screenshot-container">
                    <img
                      src={`/api/analyze/${encodeURIComponent(sessionId)}/screenshot`}
                      alt={`Sandbox render of ${result.submitted_url || sessionId}`}
                      className="screenshot-image"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                </article>
              )}

              {/* Forensic Report JSON Toggle */}
              {rawReport && (
                <article className="panel raw-json-panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <p className="section-label">Forensic Artifact</p>
                      <h3>Canonical Forensic Report JSON (Schema {rawReport.schema_version || "2.1"})</h3>
                    </div>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => setShowRawJson(!showRawJson)}
                    >
                      {showRawJson ? "Hide JSON" : "Inspect Raw Report JSON"}
                    </button>
                  </div>
                  {showRawJson && (
                    <pre className="json-viewer">
                      {JSON.stringify(rawReport, null, 2)}
                    </pre>
                  )}
                </article>
              )}

              <div className="result-actions">
                <button type="button" className="secondary-button" onClick={handleReset}>
                  Analyze Another URL
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* TAB 2: POSTGRESQL SCAN HISTORY */}
      {activeTab === "history" && (
        <>
          {/* Top Threat Telemetry Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total Analyses</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="stat-card safe">
              <span>Safe Verdicts</span>
              <strong>{stats.safe}</strong>
            </div>
            <div className="stat-card suspicious">
              <span>Suspicious Signals</span>
              <strong>{stats.suspicious}</strong>
            </div>
            <div className="stat-card danger">
              <span>High Risk / Malicious</span>
              <strong>{stats.malicious}</strong>
            </div>
          </div>

          <section className="panel" style={{ padding: 0 }}>
            <div className="history-toolbar">
              <input
                type="text"
                placeholder="Search by URL or Session ID..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadHistory(false)}
                className="history-search-input"
              />
              <div className="history-filters">
                {["ALL", "SAFE", "SUSPICIOUS", "HIGH_RISK", "MALICIOUS"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`filter-btn ${historyFilter === f ? "active" : ""}`}
                    onClick={() => setHistoryFilter(f)}
                  >
                    {f}
                  </button>
                ))}
                <button
                  type="button"
                  className={`live-feed-badge ${liveFeed ? "live-active" : "live-paused"}`}
                  onClick={() => setLiveFeed(!liveFeed)}
                  title={liveFeed ? "Live Feed: Auto-refreshing every 4s (Click to pause)" : "Click to activate live feed"}
                >
                  <span className="pulse-dot" />
                  {liveFeed ? "LIVE (4s)" : "PAUSED"}
                </button>
                <button type="button" className="filter-btn" onClick={() => loadHistory(false)}>
                  🔄 Refresh
                </button>
              </div>
            </div>

          <div className="history-table-wrapper">
            {historyLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                Querying PostgreSQL database...
              </div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No scan records found matching current criteria.
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Verdict</th>
                    <th>Submitted URL</th>
                    <th>Risk Score</th>
                    <th>Signals</th>
                    <th>Duration</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((row) => (
                    <tr
                      key={row.session_id}
                      className="history-row"
                      onClick={() => openPastScan(row.session_id)}
                    >
                      <td>
                        <span className={`verdict-tag ${row.verdict || "UNKNOWN"}`}>
                          {row.verdict || "UNKNOWN"}
                        </span>
                      </td>
                      <td style={{ maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{row.submitted_url}</span>
                        {row.page_title && (
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{row.page_title}</div>
                        )}
                      </td>
                      <td>
                        <strong>{row.risk_score ?? 0}</strong>/100
                      </td>
                      <td>
                        {row.finding_count > 0 ? (
                          <span style={{ color: "#d97706", fontWeight: 700 }}>
                            {row.finding_count} finding{row.finding_count > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span style={{ color: "#16a34a" }}>Clean</span>
                        )}
                      </td>
                      <td>
                        {row.duration_ms
                          ? `${(row.duration_ms / 1000).toFixed(1)}s`
                          : "-"}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "-"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="filter-btn"
                          style={{ fontSize: "0.76rem", padding: "4px 8px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPastScan(row.session_id);
                          }}
                        >
                          View ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </>
    )}

    {rbiActive && (
      <LiveIsolationModal
        initialUrl={rbiTargetUrl || url}
        onClose={() => setRbiActive(false)}
      />
    )}

    {showAuthModal && (
      <AuthModal
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onClose={() => setShowAuthModal(false)}
      />
    )}
  </main>
);
}

export default App;