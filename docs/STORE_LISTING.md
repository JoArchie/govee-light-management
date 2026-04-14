# Elgato Marketplace Store Listing — v2.1.0

Use this content when submitting v2.1.0 to the Elgato Maker Console.

---

## Short Description (manifest)

Control your Govee smart lights from Stream Deck

---

## Full Description (Maker Console, max 4000 chars)

Control your Govee smart lights directly from Stream Deck — no phone, no app switching, no delay.

Govee Light Management gives you **12 purpose-built actions** across keypads and Stream Deck+ dials. Toggle power, set brightness, pick colors, apply scenes, activate music-reactive lighting, and paint individual segments on your RGB IC strips. Every action syncs live state from your lights so the display always matches reality.

### Keypad Actions (8)

- **On / Off** — Toggle power with a single tap. Shows a filled or empty dot so you always know the current state. Supports toggle, force-on, and force-off modes. Works with individual lights and light groups.
- **Brightness** — Set brightness from 0 to 100%. Treats 0% as "turn off" so a single button can dim to black.
- **Color** — Set any RGB color using the built-in color picker. One tap applies the color to your selected light or group.
- **Color Temperature** — Switch between warm white (2000K) and cool daylight (9000K). Choose a preset temperature and apply with one tap.
- **Segment Color** — Paint rainbow, solid, or gradient patterns across your RGB IC light strip. Choose the start and end segments (1–15) and the hue range.
- **Scene** _(new)_ — Apply dynamic scenes like Sunrise, Aurora, Rainbow, and more. Scenes are fetched live from each device so you only see what your light actually supports.
- **Music Mode** _(new)_ — Activate audio-reactive lighting. Choose from device-specific modes (Rhythm, Energic, Spectrum, Rolling) with adjustable sensitivity. Your lights pulse and change color in sync with sound.
- **Feature Toggle** _(new)_ — One-tap control for Nightlight, Gradient, DreamView, and Scene Stage. Features are auto-filtered by device capability so you never see options your light doesn't support.

### Stream Deck+ Dial Actions (4)

- **Brightness Dial** — Rotate to scrub brightness from 0 to 100%. Press to toggle power. The touchscreen bar shows your current level with a purple-to-blue gradient.
- **Color Hue Dial** — Rotate through the full 360° color wheel. Press to toggle power. A rainbow gradient bar tracks your position with a white indicator dot.
- **Color Temperature Dial** — Rotate from warm amber (2000K) to cool blue (9000K). Press to toggle power. The warm-to-cool gradient bar shows exactly where you are.
- **Segment Color Dial** — Rotate to select a hue, then the color is applied to your chosen segment. Press to toggle power. Ideal for fine-tuning individual segments on RGB IC strips.

All dial actions feature **live state sync on appear**, deferred API calls (so the display updates instantly while the light catches up), and **visual flash feedback** (green for success, red for error).

### Setup

1. Install the plugin from the Elgato Marketplace
2. Get a free API key from the Govee app (Settings → Apply for API Key)
3. Drag an action onto a button, paste the key once, pick a light

The API key is entered once and shared across all actions. No accounts, no servers, no configuration files.

### Requirements

- Stream Deck app 6.9 or later
- macOS 12+ or Windows 10+
- A Govee developer API key (free, from the Govee mobile app)
- Govee smart lights connected to your Govee account

### Compatibility

Works with all Govee lights that support the Govee Developer API, including LED strips, bulbs, light bars, floor lamps, and RGB IC strip lights. Supports Stream Deck, Stream Deck MK.2, Stream Deck XL, Stream Deck Mini, Stream Deck Neo, Stream Deck Pedal, and Stream Deck+.

---

## What's New / Release Notes (v2.1.0)

**Three powerful new actions and smarter dials**

### New Actions

- **Scenes** — Apply dynamic scenes like Sunrise, Aurora, and Rainbow with a single tap. Scenes are fetched live from each device so you only see what your light actually supports.
- **Music Mode** — Turn your room into a light show. Activate audio-reactive lighting with device-specific modes (Rhythm, Energic, Spectrum, Rolling) and adjustable sensitivity.
- **Feature Toggle** — One-tap control for Nightlight, Gradient, DreamView, and Scene Stage. Features are auto-filtered by device capability — no guessing what works.

### Smarter Dials

- **Live state sync** — Dials now read the actual state of your lights when they appear. No more starting at default values.
- **Power toggle on press** — Press any dial to toggle power on/off, matching the keypad experience.
- **Visual flash feedback** — Green flash on success, red on error. You always know if the command landed.
- **Smooth rotation** — Deferred API calls mean the display updates instantly while the light catches up. No lag, no jitter.

### Improvements

- **Fixed segment numbering** — Segment indices now display 1–15 in the UI, matching user expectations.
- Updated all dependencies to latest stable versions.

---

## What's New / Release Notes (v2.1.1)

**Critical bug fix for accounts with device groups**

- **Fixed crash with Govee group entries** — Accounts with device groups (BaseGroup, SameModeGroup, DreamViewScenic) no longer crash the plugin. The Govee API returns group objects that lack required fields, which caused strict schema validation to reject the entire response and crash the plugin process. Discovery now gracefully skips invalid entries.
- **Resilient transport layer** — Individual transport failures no longer block device discovery from other transports.
- **Cached fallback** — If discovery fails, the plugin falls back to cached device data instead of showing an empty dropdown.

---

## Gallery Images

Upload from `docs/gallery/` (all 1920x1080):

| File                 | Slide                                           |
| -------------------- | ----------------------------------------------- |
| `1-hero.png`         | Hero — "Tactile smart light control"            |
| `2-actions.png`      | All 8 keypad actions grid                       |
| `3-dials.png`        | Stream Deck+ dial layouts                       |
| `4-setup.png`        | 3-step setup walkthrough                        |
| `5-v21-features.png` | New in v2.1 — Scene, Music Mode, Feature Toggle |

---

## Category

Lighting

## Tags

govee, smart lights, led, rgb, home automation, iot, color, brightness, scenes, music mode
