// E2E: Verify drawer math and no console errors
// Uses Playwright's test runner
const { test, expect } = require('@playwright/test');

async function collectConsoleErrors(page) {
  const messages = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error') {
      messages.push({ type, text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    messages.push({ type: 'pageerror', text: String(err) });
  });
  return messages;
}

async function gotoHome(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Dismiss onboarding overlay if present and mark as complete for future loads
  await page.evaluate(() => {
    try { localStorage.setItem('onboarding-complete-v2', '1'); } catch (_) {}
    const tour = document.querySelector('onboarding-tour');
    if (tour) tour.removeAttribute('open');
    const anyTour = document.querySelectorAll('onboarding-tour');
    anyTour.forEach((n) => n.remove());
    try { document.documentElement.removeAttribute('data-tour-open'); } catch(_) {}
  });
  // Wait for app boot (config.js sets window.DCA_DEV)
  await page.waitForFunction(() => typeof window !== 'undefined' && 'DCA_DEV' in window);
  // Wait for components to be present in DOM
  await page.waitForSelector('count-panel', { state: 'attached' });
  await page.waitForSelector('drawer-count', { state: 'attached' });

  // Programmatically start today's count and expand the panel to avoid flaky UI clicks
  await page.evaluate(() => {
    try {
      const { getTodayKey, setActiveViewDateKey } = window;
      try { if (typeof getTodayKey === 'function' && typeof setActiveViewDateKey === 'function') setActiveViewDateKey(getTodayKey()); } catch(_) {}
      const panel = document.querySelector('count-panel');
      // Ensure tour cannot intercept
      document.querySelectorAll('onboarding-tour').forEach((n) => n.remove());
      if (panel && typeof panel._onStart === 'function') {
        panel._onStart();
      } else {
        // Fallback: click start button if available
        panel?.querySelector?.('.start-btn')?.click?.();
      }
      // Force persist started/expanded in case UI animations race
      try { panel?._savePersisted?.({ started: true, collapsed: false, completed: false, reopened: false }); panel?._refresh?.(); } catch(_) {}
    } catch (_) {}
  });

  // Wait for either summary or body, then ensure body is visible for editing
  const bodyLoc = page.locator('count-panel .panel-body');
  const sumLoc = page.locator('count-panel .panel-summary');
  await Promise.race([
    bodyLoc.waitFor({ state: 'visible' }).catch(() => {}),
    sumLoc.waitFor({ state: 'visible' }).catch(() => {})
  ]);
  // If summary is showing, expand to show body
  await page.evaluate(() => { try { const p = document.querySelector('count-panel'); if (p && p.classList.contains('collapsed')) { p.expand?.(); } } catch(_) {} });
  await bodyLoc.waitFor({ state: 'visible' });
  // Wait for either new-style or legacy input IDs inside shadow DOM
    await page.waitForFunction(() => {
      const dc = document.querySelector('drawer-count');
      const root = dc && dc.shadowRoot;
      if (!root) return false;
      return !!(root.querySelector('#drawer-input') || root.querySelector('#drawer input'));
    });
    // Also ensure balance output exists
    await page.waitForFunction(() => {
      const dc = document.querySelector('drawer-count');
      const root = dc && dc.shadowRoot;
      if (!root) return false;
      return !!root.querySelector('#balance balance');
    });
}

// Helper to get a shadow element inside <drawer-count>
async function $dc(page, selector) {
  return page.locator('drawer-count').locator(`>>> ${selector}`);
}

// Type value into a number input in drawer-count by field id (e.g., 'drawer', 'roa', 'slips', etc)
async function typeInField(page, fieldId, value) {
  // Ensure input exists in shadow DOM
  await page.waitForFunction((fid) => {
    const dc = document.querySelector('drawer-count');
    const root = dc && dc.shadowRoot;
    if (!root) return false;
    return !!(root.querySelector(`#${fid}-input`) || root.querySelector(`#${fid} input`));
  }, fieldId);
  // Set the value and dispatch input events programmatically (more robust than typing)
  await page.evaluate(({ fid, val }) => {
    const dc = document.querySelector('drawer-count');
    const root = dc && dc.shadowRoot;
    if (!root) return;
    const el = root.querySelector(`#${fid}-input`) || root.querySelector(`#${fid} input`);
    if (!el) return;
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.value = String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, { fid: fieldId, val: value });
}

function toNum(s) { return Number(String(s).replace(/[^0-9.-]/g, '')); }

async function readNumber(page, selector) {
  const txt = await page.evaluate((sel) => {
    const dc = document.querySelector('drawer-count');
    const root = dc && dc.shadowRoot;
    if (!root) return '';
    const el = root.querySelector(sel);
    return el ? el.textContent || '' : '';
  }, selector);
  return toNum(txt || '0');
}

// Calculate expected balance = total - roa - drawer - 150
async function readBalance(page) {
  const bal = await readNumber(page, '#balance balance');
  return bal;
}

test.describe('Drawer math and basic UI', () => {
  test('computes balanced drawer correctly', async ({ page }) => {
    const errors = await collectConsoleErrors(page);
    await gotoHome(page);

    // Start the count if the panel shows "Start" button
    const startBtn = page.locator('count-panel .start-btn');
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // Enter amounts that lead to zero balance
    // We want: total - roa - drawer - 150 = 0
    // We'll set slips/checks and cash so that total = roa + drawer + 150

    await typeInField(page, 'drawer', 500);
    await typeInField(page, 'roa', 100);

    // Cash denominations to $150 (so cash section after -150 is $0)
    await typeInField(page, 'hundreds', 1); // $100
    await typeInField(page, 'twenties', 2); // $40
    await typeInField(page, 'tens', 1);     // $10
    await typeInField(page, 'fives', 0);    // $0
    await typeInField(page, 'dollars', 0);

    // That is $150 cash; we need total = 100 + 500 + 150 = 750
    // Currently cash contributes 150; set slips + checks to 600
    await typeInField(page, 'slips', 400);
    await typeInField(page, 'checks', 200);

    const balance = await readBalance(page);
    expect(Math.abs(balance)).toBeLessThanOrEqual(0.33);

    // No console errors
    expect(errors.length).toBe(0);
  });
});
