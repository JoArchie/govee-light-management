/**
 * E2E tests for the Scene Control and Music Mode Property Inspectors
 *
 * Tests the actual Vite-built Vue components for advanced Govee features.
 */
import { test, expect } from '@playwright/test';

test.describe('Scene Control Property Inspector', () => {
  const PI_URL = '/ui/dist/src/frontend/scene-control.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(PI_URL);
    await page.waitForSelector('#app');
  });

  test('should mount Vue app', async ({ page }) => {
    const app = page.locator('#app');
    await expect(app).not.toBeEmpty();
  });

  test('should render API Configuration section', async ({ page }) => {
    const section = page.locator('[data-testid="api-key-section"]');
    await expect(section).toBeVisible();
  });

  test('should render Light Selection section', async ({ page }) => {
    const section = page.locator('[data-testid="light-selection-section"]');
    await expect(section).toBeVisible();
  });

  test('should render API key input', async ({ page }) => {
    const input = page.locator('#apiKey');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'password');
  });
});

test.describe('Music Mode Property Inspector', () => {
  const PI_URL = '/ui/dist/src/frontend/music-mode.html';

  test.beforeEach(async ({ page }) => {
    await page.goto(PI_URL);
    await page.waitForSelector('#app');
  });

  test('should mount Vue app', async ({ page }) => {
    const app = page.locator('#app');
    await expect(app).not.toBeEmpty();
  });

  test('should render API Configuration section', async ({ page }) => {
    const section = page.locator('[data-testid="api-key-section"]');
    await expect(section).toBeVisible();
  });

  test('should render Light Selection section', async ({ page }) => {
    const section = page.locator('[data-testid="light-selection-section"]');
    await expect(section).toBeVisible();
  });

  test('should render API key input', async ({ page }) => {
    const input = page.locator('#apiKey');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'password');
  });
});
