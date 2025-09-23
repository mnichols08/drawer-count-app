// @ts-check
/**
 * Playwright configuration for E2E tests.
 * - Boots the local dev server on a test port
 * - Exposes baseURL for tests
 */
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.E2E_PORT || '3100';

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
    headless: true,
    trace: 'on-first-retry'
  },
  webServer: {
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
