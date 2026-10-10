/**
 * BrowseGuard Zero-Trust URL Shield - Background Service Worker (Manifest V3)
 */

const DEFAULT_CONFIG = {
  apiUrl: "http://localhost:3000",
  apiKey: "bg_live_email_gateway_default",
  enableWebmailShield: true,
  enableAllSites: false,
  quarantineThreshold: 60, // Risk score >= 60 triggers warning modal
  cacheTtlMs: 300000 // 5 minutes cache
};

// In-memory cache for fast lookups
const urlCache = new Map();
let threatStats = {
  scanned: 0,
  blocked: 0,
  safe: 0
};

// Load saved configuration and stats from storage
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["config", "threatStats"]);
  if (!stored.config) {
    await chrome.storage.local.set({ config: DEFAULT_CONFIG });
  }
  if (stored.threatStats) {
    threatStats = stored.threatStats;
  }
  console.log("[BrowseGuard Shield] Extension installed and initialized.");
});

async function getConfig() {
  const stored = await chrome.storage.local.get("config");
  return { ...DEFAULT_CONFIG, ...(stored.config || {}) };
}

async function recordStat(verdict) {
  threatStats.scanned++;
  if (["MALICIOUS", "HIGH_RISK"].includes(verdict)) {
    threatStats.blocked++;
  } else {
    threatStats.safe++;
  }
  await chrome.storage.local.set({ threatStats });
}

/**
 * Perform URL threat analysis via BrowseGuard API v1
 */
async function analyzeUrlThroughApi(url, config) {
  // Check memory cache
  const cached = urlCache.get(url);
  if (cached && Date.now() - cached.timestamp < config.cacheTtlMs) {
    return cached.data;
  }

  const endpoint = `${config.apiUrl.replace(/\/+$/, "")}/api/v1/analyses`;
  
  const authHeaders = config.apiKey?.startsWith("bg_ext_")
    ? { "X-Extension-Token": config.apiKey }
    : { "X-API-Key": config.apiKey || "bg_live_email_gateway_default" };

  // Submit analysis job
  const submitResp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      url,
      source: "BROWSER_EXTENSION",
      scan_options: {
        trigger: "extension_click_interception"
      }
    })
  });

  if (!submitResp.ok) {
    throw new Error(`BrowseGuard API returned HTTP ${submitResp.status}`);
  }

  const submitJson = await submitResp.json();
  const analysisId = submitJson?.data?.analysis_id;
  if (!analysisId) {
    throw new Error("Missing analysis_id from BrowseGuard response");
  }

  // Poll for status (max 15 seconds)
  const statusEndpoint = `${config.apiUrl.replace(/\/+$/, "")}/api/v1/analyses/${analysisId}/status`;
  const startTime = Date.now();
  let result = null;

  while (Date.now() - startTime < 15000) {
    await new Promise((res) => setTimeout(res, 1200));

    const pollResp = await fetch(statusEndpoint, {
      headers: authHeaders
    });

    if (pollResp.ok) {
      const pollJson = await pollResp.json();
      if (pollJson.data?.report_ready) {
        result = pollJson.data;
        break;
      }
    }
  }

  if (!result) {
    // If timed out, return fallback status
    result = {
      analysis_id: analysisId,
      status: "TIMEOUT",
      verdict: "SUSPICIOUS",
      recommended_action: "ISOLATE",
      risk_score: 50,
      risk_level: "moderate",
      allow_user_access: false
    };
  }

  // Update cache & stats
  urlCache.set(url, { timestamp: Date.now(), data: result });
  await recordStat(result.verdict);

  return result;
}

// Listen for messages from content scripts and popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CHECK_URL") {
    (async () => {
      try {
        const config = await getConfig();
        const result = await analyzeUrlThroughApi(request.url, config);
        sendResponse({ success: true, result, config });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep sendResponse channel open for async response
  }

  if (request.type === "GET_STATS") {
    (async () => {
      const stored = await chrome.storage.local.get(["threatStats", "config"]);
      sendResponse({
        stats: stored.threatStats || threatStats,
        config: stored.config || DEFAULT_CONFIG
      });
    })();
    return true;
  }

  if (request.type === "UPDATE_CONFIG") {
    (async () => {
      await chrome.storage.local.set({ config: request.config });
      sendResponse({ success: true });
    })();
    return true;
  }
});
