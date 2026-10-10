document.addEventListener("DOMContentLoaded", async () => {
  const apiUrlEl = document.getElementById("apiUrl");
  const apiKeyEl = document.getElementById("apiKey");
  const quarantineThresholdEl = document.getElementById("quarantineThreshold");
  const enableWebmailShieldEl = document.getElementById("enableWebmailShield");
  const form = document.getElementById("optionsForm");
  const testBtn = document.getElementById("testBtn");
  const statusMsgEl = document.getElementById("statusMsg");

  // Load existing config
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
    if (response && response.config) {
      const cfg = response.config;
      apiUrlEl.value = cfg.apiUrl || "http://localhost:3000";
      apiKeyEl.value = cfg.apiKey || "bg_live_email_gateway_default";
      quarantineThresholdEl.value = cfg.quarantineThreshold || 60;
      enableWebmailShieldEl.checked = cfg.enableWebmailShield !== false;
    }
  });

  // Save config
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newConfig = {
      apiUrl: apiUrlEl.value.trim(),
      apiKey: apiKeyEl.value.trim(),
      quarantineThreshold: Number(quarantineThresholdEl.value) || 60,
      enableWebmailShield: enableWebmailShieldEl.checked
    };

    chrome.runtime.sendMessage(
      { type: "UPDATE_CONFIG", config: newConfig },
      (res) => {
        if (res && res.success) {
          statusMsgEl.className = "status-msg success";
          statusMsgEl.textContent = "✓ Settings saved successfully!";
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

  // Test connection
  testBtn.addEventListener("click", async () => {
    const url = apiUrlEl.value.trim();
    statusMsgEl.className = "status-msg";
    statusMsgEl.textContent = "Testing connection to " + url + "...";

    try {
      const resp = await fetch(`${url.replace(/\/+$/, "")}/api/health`);
      if (resp.ok) {
        const json = await resp.json();
        statusMsgEl.className = "status-msg success";
        statusMsgEl.textContent = `✓ Successfully connected to BrowseGuard! (Status: ${json.status}, DB: ${json.database?.status})`;
      } else {
        statusMsgEl.className = "status-msg error";
        statusMsgEl.textContent = `✗ HTTP Error ${resp.status} received from endpoint.`;
      }
    } catch (err) {
      statusMsgEl.className = "status-msg error";
      statusMsgEl.textContent = `✗ Connection failed: ${err.message}`;
    }
  });
});
