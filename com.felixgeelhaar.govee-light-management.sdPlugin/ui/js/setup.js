/**
 * Shared setup logic for all Property Inspectors.
 * Handles: API key flow, conditional visibility, group management.
 */
document.addEventListener("DOMContentLoaded", () => {
  const setupWrapper = document.getElementById("setup");
  const settingsWrapper = document.getElementById("settings");
  const connectElem = document.getElementById("connect");
  const apiKeyElem = document.getElementById("apiKey");
  const failedElem = document.getElementById("errorMessage");
  const API_KEY_PATTERN = /^[A-Za-z0-9-]{20,64}$/;

  // Optional conditional visibility elements
  const conditionalItems = {
    brightness: document.getElementById("brightnessItem"),
    color: document.getElementById("colorItem"),
    colorTemp: document.getElementById("tempItem"),
  };
  const hasConditionalItems = Object.values(conditionalItems).some(Boolean);
  let deviceDebugMap = {};
  let latestSettings = {};
  let debugRefreshTimers = [];
  let debugPollInterval = null;

  function showPanel(isSetup) {
    if (isSetup) {
      setupWrapper.classList.remove("hidden");
      settingsWrapper.classList.add("hidden");
    } else {
      settingsWrapper.classList.remove("hidden");
      setupWrapper.classList.add("hidden");
    }
  }

  function updateConditionalVisibility(mode) {
    if (!hasConditionalItems) return;
    for (const [key, el] of Object.entries(conditionalItems)) {
      if (el) el.style.display = key === mode ? "" : "none";
    }
  }

  function normalizeApiKey(value) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  function hasValidApiKey(value) {
    return API_KEY_PATTERN.test(normalizeApiKey(value));
  }

  function toPayload(message) {
    if (
      message &&
      typeof message === "object" &&
      "payload" in message &&
      message.payload
    ) {
      return message.payload;
    }
    return message || {};
  }

  function sendPluginMessage(client, payload) {
    if (client && typeof client.sendToPlugin === "function") {
      client.sendToPlugin(payload);
      return;
    }

    // Fallback for older SDPI client builds that only expose `send`.
    if (client && typeof client.send === "function") {
      client.send("sendToPlugin", payload);
      return;
    }

    console.warn("sendToPlugin is unavailable on streamDeckClient", {
      event: payload && payload.event,
    });
  }

  function syncSelectedDeviceFromDom() {
    const deviceSelect = document.querySelector(
      'sdpi-select[setting="selectedDeviceId"]',
    );
    if (!deviceSelect) return;

    const shadowSelect =
      deviceSelect.shadowRoot &&
      deviceSelect.shadowRoot.querySelector("select");
    const value =
      deviceSelect.value ||
      deviceSelect.getAttribute("value") ||
      deviceSelect.getAttribute("default-value") ||
      (shadowSelect && shadowSelect.value) ||
      (shadowSelect &&
        shadowSelect.selectedOptions &&
        shadowSelect.selectedOptions[0] &&
        shadowSelect.selectedOptions[0].value);
    if (typeof value === "string" && value.trim()) {
      latestSettings = {
        ...latestSettings,
        selectedDeviceId: value,
      };
    }
  }

  function scheduleDebugRefresh() {
    debugRefreshTimers.forEach((timer) => clearTimeout(timer));
    debugRefreshTimers = [];

    [0, 100, 300, 1000].forEach((delay) => {
      const timer = setTimeout(() => {
        syncSelectedDeviceFromDom();
        renderDebugInfo();
      }, delay);
      debugRefreshTimers.push(timer);
    });
  }

  function startDebugPolling() {
    if (debugPollInterval) {
      clearInterval(debugPollInterval);
    }

    debugPollInterval = setInterval(() => {
      const previousValue = latestSettings?.selectedDeviceId;
      syncSelectedDeviceFromDom();
      if (!previousValue || latestSettings?.selectedDeviceId !== previousValue) {
        renderDebugInfo();
      }
    }, 500);
  }

  function getSelectedDeviceDebug() {
    syncSelectedDeviceFromDom();
    const selectedDeviceId = latestSettings?.selectedDeviceId;

    if (!selectedDeviceId || typeof selectedDeviceId !== "string") {
      return null;
    }

    if (!selectedDeviceId.startsWith("light:")) {
      return {
        selection: selectedDeviceId,
        message: "Debug device data is only available for individual lights.",
      };
    }

    const match = deviceDebugMap[selectedDeviceId];
    if (!match) {
      return {
        selection: selectedDeviceId,
        message: "Selected light metadata is not loaded yet.",
      };
    }

    return match;
  }

  function renderDebugInfo() {
    const debugValue = document.getElementById("deviceDebugValue");
    if (!debugValue) return;

    const data = getSelectedDeviceDebug();
    if (!data) {
      debugValue.innerHTML =
        '<div style="color:#999;">Select a light to inspect device metadata.</div>';
      return;
    }

    if (data.message) {
      debugValue.innerHTML = `
        <div style="display:grid;gap:6px;">
          <div><strong>Selection:</strong> ${escapeHtml(data.selection ?? "Unknown")}</div>
          <div style="color:#999;">${escapeHtml(data.message)}</div>
        </div>
      `;
      return;
    }

    const capabilities = Object.entries(data.capabilities ?? {})
      .map(
        ([key, enabled]) =>
          `<span style="${pillStyle(Boolean(enabled))}">${escapeHtml(formatKey(key))}</span>`,
      )
      .join("");

    const commands = (data.supportedCommands ?? [])
      .map(
        (command) =>
          `<span style="${tagStyle}">${escapeHtml(command)}</span>`,
      )
      .join("");

    debugValue.innerHTML = `
      <div style="display:grid;gap:10px;">
        <div style="display:grid;gap:4px;">
          ${renderMetaRow("Name", data.name)}
          ${renderMetaRow("Device", data.device, {
            copyValue: data.device,
            copyLabel: "Click to copy device ID",
          })}
          ${renderMetaRow("Model", data.model, {
            copyValue: data.model,
            copyLabel: "Click to copy model",
          })}
        </div>
        <div style="display:grid;gap:4px;">
          ${renderMetaRow("Controllable", formatBoolean(data.controllable))}
          ${renderMetaRow("Retrievable", formatBoolean(data.retrievable))}
        </div>
        <div style="display:grid;gap:6px;">
          <div style="font-weight:600;">Capabilities</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${capabilities || '<span style="color:#999;">None</span>'}
          </div>
        </div>
        <div style="display:grid;gap:6px;">
          <div style="font-weight:600;">Supported Commands</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${commands || '<span style="color:#999;">None</span>'}
          </div>
        </div>
      </div>
    `;

    bindCopyButtons(debugValue);
  }

  function renderMetaRow(label, value, options = {}) {
    const valueContent =
      options.copyValue && value
        ? `<span
            class="metadata-copy-value"
            data-copy="${escapeHtmlAttr(options.copyValue)}"
            aria-label="${escapeHtmlAttr(options.copyLabel || `Copy ${label}`)}"
            title="${escapeHtmlAttr(options.copyLabel || `Copy ${label}`)}"
            style="display:inline-block;padding:1px 4px;border-radius:4px;cursor:pointer;transition:background-color 120ms ease,color 120ms ease;"
          >${escapeHtml(value ?? "Unknown")}</span>`
        : "";

    return `<div style="display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:start;"><div style="color:#999;">${escapeHtml(label)}</div><div style="word-break:break-word;">${valueContent || `<span>${escapeHtml(value ?? "Unknown")}</span>`}</div></div>`;
  }

  function bindCopyButtons(container) {
    container.querySelectorAll(".metadata-copy-value").forEach((element) => {
      element.addEventListener("mouseenter", () => {
        element.style.backgroundColor = "#3a3a3a";
        element.style.color = "#ffffff";
      });

      element.addEventListener("mouseleave", () => {
        element.style.backgroundColor = "transparent";
        element.style.color = "";
      });

      element.addEventListener("click", async () => {
        const value = element.getAttribute("data-copy");
        if (!value) return;

        try {
          await navigator.clipboard.writeText(value);
          const originalText = element.textContent;
          const originalTitle = element.getAttribute("title");
          element.textContent = "Copied";
          element.setAttribute("title", "Copied");
          setTimeout(() => {
            element.textContent = originalText;
            if (originalTitle) {
              element.setAttribute("title", originalTitle);
            }
          }, 1200);
        } catch (error) {
          console.warn("Failed to copy metadata value", error);
        }
      });
    });
  }

  function formatBoolean(value) {
    return value ? "Yes" : "No";
  }

  function formatKey(value) {
    return String(value)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase())
      .trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value);
  }

  const tagStyle =
    "display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#3a3a3a;color:#e6e6e6;font-size:11px;line-height:1.5;";

  function pillStyle(enabled) {
    return `display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:11px;line-height:1.5;background:${enabled ? "#1f5f3a" : "#4a2f2f"};color:${enabled ? "#d8ffe6" : "#ffdede"};`;
  }

  function subscribePluginMessages(client, onMessage) {
    const sources = [
      client && client.sendToPropertyInspector,
      client && client.message,
    ].filter(Boolean);

    // Track { source, handler } pairs for proper cleanup.
    // SDPI client subscribe(handler) returns undefined, so we can't rely on
    // subscription.unsubscribe() - we must call source.unsubscribe(handler).
    const subscriptions = [];

    sources.forEach((source) => {
      if (source && typeof source.subscribe === "function") {
        const handler = (message) => {
          onMessage(toPayload(message));
        };
        source.subscribe(handler);
        subscriptions.push({ source, handler });
      }
    });

    if (subscriptions.length > 0) {
      return () => {
        subscriptions.forEach(({ source, handler }) => {
          // SDPI client: unsubscribe(handler) to remove the specific handler
          if (source && typeof source.unsubscribe === "function") {
            source.unsubscribe(handler);
          }
        });
      };
    }

    const legacyHandler = (evt) => onMessage(evt.detail || {});
    document.addEventListener("sdpi:message", legacyHandler);
    return () => {
      document.removeEventListener("sdpi:message", legacyHandler);
    };
  }

  function injectApiKeyActions(client) {
    if (!settingsWrapper || document.getElementById("editApiKeyBtn")) return;

    const item = document.createElement("sdpi-item");
    item.setAttribute("label", "API Key");

    const button = document.createElement("button");
    button.type = "button";
    button.id = "editApiKeyBtn";
    button.className = "sdpi-item-value group-cancel-btn";
    button.textContent = "Change API Key";
    button.addEventListener("click", () => {
      failedElem.classList.add("hidden");
      showPanel(true);
      apiKeyElem.focus();
    });

    item.appendChild(button);
    settingsWrapper.insertBefore(item, settingsWrapper.firstChild);

    const debugItem = document.createElement("sdpi-item");
    debugItem.setAttribute("label", "Metadata");
    debugItem.innerHTML = `
      <details class="sdpi-item-value" id="deviceDebugDetails">
        <summary>Selected device metadata</summary>
        <pre id="deviceDebugValue" style="margin-top:8px;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;">Select a light to inspect device metadata.</pre>
      </details>
    `;
    settingsWrapper.appendChild(debugItem, item.nextSibling);
    scheduleDebugRefresh();
  }

  // Keep a reference to the latest global settings so we can merge, not replace.
  let cachedGlobalSettings = {};

  // ── API Key Validation ──
  connectElem.addEventListener("click", async () => {
    const candidateKey = normalizeApiKey(apiKeyElem.value);
    if (!hasValidApiKey(candidateKey)) {
      failedElem.textContent = "Please enter a valid Govee API key.";
      failedElem.classList.remove("hidden");
      return;
    }

    apiKeyElem.disabled = true;
    connectElem.disabled = true;
    connectElem.innerText = "Connecting...";
    failedElem.classList.add("hidden");

    try {
      const res = await fetch(
        "https://openapi.api.govee.com/router/api/v1/user/devices",
        {
          headers: {
            "Content-Type": "application/json",
            "Govee-API-Key": candidateKey,
          },
        },
      );
      if (res.ok) {
        // Merge with existing global settings to preserve light groups etc.
        SDPIComponents.streamDeckClient.setGlobalSettings({
          ...cachedGlobalSettings,
          apiKey: candidateKey,
        });
        showPanel(false);
        document.querySelectorAll("sdpi-select[datasource]").forEach((el) => {
          if (el.refresh) el.refresh();
        });
      } else {
        failedElem.textContent =
          res.status === 401
            ? "Invalid API key. Please check and try again."
            : "Failed to connect, please try again.";
        failedElem.classList.remove("hidden");
      }
    } catch {
      failedElem.textContent =
        "Could not reach Govee servers. Check your internet connection.";
      failedElem.classList.remove("hidden");
    }

    apiKeyElem.disabled = false;
    connectElem.disabled = false;
    connectElem.innerText = "Connect";
  });

  // ── Group Manager (injected into every PI) ──
  function initGroupManager(client) {
    const container = document.getElementById("groupManager");
    if (!container) return;

    let devices = [];

    container.innerHTML = `
			<hr class="group-separator" />
			<sdpi-item label="Groups">
				<div>
					<div id="groupList"></div>
					<button type="button" id="newGroupBtn" class="sdpi-item-value group-add-btn">+ New Group</button>
				</div>
			</sdpi-item>
			<div id="groupCreateForm" style="display:none">
				<sdpi-item label="Name">
					<input id="groupNameInput" type="text" class="sdpi-item-value" placeholder="e.g. Living Room" />
				</sdpi-item>
				<sdpi-item label="Lights">
					<div id="groupLightList" class="light-checklist"></div>
				</sdpi-item>
				<div class="group-btn-row">
					<button type="button" id="saveGroupBtn" class="group-action-btn">Create</button>
					<button type="button" id="cancelGroupBtn" class="group-cancel-btn">Cancel</button>
				</div>
			</div>
			<div id="groupStatus" class="group-status"></div>
		`;

    const groupList = document.getElementById("groupList");
    const createForm = document.getElementById("groupCreateForm");
    const lightList = document.getElementById("groupLightList");
    const nameInput = document.getElementById("groupNameInput");
    const statusEl = document.getElementById("groupStatus");

    function showStatus(msg, isError) {
      statusEl.textContent = msg;
      statusEl.className = "group-status " + (isError ? "error" : "success");
      setTimeout(() => {
        statusEl.textContent = "";
      }, 3000);
    }

    function renderGroups(groups) {
      groupList.innerHTML = "";
      if (groups.length === 0) {
        groupList.innerHTML = '<span class="group-empty">No groups yet</span>';
        return;
      }
      groups.forEach((g) => {
        const row = document.createElement("div");
        row.className = "group-row";
        row.innerHTML = `
					<span class="group-label">${g.name} <small>(${g.size || "?"} lights)</small></span>
					<button class="group-delete-btn" data-id="${g.id}">✕</button>
				`;
        row.querySelector(".group-delete-btn").addEventListener("click", () => {
          if (confirm("Delete group '" + g.name + "'?")) {
            sendPluginMessage(client, { event: "deleteGroup", groupId: g.id });
          }
        });
        groupList.appendChild(row);
      });
    }

    document.getElementById("newGroupBtn").addEventListener("click", () => {
      nameInput.value = "";
      lightList.innerHTML = "";
      if (devices.length === 0) {
        lightList.innerHTML =
          '<div style="padding:4px;color:#999">No devices found</div>';
      } else {
        devices.forEach((d) => {
          const label = document.createElement("label");
          label.innerHTML = `<input type="checkbox" name="grpLight" value="${d.value}"> ${d.label}`;
          lightList.appendChild(label);
        });
      }
      createForm.style.display = "";
    });

    document.getElementById("cancelGroupBtn").addEventListener("click", () => {
      createForm.style.display = "none";
    });

    document.getElementById("saveGroupBtn").addEventListener("click", () => {
      const name = nameInput.value.trim();
      const checked = [
        ...document.querySelectorAll('input[name="grpLight"]:checked'),
      ];
      if (!name) {
        showStatus("Enter a name", true);
        return;
      }
      if (checked.length === 0) {
        showStatus("Select lights", true);
        return;
      }
      sendPluginMessage(client, {
        event: "saveGroup",
        group: { name, lightIds: checked.map((cb) => cb.value) },
      });
    });

    const unsubscribeMessages = subscribePluginMessages(client, (p) => {
      if (!p || typeof p !== "object") return;

      if (p.event === "getDevices" && p.items) {
        // Flatten: items may have children (Lights/Groups optgroups)
        devices = [];
        deviceDebugMap = p.deviceDebugMap || {};
        (p.items || []).forEach((item) => {
          if (item.children) {
            // Only include lights for group creation (not groups)
            if (item.label === "Lights") {
              devices.push(...item.children);
            }
          } else if (item.value) {
            devices.push(item);
          }
        });
        scheduleDebugRefresh();
      }

      if (p.event === "groupsReceived" && p.groups) {
        renderGroups(p.groups);
      }

      if (p.event === "groupSaved") {
        if (p.success) {
          showStatus("Group created!", false);
          createForm.style.display = "none";
          sendPluginMessage(client, { event: "getGroups" });
          // Refresh device dropdown to include new group
          document.querySelectorAll("sdpi-select[datasource]").forEach((el) => {
            if (el.refresh) el.refresh();
          });
        } else {
          showStatus(p.error || "Failed", true);
        }
      }

      if (p.event === "groupDeleted") {
        if (p.success) {
          showStatus("Deleted", false);
          sendPluginMessage(client, { event: "getGroups" });
          document.querySelectorAll("sdpi-select[datasource]").forEach((el) => {
            if (el.refresh) el.refresh();
          });
        } else {
          showStatus(p.error || "Failed", true);
        }
      }
    });

    window.addEventListener("beforeunload", unsubscribeMessages, {
      once: true,
    });

    // Fetch groups and devices
    sendPluginMessage(client, { event: "getGroups" });
    sendPluginMessage(client, { event: "getDevices" });
  }

  // ── Device Dropdown Timeout ──
  // If the dropdown stays on "Loading" for too long (backend crashed or
  // API unreachable), show a helpful hint so the user isn't stuck.
  function watchDeviceDropdown(client) {
    const TIMEOUT_MS = 15_000;
    const deviceSelect = document.querySelector(
      'sdpi-select[setting="selectedDeviceId"]',
    );
    if (!deviceSelect) return;

    const rerenderDebug = () => {
      syncSelectedDeviceFromDom();
      renderDebugInfo();
    };

    deviceSelect.addEventListener("change", rerenderDebug);
    deviceSelect.addEventListener("input", rerenderDebug);

    const timer = setTimeout(() => {
      // Check if the dropdown is still empty / loading
      const hasOptions =
        deviceSelect.querySelectorAll("option").length > 0 ||
        deviceSelect.value;
      if (hasOptions) return;

      // Insert a hint below the dropdown
      if (document.getElementById("deviceTimeout")) return;
      const hint = document.createElement("div");
      hint.id = "deviceTimeout";
      hint.style.cssText =
        "color:#FF6B6B;font-size:12px;padding:6px 0;line-height:1.4";
      hint.textContent =
        "Devices didn't load. Check your API key, try the refresh button, or restart the Stream Deck app.";
      deviceSelect.parentNode.insertBefore(hint, deviceSelect.nextSibling);
    }, TIMEOUT_MS);

    // Clear timeout if devices arrive
    const unsubscribeMessages = subscribePluginMessages(client, (p) => {
      if (!p || typeof p !== "object") return;
      if (p.event === "getDevices") {
        clearTimeout(timer);
        const hint = document.getElementById("deviceTimeout");
        if (hint) hint.remove();
        scheduleDebugRefresh();
        unsubscribeMessages();
      }
    });
  }

  // ── Initialize ──
  function init() {
    const client = SDPIComponents.streamDeckClient;
    injectApiKeyActions(client);

    client.didReceiveGlobalSettings.subscribe((msg) => {
      cachedGlobalSettings = msg.payload?.settings || {};
      const apiKey = cachedGlobalSettings.apiKey;
      showPanel(!hasValidApiKey(apiKey));
    });

    if (hasConditionalItems) {
      client.didReceiveSettings.subscribe((msg) => {
        latestSettings = msg.payload?.settings || {};
        const mode = latestSettings?.controlMode;
        if (mode) updateConditionalVisibility(mode);
        scheduleDebugRefresh();
      });
    } else {
      client.didReceiveSettings.subscribe((msg) => {
        latestSettings = msg.payload?.settings || {};
        scheduleDebugRefresh();
      });
    }

    if (client && typeof client.getSettings === "function") {
      client.getSettings();
    }
    client.getGlobalSettings();
    watchDeviceDropdown(client);
    startDebugPolling();
    scheduleDebugRefresh();
    try {
      initGroupManager(client);
    } catch (error) {
      console.warn("Failed to initialize group manager", error);
    }
  }

  const check = setInterval(() => {
    if (
      typeof SDPIComponents !== "undefined" &&
      SDPIComponents.streamDeckClient
    ) {
      clearInterval(check);
      init();
    }
  }, 50);

  setTimeout(() => {
    clearInterval(check);
    if (
      setupWrapper.classList.contains("hidden") &&
      settingsWrapper.classList.contains("hidden")
    ) {
      showPanel(true);
    }
  }, 3000);

  window.addEventListener(
    "beforeunload",
    () => {
      debugRefreshTimers.forEach((timer) => clearTimeout(timer));
      debugRefreshTimers = [];
      if (debugPollInterval) {
        clearInterval(debugPollInterval);
        debugPollInterval = null;
      }
    },
    { once: true },
  );

  updateConditionalVisibility("toggle");
});
