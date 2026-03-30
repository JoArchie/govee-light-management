/**
 * WebSocket bridge for custom PI ↔ Plugin messaging.
 * Must be loaded BEFORE sdpi-components.js.
 *
 * Patches WebSocket.prototype.send to capture the connection that SDPI creates,
 * then reuses it for custom sendToPlugin messages.
 */
(function() {
	let capturedWs = null;
	let capturedUUID = null;
	let capturedAction = null;
	let pendingMessages = [];

	window.sendToPlugin = function(payload) {
		if (capturedWs && capturedWs.readyState === 1 && capturedUUID) {
			capturedWs.send(JSON.stringify({
				event: "sendToPlugin",
				action: capturedAction || "",
				context: capturedUUID,
				payload: payload,
			}));
		} else {
			pendingMessages.push(payload);
		}
	};

	// Patch WebSocket.prototype.send to capture the connection
	const origSend = WebSocket.prototype.send;
	WebSocket.prototype.send = function(data) {
		// Capture the first WebSocket that sends a registration message
		if (!capturedWs) {
			try {
				const msg = JSON.parse(data);
				if (msg.uuid && msg.event) {
					capturedWs = this;
					capturedUUID = msg.uuid;

					// Listen for sendToPropertyInspector messages
					this.addEventListener("message", function(evt) {
						try {
							const m = JSON.parse(evt.data);
							if (m.event === "sendToPropertyInspector") {
								document.dispatchEvent(new CustomEvent("sdpi:message", { detail: m.payload }));
							}
						} catch(e) { /* ignore */ }
					});

					// Send pending messages after a short delay
					setTimeout(function() {
						pendingMessages.forEach(function(p) { window.sendToPlugin(p); });
						pendingMessages = [];
					}, 500);
				}
			} catch(e) { /* not JSON, ignore */ }
		}

		return origSend.call(this, data);
	};

	// Capture action info from connectElgatoStreamDeckSocket
	const origConnect = window.connectElgatoStreamDeckSocket;
	window.connectElgatoStreamDeckSocket = function(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
		capturedUUID = inUUID;
		try { capturedAction = JSON.parse(inActionInfo).action; } catch(e) { /* ignore */ }
		if (origConnect) origConnect(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo);
	};
})();
