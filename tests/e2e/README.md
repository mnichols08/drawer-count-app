# E2E Tests

These tests use Playwright to drive the local app in a real browser.

- drawer-balance.spec.js: verifies drawer math and asserts no console/page errors
- seeding-offline.spec.js: verifies developer seeding creates balanced days and basic offline behavior via service worker

Run locally:

1. Install Playwright browsers (one-time):

   npm run e2e:install

2. Run tests:

   npm run test:e2e

3. Open UI mode (optional):

   npm run test:e2e:ui
