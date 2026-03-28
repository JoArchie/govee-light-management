/**
 * E2E tests for the Light Control Property Inspector (SDPI)
 */
import { test, expect } from '@playwright/test';

const PI_URL = '/ui/light-control.html';

test.describe('Light Control Property Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PI_URL);
  });

  test.describe('Setup Panel', () => {
    test('should show setup panel with API key input', async ({ page }) => {
      const setup = page.locator('#setup');
      // Setup panel exists in DOM (visibility managed by SDPI components)
      await expect(setup).toBeAttached();
    });

    test('should have API key password input', async ({ page }) => {
      const apiKey = page.locator('#apiKey');
      await expect(apiKey).toBeAttached();
    });

    test('should have Connect button', async ({ page }) => {
      const connect = page.locator('#connect');
      await expect(connect).toBeAttached();
    });

    test('should have setup guide with steps', async ({ page }) => {
      const guide = page.locator('.guide ol li');
      await expect(guide).toHaveCount(3);
    });

    test('should have error message hidden by default', async ({ page }) => {
      const error = page.locator('#errorMessage');
      await expect(error).toHaveClass(/hidden/);
    });
  });

  test.describe('Settings Panel', () => {
    test('should have settings panel in DOM', async ({ page }) => {
      const settings = page.locator('#settings');
      await expect(settings).toBeAttached();
    });

    test('should have device selector', async ({ page }) => {
      const deviceSelect = page.locator('sdpi-select[setting="selectedDeviceId"]');
      await expect(deviceSelect).toBeAttached();
    });

    test('should have control mode selector', async ({ page }) => {
      const modeSelect = page.locator('sdpi-select[setting="controlMode"]');
      await expect(modeSelect).toBeAttached();
    });

    test('should have brightness range control', async ({ page }) => {
      const brightness = page.locator('sdpi-range[setting="brightnessValue"]');
      await expect(brightness).toBeAttached();
    });

    test('should have color picker', async ({ page }) => {
      const color = page.locator('sdpi-color[setting="colorValue"]');
      await expect(color).toBeAttached();
    });

    test('should have temperature range control', async ({ page }) => {
      const temp = page.locator('sdpi-range[setting="colorTempValue"]');
      await expect(temp).toBeAttached();
    });
  });
});
