/**
 * BrowseGuard Zero-Trust URL Shield - Content Script
 * Intercepts untrusted link clicks in webmail and browsers, analyzing them in real-time.
 */

(function () {
  "use strict";

  // Prevent multiple injections
  if (window.__browseguard_shield_injected) return;
  window.__browseguard_shield_injected = true;

  let activeToast = null;
  let activeModal = null;

  function showScanningToast(url) {
    removeScanningToast();
    const toast = document.createElement("div");
    toast.className = "bg-scan-toast";
    toast.innerHTML = `
      <div class="bg-spinner"></div>
      <div>
        <div style="font-weight: 600; color: #00e5ff;">BrowseGuard Zero-Trust Shield</div>
        <div style="color: #94a3b8; font-size: 11px;">Inspecting link in isolated Chromium sandbox...</div>
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

    const isMalicious = threatResult.verdict === "MALICIOUS" || threatResult.risk_score >= 80;
    const badgeClass = isMalicious ? "bg-badge-malicious" : "bg-badge-suspicious";
    const iconClass = isMalicious ? "bg-icon-malicious" : "bg-icon-suspicious";
    const titleText = isMalicious ? "Malicious Link Blocked" : "Suspicious Link Detected";
    const scoreText = `Risk Score: ${threatResult.risk_score || 100}/100`;

    const viewerUrl = `${config.apiUrl.replace(/\/+$/, "")}/api/v1/analyses/${threatResult.analysis_id}`;

    const modal = document.createElement("div");
    modal.className = "bg-modal-overlay";
    modal.innerHTML = `
      <div class="bg-modal-card">
        <div class="bg-modal-header">
          <div class="bg-modal-icon ${iconClass}">🛡️</div>
          <div>
            <h3 class="bg-modal-title">${titleText}</h3>
            <p class="bg-modal-subtitle">BrowseGuard active isolation prevented one-click compromise.</p>
          </div>
        </div>

        <div class="bg-threat-badge ${badgeClass}">
          ● ${threatResult.verdict || "MALICIOUS"} • ${scoreText}
        </div>

        <div class="bg-url-box">${escapeHtml(url)}</div>

        <div class="bg-details-box">
          <strong>Recommended Action:</strong> ${threatResult.recommended_action || "BLOCK"}<br>
          ${threatResult.reason || "This link exhibits deceptive indicators, cloud metadata SSRF probes, or known malicious redirect patterns."}
        </div>

        <div class="bg-btn-group">
          <button class="bg-btn-primary" id="bg-abort-btn">Abort & Close (Recommended)</button>
          <a class="bg-btn-secondary" href="${viewerUrl}" target="_blank" rel="noopener noreferrer">
            Inspect Canonical Forensic Report
          </a>
          <div class="bg-bypass-link" id="bg-bypass-link">Proceed anyway (Unsafe)</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    activeModal = modal;

    // Action handlers
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
    return String(str)
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
      const anchor = e.target.closest("a");
      if (!anchor || !anchor.href) return;

      const href = anchor.href.trim();
      // Only intercept external HTTP/HTTPS links
      if (!/^https?:\/\//i.test(href)) return;

      // Don't intercept same page anchors
      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(href);
      if (currentUrl.origin === targetUrl.origin && currentUrl.pathname === targetUrl.pathname && targetUrl.hash) {
        return;
      }

      // Check if clicking in an email client (Gmail, Outlook, etc.)
      const isWebmail =
        window.location.hostname.includes("mail.google.com") ||
        window.location.hostname.includes("outlook.live.com") ||
        window.location.hostname.includes("outlook.office.com") ||
        window.location.hostname.includes("outlook.office365.com");

      // Stop navigation temporarily
      e.preventDefault();
      e.stopPropagation();

      showScanningToast(href);

      chrome.runtime.sendMessage(
        { type: "CHECK_URL", url: href },
        function (response) {
          removeScanningToast();

          if (!response || !response.success) {
            console.warn("[BrowseGuard] Check failed, allowing navigation:", response?.error);
            window.location.href = href;
            return;
          }

          const { result, config } = response;
          const isHighRisk =
            ["MALICIOUS", "HIGH_RISK"].includes(result.verdict) ||
            (result.risk_score || 0) >= (config.quarantineThreshold || 60);

          if (isHighRisk) {
            showThreatModal(href, result, config);
          } else {
            // Link is safe -> navigate
            window.location.href = href;
          }
        }
      );
    },
    true // Capture phase
  );
})();
