/**
 * E2E tests for the Group Control Property Inspector (SDPI)
 */
import { test, expect } from '@playwright/test';

const PI_URL = '/ui/group-control.html';

test.describe('Group Control Property Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PI_URL);
  });

  test('should have setup and settings panels', async ({ page }) => {
    await expect(page.locator('#setup')).toBeAttached();
    await expect(page.locator('#settings')).toBeAttached();
  });

  test('should have API key input and Connect button', async ({ page }) => {
    await expect(page.locator('#apiKey')).toBeAttached();
    await expect(page.locator('#connect')).toBeAttached();
  });

  test('should have device selector', async ({ page }) => {
    await expect(page.locator('sdpi-select[setting="selectedDeviceId"]')).toBeAttached();
  });

  test('should have control mode selector', async ({ page }) => {
    await expect(page.locator('sdpi-select[setting="controlMode"]')).toBeAttached();
  });

  test('should have setup guide', async ({ page }) => {
    const guide = page.locator('.guide ol li');
    await expect(guide).toHaveCount(3);
  });
});
