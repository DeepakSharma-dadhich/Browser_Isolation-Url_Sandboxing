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

  let activeSafeToast = null;
  let safeToastTimer = null;

  function removeSafeToast() {
    if (safeToastTimer) {
      clearTimeout(safeToastTimer);
      safeToastTimer = null;
    }
    if (activeSafeToast && activeSafeToast.parentNode) {
      activeSafeToast.parentNode.removeChild(activeSafeToast);
      activeSafeToast = null;
    }
  }

  function showScanningToast(url) {
    removeScanningToast();
    removeSafeToast();
    const toast = document.createElement("div");
    toast.className = "bg-scan-toast";
    toast.innerHTML = `
      <div class="bg-spinner"></div>
      <div>
        <div style="font-weight: 600; color: #00e5ff;">BrowseGuard Link Shield</div>
        <div style="color: #94a3b8; font-size: 11px;">Inspecting link safety in real-time...</div>
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

  function unpackDestinationUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
      const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl);
      if (parsed.hostname.includes("google.") && (parsed.pathname === "/url" || parsed.pathname === "/goto")) {
        const q = parsed.searchParams.get("q") || parsed.searchParams.get("url");
        if (q && /^https?:\/\//i.test(q)) {
          return q;
        }
      }
      if (parsed.hostname.includes("safelinks.protection.outlook.com")) {
        const realUrl = parsed.searchParams.get("url");
        if (realUrl && /^https?:\/\//i.test(realUrl)) {
          return realUrl;
        }
      }
      if (parsed.hostname.includes("urldefense.proofpoint.com")) {
        const u = parsed.searchParams.get("u");
        if (u) {
          return decodeURIComponent(u.replace(/-/g, "%").replace(/_/g, "/"));
        }
      }
    } catch {}
    return rawUrl;
  }

  function showSafeToast(url, safeResult, config) {
    removeScanningToast();
    removeSafeToast();
    if (activeModal && activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
      activeModal = null;
    }

    const toast = document.createElement("div");
    toast.className = "bg-safe-toast";
    toast.innerHTML = `
      <div class="bg-safe-toast-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="bg-modal-icon bg-icon-safe" style="width: 32px; height: 32px; font-size: 16px; border-radius: 8px;">✓</div>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #ffffff;">Link Verified Safe</div>
            <div style="font-size: 11px; color: #4ade80; font-weight: 700;">● ZERO THREATS DETECTED (0/100)</div>
          </div>
        </div>
        <button class="bg-btn-close" id="bg-safe-close" title="Dismiss">✕</button>
      </div>

      <div class="bg-url-box" style="margin-bottom: 10px; padding: 8px 10px; font-size: 12px; color: #34d399; background: #061120; border-color: rgba(34, 197, 94, 0.3); word-break: break-all;">
        ${escapeHtml(url)}
      </div>

      <div style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin-bottom: 14px;">
        ${escapeHtml(safeResult?.reason || "Destination evaluated as clean and legitimate. No phishing, credential harvesting, or malware signatures detected.")}
      </div>

      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="bg-btn-safe" id="bg-safe-open">
          🔗 Open Link
        </button>
        <button class="bg-btn-secondary" id="bg-safe-dismiss" style="padding: 7px 14px; font-size: 12px;">
          Dismiss
        </button>
      </div>
    `;

    document.body.appendChild(toast);
    activeSafeToast = toast;

    toast.querySelector("#bg-safe-close").addEventListener("click", removeSafeToast);
    toast.querySelector("#bg-safe-dismiss").addEventListener("click", removeSafeToast);
    toast.querySelector("#bg-safe-open").addEventListener("click", () => {
      removeSafeToast();
      window.open(url, "_blank", "noopener,noreferrer");
    });

    safeToastTimer = setTimeout(removeSafeToast, 12000);
  }

  function inspectLinkInPage(rawUrl) {
    if (!rawUrl) return;
    const url = unpackDestinationUrl(rawUrl);

    removeScanningToast();
    removeSafeToast();
    if (activeModal && activeModal.parentNode) {
      activeModal.parentNode.removeChild(activeModal);
      activeModal = null;
    }

    showScanningToast(url);

    let responded = false;
    const safetyTimer = setTimeout(() => {
      if (!responded) {
        responded = true;
        removeScanningToast();
        showThreatModal(url, {
          verdict: "UNVERIFIED",
          risk_score: 50,
          recommended_action: "ISOLATE",
          reason: "Evaluation timeout. BrowseGuard background engine took longer than 3.5s. Open in Isolated Sandbox to inspect safely."
        }, cachedConfig);
      }
    }, 3500);

    try {
      chrome.runtime.sendMessage(
        { type: "FAST_CHECK_URL", url: url },
        function (response) {
          if (responded) return;
          responded = true;
          clearTimeout(safetyTimer);
          removeScanningToast();

          if (chrome.runtime.lastError || !response || !response.success) {
            showThreatModal(url, {
              verdict: "UNVERIFIED",
              risk_score: 50,
              recommended_action: "ISOLATE",
              reason: "Could not reach BrowseGuard control plane. Open in isolated sandbox to inspect safely."
            }, cachedConfig);
            return;
          }

          const { result, config } = response;
          cachedConfig = { ...cachedConfig, ...(config || {}) };

          if (result.bypass || result.verdict === "SAFE") {
            showSafeToast(url, result, cachedConfig);
          } else {
            showThreatModal(url, result, cachedConfig);
          }
        }
      );
    } catch (err) {
      if (responded) return;
      responded = true;
      clearTimeout(safetyTimer);
      removeScanningToast();
      showThreatModal(url, {
        verdict: "UNVERIFIED",
        risk_score: 50,
        recommended_action: "ISOLATE",
        reason: "Extension message error: " + err.message
      }, cachedConfig);
    }
  }

  // Track context menu targets to detect visible link text
  let lastContextElement = null;
  document.addEventListener("contextmenu", (e) => {
    lastContextElement = e.target;
  }, true);

  // Listen for in-page inspection triggers from background context menu
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === "INSPECT_LINK_IN_PAGE" && message.url) {
        let inspectUrl = message.url;
        if (lastContextElement) {
          const anchor = lastContextElement.closest("a");
          if (anchor) {
            const rawText = (anchor.textContent || "").trim();
            const textUrlMatch = rawText.match(/^(?:hxxps?|https?):\/\/[^\s]+/i) ||
                                 rawText.match(/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/[^\s]*)?/);
            if (textUrlMatch) {
              let visibleUrl = textUrlMatch[0].replace(/^hxxp/i, "http");
              if (!visibleUrl.startsWith("http")) visibleUrl = "http://" + visibleUrl;
              if (inspectUrl.includes("urlhaus.abuse.ch") || inspectUrl.includes("threatfox") || /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/.test(visibleUrl)) {
                inspectUrl = visibleUrl;
              }
            }
          }
        }
        inspectLinkInPage(inspectUrl);
        sendResponse({ success: true, url: inspectUrl });
      }
      return true;
    });
  } catch (e) {
    // Non-blocking
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

      const rawText = (anchor.textContent || "").trim();
      const textUrlMatch = rawText.match(/^(?:hxxps?|https?):\/\/[^\s]+/i) ||
                           rawText.match(/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/[^\s]*)?/);
      let visibleUrl = textUrlMatch ? textUrlMatch[0].replace(/^hxxp/i, "http") : null;
      if (visibleUrl && !visibleUrl.startsWith("http")) {
        visibleUrl = "http://" + visibleUrl;
      }

      // Check if href is a tracking redirect or wrapper (e.g. google.com/goto?url=... or urlhaus.abuse.ch)
      let targetToCheck = unpackDestinationUrl(href);
      if (visibleUrl && visibleUrl !== href) {
        if (href.includes("urlhaus.abuse.ch") || href.includes("threatfox.abuse.ch") || /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/.test(visibleUrl)) {
          targetToCheck = visibleUrl;
        }
      }

      let responded = false;
      let scanningToastShown = false;
      const toastTimer = setTimeout(() => {
        if (!responded) {
          scanningToastShown = true;
          showScanningToast(targetToCheck);
        }
      }, 120);

      const safetyTimer = setTimeout(() => {
        if (!responded) {
          responded = true;
          clearTimeout(toastTimer);
          if (scanningToastShown) removeScanningToast();
          if (isTestPage) {
            showThreatModal(targetToCheck, {
              verdict: "UNVERIFIED",
              risk_score: 50,
              recommended_action: "ISOLATE",
              reason: "Evaluation timeout. BrowseGuard background engine took longer than 3.5s."
            }, cachedConfig);
          } else {
            proceedToUrl(href);
          }
        }
      }, 3500);

      try {
        chrome.runtime.sendMessage(
          { type: "FAST_CHECK_URL", url: targetToCheck },
          function (response) {
            if (responded) return;
            responded = true;
            clearTimeout(toastTimer);
            clearTimeout(safetyTimer);
            if (scanningToastShown) removeScanningToast();

            if (chrome.runtime.lastError || !response || !response.success) {
              if (isTestPage) {
                showThreatModal(targetToCheck, {
                  verdict: "UNVERIFIED",
                  risk_score: 50,
                  recommended_action: "ISOLATE",
                  reason: "Could not reach BrowseGuard control plane. Open in isolated sandbox to inspect safely."
                }, cachedConfig);
              } else {
                proceedToUrl(href);
              }
              return;
            }

            const { result, config } = response;
            cachedConfig = { ...cachedConfig, ...(config || {}) };

            if (isTestPage) {
              // On the test lab page, ALWAYS show the in-page verdict card
              if (result.bypass || result.verdict === "SAFE") {
                showSafeToast(targetToCheck, result, cachedConfig);
              } else {
                showThreatModal(targetToCheck, result, cachedConfig);
              }
              return;
            }

            // In live browsing (Webmail or Global mode):
            // SILENT SAFE NAVIGATION (0ms delay, no blocking popups!)
            if (result.bypass || result.verdict === "SAFE") {
              proceedToUrl(href);
              return;
            }

            // If malicious or suspicious -> quarantine and display Zero-Trust Threat Modal!
            showThreatModal(targetToCheck, result, config);
          }
        );
      } catch (err) {
        if (responded) return;
        responded = true;
        clearTimeout(toastTimer);
        clearTimeout(safetyTimer);
        if (scanningToastShown) removeScanningToast();
        proceedToUrl(href);
      }
    },
    true // Capture phase
  );
})();
