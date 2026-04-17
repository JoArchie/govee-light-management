# Release Checklist v2.1.3

Use this checklist when preparing a new release. Follow the steps in order to ensure quality and consistency.

---

## Pre-Release Quality Checks

- [ ] **Run Full Test Suite**

  ```bash
  npm run test
  ```

  - Verify all tests pass
  - Check test coverage is >80%

- [ ] **Type Checking**

  ```bash
  npm run type-check
  ```

  - Zero TypeScript errors

- [ ] **Linting**

  ```bash
  npm run lint
  ```

  - No ESLint errors or warnings

- [ ] **Code Formatting**

  ```bash
  npm run format:check
  ```

  - All code properly formatted with Prettier

- [ ] **Build Plugin**

  ```bash
  npm run build
  ```

  - Backend compiles without errors
  - `com.felixgeelhaar.govee-light-management.sdPlugin/bin/plugin.js` exists
  - No build warnings

---

## Documentation Updates

- [ ] **Update CHANGELOG.md**
  - Add new version section at top
  - List all features, fixes, and improvements
  - Include breaking changes if any
  - Link to related issues/PRs

- [ ] **Update README.md**
  - Update version badge
  - Update feature list if applicable
  - Update roadmap section

- [ ] **Update STORE_LISTING.md**
  - Add release notes for new version
  - Update "What's New" section
  - Verify description still accurate
  - Update gallery image references if new shots added

- [ ] **Update package.json**
  - Increment version number (semantic versioning)
  - Update any new dependencies

- [ ] **Update manifest.json**
  - Increment version in plugin metadata
  - Verify all action UUIDs are correct

---

## Marketing & Communications

- [ ] **Review Dials Guide**
  - Ensure `docs/DIALS_GUIDE.md` is current
  - Verify all dial descriptions accurate

- [ ] **Gallery Images**
  - Verify screenshots in `docs/gallery/` are up-to-date
  - Check image sizes are 1920x1080
  - Ensure images show new features

- [ ] **Release Notes Clarity**
  - Read release notes from user perspective
  - Ensure new features are clearly explained
  - Verify no typos or formatting issues

---

## Git & Repository

- [ ] **Commit Changes**

  ```bash
  git add CHANGELOG.md README.md package.json manifest.json docs/
  git commit -m "chore: release v2.1.3"
  ```

- [ ] **Verify Branch**
  - Confirm you're on `main` branch
  - Verify branch is up-to-date with remote

- [ ] **Create Git Tag**

  ```bash
  git tag -a v2.1.3 -m "Release v2.1.3 — Saturation dial and group support"
  ```

- [ ] **Push Changes**
  ```bash
  git push origin main
  git push origin v2.1.3
  ```

---

## Plugin Distribution

- [ ] **Validate Plugin**

  ```bash
  npm run streamdeck:validate
  ```

  - Plugin validates successfully

- [ ] **Package Plugin**

  ```bash
  npm run streamdeck:pack
  ```

  - `.streamDeckPlugin` file created in `dist/`
  - File size is reasonable (~2-5MB)

- [ ] **Manual Testing**
  - Install packaged plugin manually
  - Verify each action works:
    - [ ] On/Off action
    - [ ] Brightness action
    - [ ] Color action
    - [ ] Color Temperature action
    - [ ] Segment Color action
    - [ ] Scene action
    - [ ] Music Mode action
    - [ ] Feature Toggle action
    - [ ] Brightness Dial
    - [ ] Color Temperature Dial
    - [ ] Color Hue Dial
    - [ ] Saturation Dial
    - [ ] Segment Color Dial
  - Test with both individual lights and groups
  - Verify real-time state sync
  - Test error scenarios (invalid API key, offline light)

---

## Marketplace Submission (Elgato)

- [ ] **Prepare Submission**
  - Update content in Elgato Maker Console
  - Use `docs/STORE_LISTING.md` as source

- [ ] **Upload Plugin**
  - Upload `.streamDeckPlugin` from `dist/`
  - Verify file integrity

- [ ] **Upload Gallery Images**
  - Upload all images from `docs/gallery/`
  - Verify images display correctly

- [ ] **Review Description**
  - Short description: 120 characters max
  - Full description: ≤4000 characters
  - What's New section: Clear and compelling

- [ ] **Fill Metadata**
  - Category: "Lighting"
  - Tags: govee, smart lights, led, rgb, home automation, iot, color, brightness, scenes, music mode
  - Support URL: https://github.com/felixgeelhaar/govee-light-management/issues

- [ ] **Submit for Review**
  - Review all information before submitting
  - Note any known issues or limitations

---

## Post-Release

- [ ] **Monitor Reviews**
  - Watch Elgato marketplace for user reviews
  - Address any issues or questions quickly

- [ ] **Announce Release**
  - Post release on GitHub Discussions (if applicable)
  - Share on community channels (Stream Deck forums, etc.)

- [ ] **Create Release Notes on GitHub**
  - Go to GitHub repo → Releases
  - Create new release from tag
  - Copy release notes from CHANGELOG.md
  - Upload `.streamDeckPlugin` file as asset

- [ ] **Close Related Issues**
  - Close any GitHub issues fixed in this release
  - Reference the release tag

- [ ] **Plan Next Release**
  - Create new issue for v2.2.0 planning
  - Collect feature requests and feedback

---

## Troubleshooting

### Plugin Won't Package

- Verify `npm run build` completes successfully
- Check `com.felixgeelhaar.govee-light-management.sdPlugin/` directory exists
- Ensure `bin/plugin.js` is present and not empty

### Validation Fails

- Run `streamdeck validate` for detailed error message
- Check manifest.json for required fields
- Verify all action UUIDs are unique

### Tests Fail Before Release

- Don't proceed with release
- Fix failing tests first
- Re-run full test suite
- Commit test fixes and try again

### Gallery Images Not Uploading

- Verify image format is PNG
- Check dimensions are exactly 1920x1080
- Ensure file names match expected pattern
- Try uploading one image at a time

---

## Version Format

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 2.1.3)
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes only

### Release Type Guide

**MAJOR (X.0.0):**

- Breaking API changes
- Removed deprecated features
- Major architecture changes

**MINOR (x.Y.0):**

- New features
- New actions or dials
- Enhanced capabilities

**PATCH (x.y.Z):**

- Bug fixes
- Security patches
- Performance improvements

---

## Questions?

Check the following resources:

- [GitHub Issues](https://github.com/felixgeelhaar/govee-light-management/issues)
- [Elgato Marketplace Submission Guide](https://github.com/elgato/streamdeck-dist)
- [Stream Deck SDK Documentation](https://docs.elgato.com/sdk)

---

_Last updated: April 17, 2026_
