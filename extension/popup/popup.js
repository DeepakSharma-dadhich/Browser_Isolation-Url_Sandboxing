document.addEventListener("DOMContentLoaded", async () => {
  const statScannedEl = document.getElementById("statScanned");
  const statBlockedEl = document.getElementById("statBlocked");
  const urlInputEl = document.getElementById("urlInput");
  const scanBtn = document.getElementById("scanBtn");
  const scanResultEl = document.getElementById("scanResult");
  const resultVerdictEl = document.getElementById("resultVerdict");
  const resultScoreEl = document.getElementById("resultScore");
  const resultActionEl = document.getElementById("resultAction");
  const resultReasonEl = document.getElementById("resultReason");
  const resultLinkEl = document.getElementById("resultLink");
  const resultRbiLinkEl = document.getElementById("resultRbiLink");
  const modeLabelEl = document.getElementById("modeLabel");
  const toggleModeBtn = document.getElementById("toggleModeBtn");
  const offlineBannerEl = document.getElementById("offlineBanner");

  let currentConfig = {
    protectionMode: "WEBMAIL_ONLY",
    apiUrl: "http://localhost:3000",
    dashboardUrl: "http://localhost:5173"
  };

  function renderMode(mode) {
    if (mode === "GLOBAL") {
      modeLabelEl.textContent = "🌐 Global Shield (All Sites)";
      modeLabelEl.style.color = "#a855f7";
    } else {
      modeLabelEl.textContent = "📧 Webmail Shield (0ms Lag)";
      modeLabelEl.style.color = "#38bdf8";
    }
  }

  // Fetch stats and config from background service worker
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
    if (response) {
      if (response.stats) {
        statScannedEl.textContent = response.stats.scanned || 0;
        statBlockedEl.textContent = response.stats.blocked || 0;
      }
      if (response.config) {
        currentConfig = response.config;
        renderMode(currentConfig.protectionMode);

        // Ping backend health
        const apiUrl = currentConfig.apiUrl || "http://localhost:3000";
        fetch(`${apiUrl}/api/v1/extension/verify`, {
          headers: { "X-Extension-Token": currentConfig.apiKey || "bg_ext_admin_live_token_777" }
        })
          .then((r) => {
            const shieldStatus = document.getElementById("shieldStatus");
            if (shieldStatus) {
              if (r.ok) {
                shieldStatus.innerHTML = '<span class="status-dot" style="background:#10b981;"></span> ACTIVE';
                if (offlineBannerEl) offlineBannerEl.style.display = "none";
              } else {
                shieldStatus.innerHTML = '<span class="status-dot" style="background:#f59e0b;"></span> UNPAIRED';
              }
            }
          })
          .catch(() => {
            const shieldStatus = document.getElementById("shieldStatus");
            if (shieldStatus) {
              shieldStatus.innerHTML = '<span class="status-dot" style="background:#ef4444;"></span> OFFLINE';
              if (offlineBannerEl) offlineBannerEl.style.display = "block";
            }
          });
      }
    }
  });

  // Toggle Mode button
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener("click", () => {
      const newMode = currentConfig.protectionMode === "GLOBAL" ? "WEBMAIL_ONLY" : "GLOBAL";
      currentConfig.protectionMode = newMode;
      renderMode(newMode);

      chrome.runtime.sendMessage({
        type: "UPDATE_CONFIG",
        config: { protectionMode: newMode }
      });
    });
  }

  // Handle Quick Scan using sub-30ms fast-check
  scanBtn.addEventListener("click", async () => {
    const rawUrl = urlInputEl.value.trim();
    if (!rawUrl) return;

    let targetUrl = rawUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    scanBtn.disabled = true;
    scanBtn.textContent = "Checking...";
    scanResultEl.classList.add("hidden");
    resultRbiLinkEl.classList.add("hidden");

    chrome.runtime.sendMessage(
      { type: "FAST_CHECK_URL", url: targetUrl },
      (response) => {
        scanBtn.disabled = false;
        scanBtn.textContent = "Scan";

        if (!response || !response.success) {
          alert("Scan failed: " + (response?.error || "Network error"));
          return;
        }

        const res = response.result;
        const config = response.config || currentConfig;

        scanResultEl.classList.remove("hidden");
        resultVerdictEl.textContent = res.verdict || "UNKNOWN";
        resultScoreEl.textContent = `Score: ${res.risk_score || 0}/100`;
        resultActionEl.textContent = `Action: ${res.recommended_action || (res.verdict === "SAFE" ? "ALLOW" : "ISOLATE")}`;

        if (resultReasonEl) {
          resultReasonEl.textContent = res.reason || "";
        }

        if (offlineBannerEl) {
          offlineBannerEl.style.display = res.isOffline ? "block" : "none";
        }

        resultVerdictEl.className = "result-badge";
        if (res.verdict === "MALICIOUS" || res.risk_score >= 80) {
          resultVerdictEl.classList.add("badge-malicious");
        } else if (res.verdict === "SUSPICIOUS" || res.risk_score >= 40) {
          resultVerdictEl.classList.add("badge-suspicious");
        } else if (res.isOffline || res.verdict === "UNVERIFIED") {
          resultVerdictEl.classList.add("badge-suspicious");
        } else {
          resultVerdictEl.classList.add("badge-safe");
        }

        const dashboardBase = config.dashboardUrl || "http://localhost:5173";
        if (res.analysis_id) {
          resultLinkEl.href = `${dashboardBase.replace(/\/+$/, "")}/?session=${res.analysis_id}`;
        } else {
          resultLinkEl.href = `${dashboardBase.replace(/\/+$/, "")}/`;
        }

        const rbiUrl = res.rbi_url || `${dashboardBase.replace(/\/+$/, "")}/?isolate=${encodeURIComponent(targetUrl)}&ext_token=${encodeURIComponent(config.apiKey || "bg_ext_admin_live_token_777")}`;
        resultRbiLinkEl.href = rbiUrl;
        resultRbiLinkEl.classList.remove("hidden");

        // Increment stats display
        statScannedEl.textContent = Number(statScannedEl.textContent || 0) + 1;
        if (["MALICIOUS", "HIGH_RISK"].includes(res.verdict)) {
          statBlockedEl.textContent = Number(statBlockedEl.textContent || 0) + 1;
        }
      }
    );
  });

  urlInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      scanBtn.click();
    }
  });

  // Bulletproof tab opening from extension popup
  resultRbiLinkEl.addEventListener("click", (e) => {
    e.preventDefault();
    const href = resultRbiLinkEl.getAttribute("href");
    if (href && href !== "#") {
      chrome.tabs.create({ url: href });
    }
  });

  resultLinkEl.addEventListener("click", (e) => {
    e.preventDefault();
    const href = resultLinkEl.getAttribute("href");
    if (href && href !== "#") {
      chrome.tabs.create({ url: href });
    }
  });

  document.querySelectorAll(".footer-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const href = link.getAttribute("href") || "";
      if (href.includes("options.html")) {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html") });
        }
      } else if (href.startsWith("http")) {
        chrome.tabs.create({ url: href });
      }
    });
  });
});
