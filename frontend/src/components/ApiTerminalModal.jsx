import React, { useState, useEffect, useMemo, useRef } from "react";

// Predefined API endpoints for BrowseGuard Sandbox & Threat Gateway
const ENDPOINT_DEFINITIONS = [
  {
    id: "submit_analysis",
    category: "Sandbox Detonation",
    method: "POST",
    path: "/api/v1/analyses",
    title: "Detonate Suspicious URL",
    description: "Submit a URL to the isolated Chromium sandbox engine. Enforces gateway quotas and sliding-window rate limits.",
    scope: "analysis:create",
    hasBody: true,
    defaultBody: JSON.stringify(
      {
        url: "https://secure-payroll-auth.pages.dev/login",
        os: "linux_chromium",
        antiCloak: true,
        timeoutMs: 30000
      },
      null,
      2
    ),
    presets: [
      {
        name: "🔴 SaaS Phishing Lure",
        body: {
          url: "https://secure-payroll-auth.pages.dev/login",
          os: "linux_chromium",
          antiCloak: true
        }
      },
      {
        name: "🔴 Cloud Metadata SSRF Probe",
        body: {
          url: "http://169.254.169.254/latest/meta-data/",
          os: "linux_chromium",
          antiCloak: true
        }
      },
      {
        name: "🟢 Benign Example",
        body: {
          url: "https://example.com",
          os: "linux_chromium",
          antiCloak: false
        }
      }
    ]
  },
  {
    id: "list_analyses",
    category: "Sandbox Detonation",
    method: "GET",
    path: "/api/v1/analyses",
    title: "List & Search Analyses",
    description: "Query recent sandbox detonations with optional keyword filter and pagination.",
    scope: "analysis:read",
    queryParams: [
      { key: "search", value: "", placeholder: "e.g. phish or microsoft" },
      { key: "limit", value: "10", placeholder: "e.g. 10" }
    ]
  },
  {
    id: "get_analysis",
    category: "Sandbox Detonation",
    method: "GET",
    path: "/api/v1/analyses/{id}",
    title: "Get Analysis Report",
    description: "Retrieve complete forensic report, MITRE findings, redirect timeline, and threat verdict.",
    pathParams: [
      { key: "id", value: "", placeholder: "e.g. session_20261012_demo or latest" }
    ]
  },
  {
    id: "get_status",
    category: "Sandbox Detonation",
    method: "GET",
    path: "/api/v1/analyses/{id}/status",
    title: "Fast Status Poll",
    description: "Check execution lifecycle status without fetching the large forensic payload.",
    pathParams: [
      { key: "id", value: "", placeholder: "e.g. session_20261012_demo" }
    ]
  },
  {
    id: "get_iocs",
    category: "Threat Intelligence & STIX",
    method: "GET",
    path: "/api/v1/analyses/{id}/iocs",
    title: "Get IOCs & MITRE ATT&CK Matrix",
    description: "Retrieve normalized indicators of compromise (Domains, IPs, URLs, Hashes) and mapped MITRE techniques.",
    pathParams: [
      { key: "id", value: "", placeholder: "e.g. session_20261012_demo" }
    ]
  },
  {
    id: "get_stix_bundle",
    category: "Threat Intelligence & STIX",
    method: "GET",
    path: "/api/v1/analyses/{id}/stix",
    title: "Export OASIS STIX 2.1 Bundle",
    description: "Download official OASIS STIX 2.1 JSON bundle containing Indicators, Attack-Patterns, Identity, and Relationships.",
    scope: "analysis:read",
    pathParams: [
      { key: "id", value: "", placeholder: "e.g. session_20261012_demo" }
    ]
  },
  {
    id: "get_stix_feed",
    category: "Threat Intelligence & STIX",
    method: "GET",
    path: "/api/v1/analyses/threat-feed/stix",
    title: "TAXII Aggregated Threat Feed",
    description: "Query aggregated high-confidence IOC feed for automated ingestion into SIEM / SOAR / TIPs.",
    scope: "analysis:read",
    queryParams: [
      { key: "minScore", value: "50", placeholder: "Min risk score (0-100)" },
      { key: "limit", value: "25", placeholder: "Max items" }
    ]
  },
  {
    id: "parse_eml",
    category: "Email Gateway Forensics",
    method: "POST",
    path: "/api/v1/email-gateway/parse-eml",
    title: "Parse RFC822 .EML Stream",
    description: "Inspect raw email MIME headers, authenticate SPF/DKIM/DMARC, extract suspicious links, and detect quishing tactics.",
    hasBody: true,
    defaultBody: JSON.stringify(
      {
        filename: "urgent_invoice_audit.eml",
        rawEml: `From: "Accounting Services" <billing@payroll-verify-cloud.com>\r\nTo: victim@company.local\r\nSubject: URGENT: Outstanding Invoice #99281\r\nDate: Mon, 12 Oct 2026 09:30:00 +0000\r\nAuthentication-Results: spf=fail; dkim=fail; dmarc=fail\r\nContent-Type: text/html\r\n\r\n<p>Please review and pay your overdue invoice:</p>\r\n<a href="https://secure-invoice-portal.net/wire-transfer">Download Invoice PDF</a>`
      },
      null,
      2
    )
  },
  {
    id: "detonate_eml_links",
    category: "Email Gateway Forensics",
    method: "POST",
    path: "/api/v1/email-gateway/detonate-links",
    title: "Batch Detonate Email Links",
    description: "Queue parallel sandbox detonations for all suspicious URLs found in an email.",
    scope: "analysis:create",
    hasBody: true,
    defaultBody: JSON.stringify(
      {
        source: "email_gateway",
        emailSubject: "URGENT: Outstanding Invoice #99281",
        links: [
          { url: "https://secure-invoice-portal.net/wire-transfer", text: "Download Invoice PDF" },
          { url: "https://auth-portal-bypass.com/verify", text: "Direct Verification" }
        ]
      },
      null,
      2
    )
  },
  {
    id: "test_siem_webhook",
    category: "SIEM & Webhooks",
    method: "POST",
    path: "/api/v1/integrations/test",
    title: "Test SIEM Webhook Ping",
    description: "Dispatch a HMAC-SHA256 signed test incident payload to Splunk, Elastic, Microsoft Sentinel, or custom webhook.",
    hasBody: true,
    defaultBody: JSON.stringify(
      {
        provider: "webhook",
        api_key: "http://localhost:3000/api/v1/siem/alerts",
        config: {
          secret: "soc_siem_hmac_secret_key_888",
          format: "generic"
        }
      },
      null,
      2
    )
  },
  {
    id: "list_api_keys",
    category: "API & Subscription",
    method: "GET",
    path: "/api/v1/api-keys",
    title: "List API Clients & Scopes",
    description: "View authorized API keys, assigned scopes, and sliding-window rate limit tiers.",
    scope: "admin"
  },
  {
    id: "get_subscriptions",
    category: "API & Subscription",
    method: "GET",
    path: "/api/v1/auth/subscriptions",
    title: "Check Gateways & Quotas",
    description: "Query current organization quota usage and active gateway subscriptions."
  }
];

export default function ApiTerminalModal({
  isOpen,
  onClose,
  initialEndpointId = "submit_analysis",
  recentSessionId = "",
  currentUser = null
}) {
  const [selectedEndpointId, setSelectedEndpointId] = useState(initialEndpointId);
  const [authType, setAuthType] = useState("jwt"); // "jwt" | "api_key" | "extension" | "none"
  const [customApiKey, setCustomApiKey] = useState("bg_live_email_gateway_default");
  const [customClientSecret, setCustomClientSecret] = useState("");
  const [customExtToken, setCustomExtToken] = useState("");
  const [jwtToken, setJwtToken] = useState(() => localStorage.getItem("bg_jwt_token") || "");

  // Request state
  const [pathParamValues, setPathParamValues] = useState({});
  const [queryParamValues, setQueryParamValues] = useState({});
  const [requestBodyText, setRequestBodyText] = useState("");
  const [bodyParseError, setBodyParseError] = useState("");

  // Response state
  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState(null);
  const [responseStatusText, setResponseStatusText] = useState("");
  const [responseTimeMs, setResponseTimeMs] = useState(null);
  const [responseHeaders, setResponseHeaders] = useState({});
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [responseBodyText, setResponseBodyText] = useState("");
  const [rawResponseSize, setRawResponseSize] = useState(0);

  // UI state
  const [activeTab, setActiveTab] = useState("response"); // "response" | "headers" | "curl"
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [history, setHistory] = useState([]);
  const [filterQuery, setFilterQuery] = useState("");

  const abortControllerRef = useRef(null);

  // Auto-select endpoint definition
  const currentEndpoint = useMemo(() => {
    return ENDPOINT_DEFINITIONS.find((ep) => ep.id === selectedEndpointId) || ENDPOINT_DEFINITIONS[0];
  }, [selectedEndpointId]);

  // Sync endpoint defaults when selection changes
  useEffect(() => {
    if (!currentEndpoint) return;

    // Reset path params
    const initialPaths = {};
    if (currentEndpoint.pathParams) {
      currentEndpoint.pathParams.forEach((p) => {
        initialPaths[p.key] = recentSessionId || p.value || "session_demo";
      });
    }
    setPathParamValues(initialPaths);

    // Reset query params
    const initialQueries = {};
    if (currentEndpoint.queryParams) {
      currentEndpoint.queryParams.forEach((q) => {
        initialQueries[q.key] = q.value || "";
      });
    }
    setQueryParamValues(initialQueries);

    // Reset body
    if (currentEndpoint.hasBody) {
      setRequestBodyText(currentEndpoint.defaultBody || "{}");
    } else {
      setRequestBodyText("");
    }
    setBodyParseError("");
  }, [currentEndpoint, recentSessionId]);

  // Sync token from localStorage or user
  useEffect(() => {
    const savedJwt = localStorage.getItem("bg_jwt_token");
    if (savedJwt) setJwtToken(savedJwt);

    if (currentUser?.extensionToken) {
      setCustomExtToken(currentUser.extensionToken);
    } else {
      setCustomExtToken("bg_ext_admin_live_token_777");
    }
  }, [currentUser, isOpen]);

  // Compute final Request URL
  const computedUrl = useMemo(() => {
    let p = currentEndpoint.path;
    if (currentEndpoint.pathParams) {
      currentEndpoint.pathParams.forEach((param) => {
        const val = pathParamValues[param.key] || `{${param.key}}`;
        p = p.replace(`{${param.key}}`, encodeURIComponent(val));
      });
    }

    const queryParts = [];
    if (currentEndpoint.queryParams) {
      currentEndpoint.queryParams.forEach((q) => {
        const val = queryParamValues[q.key];
        if (val && val.trim() !== "") {
          queryParts.push(`${encodeURIComponent(q.key)}=${encodeURIComponent(val.trim())}`);
        }
      });
    }

    if (queryParts.length > 0) {
      p += `?${queryParts.join("&")}`;
    }
    return p;
  }, [currentEndpoint, pathParamValues, queryParamValues]);

  // Compute Request Headers
  const computedHeaders = useMemo(() => {
    const headers = {};
    if (currentEndpoint.hasBody) {
      headers["Content-Type"] = "application/json";
    }

    if (authType === "jwt" && jwtToken) {
      headers["Authorization"] = `Bearer ${jwtToken}`;
    } else if (authType === "api_key") {
      if (customApiKey) headers["X-API-Key"] = customApiKey;
      if (customClientSecret) headers["X-Client-Secret"] = customClientSecret;
    } else if (authType === "extension" && customExtToken) {
      headers["X-Extension-Token"] = customExtToken;
    }

    return headers;
  }, [currentEndpoint, authType, jwtToken, customApiKey, customClientSecret, customExtToken]);

  // Generate cURL command string
  const generatedCurl = useMemo(() => {
    const host = window.location.origin || "http://localhost:3000";
    let cmd = `curl -X ${currentEndpoint.method} "${host}${computedUrl}"`;

    Object.entries(computedHeaders).forEach(([k, v]) => {
      cmd += ` \\\n  -H "${k}: ${v}"`;
    });

    if (currentEndpoint.hasBody && requestBodyText.trim()) {
      try {
        const minified = JSON.stringify(JSON.parse(requestBodyText));
        cmd += ` \\\n  -d '${minified}'`;
      } catch {
        cmd += ` \\\n  -d '${requestBodyText.replace(/\n/g, "")}'`;
      }
    }

    return cmd;
  }, [currentEndpoint, computedUrl, computedHeaders, requestBodyText]);

  // Execute API Request
  const handleExecuteRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseStatusText("");
    setResponseBodyText("");
    setResponseHeaders({});
    setRateLimitInfo(null);
    setRawResponseSize(0);
    setActiveTab("response");

    // Validate body if applicable
    if (currentEndpoint.hasBody) {
      try {
        JSON.parse(requestBodyText);
        setBodyParseError("");
      } catch (err) {
        setBodyParseError(`Invalid JSON in request payload: ${err.message}`);
        setIsLoading(false);
        return;
      }
    }

    const startTime = performance.now();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const fetchOptions = {
        method: currentEndpoint.method,
        headers: computedHeaders,
        signal: controller.signal
      };

      if (currentEndpoint.hasBody && requestBodyText.trim()) {
        fetchOptions.body = requestBodyText;
      }

      const res = await fetch(computedUrl, fetchOptions);
      const elapsed = Math.round(performance.now() - startTime);
      setResponseTimeMs(elapsed);
      setResponseStatus(res.status);
      setResponseStatusText(res.statusText || `${res.status}`);

      // Extract Headers
      const headerObj = {};
      res.headers.forEach((val, key) => {
        headerObj[key] = val;
      });
      setResponseHeaders(headerObj);

      // Extract Rate Limiting telemetry
      const limit = res.headers.get("x-ratelimit-limit");
      const remaining = res.headers.get("x-ratelimit-remaining");
      const reset = res.headers.get("x-ratelimit-reset");
      const retryAfter = res.headers.get("retry-after");

      if (limit || remaining || retryAfter) {
        setRateLimitInfo({
          limit: limit ? parseInt(limit, 10) : null,
          remaining: remaining !== null ? parseInt(remaining, 10) : null,
          reset: reset ? parseInt(reset, 10) : null,
          retryAfter: retryAfter ? parseInt(retryAfter, 10) : null
        });
      }

      // Read Body
      const text = await res.text();
      setRawResponseSize(new Blob([text]).size);

      try {
        const json = JSON.parse(text);
        setResponseBodyText(JSON.stringify(json, null, 2));
      } catch {
        setResponseBodyText(text || "/* Empty Response Body */");
      }

      // Add to session history
      setHistory((prev) => [
        {
          id: Date.now(),
          method: currentEndpoint.method,
          path: computedUrl,
          status: res.status,
          timeMs: elapsed,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      setResponseTimeMs(elapsed);
      if (err.name === "AbortError") {
        setResponseStatus(0);
        setResponseStatusText("ABORTED");
        setResponseBodyText("Request cancelled by user.");
      } else {
        setResponseStatus(500);
        setResponseStatusText("CLIENT_NETWORK_ERROR");
        setResponseBodyText(`Failed to connect to host: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generatedCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(responseBodyText);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleDownloadResponse = () => {
    const blob = new Blob([responseBodyText], { type: "application/json" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `response_${currentEndpoint.id}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(u);
  };

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    if (!filterQuery.trim()) return ENDPOINT_DEFINITIONS;
    const q = filterQuery.toLowerCase();
    return ENDPOINT_DEFINITIONS.filter(
      (ep) =>
        ep.title.toLowerCase().includes(q) ||
        ep.path.toLowerCase().includes(q) ||
        ep.category.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div
        style={{
          width: "min(1360px, 98vw)",
          height: "min(92vh, 920px)",
          background: "#081022",
          border: "1px solid rgba(0, 172, 245, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 172, 245, 0.15)",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: "16px 24px",
            background: "#050b18",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "1.1rem",
                color: "#fff",
                boxShadow: "0 0 15px rgba(0, 172, 245, 0.4)"
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                  Interactive API & Gateway Test Terminal
                </h3>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(0, 172, 245, 0.15)",
                    color: "#38bdf8",
                    border: "1px solid rgba(0, 172, 245, 0.3)"
                  }}
                >
                  LIVE PLAYGROUND
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                Test and debug BrowseGuard Sandbox, Email Gateway, and OASIS STIX 2.1 feeds with live rate-limit telemetry.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={handleCopyCurl}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title="Copy cURL command to terminal"
            >
              <span>{copiedCurl ? "✓" : "📋"}</span>
              {copiedCurl ? "Copied cURL!" : "Copy as cURL"}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              title="Close Terminal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Body: 3-Column Studio Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 1fr", flex: 1, minHeight: 0 }}>
          {/* Column 1: Endpoint Catalog & Filter */}
          <div
            style={{
              background: "#060d1b",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0
            }}
          >
            {/* Filter Input */}
            <div style={{ padding: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <input
                type="text"
                placeholder="🔍 Search endpoints..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0c182e",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "0.82rem"
                }}
              />
            </div>

            {/* Endpoints List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {filteredEndpoints.map((ep) => {
                const isSelected = ep.id === currentEndpoint.id;
                const methodColor =
                  ep.method === "POST" ? "#10b981" : ep.method === "GET" ? "#00acf5" : "#ef4444";
                return (
                  <div
                    key={ep.id}
                    onClick={() => setSelectedEndpointId(ep.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      marginBottom: "6px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(0, 172, 245, 0.12)" : "transparent",
                      border: isSelected
                        ? "1px solid rgba(0, 172, 245, 0.4)"
                        : "1px solid transparent",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "2px 5px",
                          borderRadius: "4px",
                          background: `${methodColor}22`,
                          color: methodColor,
                          border: `1px solid ${methodColor}44`,
                          fontFamily: "monospace"
                        }}
                      >
                        {ep.method}
                      </span>
                      <span
                        style={{
                          fontSize: "0.83rem",
                          fontWeight: isSelected ? 750 : 600,
                          color: isSelected ? "#fff" : "#cbd5e1",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {ep.title}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#64748b",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {ep.path}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Session History */}
            {history.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "10px",
                  background: "#040914"
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>
                  RECENT RUNS ({history.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "120px", overflowY: "auto" }}>
                  {history.map((h) => {
                    const statusColor = h.status >= 200 && h.status < 300 ? "#10b981" : h.status === 429 ? "#ef4444" : "#f59e0b";
                    return (
                      <div
                        key={h.id}
                        style={{
                          fontSize: "0.72rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "4px 6px",
                          background: "rgba(255, 255, 255, 0.03)",
                          borderRadius: "4px"
                        }}
                      >
                        <span style={{ color: statusColor, fontWeight: 750, fontFamily: "monospace" }}>
                          {h.status || "ERR"}
                        </span>
                        <span style={{ color: "#94a3b8", fontFamily: "monospace", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {h.path}
                        </span>
                        <span style={{ color: "#64748b" }}>{h.timeMs}ms</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Request Composer & Auth Configuration */}
          <div
            style={{
              background: "#091325",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflowY: "auto",
              padding: "20px"
            }}
          >
            {/* Endpoint Summary Card */}
            <div
              style={{
                background: "#0d1a33",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "16px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    padding: "3px 6px",
                    borderRadius: "4px",
                    background:
                      currentEndpoint.method === "POST"
                        ? "#10b98122"
                        : currentEndpoint.method === "GET"
                        ? "#00acf522"
                        : "#ef444422",
                    color:
                      currentEndpoint.method === "POST"
                        ? "#10b981"
                        : currentEndpoint.method === "GET"
                        ? "#00acf5"
                        : "#ef4444",
                    fontFamily: "monospace"
                  }}
                >
                  {currentEndpoint.method}
                </span>
                <span style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                  {currentEndpoint.title}
                </span>
                {currentEndpoint.scope && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(147, 51, 234, 0.2)",
                      color: "#c084fc",
                      border: "1px solid rgba(147, 51, 234, 0.4)",
                      marginLeft: "auto",
                      fontWeight: 700
                    }}
                  >
                    Scope: {currentEndpoint.scope}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.4 }}>
                {currentEndpoint.description}
              </div>
              <div
                style={{
                  marginTop: "8px",
                  padding: "6px 10px",
                  background: "#060d1b",
                  borderRadius: "5px",
                  fontSize: "0.78rem",
                  fontFamily: "monospace",
                  color: "#38bdf8",
                  wordBreak: "break-all"
                }}
              >
                {computedUrl}
              </div>
            </div>

            {/* Authentication Mode Switcher */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                🔑 AUTHENTICATION CREDENTIALS
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "10px" }}>
                {[
                  { id: "jwt", label: "User JWT" },
                  { id: "api_key", label: "API Key + Secret" },
                  { id: "extension", label: "Extension" },
                  { id: "none", label: "No Auth" }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAuthType(m.id)}
                    style={{
                      padding: "6px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: authType === m.id ? 750 : 500,
                      background: authType === m.id ? "rgba(0, 172, 245, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: authType === m.id ? "#00acf5" : "#94a3b8",
                      border: authType === m.id ? "1px solid rgba(0, 172, 245, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Sub-inputs based on Auth Type */}
              {authType === "jwt" && (
                <div>
                  <input
                    type="text"
                    value={jwtToken}
                    onChange={(e) => setJwtToken(e.target.value)}
                    placeholder="Bearer JWT Token..."
                    style={{
                      width: "100%",
                      background: "#0c182e",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#fff",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "0.76rem",
                      fontFamily: "monospace"
                    }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px", display: "block" }}>
                    Sent via header: <code>Authorization: Bearer &lt;token&gt;</code>
                  </span>
                </div>
              )}

              {authType === "api_key" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <input
                      type="text"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="X-API-Key (e.g. bg_live_...)"
                      style={{
                        width: "100%",
                        background: "#0c182e",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                        fontFamily: "monospace"
                      }}
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={customClientSecret}
                      onChange={(e) => setCustomClientSecret(e.target.value)}
                      placeholder="X-Client-Secret (bcrypt verified, optional for legacy keys)"
                      style={{
                        width: "100%",
                        background: "#0c182e",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                        fontFamily: "monospace"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                    Supports <code>X-API-Key</code> + <code>X-Client-Secret</code> and HTTP Basic Auth.
                  </span>
                </div>
              )}

              {authType === "extension" && (
                <div>
                  <input
                    type="text"
                    value={customExtToken}
                    onChange={(e) => setCustomExtToken(e.target.value)}
                    placeholder="X-Extension-Token (bg_ext_...)"
                    style={{
                      width: "100%",
                      background: "#0c182e",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#fff",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "0.76rem",
                      fontFamily: "monospace"
                    }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px", display: "block" }}>
                    Sent via header: <code>X-Extension-Token: &lt;token&gt;</code>
                  </span>
                </div>
              )}
            </div>

            {/* Path Parameters (if any) */}
            {currentEndpoint.pathParams && currentEndpoint.pathParams.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  📌 PATH PARAMETERS
                </label>
                {currentEndpoint.pathParams.map((p) => (
                  <div key={p.key} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.76rem", color: "#38bdf8", fontFamily: "monospace", width: "60px" }}>
                      :{p.key}
                    </span>
                    <input
                      type="text"
                      value={pathParamValues[p.key] || ""}
                      onChange={(e) =>
                        setPathParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                      }
                      placeholder={p.placeholder}
                      style={{
                        flex: 1,
                        background: "#0c182e",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                        fontFamily: "monospace"
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Query Parameters (if any) */}
            {currentEndpoint.queryParams && currentEndpoint.queryParams.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
                  🔎 QUERY PARAMETERS
                </label>
                {currentEndpoint.queryParams.map((q) => (
                  <div key={q.key} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.76rem", color: "#cbd5e1", fontFamily: "monospace", width: "80px" }}>
                      {q.key}:
                    </span>
                    <input
                      type="text"
                      value={queryParamValues[q.key] || ""}
                      onChange={(e) =>
                        setQueryParamValues((prev) => ({ ...prev, [q.key]: e.target.value }))
                      }
                      placeholder={q.placeholder}
                      style={{
                        flex: 1,
                        background: "#0c182e",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                        fontFamily: "monospace"
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Request Body Editor (if hasBody) */}
            {currentEndpoint.hasBody && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "220px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#cbd5e1" }}>
                    📝 REQUEST BODY (JSON)
                  </label>
                  {/* Presets dropdown/pills */}
                  {currentEndpoint.presets && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      {currentEndpoint.presets.map((pr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setRequestBodyText(JSON.stringify(pr.body, null, 2))}
                          style={{
                            fontSize: "0.68rem",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#94a3b8",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                          title={`Load preset: ${pr.name}`}
                        >
                          {pr.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <textarea
                  value={requestBodyText}
                  onChange={(e) => setRequestBodyText(e.target.value)}
                  style={{
                    flex: 1,
                    minHeight: "180px",
                    background: "#050b18",
                    border: bodyParseError ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.78rem",
                    padding: "10px",
                    lineHeight: 1.45,
                    resize: "vertical"
                  }}
                  spellCheck={false}
                />
                {bodyParseError && (
                  <div style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "4px" }}>
                    ⚠️ {bodyParseError}
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: "flex", gap: "10px", marginTop: "auto", paddingTop: "12px" }}>
              <button
                type="button"
                onClick={handleExecuteRequest}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #00acf5 0%, #0284c7 100%)",
                  border: "none",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 0 20px rgba(0, 172, 245, 0.35)",
                  cursor: isLoading ? "wait" : "pointer"
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                    Executing Request...
                  </>
                ) : (
                  <>
                    <span>⚡</span> Send {currentEndpoint.method} Request
                  </>
                )}
              </button>

              {isLoading && (
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Column 3: Live Response Console & Telemetry */}
          <div
            style={{
              background: "#060d1b",
              display: "flex",
              flexDirection: "column",
              minHeight: 0
            }}
          >
            {/* Console Tabs & Status Header */}
            <div
              style={{
                padding: "12px 16px",
                background: "#040914",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px"
              }}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "response", label: "Response Body" },
                  { id: "headers", label: "Headers" },
                  { id: "curl", label: "cURL Generator" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      background: activeTab === t.id ? "rgba(0, 172, 245, 0.15)" : "transparent",
                      border: activeTab === t.id ? "1px solid rgba(0, 172, 245, 0.4)" : "1px solid transparent",
                      color: activeTab === t.id ? "#00acf5" : "#94a3b8",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: activeTab === t.id ? 750 : 600,
                      cursor: "pointer"
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {responseStatus !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background:
                        responseStatus >= 200 && responseStatus < 300
                          ? "rgba(16, 185, 129, 0.2)"
                          : responseStatus === 429
                          ? "rgba(239, 68, 68, 0.25)"
                          : "rgba(245, 158, 11, 0.2)",
                      color:
                        responseStatus >= 200 && responseStatus < 300
                          ? "#10b981"
                          : responseStatus === 429
                          ? "#ef4444"
                          : "#f59e0b",
                      border:
                        responseStatus >= 200 && responseStatus < 300
                          ? "1px solid rgba(16, 185, 129, 0.4)"
                          : "1px solid rgba(239, 68, 68, 0.4)",
                      fontFamily: "monospace"
                    }}
                  >
                    {responseStatus} {responseStatusText}
                  </span>
                  {responseTimeMs !== null && (
                    <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                      ⏱️ {responseTimeMs}ms
                    </span>
                  )}
                  {rawResponseSize > 0 && (
                    <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                      📦 {(rawResponseSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Sliding-Window Rate Limit Visualizer Badge (if available) */}
            {rateLimitInfo && (
              <div
                style={{
                  padding: "8px 16px",
                  background: "rgba(0, 172, 245, 0.05)",
                  borderBottom: "1px solid rgba(0, 172, 245, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  color: "#cbd5e1"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                    🛡️ Sliding-Window Rate Limit:
                  </span>
                  <span>
                    <strong>{rateLimitInfo.remaining}</strong> / {rateLimitInfo.limit} calls left
                  </span>
                  {/* Gauge bar */}
                  {rateLimitInfo.limit && (
                    <div
                      style={{
                        width: "80px",
                        height: "6px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "3px",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, (rateLimitInfo.remaining / rateLimitInfo.limit) * 100))}%`,
                          height: "100%",
                          background:
                            rateLimitInfo.remaining < 5 ? "#ef4444" : "#10b981",
                          borderRadius: "3px"
                        }}
                      />
                    </div>
                  )}
                </div>

                {rateLimitInfo.reset && (
                  <span style={{ color: "#64748b", fontSize: "0.7rem", fontFamily: "monospace" }}>
                    Resets in: ~{Math.max(0, rateLimitInfo.reset - Math.floor(Date.now() / 1000))}s
                  </span>
                )}
                {rateLimitInfo.retryAfter && (
                  <span style={{ color: "#f87171", fontSize: "0.7rem", fontWeight: 700 }}>
                    ⚠️ Retry-After: {rateLimitInfo.retryAfter}s
                  </span>
                )}
              </div>
            )}

            {/* Tab 1: Response Body Content */}
            {activeTab === "response" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div
                  style={{
                    padding: "8px 16px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    background: "rgba(0, 0, 0, 0.2)"
                  }}
                >
                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    disabled={!responseBodyText}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#cbd5e1",
                      fontSize: "0.72rem",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    {copiedResponse ? "✓ Copied" : "📋 Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadResponse}
                    disabled={!responseBodyText}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#cbd5e1",
                      fontSize: "0.72rem",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    💾 Save JSON
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                  {isLoading ? (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        color: "#94a3b8"
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          border: "3px solid rgba(0, 172, 245, 0.2)",
                          borderTopColor: "#00acf5",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite"
                        }}
                      />
                      <span style={{ fontSize: "0.85rem" }}>
                        Waiting for server response from {currentEndpoint.path}...
                      </span>
                    </div>
                  ) : responseBodyText ? (
                    <pre
                      style={{
                        margin: 0,
                        color: "#f8fafc",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "0.76rem",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                      }}
                    >
                      {responseBodyText}
                    </pre>
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        color: "#475569",
                        textAlign: "center"
                      }}
                    >
                      <div style={{ fontSize: "2rem" }}>📡</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>No response yet</div>
                      <div style={{ fontSize: "0.76rem" }}>
                        Configure credentials and click "Send Request" to test live execution.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Response Headers Content */}
            {activeTab === "headers" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                {Object.keys(responseHeaders).length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px", color: "#94a3b8" }}>Header</th>
                        <th style={{ padding: "6px 8px", color: "#94a3b8" }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(responseHeaders).map(([k, v]) => (
                        <tr
                          key={k}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            fontFamily: "monospace"
                          }}
                        >
                          <td style={{ padding: "6px 8px", color: "#38bdf8", fontWeight: 700 }}>{k}</td>
                          <td style={{ padding: "6px 8px", color: "#cbd5e1", wordBreak: "break-all" }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ color: "#64748b", textAlign: "center", marginTop: "40px", fontSize: "0.82rem" }}>
                    Send a request to inspect server response headers.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Live cURL Generator Preview */}
            {activeTab === "curl" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "8px" }}>
                  Copy this production-ready command to execute from bash, PowerShell, or automated CI/CD scripts:
                </div>
                <pre
                  style={{
                    background: "#030712",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "14px",
                    margin: 0,
                    color: "#a7f3d0",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.76rem",
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all"
                  }}
                >
                  {generatedCurl}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
