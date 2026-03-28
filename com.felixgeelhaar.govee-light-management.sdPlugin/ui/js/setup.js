/**
 * Shared setup logic for all Property Inspectors.
 * Handles the two-panel flow: setup (API key) → settings (device + options).
 * Fetches devices directly from the Govee API.
 */
document.addEventListener("DOMContentLoaded", () => {
	const setupWrapper = document.getElementById("setup");
	const settingsWrapper = document.getElementById("settings");
	const connectElem = document.getElementById("connect");
	const apiKeyElem = document.getElementById("apiKey");
	const failedElem = document.getElementById("errorMessage");
	const deviceSelect = document.getElementById("deviceSelect");
	const refreshBtn = document.getElementById("refreshDevices");

	let localApiKey = null;
	let initialized = false;

	/**
	 * Toggle between setup and settings panels.
	 */
	const showSettings = (show) => {
		initialized = true;
		if (show) {
			settingsWrapper.classList.remove("hidden");
			setupWrapper.classList.add("hidden");
		} else {
			setupWrapper.classList.remove("hidden");
			settingsWrapper.classList.add("hidden");
		}
	};

	/**
	 * Fetch devices from Govee API and populate the device select.
	 */
	const fetchDevices = async (apiKey) => {
		if (!apiKey || !deviceSelect) return;

		deviceSelect.disabled = true;
		deviceSelect.innerHTML = '<option value="">Loading devices...</option>';

		try {
			const res = await fetch("https://openapi.api.govee.com/router/api/v1/user/devices", {
				headers: {
					"Content-Type": "application/json",
					"Govee-API-Key": apiKey
				}
			});

			if (!res.ok) {
				deviceSelect.innerHTML = '<option value="">Failed to load devices</option>';
				return;
			}

			const data = await res.json();
			const devices = data.data || [];

			deviceSelect.innerHTML = '<option value="">Select a device...</option>';
			devices.forEach(device => {
				const opt = document.createElement("option");
				opt.value = device.device + "|" + device.sku;
				opt.textContent = device.deviceName + " (" + device.sku + ")";
				deviceSelect.appendChild(opt);
			});

			// Restore previously selected device
			if (typeof SDPIComponents !== "undefined" && SDPIComponents.streamDeckClient) {
				SDPIComponents.streamDeckClient.getSettings?.();
			}
		} catch {
			deviceSelect.innerHTML = '<option value="">Error loading devices</option>';
		} finally {
			deviceSelect.disabled = false;
		}
	};

	/**
	 * Handle device selection change - save to settings.
	 */
	if (deviceSelect) {
		deviceSelect.addEventListener("change", () => {
			if (typeof SDPIComponents !== "undefined" && SDPIComponents.streamDeckClient) {
				const selected = deviceSelect.options[deviceSelect.selectedIndex];
				const [deviceId, model] = (deviceSelect.value || "").split("|");
				SDPIComponents.streamDeckClient.setSettings({
					selectedDeviceId: deviceSelect.value,
					selectedModel: model || "",
					selectedLightName: selected?.textContent || ""
				});
			}
		});
	}

	/**
	 * Handle refresh button click.
	 */
	if (refreshBtn) {
		refreshBtn.addEventListener("click", () => {
			if (localApiKey) fetchDevices(localApiKey);
		});
	}

	/**
	 * Handle the "Connect" button click - validate API key against Govee API.
	 */
	connectElem.addEventListener("click", async () => {
		const toggleEnabledState = (enabled) => {
			apiKeyElem.disabled = !enabled;
			connectElem.disabled = !enabled;
			connectElem.innerText = enabled ? "Connect" : "Connecting...";
		};

		toggleEnabledState(false);

		try {
			const res = await fetch("https://openapi.api.govee.com/router/api/v1/user/devices", {
				headers: {
					"Content-Type": "application/json",
					"Govee-API-Key": apiKeyElem.value
				}
			});

			if (res.ok) {
				localApiKey = apiKeyElem.value;
				SDPIComponents.streamDeckClient.setGlobalSettings({ apiKey: apiKeyElem.value });
				showSettings(true);
				fetchDevices(apiKeyElem.value);
				failedElem.classList.add("hidden");
			} else {
				failedElem.classList.remove("hidden");
			}
		} catch {
			failedElem.classList.remove("hidden");
		}

		toggleEnabledState(true);
	});

	/**
	 * Initialize once SDPIComponents is ready.
	 */
	const init = () => {
		if (typeof SDPIComponents === "undefined" || !SDPIComponents.streamDeckClient) {
			setTimeout(() => {
				if (!initialized) showSettings(false);
			}, 1000);
			return;
		}

		// Monitor global settings changes.
		SDPIComponents.streamDeckClient.didReceiveGlobalSettings.subscribe((globalSettings) => {
			const apiKey = globalSettings.payload?.settings?.apiKey;
			if (apiKey !== localApiKey) {
				localApiKey = apiKey;
				if (apiKey) fetchDevices(apiKey);
			}
			showSettings(!!apiKey);
		});

		// Restore selected device from action settings.
		SDPIComponents.streamDeckClient.didReceiveSettings.subscribe((settings) => {
			const deviceId = settings.payload?.settings?.selectedDeviceId;
			if (deviceId && deviceSelect) {
				// Try to select the saved device
				const options = deviceSelect.options;
				for (let i = 0; i < options.length; i++) {
					if (options[i].value === deviceId) {
						deviceSelect.selectedIndex = i;
						break;
					}
				}
			}
		});

		// Request current settings on load.
		SDPIComponents.streamDeckClient.getGlobalSettings();

		// Fallback: if no response within 2 seconds, show setup panel
		setTimeout(() => {
			if (!initialized) showSettings(false);
		}, 2000);
	};

	// Try to initialize immediately, or wait for SDPI to be ready
	if (typeof SDPIComponents !== "undefined" && SDPIComponents.streamDeckClient) {
		init();
	} else {
		const checkInterval = setInterval(() => {
			if (typeof SDPIComponents !== "undefined" && SDPIComponents.streamDeckClient) {
				clearInterval(checkInterval);
				init();
			}
		}, 100);

		setTimeout(() => {
			clearInterval(checkInterval);
			if (!initialized) showSettings(false);
		}, 3000);
	}
});
