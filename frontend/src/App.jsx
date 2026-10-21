import { useEffect, useRef, useState } from "react";
import LiveIsolationModal from "./components/LiveIsolationModal";
import IocPanel from "./components/IocPanel";
import AuthModal from "./components/AuthModal";
import RedirectTimeline from "./components/RedirectTimeline";
import EmailGatewayPortal from "./components/EmailGatewayPortal";
import PortalLanding from "./components/PortalLanding";
import CommercialLanding from "./components/CommercialLanding";
import SocPortalHub from "./components/SocPortalHub";
import ThreatRiskDial from "./components/ThreatRiskDial";
import ApiTerminalModal from "./components/ApiTerminalModal";
import ExecutiveReportModal from "./components/ExecutiveReportModal";
import LiveDetonationViewer from "./components/LiveDetonationViewer";
import AccountSettingsModal from "./components/AccountSettingsModal";
import AdminConsole from "./components/AdminConsole";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 180;

const FINAL_STATUSES = new Set([
  "completed",
  "completed_with_errors",
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
      (typeof payload?.error === "string" ? payload.error : null) ||
      payload?.message ||
      `Request failed with HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.errorDetails = payload?.error;
    throw err;
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
  const [activeTab, setActiveTab] = useState("landing"); // "landing" | "scanner" | "email_gateway" | "history"
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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("profile");
  const [authModalGateway, setAuthModalGateway] = useState("url_scanner");
  const [showApiTerminal, setShowApiTerminal] = useState(false);
  const [showExecutiveReport, setShowExecutiveReport] = useState(false);
  const [executiveReportTargetId, setExecutiveReportTargetId] = useState("");
  const [subscriptions, setSubscriptions] = useState(null);
  const [gatewayError, setGatewayError] = useState(null);
  const [iocsData, setIocsData] = useState(null);
  const [showLiveViewer, setShowLiveViewer] = useState(true);

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

  useEffect(() => {
    fetchSubscriptions();
  }, [currentUser]);

  const handleUpdateUser = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("bg_current_user", JSON.stringify(user));
    } catch {}
    fetchSubscriptions();
  };

  const handleDirectActivateTrial = async (gw = "url_scanner") => {
    try {
      const token = localStorage.getItem("bg_jwt_token");
      const resp = await fetch("/api/v1/auth/activate-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ gateway: gw })
      });
      const data = await resp.json();
      if (resp.ok) {
        setGatewayError(null);
        setError("");
        fetchSubscriptions();
        alert(`14-Day Free Trial activated for ${gw}! You can now scan.`);
      } else {
        alert(data.error || "Failed to activate trial");
      }
    } catch (err) {
      alert(err.message);
    }
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
  const [activeDrawerTab, setActiveDrawerTab] = useState("redirects");

  // Batch URL Scanner state
  const [scanType, setScanType] = useState("single"); // "single" | "batch"
  const [batchUrlsInput, setBatchUrlsInput] = useState("");
  const [batchQueue, setBatchQueue] = useState([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

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

  // Auto-launch Click-Time Remote Browser Isolation if URL query parameter is supplied
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isolateParam =
        params.get("isolate") ||
        (window.location.pathname.includes("isolate") ? params.get("url") : null) ||
        (params.get("url") && window.location.search.includes("isolate") ? params.get("url") : null);

      if (isolateParam) {
        setRbiTargetUrl(isolateParam);
        setRbiActive(true);
        setActiveTab("scanner");
      }
    } catch {
      // Non-blocking
    }
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

      const currentStatus = String(statusData.status || "").toLowerCase();
      if (statusData.report_ready || currentStatus === "completed" || currentStatus === "completed_with_errors") {
        setResult(statusData);
        setIsSubmitting(false);
        clearPollingTimer();
        fetchRawReport(currentSessionId);
        fetchIocs(currentSessionId);
        return;
      }

      if (FINAL_STATUSES.has(currentStatus)) {
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

  async function startAnalysis(targetUrl, isInteractive = false) {
    if (currentUser?.role === "VIEWER") {
      setError("Read-Only Mode: Viewers cannot initiate detonations. You have full access to inspect reports and past scans.");
      return;
    }

    const normalizedUrl = (targetUrl || url).trim();

    if (!normalizedUrl) {
      setError("Enter a URL before starting the analysis.");
      return;
    }

    setUrl(normalizedUrl);
    setActiveTab("scanner");
    clearPollingTimer();
    setError("");
    setGatewayError(null);
    setResult(null);
    setRawReport(null);
    setSessionId("");
    setStatus("submitting");
    setPollAttempt(0);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("bg_jwt_token");
      const generatedSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      let activeSessionId = generatedSessionId;

      if (isInteractive) {
        // 1. Launch Interactive Detonation Session (with full live mouse/keyboard/navigation controls)
        try {
          const rbiResp = await fetch("/api/v1/rbi/launch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              url: normalizedUrl,
              sessionId: generatedSessionId
            })
          });

          if (rbiResp.ok) {
            const rbiPayload = await rbiResp.json();
            activeSessionId = rbiPayload?.data?.session_id || generatedSessionId;
          } else {
            throw new Error("Could not initialize interactive sandbox session.");
          }
        } catch (launchErr) {
          throw new Error("Failed to start interactive chamber: " + normalizeError(launchErr));
        }
      } else {
        // 2. Fast Automated Detonation via worker queue (~5-9 seconds)
        const queueResp = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            url: normalizedUrl,
            metadata: { submitted_from: "browseguard_web" }
          })
        });
        const queuePayload = await readApiResponse(queueResp);
        activeSessionId = queuePayload?.data?.session_id || generatedSessionId;
      }

      fetchSubscriptions(); // Refresh compute quota remaining
      activeSessionRef.current = activeSessionId;
      setSessionId(activeSessionId);
      setStatus("running");

      fetchStatus(activeSessionId, 1);
    } catch (submitError) {
      const details = submitError.errorDetails;
      const isGatewayAuthError = details && (
        ["GATEWAY_LOCKED", "QUOTA_EXHAUSTED", "AUTHENTICATION_REQUIRED", "GATEWAY_EXPIRED", "GATEWAY_SUSPENDED"].includes(details.code) ||
        Boolean(details.gateway) ||
        submitError.status === 402
      );

      if (isGatewayAuthError) {
        setGatewayError(details);
      } else {
        setGatewayError(null);
      }
      setError(normalizeError(submitError));
      setStatus("failed");
      setIsSubmitting(false);
    }
  }

  // Batch Multi-URL Runner
  async function runBatchScan() {
    if (currentUser?.role === "VIEWER") {
      setError("Read-Only Mode: Viewers cannot initiate batch detonations. You have full access to inspect reports and past scans.");
      return;
    }

    const rawUrls = batchUrlsInput
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (rawUrls.length === 0) {
      setError("Please paste at least one URL to batch scan.");
      return;
    }

    setIsBatchRunning(true);
    setError("");

    const initialQueue = rawUrls.map((target, idx) => ({
      id: `batch_${Date.now()}_${idx}`,
      url: target.startsWith("http") ? target : `https://${target}`,
      status: "QUEUED",
      sessionId: null,
      verdict: "PENDING",
      riskScore: null
    }));

    setBatchQueue(initialQueue);

    const token = localStorage.getItem("bg_jwt_token");

    // Submit all URLs to the automated analysis queue concurrently
    for (let i = 0; i < initialQueue.length; i++) {
      const item = initialQueue[i];
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            url: item.url,
            metadata: { batch_scan: true, batch_index: i }
          })
        });

        const payload = await readApiResponse(res);
        const sid = payload?.data?.session_id;

        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, sessionId: sid, status: "RUNNING", errorDetail: null } : q))
        );
      } catch (err) {
        const errMsg = normalizeError(err);
        const isQuota = errMsg.toLowerCase().includes("quota") || errMsg.includes("429");
        setBatchQueue((prev) =>
          prev.map((q, idx) => (idx === i ? {
            ...q,
            status: "FAILED",
            verdict: isQuota ? "QUOTA_EXCEEDED" : "ERROR",
            errorDetail: errMsg
          } : q))
        );
      }
    }

    // Live status polling for batch items
    const pollInterval = setInterval(async () => {
      setBatchQueue((prevQueue) => {
        const pending = prevQueue.filter((q) => q.status === "RUNNING" && q.sessionId);
        if (pending.length === 0) {
          clearInterval(pollInterval);
          setIsBatchRunning(false);
          loadHistory(true);
          return prevQueue;
        }

        pending.forEach(async (item) => {
          try {
            const statusRes = await fetch(`/api/analyze/${encodeURIComponent(item.sessionId)}/status`);
            const statusPayload = await readApiResponse(statusRes);
            const data = statusPayload.data || {};
            const st = String(data.status || "").toLowerCase();

            if (data.report_ready || st === "completed" || st === "completed_with_errors") {
              setBatchQueue((curr) =>
                curr.map((c) =>
                  c.id === item.id
                    ? {
                        ...c,
                        status: "COMPLETED",
                        verdict: data.verdict || "SAFE",
                        riskScore: data.risk_score ?? 0
                      }
                    : c
                )
              );
            } else if (FINAL_STATUSES.has(st)) {
              setBatchQueue((curr) =>
                curr.map((c) =>
                  c.id === item.id
                    ? {
                        ...c,
                        status: st.toUpperCase(),
                        verdict: data.verdict || "UNKNOWN",
                        riskScore: data.risk_score ?? 0
                      }
                    : c
                )
              );
            }
          } catch {}
        });

        return prevQueue;
      });
    }, 2000);
  }

  async function handleSubmit(event) {
    if (event?.preventDefault) event.preventDefault();
    return startAnalysis(url);
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

  // 1. Marketing / Commercial SaaS Landing Page (ANY.RUN Image 2 style)
  if (activeTab === "landing") {
    return (
      <>
        <CommercialLanding
          onLaunchStudio={() => setActiveTab("soc_hub")}
          onOpenEmailGateway={() => setActiveTab("email_gateway")}
          onOpenAuthModal={(tab = "profile") => {
            setAuthModalTab(tab);
            setShowAuthModal(true);
          }}
          onViewHistory={() => setActiveTab("history")}
          subscriptions={subscriptions}
          currentUser={currentUser}
        />

        {showAuthModal && (
          <AuthModal
            initialTab={authModalTab}
            initialGateway={authModalGateway}
            currentUser={currentUser}
            onClose={() => setShowAuthModal(false)}
            onUpdateUser={handleUpdateUser}
            onLaunchRbi={(target) => {
              setShowAuthModal(false);
              setRbiTargetUrl(target || "https://example.com");
              setRbiActive(true);
            }}
          />
        )}

        {rbiActive && (
          <LiveIsolationModal
            targetUrl={rbiTargetUrl}
            currentUser={currentUser}
            onClose={() => setRbiActive(false)}
          />
        )}
      </>
    );
  }

  // 2. Authentic ANY.RUN SOC Application Workspace (Image 1 style)
  if (activeTab === "soc_hub") {
    return (
      <>
        <SocPortalHub
          onSubmitUrl={(target) => startAnalysis(target)}
          onOpenEmailGateway={() => setActiveTab("email_gateway")}
          onLaunchRbi={(target) => {
            setRbiTargetUrl(target || "https://example.com");
            setRbiActive(true);
          }}
          onOpenHistory={() => setActiveTab("history")}
          onOpenAuthModal={(tab = "profile") => {
            setAuthModalTab(tab);
            setShowAuthModal(true);
          }}
          onOpenApiTerminal={() => setShowApiTerminal(true)}
          onNavigateToLanding={() => setActiveTab("landing")}
          subscriptions={subscriptions}
          currentUser={currentUser}
          activeSubTab="hub"
        />

        {showAuthModal && (
          <AuthModal
            initialTab={authModalTab}
            initialGateway={authModalGateway}
            currentUser={currentUser}
            onClose={() => setShowAuthModal(false)}
            onUpdateUser={handleUpdateUser}
            onOpenApiTerminal={() => setShowApiTerminal(true)}
            onLaunchRbi={(target) => {
              setShowAuthModal(false);
              setRbiTargetUrl(target || "https://example.com");
              setRbiActive(true);
            }}
          />
        )}

        {rbiActive && (
          <LiveIsolationModal
            targetUrl={rbiTargetUrl}
            currentUser={currentUser}
            onClose={() => setRbiActive(false)}
          />
        )}

        {showApiTerminal && (
          <ApiTerminalModal
            isOpen={showApiTerminal}
            onClose={() => setShowApiTerminal(false)}
            recentSessionId={sessionId || (historyList[0]?.session_id || "")}
            currentUser={currentUser}
          />
        )}

        {showExecutiveReport && (
          <ExecutiveReportModal
            isOpen={showExecutiveReport}
            onClose={() => setShowExecutiveReport(false)}
            analysisId={executiveReportTargetId || sessionId || (historyList[0]?.session_id || "")}
            reportData={executiveReportTargetId === sessionId ? (rawReport || result) : null}
            iocsData={executiveReportTargetId === sessionId ? iocsData : null}
            currentUser={currentUser}
          />
        )}
      </>
    );
  }

  // 3. Operational SOC Views: Detonation Studio (Concept 1), Email Gateway, or Past History
  return (
    <div style={{ minHeight: "100vh", background: "#071020", color: "#f8fafc" }}>
      {/* Top Persistent SOC Workspace Navigation Bar */}
      <header className="soc-top-navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            onClick={() => setActiveTab("soc_hub")}
            title="Return to Start Analysis Workspace"
          >
            <div className="soc-brand-icon">▶</div>
            <span style={{ fontWeight: 900, color: "#fff", fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
              BROWSE<span style={{ color: "#00acf5" }}>GUARD</span>
            </span>
          </div>

          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>/</span>

          <button
            type="button"
            className={`soc-top-nav-btn ${activeTab === "soc_hub" ? "active" : ""}`}
            onClick={() => setActiveTab("soc_hub")}
          >
            🌐 Start Analysis
          </button>
          <button
            type="button"
            className={`soc-top-nav-btn ${activeTab === "scanner" ? "active" : ""}`}
            onClick={() => setActiveTab("scanner")}
          >
            🖥️ Detonation Studio
          </button>
          <button
            type="button"
            className={`soc-top-nav-btn ${activeTab === "email_gateway" ? "active" : ""}`}
            onClick={() => setActiveTab("email_gateway")}
          >
            {subscriptions?.email_gateway_api?.status === "ACTIVE" || currentUser?.role === "ADMIN" || currentUser?.role === "OWNER"
              ? "📧 Email Gateway API"
              : "🔒 Email Gateway API"}
          </button>
          <button
            type="button"
            className={`soc-top-nav-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            📄 Reports & History ({historyList.length})
          </button>

          {(currentUser?.role === "ADMIN" || currentUser?.role === "OWNER") && (
            <button
              type="button"
              className={`soc-top-nav-btn ${activeTab === "admin" ? "active" : ""}`}
              onClick={() => setActiveTab("admin")}
              style={{
                background: activeTab === "admin" ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" : "rgba(14, 165, 233, 0.12)",
                color: activeTab === "admin" ? "#ffffff" : "#38bdf8",
                border: "1px solid rgba(14, 165, 233, 0.4)",
                fontWeight: 800
              }}
            >
              ⚙️ Admin Console
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {(currentUser?.role === "ADMIN" || currentUser?.role === "OWNER") && (
            <>
              <button
                type="button"
                className="preset-pill"
                onClick={() => setShowApiTerminal(true)}
                style={{ background: "rgba(0, 172, 245, 0.15)", border: "1px solid rgba(0, 172, 245, 0.4)", color: "#38bdf8", fontWeight: 700 }}
                title="Interactive API & Gateway Test Terminal"
              >
                ⚡ API Terminal
              </button>

              <button
                type="button"
                className="preset-pill"
                onClick={() => {
                  setAuthModalTab("api_keys");
                  setShowAuthModal(true);
                }}
                style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(168, 85, 247, 0.4)", color: "#c084fc" }}
                title="Manage API Keys & Threat Intelligence Feeds (BYOK)"
              >
                🔑 API Keys & BYOK
              </button>
            </>
          )}

          <button
            type="button"
            className="preset-pill"
            onClick={() => setShowAccountSettings(true)}
            style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(0, 172, 245, 0.35)" }}
            title="View personal gateway quota"
          >
            <span>🖥️ Quota:</span>
            <strong style={{ color: "#38bdf8" }}>
              {currentUser?.role === "ADMIN" || currentUser?.role === "OWNER" ? "Unlimited" : `${subscriptions?.url_scanner?.quota_remaining ?? 20} Left`}
            </strong>
          </button>

          <button
            type="button"
            className="preset-pill"
            onClick={() => setShowAccountSettings(true)}
            style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#f8fafc", fontWeight: 700 }}
            title="Open Account & Profile Settings"
          >
            👤 {currentUser?.fullName || "Admin"} ({currentUser?.role || "ADMIN"})
          </button>

          <button
            type="button"
            className="preset-pill"
            onClick={() => setActiveTab("landing")}
            style={{ background: "transparent", border: "1px solid rgba(255, 255, 255, 0.2)", color: "#cbd5e1" }}
            title="View Commercial Landing Page"
          >
            🏠 Commercial Site ↗
          </button>
        </div>
      </header>

      <main className="app-shell" style={{ maxWidth: "1520px", margin: "0 auto", padding: "24px 28px" }}>
        {/* TAB 1: SCANNER */}
      {activeTab === "scanner" && (
        <>
          <section className="panel">
            {/* Mode Switcher: Single vs Batch */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px", background: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <button
                  type="button"
                  onClick={() => setScanType("single")}
                  style={{
                    background: scanType === "single" ? "#00acf5" : "transparent",
                    color: scanType === "single" ? "#fff" : "#94a3b8",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  ⚡ Single Target Detonation
                </button>
                <button
                  type="button"
                  onClick={() => setScanType("batch")}
                  style={{
                    background: scanType === "batch" ? "#00acf5" : "transparent",
                    color: scanType === "batch" ? "#fff" : "#94a3b8",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  📋 Batch Multi-URL Scanner
                </button>
              </div>

              <button
                type="button"
                className="preset-pill"
                onClick={() => setActiveTab("soc_hub")}
                style={{ fontSize: "0.74rem", padding: "4px 12px" }}
                title="Return to Start Analysis Workspace"
              >
                ← Back to Start Analysis
              </button>
            </div>

            {/* SINGLE SCAN MODE */}
            {scanType === "single" ? (
              <form className="url-form" onSubmit={handleSubmit}>
                {currentUser?.role === "VIEWER" && (
                  <div style={{
                    background: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    color: "#93c5fd",
                    fontSize: "0.85rem",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span>👁️ <strong>Read-Only Mode:</strong> Your account has Viewer permissions. Live URL detonation is restricted to Analysts and Administrators. You have full access to Reports & History.</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label htmlFor="url" style={{ margin: 0 }}>Target URL to inspect in isolation</label>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Fast queue ~5-8s • Sandbox isolation active</span>
                </div>
                <div className="url-input-row">
                  <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    autoComplete="off"
                    spellCheck="false"
                    disabled={isSubmitting || currentUser?.role === "VIEWER"}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || currentUser?.role === "VIEWER"}
                    title={currentUser?.role === "VIEWER" ? "Viewers cannot trigger scans" : "Fast automated scan (5-8 seconds)"}
                  >
                    {isSubmitting ? "Dispatching..." : "⚡ Fast Scan (~5-8s)"}
                  </button>
                  <button
                    type="button"
                    className="rbi-launch-btn"
                    onClick={() => startAnalysis(url, true)}
                    disabled={isSubmitting || currentUser?.role === "VIEWER"}
                    title={currentUser?.role === "VIEWER" ? "Viewers cannot trigger interactive detonations" : "Launch zero-trust interactive browser isolation chamber with mouse & keyboard controls"}
                  >
                    🖥️ Interactive Detonation (ANY.RUN)
                  </button>
                </div>
              </form>
            ) : (
              /* BATCH MULTI-URL SCAN MODE */
              <div style={{ marginTop: "4px" }}>
                {currentUser?.role === "VIEWER" && (
                  <div style={{
                    background: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    color: "#93c5fd",
                    fontSize: "0.85rem",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span>👁️ <strong>Read-Only Mode:</strong> Your account has Viewer permissions. Batch detonations are restricted to Analysts and Administrators.</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#e2e8f0" }}>
                    Paste Multiple URLs to Detonate Concurrently
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>One URL per line • Parallel queue execution</span>
                </div>
                <textarea
                  value={batchUrlsInput}
                  onChange={(e) => setBatchUrlsInput(e.target.value)}
                  placeholder={`https://instagram.com/daksh_dadhich\nhttps://example.com\nhttp://127.0.0.1:3000/api/v1/simulations/clickfix-captcha\nhttps://micros0ft-verify.com/login.html`}
                  rows={4}
                  style={{
                    width: "100%",
                    background: "#080f20",
                    border: "1px solid rgba(0, 172, 245, 0.35)",
                    borderRadius: "8px",
                    padding: "12px",
                    color: "#ffffff",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box"
                  }}
                  disabled={isBatchRunning || currentUser?.role === "VIEWER"}
                />
                <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={runBatchScan}
                    disabled={isBatchRunning || !batchUrlsInput.trim() || currentUser?.role === "VIEWER"}
                    title={currentUser?.role === "VIEWER" ? "Viewers cannot trigger batch scans" : "Launch batch sandbox detonation"}
                    style={{
                      background: currentUser?.role === "VIEWER" ? "#334155" : "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
                      color: currentUser?.role === "VIEWER" ? "#94a3b8" : "#fff",
                      border: "none",
                      padding: "8px 20px",
                      borderRadius: "6px",
                      fontWeight: 700,
                      cursor: (isBatchRunning || currentUser?.role === "VIEWER") ? "not-allowed" : "pointer",
                      boxShadow: currentUser?.role === "VIEWER" ? "none" : "0 2px 8px rgba(0, 172, 245, 0.3)"
                    }}
                  >
                    {isBatchRunning ? "⏳ Detonating Batch Targets..." : "🚀 Launch Batch Sandbox Detonation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBatchUrlsInput(""); setBatchQueue([]); }}
                    disabled={isBatchRunning}
                    className="secondary-button"
                    style={{ padding: "8px 16px" }}
                  >
                    Clear
                  </button>
                  {batchQueue.some(q => q.status === "FAILED") && !isBatchRunning && (
                    <button
                      type="button"
                      onClick={() => {
                        const failedUrls = batchQueue.filter(q => q.status === "FAILED").map(q => q.url).join("\n");
                        setBatchUrlsInput(failedUrls);
                      }}
                      className="preset-pill"
                      style={{ padding: "6px 14px", fontSize: "0.8rem", color: "#38bdf8", border: "1px solid #38bdf8" }}
                      title="Load all failed targets into the box to retry"
                    >
                      🔄 Load Failed to Retry
                    </button>
                  )}
                  {batchQueue.length > 0 && (
                    <span style={{ fontSize: "0.85rem", color: "#38bdf8", marginLeft: "auto", fontFamily: "monospace" }}>
                      Completed {batchQueue.filter(q => q.status === "COMPLETED").length} of {batchQueue.length} Targets
                    </span>
                  )}
                </div>

                {batchQueue.length > 0 && (
                  <div style={{ marginTop: "18px", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", background: "#060d1b", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <thead>
                        <tr style={{ background: "rgba(0, 172, 245, 0.12)", textAlign: "left", color: "#94a3b8" }}>
                          <th style={{ padding: "10px 14px" }}>#</th>
                          <th style={{ padding: "10px 14px" }}>Target URL</th>
                          <th style={{ padding: "10px 14px" }}>Status</th>
                          <th style={{ padding: "10px 14px" }}>Verdict</th>
                          <th style={{ padding: "10px 14px" }}>Risk Score</th>
                          <th style={{ padding: "10px 14px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchQueue.map((item, idx) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace", maxWidth: "340px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.url}>
                              {item.url}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                background: item.status === "COMPLETED" ? "rgba(16, 185, 129, 0.15)" : item.status === "RUNNING" ? "rgba(0, 172, 245, 0.2)" : "rgba(239, 68, 68, 0.15)",
                                color: item.status === "COMPLETED" ? "#10b981" : item.status === "RUNNING" ? "#38bdf8" : "#f87171"
                              }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span className={`verdict-tag ${item.verdict}`} style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                                {item.verdict}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: (item.riskScore ?? 0) > 60 ? "#ef4444" : (item.riskScore ?? 0) > 20 ? "#f59e0b" : "#10b981" }}>
                              {item.riskScore !== null ? `${item.riskScore}/100` : "--"}
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              {item.sessionId && (
                                <button
                                  type="button"
                                  onClick={() => openPastScan(item.sessionId)}
                                  style={{
                                    background: "rgba(0, 172, 245, 0.2)",
                                    border: "1px solid rgba(0, 172, 245, 0.4)",
                                    color: "#38bdf8",
                                    borderRadius: "4px",
                                    padding: "3px 10px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    fontWeight: 700
                                  }}
                                >
                                  🔍 View Report
                                </button>
                              )}
                              {item.errorDetail && (
                                <span
                                  style={{
                                    display: "inline-block",
                                    maxWidth: "200px",
                                    fontSize: "0.7rem",
                                    color: "#f87171",
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    borderRadius: "4px",
                                    padding: "2px 8px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                  }}
                                  title={item.errorDetail}
                                >
                                  ⚠️ {item.errorDetail}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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
                  style={{ borderColor: "rgba(236, 72, 153, 0.5)", color: "#ec4899" }}
                  onClick={() => setUrl("http://127.0.0.1:3000/api/v1/simulations/clickfix-captcha")}
                  disabled={isSubmitting}
                >
                  ⚡ ClickFix Win+R Lure
                </button>
                <button
                  type="button"
                  className="preset-pill threat"
                  style={{ borderColor: "rgba(192, 132, 252, 0.5)", color: "#c084fc" }}
                  onClick={() => setUrl("http://127.0.0.1:3000/api/v1/simulations/oauth-device-login")}
                  disabled={isSubmitting}
                >
                  🔑 OAuth Device Phish
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
          </section>

          {gatewayError && (
            <section
              className="alert"
              style={{
                marginTop: "20px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                padding: "16px 20px",
                borderRadius: "8px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <strong style={{ color: "#f87171", fontSize: "0.95rem", display: "block" }}>
                    ⚠️ Gateway Access Restriction: {gatewayError.code || "ACCESS_DENIED"}
                  </strong>
                  <p style={{ margin: "4px 0 0", color: "#e2e8f0", fontSize: "0.85rem" }}>
                    {gatewayError.message || error}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {gatewayError.can_activate_trial && (
                    <button
                      type="button"
                      onClick={() => handleDirectActivateTrial("url_scanner")}
                      className="primary-button"
                      style={{ padding: "6px 14px", fontSize: "0.8rem", background: "#00acf5" }}
                    >
                      🚀 Activate 14-Day Free Trial
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTab("login");
                      setAuthModalGateway("url_scanner");
                      setShowAuthModal(true);
                    }}
                    className="preset-pill"
                    style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                  >
                    🔐 Switch Account
                  </button>
                  <button type="button" className="secondary-button" onClick={handleReset} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                    Dismiss
                  </button>
                </div>
              </div>
            </section>
          )}

          {error && !gatewayError && (
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

          {sessionId && (isProcessing || (!result && status !== "idle")) && (
            <LiveDetonationViewer
              sessionId={sessionId}
              targetUrl={url}
              onTakeOverRbi={(target) => {
                setRbiTargetUrl(target || url);
                setRbiActive(true);
              }}
              onComplete={() => {
                fetchStatus(sessionId, 1);
              }}
            />
          )}

          {result && (
            <section style={{ marginTop: "24px" }}>
              {/* ANY.RUN Top Execution HUD Strip */}
              <div className="anyrun-hud">
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="pulse-dot" />
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f87171", letterSpacing: "0.06em", fontFamily: "ui-monospace, monospace" }}>
                      LIVE SANDBOX DETONATION
                    </span>
                  </div>
                  <span style={{ color: "rgba(148, 163, 184, 0.4)" }}>|</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#38bdf8", fontSize: "0.88rem" }}>🔒</span>
                    <span
                      style={{
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        fontSize: "0.85rem",
                        color: "#e2e8f0",
                        fontWeight: 600,
                        maxWidth: "480px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                      title={result.submitted_url || url}
                    >
                      {result.submitted_url || url}
                    </span>
                  </div>
                  <span
                    className={`verdict-tag ${result.verdict || "UNKNOWN"}`}
                    style={{ fontSize: "0.74rem", padding: "3px 10px" }}
                  >
                    VERDICT: {result.verdict || "UNKNOWN"}
                  </span>
                </div>

                {/* HUD Action Toolbar */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="preset-pill"
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9 0%, #00e5ff 100%)",
                      color: "#0b1220",
                      fontWeight: 800,
                      border: "none",
                      boxShadow: "0 0 12px rgba(0, 229, 255, 0.3)"
                    }}
                    onClick={() => {
                      setRbiTargetUrl(result.final_url || result.submitted_url || url);
                      setRbiActive(true);
                    }}
                    title="Launch live interactive Remote Browser Isolation session in sandbox"
                  >
                    🖥️ Interactive RBI
                  </button>
                  <a
                    href={`/api/analyze/${encodeURIComponent(sessionId)}/har`}
                    download={`browseguard_${sessionId}.har`}
                    className="preset-pill"
                    style={{
                      color: "#00e5ff",
                      background: "rgba(0, 229, 255, 0.1)",
                      border: "1px solid rgba(0, 229, 255, 0.35)",
                      textDecoration: "none"
                    }}
                    title="Download network stream HTTP Archive (.har)"
                  >
                    📥 HAR Stream
                  </a>
                  <a
                    href={`/api/analyze/${encodeURIComponent(sessionId)}/dom`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="preset-pill"
                    style={{
                      color: "#c084fc",
                      background: "rgba(176, 38, 255, 0.1)",
                      border: "1px solid rgba(176, 38, 255, 0.35)",
                      textDecoration: "none"
                    }}
                    title="View post-render HTML snapshot"
                  >
                    📄 DOM HTML ↗
                  </a>
                  <button
                    type="button"
                    className="preset-pill"
                    style={{
                      background: "rgba(16, 185, 129, 0.18)",
                      border: "1px solid rgba(16, 185, 129, 0.5)",
                      color: "#34d399",
                      fontWeight: 800,
                      boxShadow: "0 0 12px rgba(16, 185, 129, 0.2)"
                    }}
                    onClick={() => {
                      setExecutiveReportTargetId(sessionId);
                      setShowExecutiveReport(true);
                    }}
                    title="Generate and export executive incident response threat brief (PDF / Print / Markdown)"
                  >
                    📄 IR Brief / PDF
                  </button>
                  <button
                    type="button"
                    className="preset-pill"
                    onClick={() => setShowLiveViewer(!showLiveViewer)}
                    style={{
                      background: showLiveViewer ? "rgba(0, 172, 245, 0.22)" : "rgba(30, 41, 59, 0.8)",
                      border: `1px solid ${showLiveViewer ? "#00acf5" : "rgba(71, 85, 105, 0.4)"}`,
                      color: showLiveViewer ? "#38bdf8" : "#94a3b8",
                      fontWeight: 700
                    }}
                    title="Toggle Real-Time Detonation Screencast Player"
                  >
                    📹 {showLiveViewer ? "Hide Live Player" : "🔴 Detonation Stream"}
                  </button>
                  <button
                    type="button"
                    className="preset-pill"
                    onClick={handleReset}
                    style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(71, 85, 105, 0.4)" }}
                  >
                    🔄 New Scan
                  </button>
                </div>
              </div>

              {showLiveViewer && sessionId && (
                <LiveDetonationViewer
                  sessionId={sessionId}
                  targetUrl={result.submitted_url || url}
                  compact
                  onTakeOverRbi={(target) => {
                    setRbiTargetUrl(target || result.submitted_url || url);
                    setRbiActive(true);
                  }}
                />
              )}

              {/* ANY.RUN Dual-Pane Split Workspace */}
              <div className="anyrun-split">
                {/* Left Column: Sandbox Screen Viewport */}
                <div className="anyrun-viewport-card">
                  <div className="anyrun-window-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="window-dots">
                        <span className="window-dot red" />
                        <span className="window-dot yellow" />
                        <span className="window-dot green" />
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "ui-monospace, monospace",
                          color: "#94a3b8",
                          fontWeight: 700,
                          letterSpacing: "0.04em"
                        }}
                      >
                        SANDBOX DETONATION STREAM • Chromium 128 (x86_64)
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <a
                        href={`/api/analyze/${encodeURIComponent(sessionId)}/screenshot`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="preset-pill"
                        style={{ padding: "3px 8px", fontSize: "0.72rem", textDecoration: "none" }}
                      >
                        Full Size ↗
                      </a>
                    </div>
                  </div>

                  <div className="anyrun-viewport-inner">
                    <img
                      src={`/api/analyze/${encodeURIComponent(sessionId)}/screenshot`}
                      alt={`Sandbox render of ${result.submitted_url || sessionId}`}
                      className="anyrun-viewport-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>

                  <div className="anyrun-viewport-footer">
                    <span>RESOLUTION: 1366x768 • NETWORKGUARD: ACTIVE</span>
                    <span>
                      DURATION:{" "}
                      {typeof result.duration_ms === "number"
                        ? `${(result.duration_ms / 1000).toFixed(2)}s`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Right Column: Threat Intelligence Rail (Concept 1) */}
                <div className="anyrun-threat-rail">
                  {/* Concept 1: Threat Risk Score Dial & Heuristics */}
                  <ThreatRiskDial
                    score={result.risk_score ?? 0}
                    verdict={result.verdict || "UNKNOWN"}
                    riskLevel={result.risk_level || "low"}
                    findings={findings}
                    action={result.allow_user_access ? "ALLOW" : "BLOCK"}
                  />

                  {result.reason && (
                    <div style={{ padding: "12px 14px", background: "rgba(15, 23, 42, 0.7)", borderRadius: "8px", border: "1px solid rgba(71, 85, 105, 0.3)" }}>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Policy Decision Reason</span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#e2e8f0" }}>{result.reason}</p>
                    </div>
                  )}

                  {/* Anti-Cloaking / Click-Wall Traversed Alert */}
                  {rawReport?.browser_behaviour?.auto_interaction?.interacted && (
                    <div
                      style={{
                        background: "linear-gradient(90deg, rgba(234, 88, 12, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)",
                        border: "1px solid rgba(249, 115, 22, 0.5)",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        boxShadow: "0 0 16px rgba(249, 115, 22, 0.15)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "1.2rem" }}>🛡️</span>
                        <div>
                          <strong style={{ color: "#fb923c", fontSize: "0.85rem", display: "block" }}>
                            Anti-Cloaking Engine: Click-Wall Bypassed
                          </strong>
                          <span style={{ color: "#cbd5e1", fontSize: "0.76rem" }}>
                            Automated interaction traversed verification lures to uncover true landing payload.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Telemetry Summary */}
                  <div className="panel" style={{ padding: "16px 20px" }}>
                    <p className="section-label">Detonation Telemetry</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Target Host:</span>
                        <code style={{ color: "#38bdf8" }}>{result.final_hostname || "Resolved"}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Page Title:</span>
                        <span style={{ color: "#f8fafc", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {result.page_title || "None"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Domain Transition:</span>
                        <span style={{ color: result.domain_changed ? "#ffb700" : "#00f59b", fontWeight: 700 }}>
                          {result.domain_changed ? "DOMAIN CHANGED" : "SAME DOMAIN"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8" }}>Analysis Record:</span>
                        <code style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{sessionId.slice(0, 18)}...</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Forensic SOC Drawer (Tabbed Workbench) */}
              <div className="anyrun-drawer">
                <div className="anyrun-drawer-tabs">
                  <button
                    type="button"
                    className={`anyrun-drawer-tab ${activeDrawerTab === "redirects" ? "active" : ""}`}
                    onClick={() => setActiveDrawerTab("redirects")}
                  >
                    🌐 Redirect Hop Flowchart
                  </button>
                  <button
                    type="button"
                    className={`anyrun-drawer-tab ${activeDrawerTab === "iocs" ? "active" : ""}`}
                    onClick={() => setActiveDrawerTab("iocs")}
                  >
                    🎯 Threat Intelligence & IOCs
                  </button>
                  <button
                    type="button"
                    className={`anyrun-drawer-tab ${activeDrawerTab === "findings" ? "active" : ""}`}
                    onClick={() => setActiveDrawerTab("findings")}
                  >
                    🛡️ Security Findings ({findings.length})
                  </button>
                  <button
                    type="button"
                    className={`anyrun-drawer-tab ${activeDrawerTab === "raw_json" ? "active" : ""}`}
                    onClick={() => setActiveDrawerTab("raw_json")}
                  >
                    ⚙️ Canonical Report JSON
                  </button>
                </div>

                <div className="anyrun-drawer-content">
                  {/* TAB 1: Redirect Flowchart & HAR Log */}
                  {activeDrawerTab === "redirects" && (
                    <RedirectTimeline
                      analysisId={sessionId}
                      reportData={rawReport || result}
                      onLaunchRbi={(target) => {
                        setRbiTargetUrl(target);
                        setRbiActive(true);
                      }}
                    />
                  )}

                  {/* TAB 2: ANY.RUN-inspired IOCs & MITRE ATT&CK Matrix */}
                  {activeDrawerTab === "iocs" && (
                    <IocPanel analysisId={sessionId} iocsData={iocsData} />
                  )}

                  {/* TAB 3: Observed Security Rule Findings */}
                  {activeDrawerTab === "findings" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <div>
                          <p className="section-label" style={{ color: "#00e5ff" }}>Observed Security Findings</p>
                          <h3 style={{ margin: "4px 0 0", color: "#f8fafc", fontSize: "1.1rem" }}>
                            {findings.length === 0
                              ? "No suspicious behavior detected"
                              : `${findings.length} signal${findings.length === 1 ? "" : "s"} identified by rule engine`}
                          </h3>
                        </div>
                      </div>

                      {findings.length === 0 ? (
                        <div style={{ padding: "24px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", textAlign: "center", color: "#94a3b8" }}>
                          The rule engine detected no high-risk redirects, credential lures, or dangerous downloads.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {findings.map((finding, idx) => (
                            <FindingCard key={finding.id || idx} finding={finding} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Canonical Report JSON */}
                  {activeDrawerTab === "raw_json" && rawReport && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div>
                          <p className="section-label" style={{ color: "#00e5ff" }}>Forensic Artifact</p>
                          <h3 style={{ margin: "4px 0 0", color: "#f8fafc", fontSize: "1.1rem" }}>
                            Canonical Forensic Report JSON (Schema {rawReport.schema_version || "2.1"})
                          </h3>
                        </div>
                        <button
                          type="button"
                          className="preset-pill"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(rawReport, null, 2));
                          }}
                        >
                          📋 Copy JSON
                        </button>
                      </div>
                      <pre className="json-viewer">
                        {JSON.stringify(rawReport, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* TAB 2: EMAIL GATEWAY & API PORTAL */}
      {activeTab === "email_gateway" && (
        subscriptions?.email_gateway_api?.status === "ACTIVE" || currentUser?.role === "ADMIN" || currentUser?.role === "OWNER" ? (
          <EmailGatewayPortal
            onLaunchRbi={(target) => {
              setRbiTargetUrl(target);
              setRbiActive(true);
            }}
            onBackToPortal={() => setActiveTab("soc_hub")}
          />
        ) : (
          <div className="panel" style={{ padding: "50px 24px", textAlign: "center", maxWidth: "680px", margin: "40px auto" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", border: "2px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 16px" }}>
              🔒
            </div>
            <h2 style={{ color: "#f8fafc", margin: "0 0 10px", fontSize: "1.3rem" }}>Enterprise Gateway Locked</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: "1.6", maxWidth: "520px", margin: "0 auto 24px" }}>
              The <strong>Email Gateway API & EML Threat Detonation Chamber</strong> is an enterprise-tier capability.
              Your account currently does not have an active entitlement for this gateway.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleDirectActivateTrial("email_gateway_api")}
                style={{ background: "#00acf5", border: "none", color: "#fff", padding: "10px 22px", borderRadius: "6px", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem" }}
              >
                🚀 Activate 14-Day Free Trial
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("scanner")}
                style={{ background: "rgba(255, 255, 255, 0.1)", border: "none", color: "#cbd5e1", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Back to URL Scanner
              </button>
            </div>
          </div>
        )
      )}

      {/* TAB 4: ENTERPRISE ADMIN CONSOLE */}
      {activeTab === "admin" && (
        <AdminConsole
          currentUser={currentUser}
          onBackToWorkspace={() => setActiveTab("scanner")}
        />
      )}

      {/* TAB 3: POSTGRESQL SCAN HISTORY */}
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
                        <div style={{ display: "flex", gap: "6px" }}>
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
                          <button
                            type="button"
                            className="filter-btn"
                            style={{ fontSize: "0.76rem", padding: "4px 8px", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.35)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExecutiveReportTargetId(row.session_id);
                              setShowExecutiveReport(true);
                            }}
                            title="Export Executive Incident Response Threat Brief"
                          >
                            📄 IR Brief
                          </button>
                        </div>
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
        initialTab={authModalTab}
        initialGateway={authModalGateway}
        onOpenApiTerminal={() => setShowApiTerminal(true)}
        onLaunchRbi={(target) => {
          setShowAuthModal(false);
          setRbiTargetUrl(target || "https://example.com");
          setRbiActive(true);
        }}
      />
    )}

    {showApiTerminal && (
      <ApiTerminalModal
        isOpen={showApiTerminal}
        onClose={() => setShowApiTerminal(false)}
        recentSessionId={sessionId || (historyList[0]?.session_id || "")}
        currentUser={currentUser}
      />
    )}

    {showExecutiveReport && (
      <ExecutiveReportModal
        isOpen={showExecutiveReport}
        onClose={() => setShowExecutiveReport(false)}
        analysisId={executiveReportTargetId || sessionId || (historyList[0]?.session_id || "")}
        reportData={executiveReportTargetId === sessionId ? (rawReport || result) : null}
        iocsData={executiveReportTargetId === sessionId ? iocsData : null}
        currentUser={currentUser}
      />
    )}

    {showAccountSettings && (
      <AccountSettingsModal
        currentUser={currentUser}
        onUpdateUser={(updated) => {
          handleUpdateUser(updated);
        }}
        onClose={() => setShowAccountSettings(false)}
        onLogout={() => {
          setShowAccountSettings(false);
          localStorage.removeItem("bg_jwt_token");
          localStorage.removeItem("bg_current_user");
          window.location.reload();
        }}
      />
    )}
    </main>
  </div>
);
}

export default App;