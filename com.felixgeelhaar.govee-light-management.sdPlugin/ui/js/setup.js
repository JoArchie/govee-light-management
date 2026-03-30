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

	// ── API Key Validation ──
	connectElem.addEventListener("click", async () => {
		apiKeyElem.disabled = true;
		connectElem.disabled = true;
		connectElem.innerText = "Connecting...";
		failedElem.classList.add("hidden");

		try {
			const res = await fetch("https://openapi.api.govee.com/router/api/v1/user/devices", {
				headers: { "Content-Type": "application/json", "Govee-API-Key": apiKeyElem.value }
			});
			if (res.ok) {
				SDPIComponents.streamDeckClient.setGlobalSettings({ apiKey: apiKeyElem.value });
				showPanel(false);
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
					<button id="newGroupBtn" class="sdpi-item-value group-add-btn">+ New Group</button>
				</div>
			</sdpi-item>
			<div id="groupCreateForm" style="display:none">
				<sdpi-item label="Name">
					<input id="groupNameInput" type="text" class="sdpi-item-value" placeholder="e.g. Living Room" />
				</sdpi-item>
				<sdpi-item label="Lights">
					<div id="groupLightList" class="light-checklist"></div>
				</sdpi-item>
				<sdpi-item label="&nbsp;">
					<button id="saveGroupBtn" class="sdpi-item-value group-action-btn">Create</button>
					<button id="cancelGroupBtn" class="sdpi-item-value group-cancel-btn">Cancel</button>
				</sdpi-item>
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
			setTimeout(() => { statusEl.textContent = ""; }, 3000);
		}

		function renderGroups(groups) {
			groupList.innerHTML = "";
			if (groups.length === 0) {
				groupList.innerHTML = '<span class="group-empty">No groups yet</span>';
				return;
			}
			groups.forEach(g => {
				const row = document.createElement("div");
				row.className = "group-row";
				row.innerHTML = `
					<span class="group-label">${g.name} <small>(${g.size || "?"} lights)</small></span>
					<button class="group-delete-btn" data-id="${g.id}">✕</button>
				`;
				row.querySelector(".group-delete-btn").addEventListener("click", () => {
					if (confirm("Delete group '" + g.name + "'?")) {
						sendToPlugin({ event: "deleteGroup", groupId: g.id });
					}
				});
				groupList.appendChild(row);
			});
		}

		document.getElementById("newGroupBtn").addEventListener("click", () => {
			nameInput.value = "";
			lightList.innerHTML = "";
			if (devices.length === 0) {
				lightList.innerHTML = '<div style="padding:4px;color:#999">No devices found</div>';
			} else {
				devices.forEach(d => {
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
			const checked = [...document.querySelectorAll('input[name="grpLight"]:checked')];
			if (!name) { showStatus("Enter a name", true); return; }
			if (checked.length === 0) { showStatus("Select lights", true); return; }
			sendToPlugin({
				event: "saveGroup",
				group: { name, lightIds: checked.map(cb => cb.value) }
			});
		});

		// Listen for backend responses via raw WebSocket
		document.addEventListener("sdpi:message", (evt) => {
			const p = evt.detail || {};

			if (p.event === "getDevices" && p.items) {
				// Flatten: items may have children (Lights/Groups optgroups)
				devices = [];
				(p.items || []).forEach(item => {
					if (item.children) {
						// Only include lights for group creation (not groups)
						if (item.label === "Lights") {
							devices.push(...item.children);
						}
					} else if (item.value) {
						devices.push(item);
					}
				});
			}

			if (p.event === "groupsReceived" && p.groups) {
				renderGroups(p.groups);
			}

			if (p.event === "groupSaved") {
				if (p.success) {
					showStatus("Group created!", false);
					createForm.style.display = "none";
					sendToPlugin({ event: "getGroups" });
					// Refresh device dropdown to include new group
					document.querySelectorAll("sdpi-select[datasource]").forEach(el => {
						if (el.refresh) el.refresh();
					});
				} else {
					showStatus(p.error || "Failed", true);
				}
			}

			if (p.event === "groupDeleted") {
				if (p.success) {
					showStatus("Deleted", false);
					sendToPlugin({ event: "getGroups" });
					document.querySelectorAll("sdpi-select[datasource]").forEach(el => {
						if (el.refresh) el.refresh();
					});
				} else {
					showStatus(p.error || "Failed", true);
				}
			}
		});

		// Fetch groups and devices
		sendToPlugin({ event: "getGroups" });
		sendToPlugin({ event: "getDevices" });
	}

	// ── Initialize ──
	function init() {
		const client = SDPIComponents.streamDeckClient;

		client.didReceiveGlobalSettings.subscribe((msg) => {
			const apiKey = msg.payload?.settings?.apiKey;
			showPanel(!apiKey);
		});

		if (hasConditionalItems) {
			client.didReceiveSettings.subscribe((msg) => {
				const mode = msg.payload?.settings?.controlMode;
				if (mode) updateConditionalVisibility(mode);
			});
		}

		client.getGlobalSettings();
		initGroupManager(client);
	}

	const check = setInterval(() => {
		if (typeof SDPIComponents !== "undefined" && SDPIComponents.streamDeckClient) {
			clearInterval(check);
			init();
		}
	}, 50);

	setTimeout(() => {
		clearInterval(check);
		if (setupWrapper.classList.contains("hidden") && settingsWrapper.classList.contains("hidden")) {
			showPanel(true);
		}
	}, 3000);

	updateConditionalVisibility("toggle");
});
