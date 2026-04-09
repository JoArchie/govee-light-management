# Marketplace Gallery Templates

These HTML files render at exactly **1920×1080** using the real plugin icons.
Open each in a browser and take a screenshot to produce marketplace gallery images — no AI image generation required.

## How to capture

### Option 1: Chrome headless (recommended, pixel-perfect)

```bash
cd docs/gallery
for page in 1-hero 2-actions 3-dials 4-setup; do
  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --headless --disable-gpu --hide-scrollbars \
    --window-size=1920,1080 \
    --screenshot=$page.png \
    file://$PWD/$page.html
done
```

### Option 2: Manual screenshot

1. Open each HTML file in Chrome
2. Open DevTools → toggle device toolbar (Cmd+Shift+M)
3. Set to "Responsive" with exact dimensions 1920×1080
4. Right-click the page → "Capture full size screenshot"

### Option 3: Playwright

```bash
npx playwright screenshot --viewport-size=1920,1080 \
  file://$(pwd)/docs/gallery/1-hero.html gallery-1.png
```

## Files

| File             | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `1-hero.html`    | Hero shot with headline + 4 action icons              |
| `2-actions.html` | 5-icon keypad actions overview                        |
| `3-dials.html`   | Stream Deck+ dial experience with touchscreen layouts |
| `4-setup.html`   | 3-step setup walkthrough                              |

Upload the captured PNGs to the Elgato Marketplace listing (minimum 3, no cropped info).
