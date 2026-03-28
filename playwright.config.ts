import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing of Stream Deck plugin UI
 *
 * Tests the SDPI-based Property Inspectors served from the plugin's ui/ directory.
 */
export default defineConfig({
  testDir: './test/e2e',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Stream Deck PI runs in Chromium-based CEF */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Serve the plugin directory */
  webServer: {
    command: 'python3 -m http.server 3333 --directory com.felixgeelhaar.govee-light-management.sdPlugin',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
});
