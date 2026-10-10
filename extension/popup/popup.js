document.addEventListener("DOMContentLoaded", async () => {
  const statScannedEl = document.getElementById("statScanned");
  const statBlockedEl = document.getElementById("statBlocked");
  const urlInputEl = document.getElementById("urlInput");
  const scanBtn = document.getElementById("scanBtn");
  const scanResultEl = document.getElementById("scanResult");
  const resultVerdictEl = document.getElementById("resultVerdict");
  const resultScoreEl = document.getElementById("resultScore");
  const resultActionEl = document.getElementById("resultAction");
  const resultLinkEl = document.getElementById("resultLink");

  // Fetch stats from background service worker
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
    if (response && response.stats) {
      statScannedEl.textContent = response.stats.scanned || 0;
      statBlockedEl.textContent = response.stats.blocked || 0;
    }
  });

  // Handle Quick Scan
  scanBtn.addEventListener("click", async () => {
    const rawUrl = urlInputEl.value.trim();
    if (!rawUrl) return;

    let targetUrl = rawUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";
    scanResultEl.classList.add("hidden");

    chrome.runtime.sendMessage(
      { type: "CHECK_URL", url: targetUrl },
      (response) => {
        scanBtn.disabled = false;
        scanBtn.textContent = "Scan";

        if (!response || !response.success) {
          alert("Scan failed: " + (response?.error || "Network error"));
          return;
        }

        const res = response.result;
        const config = response.config;

        scanResultEl.classList.remove("hidden");
        resultVerdictEl.textContent = res.verdict || "UNKNOWN";
        resultScoreEl.textContent = `Score: ${res.risk_score || 0}/100`;
        resultActionEl.textContent = `Action: ${res.recommended_action || "REVIEW"}`;

        resultVerdictEl.className = "result-badge";
        if (res.verdict === "MALICIOUS" || res.risk_score >= 80) {
          resultVerdictEl.classList.add("badge-malicious");
        } else if (res.verdict === "SUSPICIOUS" || res.risk_score >= 40) {
          resultVerdictEl.classList.add("badge-suspicious");
        } else {
          resultVerdictEl.classList.add("badge-safe");
        }

        resultLinkEl.href = `${config.apiUrl.replace(/\/+$/, "")}/api/v1/analyses/${res.analysis_id}`;

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
});
