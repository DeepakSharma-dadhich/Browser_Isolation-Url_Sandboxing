/**
 * BrowseGuard Zero-Trust URL Shield - Background Service Worker (Manifest V3)
 * Implements multi-tiered sub-50ms reputation checks, instant whitelisting, and RBI routing.
 */

try {
  importScripts("whitelist.js");
} catch (e) {
  console.warn("[BrowseGuard] Could not import whitelist.js in worker:", e);
}

const DEFAULT_CONFIG = {
  apiUrl: "http://localhost:3000",
  dashboardUrl: "http://localhost:5173",
  apiKey: "bg_ext_admin_live_token_777",
  protectionMode: "WEBMAIL_ONLY", // "WEBMAIL_ONLY" (Default, zero lag) | "GLOBAL"
  enableWebmailShield: true,
  customWhitelist: [],
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
  } else {
    // Ensure all keys exist
    await chrome.storage.local.set({ config: { ...DEFAULT_CONFIG, ...stored.config } });
  }
  if (stored.threatStats) {
    threatStats = stored.threatStats;
  }
  console.log("[BrowseGuard Shield] Extension installed and initialized with Smart Whitelisting.");
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

function evaluateClientHeuristics(url) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port;
    const pathname = (parsed.pathname || "").toLowerCase();
    const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes("[");
    const executableExts = [".sh", ".bin", ".elf", ".exe", ".bat", ".ps1", ".apk", ".vbs", ".dll", ".scr", ".msi", ".iso", ".cmd", ".hta"];
    const hasExecutablePayload = executableExts.some((ext) => pathname.endsWith(ext) || pathname.includes(ext + "?") || pathname.includes(ext + "/"));
    const isAbnormalPort = port && port !== "80" && port !== "443";

    if (hasExecutablePayload) {
      return {
        verdict: "MALICIOUS",
        risk_score: 98,
        recommended_action: "BLOCK",
        reason: `Malware dropper payload detected (${pathname}): Direct execution of shell script or binary payload from untrusted host ${hostname}${port ? `:${port}` : ""}.`
      };
    }

    if (isIpHost) {
      const isMaliciousIp = isAbnormalPort;
      return {
        verdict: isMaliciousIp ? "MALICIOUS" : "SUSPICIOUS",
        risk_score: isMaliciousIp ? 95 : 75,
        recommended_action: isMaliciousIp ? "BLOCK" : "ISOLATE",
        reason: isMaliciousIp
          ? `High-risk botnet C2 / malware infrastructure: Raw IP address using non-standard high port (:${port}).`
          : "Raw IP address host navigation without domain reputation."
      };
    }

    if (parsed.username || parsed.password) {
      return {
        verdict: "MALICIOUS",
        risk_score: 95,
        recommended_action: "BLOCK",
        reason: "Deceptive credential userinfo in URL structure (@ symbol injection)."
      };
    }

    if (hostname.includes("xn--")) {
      return {
        verdict: "MALICIOUS",
        risk_score: 85,
        recommended_action: "BLOCK",
        reason: "Internationalized Domain Name (IDN) Punycode homoglyph detected."
      };
    }

    const brandChecks = [
      { brand: "paypal", legit: ["paypal.com", "paypal.me"] },
      { brand: "microsoft", legit: ["microsoft.com", "live.com", "office.com", "office365.com", "azure.com"] },
      { brand: "apple", legit: ["apple.com", "icloud.com"] },
      { brand: "netflix", legit: ["netflix.com"] }
    ];
    for (const b of brandChecks) {
      if (hostname.includes(b.brand)) {
        const isLegit = b.legit.some((legitDomain) => hostname === legitDomain || hostname.endsWith("." + legitDomain));
        if (!isLegit) {
          return {
            verdict: "MALICIOUS",
            risk_score: 92,
            recommended_action: "BLOCK",
            reason: `High-risk brand impersonation detected ('${b.brand}' mimicry on non-official domain '${hostname}').`
          };
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Ultra-fast (< 30ms) evaluation endpoint call with client-side heuristic preflight
 */
async function fastCheckThroughApi(url, config) {
  // Check memory cache
  const cached = urlCache.get(url);
  if (cached && Date.now() - cached.timestamp < config.cacheTtlMs) {
    return cached.data;
  }

  // 1. Check client-side instant whitelist before making network call
  const wl = typeof BrowseGuardWhitelist !== "undefined"
    ? BrowseGuardWhitelist
    : (typeof self !== "undefined" && self.BrowseGuardWhitelist ? self.BrowseGuardWhitelist : null);

  if (wl && wl.isInstantWhitelisted(url, config.customWhitelist)) {
    const safeResult = {
      verdict: "SAFE",
      risk_score: 0,
      bypass: true,
      reason: "Whitelisted trusted global domain."
    };
    urlCache.set(url, { timestamp: Date.now(), data: safeResult });
    return safeResult;
  }

  // 2. Pre-flight Client Heuristics (flags raw IPs with malware droppers, port anomalies, brand impersonation)
  const clientThreat = evaluateClientHeuristics(url);
  if (clientThreat) {
    const rbiUrl = `${(config.dashboardUrl || "http://localhost:5173").replace(/\/+$/, "")}/?isolate=${encodeURIComponent(url)}&ext_token=${encodeURIComponent(config.apiKey || "bg_ext_admin_live_token_777")}`;
    const threatResult = {
      ...clientThreat,
      bypass: false,
      rbi_url: rbiUrl,
      analysis_id: null
    };
    urlCache.set(url, { timestamp: Date.now(), data: threatResult });
    await recordStat(threatResult.verdict);
    return threatResult;
  }

  const endpoint = `${config.apiUrl.replace(/\/+$/, "")}/api/v1/extension/fast-check`;
  const authHeaders = config.apiKey?.startsWith("bg_ext_")
    ? { "X-Extension-Token": config.apiKey }
    : { "X-API-Key": config.apiKey || "bg_ext_admin_live_token_777" };

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify({ url })
    });

    if (resp.ok) {
      const json = await resp.json();
      const result = {
        verdict: json.verdict || "SAFE",
        risk_score: json.risk_score || 0,
        recommended_action: json.recommended_action || "ALLOW",
        bypass: json.bypass ?? (json.verdict === "SAFE"),
        reason: json.reason || "",
        rbi_url: json.rbi_url || `${(config.dashboardUrl || "http://localhost:5173").replace(/\/+$/, "")}/?isolate=${encodeURIComponent(url)}&ext_token=${encodeURIComponent(config.apiKey || "bg_ext_admin_live_token_777")}`,
        analysis_id: json.analysis_id || null
      };

      urlCache.set(url, { timestamp: Date.now(), data: result });
      await recordStat(result.verdict);
      return result;
    }
  } catch (err) {
    console.warn("[BrowseGuard] Fast-check API call failed:", err);
  }

  // If backend is offline, notify user accurately instead of falsely claiming dangerous links are safe
  const offlineRbiUrl = `${(config.dashboardUrl || "http://localhost:5173").replace(/\/+$/, "")}/?isolate=${encodeURIComponent(url)}&ext_token=${encodeURIComponent(config.apiKey || "bg_ext_admin_live_token_777")}`;
  return {
    verdict: "UNVERIFIED",
    risk_score: 50,
    recommended_action: "ISOLATE",
    bypass: false,
    reason: "Control Plane unreachable (localhost:3000 offline). Open in Isolated Browser for zero-risk inspection.",
    rbi_url: offlineRbiUrl,
    isOffline: true
  };
}

// Listen for messages from content scripts and popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_CONFIG") {
    (async () => {
      const config = await getConfig();
      sendResponse({ success: true, config });
    })();
    return true;
  }

  if (request.type === "FAST_CHECK_URL") {
    (async () => {
      try {
        const config = await getConfig();
        const result = await fastCheckThroughApi(request.url, config);
        sendResponse({ success: true, result, config });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
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
      const current = await getConfig();
      const updated = { ...current, ...(request.config || {}) };
      await chrome.storage.local.set({ config: updated });
      sendResponse({ success: true, config: updated });
    })();
    return true;
  }
});
