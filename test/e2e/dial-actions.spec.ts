/**
 * E2E tests for the Stream Deck+ Dial Property Inspectors
 *
 * Tests the actual Vite-built Vue components for brightness, color hue,
 * color temperature, and segment color dial actions.
 */
import { test, expect } from '@playwright/test';

const DIAL_PIS = [
  { name: 'Brightness Dial', url: '/ui/dist/src/frontend/brightness-dial.html' },
  { name: 'Color Hue Dial', url: '/ui/dist/src/frontend/colorhue-dial.html' },
  { name: 'Color Temperature Dial', url: '/ui/dist/src/frontend/colortemp-dial.html' },
  { name: 'Segment Color Dial', url: '/ui/dist/src/frontend/segment-color-dial.html' },
];

for (const { name, url } of DIAL_PIS) {
  test.describe(`${name} Property Inspector`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url);
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
      await expect(section.locator('h2')).toContainText('Light Selection');
    });

    test('should render Dial Configuration section', async ({ page }) => {
      const view = page.locator('.pi-view');
      await expect(view).toBeVisible();
      // All dial views have a configuration section
      const headers = view.locator('h2');
      const count = await headers.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should render API key input', async ({ page }) => {
      const input = page.locator('#apiKey');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('type', 'password');
    });

    test('should accept API key input', async ({ page }) => {
      const input = page.locator('#apiKey');
      await input.fill('test-key-12345');
      await expect(input).toHaveValue('test-key-12345');
    });
  });
}
