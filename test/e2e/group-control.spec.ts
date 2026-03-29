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

  test('should have group selector', async ({ page }) => {
    await expect(page.locator('#groupSelect')).toBeAttached();
  });

  test('should have New Group and Delete buttons', async ({ page }) => {
    await expect(page.locator('#createGroupBtn')).toBeAttached();
    await expect(page.locator('#deleteGroupBtn')).toBeAttached();
  });

  test('should have inline group creation panel (hidden by default)', async ({ page }) => {
    const panel = page.locator('#createGroupPanel');
    await expect(panel).toBeAttached();
    await expect(panel).not.toBeVisible();
  });

  test('should have control mode selector', async ({ page }) => {
    await expect(page.locator('sdpi-select[setting="controlMode"]')).toBeAttached();
  });

  test('should have setup guide', async ({ page }) => {
    const guide = page.locator('.guide ol li');
    await expect(guide).toHaveCount(3);
  });
});
