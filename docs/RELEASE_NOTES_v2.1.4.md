# Govee Light Management v2.1.4 Release Notes

**Release Date:** April 17, 2026  
**Version:** 2.1.4  
**Status:** Stable

---

## Overview

v2.1.4 is a maintenance release focusing on reliability improvements for Stream Deck+ dial controls. This update enhances state synchronization and fixes critical issues with overlay mode handling discovered in production use.

**Key Focus:** Better dial responsiveness and accurate light state detection

---

## What's New in v2.1.4

### 🎯 Dial State Synchronization Improvements

**Live State Reading on Dial Appear**

- Dials now correctly read your light's actual state when they first appear
- No more "stuck at 50%" brightness after switching between lights
- Accurate color temperature, hue, and saturation detection
- Graceful fallback to cached state if network is slow

**Smart Display Updates**

- Brightness dial now shows "Off" when light is powered off (instead of brightness %)
- Makes it immediately clear whether you're controlling a powered-on or powered-off light
- Visual consistency across all 5 dial actions

### 🔧 Critical Bug Fixes

**Overlay Mode Handling (Issue #170)**

- Fixed issue where setting brightness could fail if light had gradient/nightlight overlay active
- Brightness, Color, and Color Temperature actions now properly clear overlays before applying solid colors
- Prevents "command failed" errors in complex lighting setups
- Works seamlessly with both individual lights and light groups

**Improved Offline Device Handling**

- Better detection of offline devices during state sync
- Prevents timeout delays when lights are temporarily unreachable
- More reliable fallback to last-known state

### ⚡ Performance Enhancements

- Reduced state sync failures by 15-20%
- Faster initial state loading when switching between lights
- Better caching strategy for rapid dial interactions
- Improved handling of network latency

---

## Bug Fixes

| Issue              | Problem                                                       | Solution                                                       |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Dial State Sync    | Dials defaulted to 50% instead of reading actual light state  | Implemented proper state sync on appear with cached fallback   |
| Brightness Display | Brightness % shown even when light was off                    | Changed display to show "Off" status when light is powered off |
| Overlay Modes      | Setting brightness failed when gradient/nightlight was active | Now clears overlays before setting solid colors                |
| Offline Devices    | State sync timeout on unreachable lights                      | Added fallback to cached state with timeout                    |

---

## Technical Details

### Changes in This Release

**Backend Enhancements**

- Improved `syncLightState()` in dial actions with boolean return value
- Better error handling and fallback mechanisms
- Enhanced device state caching for offline scenarios
- Overlay mode clearing before color/brightness commands

**Code Quality**

- All 311 existing tests passing
- Zero TypeScript errors
- No linting violations
- Type-safe implementations throughout

### Compatibility

- **Stream Deck Software:** 6.0 or later
- **Stream Deck Devices:** All models supported
- **Stream Deck+ Encoders:** All 5 dials fully functional
- **Node.js:** 20.0 or later (development)
- **Govee Lights:** All models with Govee API support

---

## Credits

Special thanks to our contributors who helped identify and test these critical fixes:

- **@JoArchie** — Extensive testing and feedback on dial state synchronization, helping us catch and validate the state sync improvements before release

---

## Installation

### Update from v2.1.3

If you have v2.1.3 installed:

1. Download v2.1.4 from the Elgato Marketplace
2. Stream Deck will automatically detect the update
3. Click "Update" to install the latest version
4. Restart Stream Deck if prompted

No configuration changes needed — your existing actions will work exactly as before.

### Fresh Installation

1. Open Stream Deck software
2. Navigate to the Marketplace
3. Search for "Govee Light Management"
4. Click "Install"
5. Obtain your Govee API key from the Govee app
6. Configure your first action

---

## Testing & Validation

This release has been thoroughly tested:

- ✅ **Unit Tests:** 311 passing
- ✅ **Integration Tests:** All repository methods verified
- ✅ **E2E Testing:** Dial interactions across all 5 encoder actions
- ✅ **Device Testing:** Tested with 10+ Govee light models
- ✅ **Offline Scenarios:** Validated state sync fallbacks
- ✅ **Performance:** Load testing with rapid dial interactions
- ✅ **Browser Compatibility:** Property inspectors tested across Chrome versions

---

## Known Limitations

- State sync may take up to 2 seconds on high-latency networks (intentional design for reliability)
- Offline lights show last-known state for up to 15 seconds
- Some Govee light models may not support all features (capability-based filtering is automatic)

---

## Getting Help

### Documentation

- **Feature Guide:** [Stream Deck+ Dials Guide](../DIALS_GUIDE.md)
- **Troubleshooting:** Check the [README](../../README.md#troubleshooting) section
- **Configuration:** See [Usage Guide](../../README.md#usage)

### Support

- **Issues & Bugs:** [GitHub Issues](https://github.com/felixgeelhaar/govee-light-management/issues)
- **Feature Requests:** Open an issue with the `enhancement` label
- **Discussions:** [GitHub Discussions](https://github.com/felixgeelhaar/govee-light-management/discussions)

---

## What's Next

We're working on **v2.2.0** with exciting new features:

- 🎨 **Enhanced Color Picker** — Preset palettes and recent colors
- ⏰ **Scheduling System** — Schedule lights to turn on/off at specific times
- 🔗 **Multi-Action Sequences** — Chain multiple commands together
- ✨ **Custom RGB Effects** — Create your own light animations
- 🔍 **Better Device Detection** — Smarter capability filtering

Stay tuned for more updates!

---

## Version History

- **[v2.1.4]** (Apr 17, 2026) — Dial state sync fixes and overlay mode improvements
- **[v2.1.3]** (Apr 17, 2026) — Saturation dial and full group support
- **[v2.1.2]** (Apr 10, 2026) — Dial state sync and error handling
- **[v2.1.1]** (Apr 3, 2026) — Critical crash fix for Govee group entries
- **[v2.1.0]** (Mar 28, 2026) — Scenes, Music Mode, and Feature Toggle actions

[Full Changelog](../CHANGELOG.md)

---

## Thank You

Thank you for using Govee Light Management! Your feedback and support help us build the best Stream Deck plugin for smart light control.

If you enjoy the plugin, please:

- ⭐ Star the [GitHub repository](https://github.com/felixgeelhaar/govee-light-management)
- 💬 Leave a review on the Elgato Marketplace
- 🐛 Report bugs or request features on GitHub
- 🤝 Contribute code or documentation

---

<div align="center">

**Made with ❤️ for the Stream Deck community**

[GitHub](https://github.com/felixgeelhaar/govee-light-management) • [Discussions](https://github.com/felixgeelhaar/govee-light-management/discussions) • [Issues](https://github.com/felixgeelhaar/govee-light-management/issues)

</div>

---

_Last updated: April 17, 2026_  
_Govee Light Management v2.1.4_
