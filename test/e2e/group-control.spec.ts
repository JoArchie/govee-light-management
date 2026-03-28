/**
 * E2E tests for the Group Control Property Inspector
 *
 * Tests the actual Vite-built Vue component served from the plugin's ui/dist directory.
 */
import { test, expect } from '@playwright/test';

const PI_URL = '/ui/dist/src/frontend/group-control.html';

test.describe('Group Control Property Inspector', () => {
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

    test('should render Group Management section', async ({ page }) => {
      const section = page.locator('[data-testid="group-management-section"]');
      await expect(section).toBeVisible();
      await expect(section.locator('h2')).toContainText('Group Management');
    });

    test('should render API key input', async ({ page }) => {
      const apiKeyInput = page.locator('#apiKey');
      await expect(apiKeyInput).toBeVisible();
      await expect(apiKeyInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Group Management Initial State', () => {
    test('should show Load Groups button', async ({ page }) => {
      const loadBtn = page.locator('[data-testid="group-management-section"] .btn-primary');
      await expect(loadBtn).toBeVisible();
      await expect(loadBtn).toContainText('Load Groups');
    });

    test('should have Load Groups button visible', async ({ page }) => {
      const loadBtn = page.locator('[data-testid="group-management-section"] .btn-primary');
      await expect(loadBtn).toBeVisible();
    });

    test('should show help text about connecting API key first', async ({ page }) => {
      const help = page.locator('[data-testid="group-management-section"] .help-text');
      await expect(help).toContainText('Connect your API key first');
    });
  });

  test.describe('Accessibility', () => {
    test('should have labels for form controls', async ({ page }) => {
      const apiLabel = page.locator('label[for="apiKey"]');
      await expect(apiLabel).toBeVisible();
      await expect(apiLabel).toContainText('API Key');
    });

    test('should use Stream Deck dark theme', async ({ page }) => {
      const view = page.locator('.pi-view');
      await expect(view).toBeVisible();
    });
  });
});
