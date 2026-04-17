# Changelog

All notable changes to this project are documented below. This project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.2.0] - 2026-04-17

### Major Features — 5 new capabilities across 3 new actions

#### Enhanced Color Picker

- **Color Palettes** — 4 preset palettes (Warm, Cool, Pastel, Vivid) with 20 curated colors
- **Recent Colors** — Auto-tracks the last 10 colors you applied, persists across sessions
- **Click-to-Apply** — Swatches in the Color action property inspector
- **Clear Recent** — One-click reset for recent colors

#### Scheduling System

- **New Schedule Action** — Time-based automation for any light or group
- **3 schedule types**:
  - **Daily** — Fire at HH:MM every day
  - **Weekly** — Fire on selected days (Mon-Sun chip selector)
  - **Delay** — Fire N seconds after button press
- **Press to toggle** — Press the Stream Deck button to enable/disable
- **Background scheduler** — 30-second polling loop fires scheduled actions automatically
- **Persistent** — Schedules survive plugin restarts via global settings

#### Multi-Action Sequences

- **New Sequence Action** — Chain multiple light commands with delays
- **Step Builder UI** — Add action steps or timing delays (up to 5 min)
- **Commands supported**: on, off, toggle, brightness
- **Reorder** — Up/down controls for step arrangement
- **Press to run** — Press again to cancel mid-sequence
- **Error-resilient** — Continues through individual step failures

#### Custom RGB Effects

- **New Custom Effect Action** — Play animated lighting effects on RGB IC strips
- **4 built-in presets**:
  - **Rainbow Wave** — 36-frame looping hue rotation
  - **Pulse** — Fading brightness loop
  - **Fade** — 20-step color transition
  - **Strobe** — On/off flashing
- **Live preview** — Property inspector shows 15-segment color strip
- **Concurrent playback** — Different effects on different lights simultaneously
- **Once/Loop modes** — Effects auto-loop or play once

#### Device Capability Improvements

- **Device Classifier** — Automatic detection of Bulb, LED Strip, Light Bar, or Floor Lamp from model number
- **Capability Registry** — Centralized metadata with helpful descriptions for all 8 capabilities
- **Better error messages** — "My Light (LED Strip) doesn't support music mode. Music mode is available on most RGB-capable lights with a built-in microphone."
- **Extended cache TTL** — Device discovery cache doubled from 15s to 30s, reducing API calls

### Technical Improvements

- **Domain-Driven Design** — 3 new entities, 5 new value objects, 8 new domain services
- **Test Coverage** — 177 new tests (56% increase: 311 → 488)
- **Clean Architecture** — Phase-based development with independent PRs
- **Zero regressions** — All existing functionality preserved

### Stream Deck Action Count

- **v2.1.4**: 14 actions (9 keypad + 5 dial)
- **v2.2.0**: 17 actions (12 keypad + 5 dial)
- New actions: Schedule, Sequence, Custom Effect

### Compatibility

- Fully backward-compatible with v2.1.x
- Existing settings preserved
- Same API key, same devices, same workflows

---

## [2.1.4] - 2026-04-17

### Bug Fixes

- **Fixed dial state sync** — Dials now properly detect and read current light state on first appear
  - Resolves issue where dial values would default to 50% even if light was off
  - `syncLightState()` now returns boolean to indicate successful sync
  - Better handling of offline devices during initial state loading
- **Improved brightness dial display** — Shows "Off" when light is powered off instead of brightness percentage
- **Fixed overlay mode clearing** — Brightness and other actions now properly clear gradient/nightlight overlays before setting solid colors (issue #170)

### Performance

- Reduced state sync failures by adding fallback to cached state data
- Better offline device handling prevents timeout delays

---

## [2.1.3] - 2026-04-17

### Major Features

#### Stream Deck+ Encoder Enhancements

- **New: Saturation Dial** — Control color intensity from pure white (0%) to full saturation (100%)
  - Perfect companion to the Color Hue dial for precise color control
  - Configurable sensitivity (1-10% per tick)
  - Live state sync shows current saturation level
  - Works with both individual lights and light groups

#### Comprehensive Group Support

- **Full Dial Support for Groups** — All 5 Stream Deck+ dials now work seamlessly with light groups:
  - Select a group in any dial's property inspector
  - Live state sync reflects the combined group state
  - Press dial to toggle power on entire group
  - Rotate to control all lights simultaneously
- **Music Mode Groups** — `MusicModeAction` now supports light groups
  - Apply music-reactive lighting to entire rooms
  - All lights in group respond together
  - Same device-specific mode and sensitivity configuration

- **Feature Toggle Groups** — `ToggleAction` now supports light groups
  - Toggle Nightlight, Gradient, DreamView, Scene Stage on entire groups
  - Auto-filtered features based on group capabilities
  - Same one-tap simplicity as individual light toggles

### Improvements

- Enhanced group state handling for more accurate reflected status
- Improved compatibility across all actions with groups
- Better error reporting for group operations

### Fixes

- Fixed group state reading for mixed-capability lights (some support brightness, others don't)
- Improved fallback behavior when some lights in group are offline
- Better handling of capability differences within a group

### Dependencies

- Updated `@felixgeelhaar/govee-api-client` to v3.2.0
- All development dependencies kept current

---

## [2.1.2] - 2026-04-10

### Fixes

- Fixed dialAction state sync to properly read current saturation and hue from device
- Improved error handling when lights report incomplete capability data
- Better handling of stale device cache during rapid actions

### Performance

- Reduced API calls during dial state sync by 20%
- Improved caching strategy for device discovery

---

## [2.1.1] - 2026-04-03

### Critical Fixes

#### Govee Group Entry Crash

- **Fixed crash with Govee group entries** — Accounts with device groups (BaseGroup, SameModeGroup, DreamViewScenic) no longer crash the plugin
  - The Govee API returns group objects that lack required device capability fields
  - Strict schema validation was rejecting entire discovery responses
  - Plugin now gracefully skips invalid group entries
  - Discovery continues from other transports instead of failing completely

### Infrastructure Improvements

- **Resilient Transport Layer** — Individual transport failures no longer block discovery
- **Cached Fallback** — If discovery fails, plugin falls back to cached device data instead of showing empty dropdowns
- **Better Error Recovery** — More graceful degradation when API is temporarily unavailable

### Testing

- Added tests for Govee group entry handling
- Improved discovery failure recovery tests

---

## [2.1.0] - 2026-03-28

### Major Features

#### Three New Keypad Actions

- **Scene Action** — Apply dynamic scenes to lights with device-specific scene discovery
  - Sunrise, Sunset, Rainbow, Aurora, Nightlight, and more
  - Scenes are fetched live from each device
  - Only shows scenes that the selected light actually supports
  - Beautiful property inspector with emoji-enhanced scene names

- **Music Mode Action** — Activate audio-reactive lighting
  - 4 device-specific music modes: Rhythm, Energic, Spectrum, Rolling
  - Adjustable audio sensitivity (0-100%)
  - Auto-color toggle for automatic color cycling
  - Perfect for parties and entertainment

- **Feature Toggle Action** — One-tap control for light features
  - Nightlight mode (soft ambient lighting)
  - Gradient mode (color gradient effects)
  - DreamView mode (voice-controlled scenes)
  - Scene Stage mode (synchronized scenes)
  - Features auto-filtered by device capability

#### Stream Deck+ Dial Improvements

- **Live State Sync** — Dials now read the actual state of your lights when they appear
  - No more starting at default values
  - Shows true brightness, color temperature, hue, and saturation
  - Perfect for switching between devices mid-session

- **Power Toggle on Press** — Press any dial to toggle power on/off
  - Consistent with keypad On/Off action
  - Same visual feedback system

- **Visual Feedback System** — All dials provide clear status indicators
  - Green flash = command succeeded
  - Red flash = error (check API key, network, light status)
  - Smooth visual response to every action

- **Deferred Updates** — Display updates instantly while light catches up
  - Zero lag, responsive feel
  - Rotation feels buttery smooth even at 100ms latency

### Action Enhancements

- **Enhanced LightControlAction** — Added 4 new control modes
  - `nightlight-on` / `nightlight-off` — Toggle nightlight mode
  - `gradient-on` / `gradient-off` — Toggle gradient effect
  - Total of 10 supported control modes
  - Better title generation for new modes

### Property Inspector Improvements

- New Vue 3 components: `SceneControlView`, `MusicModeView`, `SegmentColorDialView`
- Improved light filtering by capability
- Real-time settings persistence via WebSocket
- Better form validation and user feedback

### Repository Interface Expansion

Extended `ILightRepository` with new methods:

- `applyScene(light, scene)` — Apply a dynamic scene
- `setMusicMode(light, config)` — Set music-reactive mode
- `toggleNightlight(light, enabled)` — Toggle nightlight
- `toggleGradient(light, enabled)` — Toggle gradient
- `getDynamicScenes(light)` — Get device-specific scenes
- `setSegmentColors(light, segments)` — Set RGB segment colors
- `setLightScene(light, scene)` — Apply preset scene

All methods fully implemented using govee-api-client v3.1.13.

### Domain Layer Expansion

New domain value objects for advanced features:

- **Scene** — Immutable scene configuration with factory methods
- **SegmentColor** — RGB IC light segment configuration
- **MusicModeConfig** — Music mode settings with 4 supported modes

New domain services:

- **SceneService** — Manage scene application and capability checking
- **DeviceService** — High-level device operations with caching and capability normalization

New infrastructure mappers:

- **SceneMapper** — Domain Scene to API LightScene conversion
- **MusicModeMapper** — MusicModeConfig to API MusicMode mapping
- **SegmentColorMapper** — Bidirectional segment color mapping

### Testing

- Added 172 new tests for v2.1.0 features (160 → 332 total)
  - Domain value objects: 85 tests (Scene, SegmentColor, MusicModeConfig)
  - Domain services: 15 tests (SceneService)
  - Stream Deck actions: 72 tests (Scene, Music, SegmentDial, LightControl enhancements)
- 100% test passing rate with comprehensive coverage

### Documentation

- Created comprehensive guides for all new features
- Updated README with new action descriptions
- Added advanced features documentation
- Property inspector help sections for each new action

### Deprecations

- Old template files removed (govee-api.ts, increment-counter.ts, open-product-page.ts)

---

## [2.0.0] - 2026-02-20

### Breaking Changes

- **Backend Build System Migration** — Switched from Vite to Rollup for backend bundling
  - Fixes packaged `.streamDeckPlugin` files crash-loop issue
  - Correct Node.js module resolution (browser: false)
  - Single bundled output with no external dependencies
  - ESM output with proper export handling

### Major Features

#### Stream Deck+ Encoder Support

- **Brightness Dial** — Rotate to adjust brightness (1-100%), press to toggle power
  - Configurable step size (1-25% per tick)
  - Purple-to-blue gradient feedback bar
  - Live brightness percentage display

- **Color Temperature Dial** — Rotate to adjust warmth (2000K-9000K), press to toggle power
  - Configurable step size (50-500K per tick)
  - Warm amber-to-cool blue gradient feedback
  - Live temperature in Kelvin display

- **Color Hue Dial** — Rotate through full spectrum (0-360°), press to toggle power
  - Configurable step size (1-90° per tick)
  - Configurable saturation (0-100%)
  - Rainbow gradient feedback bar
  - Full HSV color space support

- **Segment Color Dial** — Rotate for hue, press to apply to segment
  - Target specific RGB IC light segments (1-15)
  - Configurable hue sensitivity
  - Live color preview
  - Per-segment color control

### Action Improvements

- All keypad actions now have consistent property inspector UI
- Better light discovery with capability filtering
- Improved error messages and validation

### Architecture

- Complete Domain-Driven Design implementation
- Clean separation: Domain → Infrastructure → Application layers
- Pluggable transport abstraction for future connectivity options
- DeviceService with intelligent caching (15s TTL)
- TelemetryService for metrics and observability

### Infrastructure

- Govee API integration via `@felixgeelhaar/govee-api-client`
- Rate limiting and exponential backoff
- Circuit breaker pattern for API resilience
- Health monitoring with periodic checks

### Frontend

- Vue 3 with Composition API
- XState machines for complex workflows
- WebSocket communication
- DiagnosticsPanel component for system health
- Real-time state management

### Testing

- 160+ unit and integration tests
- Vitest with jsdom environment
- Playwright end-to-end tests
- 80%+ code coverage target
- Red-Green-Refactor TDD approach

### CI/CD

- GitHub Actions workflow
- Automated testing on every push
- CodeQL security scanning
- Dependabot for dependency management

---

## [1.0.0] - 2026-01-15

### Initial Release

#### Core Features

- **On/Off Action** — Toggle lights with state indicators (● on, ○ off, ◐ mixed)
- **Brightness Action** — Set brightness 0-100% (0% = off)
- **Color Action** — Set RGB color via hex picker
- **Color Temperature Action** — Set warmth 2000K-9000K
- **Segment Color Action** — Rainbow, solid, or gradient patterns on RGB IC strips

#### Group Management

- **Create Groups** — Custom light groups with intuitive interface
- **Edit Groups** — Modify names and included lights
- **Delete Groups** — With confirmation prompts
- **Visual Indicators** — ●/○/◐ for group states

#### Architecture

- Enterprise-grade SOLID principles
- TypeScript for type safety
- Comprehensive error handling
- Stream Deck SDK integration

#### Developer Experience

- `npm run watch` for hot reload
- Comprehensive test suite
- ESLint + Prettier formatting
- Husky pre-commit hooks

---

## [Unreleased]

### Ideas for Future Releases

- LAN connectivity for local network control
- WebSocket support for real-time updates
- Scheduled actions and timers
- Enhanced color picker with presets
- Custom effect creation
- Cloud sync for configurations
- Multi-platform support
- Third-party plugin SDK

---

## Format Notes

- **[MAJOR]** indicates breaking changes
- **[MINOR]** indicates new backwards-compatible features
- **[PATCH]** indicates backwards-compatible bug fixes
- **[Deprecated]** indicates features being phased out

For questions about releases, check the [GitHub Releases](https://github.com/felixgeelhaar/govee-light-management/releases) page.
