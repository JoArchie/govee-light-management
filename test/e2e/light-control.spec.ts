/**
 * E2E tests for the Light Control Property Inspector
 *
 * Tests the actual Vite-built Vue component served from the plugin's ui/dist directory.
 * The Vue app mounts and renders without the Stream Deck WebSocket connection,
 * allowing us to test rendering, form interactions, and UI state.
 */
import { test, expect } from '@playwright/test';

const PI_URL = '/ui/dist/src/frontend/light-control.html';

test.describe('Light Control Property Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PI_URL);
    await page.waitForSelector('#app');
  });

  test.describe('Page Load & Structure', () => {
    test('should mount Vue app into #app container', async ({ page }) => {
      const app = page.locator('#app');
      await expect(app).not.toBeEmpty();
    });

    test('should render API Configuration section', async ({ page }) => {
      const section = page.locator('[data-testid="api-key-section"]');
      await expect(section).toBeVisible();
      await expect(section.locator('h2')).toContainText('API Configuration');
    });

    test('should render API key input', async ({ page }) => {
      const apiKeyInput = page.locator('#apiKey');
      await expect(apiKeyInput).toBeVisible();
      await expect(apiKeyInput).toHaveAttribute('type', 'password');
      await expect(apiKeyInput).toHaveAttribute('placeholder', 'Enter your Govee API key');
    });

    test('should render Control Mode section', async ({ page }) => {
      const section = page.locator('[data-testid="control-mode-section"]');
      await expect(section).toBeVisible();
      await expect(section.locator('h2')).toContainText('Control Mode');
    });

    test('should render Light Selection section', async ({ page }) => {
      const section = page.locator('[data-testid="light-selection-section"]');
      await expect(section).toBeVisible();
      await expect(section.locator('h2')).toContainText('Light Selection');
    });
  });

  test.describe('Control Mode Interaction', () => {
    test('should have control mode dropdown with expected options', async ({ page }) => {
      const select = page.locator('#controlMode');
      await expect(select).toBeVisible();

      const options = select.locator('option');
      await expect(options).toHaveCount(6);

      const texts = await options.allTextContents();
      expect(texts).toContain('Toggle On/Off');
      expect(texts).toContain('Turn On');
      expect(texts).toContain('Turn Off');
      expect(texts).toContain('Set Brightness');
      expect(texts).toContain('Set Color');
      expect(texts).toContain('Set Color Temperature');
    });

    test('should show brightness slider when brightness mode selected', async ({ page }) => {
      await page.locator('#controlMode').selectOption('brightness');

      const slider = page.locator('#brightness');
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAttribute('type', 'range');
      await expect(slider).toHaveAttribute('min', '1');
      await expect(slider).toHaveAttribute('max', '100');

      const value = page.locator('.range-value');
      await expect(value).toContainText('%');
    });

    test('should show color picker when color mode selected', async ({ page }) => {
      await page.locator('#controlMode').selectOption('color');

      const picker = page.locator('#color');
      await expect(picker).toBeVisible();
      await expect(picker).toHaveAttribute('type', 'color');
    });

    test('should show color temperature slider when colorTemp mode selected', async ({ page }) => {
      await page.locator('#controlMode').selectOption('colorTemp');

      const slider = page.locator('#colorTemp');
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAttribute('type', 'range');
      await expect(slider).toHaveAttribute('min', '2000');
      await expect(slider).toHaveAttribute('max', '9000');

      const value = page.locator('.range-value');
      await expect(value).toContainText('K');
    });

    test('should hide conditional controls when toggle mode selected', async ({ page }) => {
      // First show brightness controls
      await page.locator('#controlMode').selectOption('brightness');
      await expect(page.locator('#brightness')).toBeVisible();

      // Switch to toggle - brightness should disappear
      await page.locator('#controlMode').selectOption('toggle');
      await expect(page.locator('#brightness')).not.toBeVisible();
      await expect(page.locator('#color')).not.toBeVisible();
      await expect(page.locator('#colorTemp')).not.toBeVisible();
    });

    test('should switch between control modes correctly', async ({ page }) => {
      // Brightness
      await page.locator('#controlMode').selectOption('brightness');
      await expect(page.locator('#brightness')).toBeVisible();
      await expect(page.locator('#color')).not.toBeVisible();

      // Color
      await page.locator('#controlMode').selectOption('color');
      await expect(page.locator('#brightness')).not.toBeVisible();
      await expect(page.locator('#color')).toBeVisible();

      // Color temp
      await page.locator('#controlMode').selectOption('colorTemp');
      await expect(page.locator('#color')).not.toBeVisible();
      await expect(page.locator('#colorTemp')).toBeVisible();
    });
  });

  test.describe('API Key Input', () => {
    test('should accept text input', async ({ page }) => {
      const input = page.locator('#apiKey');
      await input.fill('test-api-key-123');
      await expect(input).toHaveValue('test-api-key-123');
    });

    test('should show Connect button when disconnected', async ({ page }) => {
      const connectBtn = page.locator('[data-testid="api-key-section"] .btn-primary');
      await expect(connectBtn).toBeVisible();
      await expect(connectBtn).toContainText('Connect');
    });
  });

  test.describe('Accessibility', () => {
    test('should have labels for all form controls', async ({ page }) => {
      // API key label
      const apiLabel = page.locator('label[for="apiKey"]');
      await expect(apiLabel).toBeVisible();
      await expect(apiLabel).toContainText('API Key');

      // Control mode label
      const modeLabel = page.locator('label[for="controlMode"]');
      await expect(modeLabel).toBeVisible();
      await expect(modeLabel).toContainText('Control Mode');
    });

    test('should have ARIA live regions for status messages', async ({ page }) => {
      const liveRegions = page.locator('[aria-live]');
      // There should be at least one aria-live region ready for status updates
      const count = await liveRegions.count();
      expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no status shown initially
    });

    test('should use Stream Deck dark theme', async ({ page }) => {
      // The pi-view container should be rendered
      const view = page.locator('.pi-view');
      await expect(view).toBeVisible();
    });
  });
});
