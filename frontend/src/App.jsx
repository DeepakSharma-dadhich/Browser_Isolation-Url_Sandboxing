
import { useEffect, useRef, useState } from "react";

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
      return "Waiting for VM Agent";

    case "created":
      return "Session created";

    case "running":
      return "Opening URL inside isolated VM";

    case "analyzing":
      return "Analyzing collected evidence";

    case "completed_with_errors":
      return "Analysis completed with browser errors";

    case "completed":
      return "Analysis completed";

    case "failed":
      return "Analysis failed";

    case "rejected":
      return "Request rejected";

    case "duplicate":
      return "Existing result found";

    default:
      return status || "Preparing analysis";
  }
}


function FindingCard({ finding }) {
  return (
    <article className="finding-card">
      <div className="finding-heading">
        <h4>
          {finding.title || "Security finding"}
        </h4>

        <span
          className={`severity severity-${
            finding.severity || "informational"
          }`}
        >
          {finding.severity || "informational"}
        </span>
      </div>

      <p>
        {finding.description ||
          "No description was provided."}
      </p>

      {finding.category && (
        <div className="finding-meta">
          Category: {finding.category}
        </div>
      )}

      {typeof finding.score === "number" && (
        <div className="finding-meta">
          Risk contribution: {finding.score}
        </div>
      )}
    </article>
  );
}


function App() {
  const [url, setUrl] = useState(
    "https://example.com"
  );

  const [sessionId, setSessionId] =
    useState("");

  const [status, setStatus] =
    useState("idle");

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [pollAttempt, setPollAttempt] =
    useState(0);

  const pollTimerRef = useRef(null);
  const activeSessionRef = useRef("");


  function clearPollingTimer() {
    if (pollTimerRef.current) {
      clearTimeout(
        pollTimerRef.current
      );

      pollTimerRef.current = null;
    }
  }


  useEffect(() => {
    return () => {
      clearPollingTimer();
    };
  }, []);


  async function fetchStatus(
    currentSessionId,
    attemptNumber = 1
  ) {
    if (
      !currentSessionId ||
      activeSessionRef.current !==
        currentSessionId
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/analyze/${encodeURIComponent(
          currentSessionId
        )}/status`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      const payload =
        await readApiResponse(response);

      const statusData =
        payload.data || {};

      setStatus(
        statusData.status ||
          "processing"
      );

      setPollAttempt(
        attemptNumber
      );

      if (
        statusData.report_ready ||
        statusData.status === "completed"
      ) {
        setResult(statusData);
        setIsSubmitting(false);
        clearPollingTimer();
        return;
      }

      if (
        FINAL_STATUSES.has(
          statusData.status
        )
      ) {
        setResult(statusData);
        setIsSubmitting(false);
        clearPollingTimer();
        return;
      }

      if (
        attemptNumber >=
        MAX_POLL_ATTEMPTS
      ) {
        throw new Error(
          "Analysis is taking longer than expected. The session may still be running in the VM."
        );
      }

      pollTimerRef.current =
        setTimeout(
          () => {
            fetchStatus(
              currentSessionId,
              attemptNumber + 1
            );
          },
          POLL_INTERVAL_MS
        );

    } catch (statusError) {
      setError(
        normalizeError(
          statusError
        )
      );

      setIsSubmitting(false);
      setStatus("failed");
      clearPollingTimer();
    }
  }


  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedUrl =
      url.trim();

    if (!normalizedUrl) {
      setError(
        "Enter a URL before starting the analysis."
      );
      return;
    }

    clearPollingTimer();

    setError("");
    setResult(null);
    setSessionId("");
    setStatus("submitting");
    setPollAttempt(0);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json"
          },
          body: JSON.stringify({
            url: normalizedUrl,
            metadata: {
              submitted_from:
                "react_frontend"
            }
          })
        }
      );

      const payload =
        await readApiResponse(
          response
        );

      const newSessionId =
        payload?.data?.session_id;

      if (!newSessionId) {
        throw new Error(
          "The backend did not return a session ID."
        );
      }

      activeSessionRef.current =
        newSessionId;

      setSessionId(
        newSessionId
      );

      setStatus(
        payload?.data?.status ||
          "queued"
      );

      fetchStatus(
        newSessionId,
        1
      );

    } catch (submitError) {
      setError(
        normalizeError(
          submitError
        )
      );

      setStatus("failed");
      setIsSubmitting(false);
    }
  }


  function handleReset() {
    clearPollingTimer();

    activeSessionRef.current = "";

    setUrl(
      "https://example.com"
    );

    setSessionId("");
    setStatus("idle");
    setResult(null);
    setError("");
    setIsSubmitting(false);
    setPollAttempt(0);
  }


  const isProcessing =
    isSubmitting &&
    !FINAL_STATUSES.has(status);


  const findings =
    Array.isArray(
      result?.findings
    )
      ? result.findings
      : [];


  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            Email URL Sandbox
          </p>

          <h1>
            Analyze a URL inside an isolated browser
          </h1>

          <p className="hero-description">
            The host backend submits the URL to the VM.
            Playwright, Chromium, collectors, threat
            analysis and the final decision all run
            inside the isolated virtual machine.
          </p>
        </div>

        <div className="architecture-pill">
          Host → VM → Report
        </div>
      </section>


      <section className="panel">
        <form
          className="url-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="url">
            URL to analyze
          </label>

          <div className="url-input-row">
            <input
              id="url"
              type="url"
              value={url}
              onChange={(event) =>
                setUrl(
                  event.target.value
                )
              }
              placeholder="https://example.com"
              autoComplete="off"
              spellCheck="false"
              disabled={isSubmitting}
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Analyzing..."
                : "Analyze URL"}
            </button>
          </div>

          <p className="input-help">
            Only HTTP and HTTPS URLs are accepted.
            The URL is never opened by the host backend.
          </p>
        </form>
      </section>


      {error && (
        <section className="alert alert-error">
          <strong>
            Analysis error
          </strong>

          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
          >
            Reset
          </button>
        </section>
      )}


      {status !== "idle" &&
        !error && (
          <section className="panel status-panel">
            <div>
              <p className="section-label">
                Current status
              </p>

              <h2>
                {getStatusLabel(
                  status
                )}
              </h2>

              {sessionId && (
                <p className="session-id">
                  Session: {sessionId}
                </p>
              )}
            </div>

            {isProcessing && (
              <div className="processing-indicator">
                <span className="spinner" />

                <span>
                  Polling attempt{" "}
                  {pollAttempt || 1}
                </span>
              </div>
            )}
          </section>
        )}


      {result && (
        <section className="results-layout">
          <article className="panel result-summary">
            <p className="section-label">
              Final decision
            </p>

            <div
              className={`verdict-badge ${getVerdictClass(
                result.verdict
              )}`}
            >
              {result.verdict ||
                "UNKNOWN"}
            </div>

            <div className="metric-grid">
              <div className="metric">
                <span>
                  Risk score
                </span>

                <strong>
                  {result.risk_score ??
                    0}
                  /100
                </strong>
              </div>

              <div className="metric">
                <span>
                  Risk level
                </span>

                <strong>
                  {result.risk_level ||
                    "unknown"}
                </strong>
              </div>

              <div className="metric">
                <span>
                  Action
                </span>

                <strong>
                  {result.recommended_action ||
                    "UNKNOWN"}
                </strong>
              </div>

              <div className="metric">
                <span>
                  User access
                </span>

                <strong>
                  {result.allow_user_access
                    ? "Allowed"
                    : "Blocked"}
                </strong>
              </div>
            </div>

            {result.reason && (
              <div className="decision-reason">
                <strong>
                  Decision reason
                </strong>

                <p>
                  {result.reason}
                </p>
              </div>
            )}
          </article>


          <article className="panel page-details">
            <p className="section-label">
              Page details
            </p>

            <dl>
              <div>
                <dt>
                  Submitted URL
                </dt>

                <dd>
                  {result.submitted_url ||
                    url}
                </dd>
              </div>

              <div>
                <dt>
                  Final URL
                </dt>

                <dd>
                  {result.final_url ||
                    "Not available"}
                </dd>
              </div>

              <div>
                <dt>
                  Page title
                </dt>

                <dd>
                  {result.page_title ||
                    "Not available"}
                </dd>
              </div>

              <div>
                <dt>
                  Execution status
                </dt>

                <dd>
                  {result.execution_status ||
                    result.status ||
                    "unknown"}
                </dd>
              </div>

              <div>
                <dt>
                  Duration
                </dt>

                <dd>
                  {typeof result.duration_ms ===
                  "number"
                    ? `${(
                        result.duration_ms /
                        1000
                      ).toFixed(
                        2
                      )} seconds`
                    : "Not available"}
                </dd>
              </div>

              <div>
                <dt>
                  Session ID
                </dt>

                <dd>
                  {sessionId}
                </dd>
              </div>
            </dl>
          </article>


          <article className="panel findings-panel">
            <div className="findings-header">
              <div>
                <p className="section-label">
                  Security findings
                </p>

                <h2>
                  {findings.length === 0
                    ? "No suspicious behaviour detected"
                    : `${findings.length} finding${
                        findings.length === 1
                          ? ""
                          : "s"
                      }`}
                </h2>
              </div>

              <span className="finding-count">
                {result.finding_count ??
                  findings.length}
              </span>
            </div>

            {findings.length === 0 ? (
              <p className="empty-findings">
                The current rule engine did not identify
                significant suspicious browser behaviour.
              </p>
            ) : (
              <div className="findings-list">
                {findings.map(
                  (
                    finding,
                    index
                  ) => (
                    <FindingCard
                      key={
                        finding.id ||
                        `${finding.title}-${index}`
                      }
                      finding={
                        finding
                      }
                    />
                  )
                )}
              </div>
            )}
          </article>


          <div className="result-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleReset}
            >
              Analyze another URL
            </button>
          </div>
        </section>
      )}
    </main>
  );
}


export default App;