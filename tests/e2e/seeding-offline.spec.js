// E2E: Verify dev seeding produces balanced days and offline behavior works
const { test, expect } = require('@playwright/test');
const { SEED_COUNT, INCLUDE_TODAY } = require('./config');

// Initial navigation for Playwright UI preview to attach
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
});

async function collectConsoleErrors(page) {
  const messages = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      messages.push({ type: 'error', text: msg.text() });
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
  // Always bust SW/caches to avoid stale JS during tests
  await page.evaluate(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch(_) {}
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  // Disable onboarding overlay if present, and mark as complete
  await page.evaluate(() => {
    try { localStorage.setItem('onboarding-complete-v2', '1'); } catch (_) {}
    const tour = document.querySelector('onboarding-tour');
    if (tour) tour.removeAttribute('open');
    const anyTour = document.querySelectorAll('onboarding-tour');
    anyTour.forEach((n) => n.remove());
    try { document.documentElement.removeAttribute('data-tour-open'); } catch(_) {}
  });
  await page.waitForFunction(() => typeof window !== 'undefined' && 'DCA_DEV' in window);
  await page.waitForSelector('count-panel', { state: 'attached' });
  await page.waitForSelector('drawer-count', { state: 'attached' });
  // Ensure panel initialized by starting it programmatically (no-op for past days)
  await page.evaluate(() => {
    try {
      const panel = document.querySelector('count-panel');
      document.querySelectorAll('onboarding-tour').forEach((n) => n.remove());
      if (panel && typeof panel._onStart === 'function') panel._onStart();
    } catch(_) {}
  });
  // Wait for body or summary to be visible (either is fine)
  const body = page.locator('count-panel .panel-body[aria-hidden="false"]');
  const summary = page.locator('count-panel .panel-summary:not([hidden])');
  await Promise.race([
    body.waitFor({ state: 'visible' }).catch(() => {}),
    summary.waitFor({ state: 'visible' }).catch(() => {})
  ]);
}

async function inShadow(page, hostSelector, innerSelector) {
  return page.locator(hostSelector).locator(`:scope >>> ${innerSelector}`);
}

async function openSettings(page) {
  // Ensure onboarding overlay cannot intercept clicks
  await page.evaluate(() => {
    try { localStorage.setItem('onboarding-complete-v2', '1'); } catch (_) {}
    document.querySelectorAll('onboarding-tour').forEach((n) => n.remove());
    try { document.documentElement.removeAttribute('data-tour-open'); } catch(_) {}
  });
  // Open settings modal programmatically to avoid strict-mode ambiguity
  await page.evaluate(() => {
    try {
      const hdr = document.querySelector('app-header');
      if (hdr && typeof hdr._onSettings === 'function') {
        hdr._onSettings();
      } else {
        // Fallback to global getter
        const get = window.getSettingsModal || undefined;
        if (get) get().open();
      }
    } catch(_) {}
  });
  await page.waitForSelector('settings-modal', { state: 'attached' });
  await page.waitForFunction(() => !!document.querySelector('settings-modal[open]'));
}

async function getDayItems(page) {
  const modal = await inShadow(page, 'settings-modal', 'select.day-select');
  const opts = modal.locator('option');
  const count = await opts.count();
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(await opts.nth(i).textContent());
  }
  return items;
}

// Helper to compute balance in the UI after restoring a day
async function getUiBalance(page) {
  // Read from drawer-count shadow DOM for consistency
  const txt = await page.evaluate(() => {
    try {
      const dc = document.querySelector('drawer-count');
      const root = dc && dc.shadowRoot;
      const el = root && root.querySelector('#balance balance');
      return el ? el.textContent || '' : '';
    } catch(_) { return ''; }
  });
  return Number(String(txt || '0').replace(/[^0-9.-]/g, ''));
}

// Read window.DCA_DEV
async function isDev(page) {
  return await page.evaluate(() => !!window.DCA_DEV);
}

test.describe('Dev seeding and offline', () => {
  test('seeds last 7 days with balanced entries and restores one', async ({ page, context }) => {
    const errors = await collectConsoleErrors(page);
    await gotoHome(page);
    expect(await isDev(page)).toBe(true);

    // Ensure service worker is installed and active before going offline
    await page.waitForFunction(() => 'serviceWorker' in navigator);
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try { await navigator.serviceWorker.ready; } catch (_) {}
      }
    });

    // Seed days programmatically within the app context (deterministic)
    await page.evaluate(async ({ SEED_COUNT, INCLUDE_TODAY }) => {
      try {
        // Ensure dev mode flag so settings shows developer section (not strictly required for seeding programmatically)
        window.DCA_DEV = true;
        const mod = await import('/lib/days.js');
        mod.seedPreviousDays(Number(SEED_COUNT)||7, { includeToday: !!INCLUDE_TODAY, overwrite: true });
      } catch(_) {}
    }, { SEED_COUNT, INCLUDE_TODAY });
    // Get seeded dates from persistence and restore one (prefer yesterday)
    const restoredKey = await page.evaluate(async () => {
      try {
        const daysRaw = localStorage.getItem('drawer-days-v1');
        const data = daysRaw ? JSON.parse(daysRaw) : {};
        const prof = JSON.parse(localStorage.getItem('drawer-profiles-v1')||'{}');
        const activeId = prof.activeId || 'default';
        const entry = data[activeId] || { days: {} };
        const keys = Object.keys(entry.days||{}).sort();
        // choose the last non-today key if available
        const today = (window.getTodayKey && window.getTodayKey()) || '';
        let pick = keys.reverse().find(k => k !== today) || keys[0];
        if (!pick) return '';
        const mod = await import('/lib/persistence.js');
        if (mod && typeof mod.setActiveViewDateKey === 'function') mod.setActiveViewDateKey(pick);
        if (mod && typeof mod.restoreDay === 'function') { mod.restoreDay(pick); mod.restoreDay(pick); }
        // Return state as well for validation of summary details
        const saved = entry.days[pick]?.state || null;
        const panel = document.querySelector('count-panel');
        if (panel) {
          panel.showCompletedSummary && panel.showCompletedSummary();
          panel.refresh && panel.refresh();
        }
        return { pick, saved };
      } catch(_) { return ''; }
    });
    expect(restoredKey).not.toEqual('');
    const { pick: chosenKey, saved: restoredState } = restoredKey;
    expect(chosenKey).toBeTruthy();

  // Ensure summary state and render, then allow computations to settle
  await page.waitForSelector('count-panel.completed.collapsed');
  await page.evaluate(() => { try { document.querySelector('count-panel')?._renderSummary?.(); } catch(_) {} });
  await page.waitForTimeout(100);

    // Assert that summary includes slip/check breakdown matching state
    if (restoredState && restoredState.extra) {
      const slips = Array.isArray(restoredState.extra.slips) ? restoredState.extra.slips : [];
      const checks = Array.isArray(restoredState.extra.checks) ? restoredState.extra.checks : [];
      // For each slip/check, expect it to appear in the summary list
      for (let i = 0; i < slips.length; i++) {
        const slipVal = Number(slips[i] || 0).toFixed(2);
        await expect(page.locator('count-panel .panel-summary .section:has(h4:has-text("Recorded Slips")) .list li').nth(i)).toContainText(slipVal);
      }
      for (let i = 0; i < checks.length; i++) {
        const checkVal = Number(checks[i] || 0).toFixed(2);
        await expect(page.locator('count-panel .panel-summary .section:has(h4:has-text("Recorded Checks")) .list li').nth(i)).toContainText(checkVal);
      }
    }

    // Balance should be approximately zero
    const balance = await getUiBalance(page);
    if (Math.abs(balance) > 0.5) {
      // Collect diagnostics to aid debugging
      const details = await page.evaluate(() => {
        const dc = document.querySelector('drawer-count');
        const root = dc && dc.shadowRoot;
        function num(sel) { const el = root && root.querySelector(sel); const s = el ? (el.textContent||'') : '0'; return Number(String(s).replace(/[^0-9.-]/g, '')); }
        function sumSpans(sel) { const nodes = root ? Array.from(root.querySelectorAll(sel)) : []; return nodes.reduce((a,b)=> a + Number((b.textContent||'').replace(/[^0-9.-]/g,'')), 0); }
        const total = num('total');
        const drawer = num('drawer');
        const roa = num('roa');
        const cash = num('cash');
        const bal = num('#balance balance');
        const slips = num('#cardTotal balance');
        const checks = num('#checkTotal balance');
        const spanSum = sumSpans('.wrap span');
        const cashSpanSum = sumSpans('span.cash');
        return { total, drawer, roa, cash, bal, slips, checks, spanSum, cashSpanSum };
      });
      console.log('DEBUG drawer details:', details);
    }
    expect(Math.abs(balance)).toBeLessThanOrEqual(0.5);

    // Ensure no console errors or page errors occurred
    expect(errors.length).toBe(0);

    // Offline behavior: go offline, status pill should show Offline
  await context.setOffline(true);
  const status = page.locator('network-status');
  await expect(status).toHaveClass(/offline/);

    // Navigate to a page that should be cached (root) while offline
    await page.goto('/');
  await page.waitForSelector('count-panel');

    // Go back online
    await context.setOffline(false);
  });
});
