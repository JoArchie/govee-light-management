/**
 * E2E tests for Scene Control and Music Mode Property Inspectors (SDPI)
 */
import { test, expect } from '@playwright/test';

test.describe('Scene Control Property Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui/scene-control.html');
  });

  test('should have setup and settings panels', async ({ page }) => {
    await expect(page.locator('#setup')).toBeAttached();
    await expect(page.locator('#settings')).toBeAttached();
  });

  test('should have device selector', async ({ page }) => {
    await expect(page.locator('sdpi-select[setting="selectedDeviceId"]')).toBeAttached();
  });

  test('should have scene selector', async ({ page }) => {
    await expect(page.locator('sdpi-select[setting="selectedSceneId"]')).toBeAttached();
  });
});

test.describe('Music Mode Property Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ui/music-mode.html');
  });

  test('should have setup and settings panels', async ({ page }) => {
    await expect(page.locator('#setup')).toBeAttached();
    await expect(page.locator('#settings')).toBeAttached();
  });

  test('should have device selector', async ({ page }) => {
    await expect(page.locator('sdpi-select[setting="selectedDeviceId"]')).toBeAttached();
  });

  test('should have music mode selector', async ({ page }) => {
    await expect(page.locator('sdpi-select[setting="musicMode"]')).toBeAttached();
  });

  test('should have sensitivity range control', async ({ page }) => {
    await expect(page.locator('sdpi-range[setting="sensitivity"]')).toBeAttached();
  });

  test('should have auto color checkbox', async ({ page }) => {
    await expect(page.locator('sdpi-checkbox[setting="autoColor"]')).toBeAttached();
  });
});
