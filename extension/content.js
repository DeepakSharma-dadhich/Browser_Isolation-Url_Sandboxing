/**
 * BrowseGuard Zero-Trust URL Shield - Content Script
 * Intercepts untrusted link clicks in webmail & chat, analyzing them in real-time.
 * Safe and whitelisted domains bypass instantly with 0ms delay.
 */

(function () {
  "use strict";

  // Prevent multiple injections
  if (window.__browseguard_shield_injected) return;
  window.__browseguard_shield_injected = true;

  let activeToast = null;
  let activeModal = null;
  let cachedConfig = {
    protectionMode: "WEBMAIL_ONLY", // "WEBMAIL_ONLY" (Default, zero browsing delay) | "GLOBAL"
    enableWebmailShield: true,
    customWhitelist: [],
    quarantineThreshold: 60,
    apiUrl: "http://localhost:3000",
    dashboardUrl: "http://localhost:5173"
  };

  // Sync initial config from background worker and listen for live changes
  try {
    chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (response) => {
      if (response && response.config) {
        cachedConfig = { ...cachedConfig, ...response.config };
      }
    });

    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.config && changes.config.newValue) {
          cachedConfig = { ...cachedConfig, ...changes.config.newValue };
        }
      });
    }
  } catch (err) {
    // Non-blocking
  }

  function showScanningToast(url) {
    removeScanningToast();
    const toast = document.createElement("div");
    toast.className = "bg-scan-toast";
    toast.innerHTML = `
      <div class="bg-spinner"></div>
      <div>
        <div style="font-weight: 600; color: #00e5ff;">BrowseGuard Link Shield</div>
        <div style="color: #94a3b8; font-size: 11px;">Verifying destination in sub-50ms reputation cache...</div>
      </div>
    `;
    document.body.appendChild(toast);
    activeToast = toast;
  }

  function removeScanningToast() {
    if (activeToast && activeToast.parentNode) {
      activeToast.parentNode.removeChild(activeToast);
      activeToast = null;
    }
  }

  function showThreatModal(url, threatResult, config) {
    removeScanningToast();
    if (activeModal && activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
    }

    const isMalicious = threatResult.verdict === "MALICIOUS" || (threatResult.risk_score || 0) >= 80;
    const badgeClass = isMalicious ? "bg-badge-malicious" : "bg-badge-suspicious";
    const iconClass = isMalicious ? "bg-icon-malicious" : "bg-icon-suspicious";
    const titleText = isMalicious ? "Malicious Phishing Link Blocked" : "Suspicious Link Detected";
    const scoreText = `Risk Score: ${threatResult.risk_score || 75}/100`;

    const dashboardBase = config.dashboardUrl || "http://localhost:5173";
    const rbiUrl = threatResult.rbi_url || `${dashboardBase.replace(/\/+$/, "")}/?isolate=${encodeURIComponent(url)}`;
    const forensicUrl = threatResult.analysis_id
      ? `${dashboardBase.replace(/\/+$/, "")}/?session=${threatResult.analysis_id}`
      : `${dashboardBase.replace(/\/+$/, "")}/`;

    const modal = document.createElement("div");
    modal.className = "bg-modal-overlay";
    modal.innerHTML = `
      <div class="bg-modal-card">
        <div class="bg-modal-header">
          <div class="bg-modal-icon ${iconClass}">🛡️</div>
          <div>
            <h3 class="bg-modal-title">${titleText}</h3>
            <p class="bg-modal-subtitle">BrowseGuard Zero-Trust Shield prevented potential credential compromise.</p>
          </div>
        </div>

        <div class="bg-threat-badge ${badgeClass}">
          ● ${threatResult.verdict || "SUSPICIOUS"} • ${scoreText}
        </div>

        <div class="bg-url-box">${escapeHtml(url)}</div>

        <div class="bg-details-box">
          <strong>Recommended Action:</strong> ${threatResult.recommended_action || "ISOLATE"}<br>
          ${escapeHtml(threatResult.reason || "This link exhibits deceptive indicators, high-risk TLDs, IP hosting, or known phishing signatures.")}
        </div>

        <div class="bg-btn-group">
          <a class="bg-btn-rbi" id="bg-rbi-btn" href="${rbiUrl}" target="_blank" rel="noopener noreferrer">
            ⚡ Open in Isolated Browser (Zero Risk)
          </a>
          <button class="bg-btn-primary" id="bg-abort-btn">Abort & Close (Recommended)</button>
          <a class="bg-btn-secondary" href="${forensicUrl}" target="_blank" rel="noopener noreferrer">
            Inspect Canonical Forensic Report
          </a>
          <div class="bg-bypass-link" id="bg-bypass-link">Proceed anyway (Unsafe local execution)</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    activeModal = modal;

    // Action handlers
    modal.querySelector("#bg-rbi-btn").addEventListener("click", () => {
      modal.remove();
      activeModal = null;
    });

    modal.querySelector("#bg-abort-btn").addEventListener("click", () => {
      modal.remove();
      activeModal = null;
    });

    modal.querySelector("#bg-bypass-link").addEventListener("click", () => {
      modal.remove();
      activeModal = null;
      window.location.href = url;
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Intercept clicks on links
  document.addEventListener(
    "click",
    function (e) {
      // 0. DO NOT intercept clicks inside BrowseGuard's own modal or toast!
      if (e.target.closest(".bg-modal-overlay") || e.target.closest(".bg-scan-toast")) {
        return;
      }

      const anchor = e.target.closest("a");
      if (!anchor || !anchor.href) return;

      const href = anchor.href.trim();

      // Only inspect external HTTP/HTTPS links
      if (!/^https?:\/\//i.test(href)) return;

      // Don't intercept same page anchors or relative navigations
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href);
        if (currentUrl.origin === targetUrl.origin && currentUrl.pathname === targetUrl.pathname) {
          return;
        }
      } catch {
        return;
      }

      // Check whether link should open in a new tab
      const isNewTab = anchor.target === "_blank" || e.ctrlKey || e.metaKey || (anchor.getAttribute("target") && anchor.getAttribute("target").toLowerCase() === "_blank");

      function proceedToUrl(dest) {
        if (isNewTab) {
          window.open(dest, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = dest;
        }
      }

      const wl = typeof BrowseGuardWhitelist !== "undefined"
        ? BrowseGuardWhitelist
        : (typeof window !== "undefined" && window.BrowseGuardWhitelist ? window.BrowseGuardWhitelist : null);

      // Check current page context: Is the user in Webmail, Enterprise Chat, or our Interactive Test Bed?
      const isTestPage = window.location.pathname.includes("extension-test.html") || !!document.querySelector("[data-browseguard-test]");
      const isWebmail = (wl ? wl.isWebmailOrChatHost(window.location.hostname) : false) || isTestPage;

      // 1. TIER 0 CHECK: If in Default "WEBMAIL_ONLY" mode and NOT on a webmail/chat host:
      // DO NOT INTERCEPT AT ALL! Let the user browse normally with zero latency!
      if (cachedConfig.protectionMode !== "GLOBAL" && !isWebmail) {
        return;
      }

      // 2. TIER 1 CHECK: Instant High-Reputation Domain Whitelist (0ms delay)
      // If target URL belongs to trusted domains (Google, Microsoft, GitHub, Amazon, Wikipedia, etc.):
      // DO NOT INTERCEPT! User navigates immediately at native speed!
      if (wl && wl.isInstantWhitelisted(href, cachedConfig.customWhitelist)) {
        return;
      }

      // 3. TIER 2 CHECK: Untrusted / Unknown Link clicked in Webmail (or in Global mode)
      e.preventDefault();
      e.stopPropagation();

      showScanningToast(href);

      try {
        chrome.runtime.sendMessage(
          { type: "FAST_CHECK_URL", url: href },
          function (response) {
            removeScanningToast();

            if (chrome.runtime.lastError || !response || !response.success) {
              // Graceful fallback to avoid trapping user on glitch
              proceedToUrl(href);
              return;
            }

            const { result, config } = response;
            cachedConfig = { ...cachedConfig, ...(config || {}) };

            // If safe or whitelisted by fast-check API -> navigate instantly
            if (result.bypass || result.verdict === "SAFE") {
              proceedToUrl(href);
              return;
            }

            // If malicious or suspicious -> quarantine and display Zero-Trust Threat Modal
            showThreatModal(href, result, config);
          }
        );
      } catch (err) {
        removeScanningToast();
        proceedToUrl(href);
      }
    },
    true // Capture phase
  );
})();
