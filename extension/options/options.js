document.addEventListener("DOMContentLoaded", async () => {
  const apiUrlEl = document.getElementById("apiUrl");
  const dashboardUrlEl = document.getElementById("dashboardUrl");
  const apiKeyEl = document.getElementById("apiKey");
  const customWhitelistEl = document.getElementById("customWhitelist");
  const modeRadios = document.querySelectorAll('input[name="protectionMode"]');
  const modeOptionWebmail = document.getElementById("modeOptionWebmail");
  const modeOptionGlobal = document.getElementById("modeOptionGlobal");
  const form = document.getElementById("optionsForm");
  const testBtn = document.getElementById("testBtn");
  const statusMsgEl = document.getElementById("statusMsg");

  function updateModeHighlights(selected) {
    if (selected === "GLOBAL") {
      modeOptionGlobal.classList.add("active");
      modeOptionWebmail.classList.remove("active");
    } else {
      modeOptionWebmail.classList.add("active");
      modeOptionGlobal.classList.remove("active");
    }
  }

  modeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      updateModeHighlights(e.target.value);
    });
  });

  // Load existing config
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
    if (response && response.config) {
      const cfg = response.config;
      apiUrlEl.value = cfg.apiUrl || "http://localhost:3000";
      dashboardUrlEl.value = cfg.dashboardUrl || "http://localhost:5173";
      apiKeyEl.value = cfg.apiKey || "bg_ext_admin_live_token_777";

      const mode = cfg.protectionMode || "WEBMAIL_ONLY";
      modeRadios.forEach((r) => {
        if (r.value === mode) r.checked = true;
      });
      updateModeHighlights(mode);

      if (Array.isArray(cfg.customWhitelist)) {
        customWhitelistEl.value = cfg.customWhitelist.join("\n");
      }
    }
  });

  // Save config
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let selectedMode = "WEBMAIL_ONLY";
    modeRadios.forEach((r) => {
      if (r.checked) selectedMode = r.value;
    });

    const parsedWhitelist = (customWhitelistEl.value || "")
      .split("\n")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0 && !item.startsWith("#"));

    const newConfig = {
      apiUrl: apiUrlEl.value.trim(),
      dashboardUrl: dashboardUrlEl.value.trim(),
      apiKey: apiKeyEl.value.trim(),
      protectionMode: selectedMode,
      customWhitelist: parsedWhitelist
    };

    chrome.runtime.sendMessage(
      { type: "UPDATE_CONFIG", config: newConfig },
      (res) => {
        if (res && res.success) {
          statusMsgEl.className = "status-msg success";
          statusMsgEl.textContent = "✓ Settings saved successfully! Extension updated.";
          setTimeout(() => {
            statusMsgEl.textContent = "";
          }, 4000);
        } else {
          statusMsgEl.className = "status-msg error";
          statusMsgEl.textContent = "Failed to save settings.";
        }
      }
    );
  });

  // Test connection & token validity
  testBtn.addEventListener("click", async () => {
    const url = apiUrlEl.value.trim().replace(/\/+$/, "");
    const token = apiKeyEl.value.trim();
    statusMsgEl.className = "status-msg";
    statusMsgEl.textContent = "Testing connection and pairing token with " + url + "...";

    try {
      const authHeader = token.startsWith("bg_live_")
        ? { "X-API-Key": token }
        : { "X-Extension-Token": token };

      const resp = await fetch(`${url}/api/v1/extension/verify`, {
        headers: authHeader
      });

      const json = await resp.json().catch(() => ({}));

      if (resp.ok && json.success) {
        statusMsgEl.className = "status-msg success";
        statusMsgEl.textContent = `✓ Verified! Paired to ${json.user?.email || "Account"} (${json.organization?.name || "Org"}) • Gateway: ${json.gateway?.status || "ACTIVE"} • Quota: ${json.gateway?.quota_remaining}`;
      } else {
        statusMsgEl.className = "status-msg error";
        statusMsgEl.textContent = `✗ Pairing Rejected (HTTP ${resp.status}): ${json.message || json.error || "Invalid token"}`;
      }
    } catch (err) {
      statusMsgEl.className = "status-msg error";
      statusMsgEl.textContent = `✗ Connection failed: ${err.message}. Ensure BrowseGuard Control Plane is running.`;
    }
  });
});
