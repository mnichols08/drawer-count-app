// @ts-check
/**
 * Playwright configuration for E2E tests.
 * - Boots the local dev server on a test port
 * - Exposes baseURL for tests
 */
const { defineConfig, devices } = require('@playwright/test');
const process = require('node:process');

const PORT = process.env.E2E_PORT || '3100';

/**
 * @param {unknown} value
 * @param {boolean} [fallback]
 */
const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
};

const skipWebServer = toBool(process.env.PLAYWRIGHT_SKIP_WEB_SERVER ?? process.env.DCA_USE_EXTERNAL_SERVER, false);
const resolvedHeadless = toBool(process.env.PLAYWRIGHT_HEADLESS ?? process.env.HEADLESS, true);

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: resolvedHeadless,
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    }
  },
  webServer: skipWebServer ? undefined : {
    command: `node server.js`,
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DCA_DEV: 'true'
    },
    stdout: 'pipe',
    stderr: 'pipe',
    port: Number(PORT),
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
