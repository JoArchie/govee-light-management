# Release Guide v2.1.3

Complete guide for preparing, building, and releasing Govee Light Management v2.1.3 to the Elgato Marketplace.

---

## 📋 What's New in v2.1.3

### Features

- **Saturation Dial** — New Stream Deck+ encoder action for color intensity control
- **Full Group Support for Dials** — All 5 dials now work with light groups
- **Music Mode Groups** — Apply music-reactive lighting to entire groups
- **Feature Toggle Groups** — Toggle nightlight, gradient, etc. on entire groups

### Updated Files

- 5 Stream Deck+ dial actions (added Saturation)
- Updated gallery images with Saturation dial
- Comprehensive documentation and marketing materials

---

## 📁 Release Artifacts Created

### Documentation

| File                    | Purpose                            | Location |
| ----------------------- | ---------------------------------- | -------- |
| `CHANGELOG.md`          | Complete version history           | Root     |
| `DIALS_GUIDE.md`        | Comprehensive dial marketing guide | `/docs/` |
| `MARKETPLACE_ASSETS.md` | Gallery generation & upload guide  | `/docs/` |
| `RELEASE_CHECKLIST.md`  | Step-by-step release process       | `/docs/` |
| `STORE_LISTING.md`      | Marketplace copy & release notes   | `/docs/` |

### Marketing Assets

| File                              | Purpose           | Status          | Size   |
| --------------------------------- | ----------------- | --------------- | ------ |
| `docs/gallery/1-hero.png`         | Hero image        | Current         | ~744KB |
| `docs/gallery/2-actions.png`      | All actions grid  | Current         | ~822KB |
| `docs/gallery/3-dials.png`        | All 5 dials       | ⚠️ Needs update | ~614KB |
| `docs/gallery/4-setup.png`        | Setup walkthrough | Current         | ~727KB |
| `docs/gallery/5-v21-features.png` | v2.1 features     | Current         | ~775KB |

**Note:** Gallery image `3-dials.html` already includes Saturation dial, but PNG needs to be regenerated.

### Scripts

| File                          | Purpose                          | Usage                           |
| ----------------------------- | -------------------------------- | ------------------------------- |
| `scripts/generate-gallery.sh` | Auto-generate marketplace images | `./scripts/generate-gallery.sh` |

---

## 🚀 Release Process

### Phase 1: Quality Assurance (5 mins)

```bash
# Run all checks
npm run test
npm run type-check
npm run lint
npm run format:check
npm run build

# Verify no errors
echo "✅ All quality checks passed"
```

### Phase 2: Generate Marketplace Assets (2 mins)

```bash
# Regenerate gallery images from updated HTML templates
./scripts/generate-gallery.sh

# Verify images generated
ls -lh docs/gallery/*.png
```

Expected output:

```
  ✓ 1-hero.png (~744KB)
  ✓ 2-actions.png (~822KB)
  ✓ 3-dials.png (~614KB)  ← Updated with Saturation dial
  ✓ 4-setup.png (~727KB)
  ✓ 5-v21-features.png (~775KB)
```

### Phase 3: Update Version (1 min)

```bash
# Update version in package.json
npm version minor  # Or use 'patch' for bug fixes

# This updates package.json and creates git tag
```

### Phase 4: Commit & Tag (2 mins)

```bash
# Stage documentation changes
git add \
  CHANGELOG.md \
  README.md \
  docs/ \
  package.json \
  com.felixgeelhaar.govee-light-management.sdPlugin/manifest.json

# Commit
git commit -m "chore: release v2.1.3 — Saturation dial and group support"

# Create annotated tag
git tag -a v2.1.3 -m "Release v2.1.3
- New: Saturation dial for Stream Deck+
- New: Group support for all dials
- New: Music mode and feature toggle group actions
- Improved: State handling for mixed-capability groups"

# Push
git push origin main
git push origin v2.1.3
```

### Phase 5: Package Plugin (2 mins)

```bash
# Validate plugin
npm run streamdeck:validate

# Package for distribution
npm run streamdeck:pack

# Verify package
ls -lh dist/*.streamDeckPlugin
```

Expected: Single `.streamDeckPlugin` file (~2-5MB)

### Phase 6: Test Package (5 mins)

1. **Uninstall current version** from Stream Deck
2. **Install packaged plugin** from `dist/`
3. **Test each action:**
   - [ ] On/Off action
   - [ ] Brightness action
   - [ ] Color action
   - [ ] Color Temperature action
   - [ ] Segment Color action
   - [ ] Scene action
   - [ ] Music Mode action
   - [ ] Feature Toggle action
4. **Test each dial:**
   - [ ] Brightness Dial
   - [ ] Color Temperature Dial
   - [ ] Color Hue Dial
   - [ ] Saturation Dial (NEW)
   - [ ] Segment Color Dial
5. **Test with groups:**
   - [ ] Select a group in dial property inspector
   - [ ] Verify dial controls all lights in group
   - [ ] Verify live state sync shows combined state
6. **Test error scenarios:**
   - [ ] Invalid API key → red flash, error message
   - [ ] Offline light → red flash, graceful fallback
   - [ ] Network issues → retry mechanism

### Phase 7: Upload to Marketplace (10 mins)

#### Step 1: Prepare Marketplace Copy

Have ready:

- All content from `docs/STORE_LISTING.md`
- Gallery images from `docs/gallery/` (5 PNG files)
- Plugin file from `dist/` (the `.streamDeckPlugin`)

#### Step 2: Log Into Maker Console

```
https://maker.elgato.com/
→ Sign in with Elgato account
→ Select "Govee Light Management"
→ Navigate to "Releases" or "Edit Listing"
```

#### Step 3: Update Plugin Version

- Plugin Version: `2.1.3.0` (manifest.json format)
- App Minimum Version: `6.9`
- Release Date: Today's date

#### Step 4: Update Listing Content

Copy from `docs/STORE_LISTING.md`:

**Short Description:**

```
Control your Govee smart lights from Stream Deck
```

**Full Description:**

```
[Copy from STORE_LISTING.md "Full Description" section]
```

**What's New / Release Notes:**

```
[Copy from STORE_LISTING.md "What's New / Release Notes (v2.1.3)" section]
```

**Category:** Lighting

**Tags:** govee, smart lights, led, rgb, home automation, iot, color, brightness, scenes, music mode

#### Step 5: Upload Gallery Images

Click "Upload New Image" for each:

1. `1-hero.png` — Hero shot
2. `2-actions.png` — All actions
3. `3-dials.png` — All 5 dials (with Saturation)
4. `4-setup.png` — Setup walkthrough
5. `5-v21-features.png` — v2.1 features

Verify each image:

- ✓ Displays correctly
- ✓ No cropped content
- ✓ Clear and readable
- ✓ Shows all features

#### Step 6: Upload Plugin File

1. Click "Upload New Build"
2. Select `.streamDeckPlugin` from `dist/`
3. Set Release Type: "Release" or "Release Candidate"
4. Enter release notes (same as "What's New")
5. Verify upload progress

#### Step 7: Preview & Review

1. Click "Preview Marketplace Listing"
2. Review everything:
   - Description is accurate
   - All 5 gallery images appear in order
   - Plugin download link works
   - Feature list is current
   - Release notes are clear

#### Step 8: Submit for Review

1. Click "Submit for Review"
2. Confirm all information
3. Receive confirmation email

**Review typically takes 3-5 business days**

---

## ✅ Pre-Release Verification Checklist

### Code Quality

- [ ] `npm test` passes (all tests green)
- [ ] `npm run type-check` passes (no TypeScript errors)
- [ ] `npm run lint` passes (no linting issues)
- [ ] `npm run build` succeeds (no build errors)
- [ ] Test coverage >80%

### Documentation

- [ ] `CHANGELOG.md` updated with v2.1.3 section
- [ ] `README.md` version badge updated to 2.1.3
- [ ] `STORE_LISTING.md` reflects v2.1.3 features
- [ ] `DIALS_GUIDE.md` includes all 5 dials
- [ ] `docs/RELEASE_CHECKLIST.md` is accurate
- [ ] `package.json` version matches intended release

### Assets

- [ ] Gallery HTML templates up-to-date
- [ ] Gallery images regenerated (3-dials.png with Saturation)
- [ ] All PNG files are 1920×1080
- [ ] All PNG files <2MB
- [ ] SVG assets complete (saturation-dial.svg exists)

### Plugin

- [ ] `manifest.json` version updated
- [ ] All action UUIDs valid and unique
- [ ] `npm run streamdeck:validate` passes
- [ ] `npm run streamdeck:pack` creates `.streamDeckPlugin`
- [ ] Package can be manually installed
- [ ] All actions work in packaged version

### Testing

- [ ] Manually tested all 8 keypad actions
- [ ] Manually tested all 5 dial actions
- [ ] Tested dial group support
- [ ] Tested with individual lights
- [ ] Tested with light groups
- [ ] Tested error scenarios
- [ ] Verified real-time state sync

---

## 📊 Release Statistics

### Code Changes

- **Files Modified:** ~15
- **Documentation Files Added:** 5
- **Total Lines of Documentation:** ~2,500
- **Code Comments:** Minimal (follows project style)

### Actions

- **Total Keypad Actions:** 8
- **Total Dial Actions:** 5 (1 new: Saturation)
- **Total Features:** 13 actions

### Coverage

- **Test Suite:** 388+ tests
- **Test Coverage:** >80%
- **TypeScript:** 100% strict mode
- **ESLint:** Zero warnings

### Performance

- **Build Time:** ~30 seconds
- **Plugin Size:** ~2-3MB
- **Bundle Format:** ESM with single entry point

---

## 🎯 Success Criteria

Release is successful when:

1. ✅ All quality checks pass
2. ✅ Gallery images generated and accurate
3. ✅ Plugin packages without errors
4. ✅ All actions work when installed
5. ✅ Marketplace upload succeeds
6. ✅ Marketplace preview looks correct
7. ✅ Elgato review approves plugin
8. ✅ Plugin appears in marketplace

---

## 📞 Support & Troubleshooting

### Gallery Generation Issues

```bash
# If images won't generate, check:
which "google-chrome"  # or use full path
brew install google-chrome  # Install if missing

# Try verbose output
./scripts/generate-gallery.sh -v
```

### Plugin Validation Issues

```bash
# Validate plugin structure
npm run streamdeck:validate

# Check manifest.json for errors
cat com.felixgeelhaar.govee-light-management.sdPlugin/manifest.json | jq
```

### Marketplace Upload Issues

**File too large:**

```bash
# Compress PNG
pngquant --quality=80-90 *.png
```

**Wrong resolution:**

```bash
# Check dimensions
file docs/gallery/*.png
```

**Upload rejected:**

- Verify plugin version format (X.Y.Z.0)
- Check description under character limits
- Ensure all required fields filled
- Test marketplace copy for special characters

### Test Failures

```bash
# Clear cache and retry
rm -rf node_modules/.vite
npm run test

# Run specific test file
npm test -- path/to/test.spec.ts

# Run with coverage
npm run test:coverage
```

---

## 📝 Marketplace Submission Notes

### What Works Best

✅ **Clear Feature Lists** — Users want to know exactly what they get
✅ **Visual Examples** — Gallery images that show real plugin UI
✅ **Setup Instructions** — Simple 3-step getting started
✅ **Group Support Highlighted** — Major feature in v2.1.3
✅ **Dial Showcase** — All 5 dials displayed with feedback bars
✅ **Real Screenshots** — From actual plugin, not mockups

### What to Avoid

❌ Generic descriptions (be specific)
❌ Outdated features (remove old version info)
❌ Typos or grammar errors
❌ Cropped or incomplete images
❌ Misleading feature claims
❌ Missing required fields

### Review Timeframe

- **Submission:** Takes 5-10 minutes
- **Review:** 3-5 business days (typically)
- **Approval:** Appears in marketplace immediately
- **Peak Hours:** Avoid submitting Friday evening → review next week

---

## 🎉 Post-Release Tasks

After marketplace approval:

1. **Create GitHub Release**

   ```bash
   # Goes to https://github.com/felixgeelhaar/govee-light-management/releases
   # Create release from tag v2.1.3
   # Copy CHANGELOG.md section
   # Attach .streamDeckPlugin file
   ```

2. **Announce Release**
   - GitHub Discussions (if applicable)
   - Stream Deck forums
   - Social media (if applicable)

3. **Close Related Issues**
   - Link to release tag
   - Thank contributors

4. **Collect Feedback**
   - Monitor reviews
   - Fix any reported issues
   - Plan v2.2.0

5. **Update Roadmap**
   - Plan next features
   - Create v2.2.0 milestone

---

## 📚 Reference Documents

- [CHANGELOG.md](../CHANGELOG.md) — Full version history
- [DIALS_GUIDE.md](./DIALS_GUIDE.md) — Comprehensive dial documentation
- [STORE_LISTING.md](./STORE_LISTING.md) — Marketplace copy
- [MARKETPLACE_ASSETS.md](./MARKETPLACE_ASSETS.md) — Asset generation guide
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) — Detailed checklist

---

## 📞 Questions?

- **GitHub Issues:** https://github.com/felixgeelhaar/govee-light-management/issues
- **Marketplace Support:** https://support.elgato.com/
- **SDK Documentation:** https://docs.elgato.com/sdk

---

**Estimated Total Release Time: 45-60 minutes**

_Last updated: April 17, 2026_
_Version: v2.1.3 Release Guide_
