/**
 * Shows the current value on sdpi-range sliders in real time.
 * Reaches into the shadow DOM to listen for native input events on the
 * underlying <input type="range">, then updates the sdpi-item label.
 */
(function () {
	function init() {
		document.querySelectorAll("sdpi-range[data-suffix]").forEach(function (range) {
			var suffix = range.getAttribute("data-suffix") || "";
			var item = range.closest("sdpi-item");
			if (!item) return;

			var baseLabel = item.getAttribute("label") || "";
			var attached = false;

			function update(val) {
				if (val != null && val !== "") {
					item.setAttribute("label", baseLabel + " \u00B7 " + val + suffix);
				}
			}

			function readValue() {
				// Prefer shadow DOM input value, fall back to component value
				var shadow = range.shadowRoot;
				if (shadow) {
					var input = shadow.querySelector("input[type=range]");
					if (input) return input.value;
				}
				return range.value;
			}

			function tryAttach() {
				var shadow = range.shadowRoot;
				if (!shadow) return false;
				var input = shadow.querySelector("input[type=range]");
				if (!input) return false;
				input.addEventListener("input", function () {
					update(input.value);
				});
				return true;
			}

			// Keep trying to attach and read value until we succeed
			var attempts = 0;
			var poll = setInterval(function () {
				if (!attached) attached = tryAttach();
				var v = readValue();
				if (v != null && v !== "") {
					update(v);
					if (attached) clearInterval(poll);
				}
				if (++attempts > 30) clearInterval(poll);
			}, 100);

			// valuechange fires when SDPI loads saved settings
			range.addEventListener("valuechange", function () {
				update(range.value);
			});
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
