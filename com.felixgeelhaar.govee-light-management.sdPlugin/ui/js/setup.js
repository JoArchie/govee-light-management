/**
 * Shared setup logic for all Property Inspectors.
 * Handles the two-panel flow: setup (API key) → settings (device + options).
 */
document.addEventListener("DOMContentLoaded", () => {
	const setupWrapper = document.getElementById("setup");
	const settingsWrapper = document.getElementById("settings");
	const connectElem = document.getElementById("connect");
	const apiKeyElem = document.getElementById("apiKey");
	const failedElem = document.getElementById("errorMessage");

	// Optional conditional visibility elements
	const conditionalItems = {
		brightness: document.getElementById("brightnessItem"),
		color: document.getElementById("colorItem"),
		colorTemp: document.getElementById("tempItem"),
	};
	const hasConditionalItems = Object.values(conditionalItems).some(Boolean);

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

	/**
	 * Validate API key against Govee API.
	 */
	connectElem.addEventListener("click", async () => {
		apiKeyElem.disabled = true;
		connectElem.disabled = true;
		connectElem.innerText = "Connecting...";
		failedElem.classList.add("hidden");

		try {
			const res = await fetch("https://openapi.api.govee.com/router/api/v1/user/devices", {
				headers: {
					"Content-Type": "application/json",
					"Govee-API-Key": apiKeyElem.value
				}
			});

			if (res.ok) {
				SDPIComponents.streamDeckClient.setGlobalSettings({ apiKey: apiKeyElem.value });
				showPanel(false);
				// Refresh device selects after connecting
				document.querySelectorAll("sdpi-select[datasource]").forEach(el => {
					if (el.refresh) el.refresh();
				});
			} else {
				failedElem.classList.remove("hidden");
			}
		} catch {
			failedElem.classList.remove("hidden");
		}

		apiKeyElem.disabled = false;
		connectElem.disabled = false;
		connectElem.innerText = "Connect";
	});

	/**
	 * Initialize when SDPI is ready.
	 */
	function init() {
		const client = SDPIComponents.streamDeckClient;

		// Show correct panel based on global API key
		client.didReceiveGlobalSettings.subscribe((msg) => {
			const apiKey = msg.payload?.settings?.apiKey;
			showPanel(!apiKey);
		});

		// Update conditional visibility when action settings change
		if (hasConditionalItems) {
			client.didReceiveSettings.subscribe((msg) => {
				const mode = msg.payload?.settings?.controlMode;
				if (mode) updateConditionalVisibility(mode);
			});
		}

		// Request current settings
		client.getGlobalSettings();
	}

	// Wait for SDPI components to be ready
	const check = setInterval(() => {
		if (typeof SDPIComponents !== "undefined" && SDPIComponents.streamDeckClient) {
			clearInterval(check);
			init();
		}
	}, 50);

	// Fallback: show setup after 3s if SDPI never loads
	setTimeout(() => {
		clearInterval(check);
		if (setupWrapper.classList.contains("hidden") && settingsWrapper.classList.contains("hidden")) {
			showPanel(true);
		}
	}, 3000);

	// Default: hide conditional items
	updateConditionalVisibility("toggle");
});
