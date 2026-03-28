/**
 * Shared setup logic for all Property Inspectors.
 * Handles the two-panel flow: setup (API key) → settings (device + options).
 * Validates the API key directly against the Govee API.
 */
document.addEventListener("DOMContentLoaded", () => {
	const setupWrapper = document.getElementById("setup");
	const settingsWrapper = document.getElementById("settings");
	const connectElem = document.getElementById("connect");
	const apiKeyElem = document.getElementById("apiKey");
	const failedElem = document.getElementById("errorMessage");

	let localApiKey = null;
	let isDeviceCollectionDirty = false;

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
				isDeviceCollectionDirty = true;
				SDPIComponents.streamDeckClient.setGlobalSettings({ apiKey: apiKeyElem.value });
				showSettings(true);
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
	 * Toggle between setup and settings panels.
	 */
	const showSettings = (show) => {
		if (show) {
			if (isDeviceCollectionDirty) {
				document.querySelectorAll("sdpi-select[datasource]").forEach(el => el.refresh());
			}
			settingsWrapper.classList.remove("hidden");
			setupWrapper.classList.add("hidden");
		} else {
			setupWrapper.classList.remove("hidden");
			settingsWrapper.classList.add("hidden");
		}
	};

	// Monitor global settings changes.
	SDPIComponents.streamDeckClient.didReceiveGlobalSettings.subscribe((globalSettings) => {
		const apiKey = globalSettings.payload?.settings?.apiKey;
		isDeviceCollectionDirty = apiKey !== localApiKey;
		localApiKey = apiKey;
		showSettings(!!apiKey);
	});

	// Request current global settings on load.
	SDPIComponents.streamDeckClient.getGlobalSettings();
});
