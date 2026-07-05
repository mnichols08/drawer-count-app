// E2E: Verify summary vs editor visibility by day completion state
const { test, expect } = require('@playwright/test');

// Perform an initial navigation so the Playwright UI preview attaches/browser connects
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
});

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
  // Disable onboarding overlay and clear persisted panel collapse to avoid interference
  await page.evaluate(() => {
    try { localStorage.setItem('onboarding-complete-v2', '1'); } catch (_) {}
    try { localStorage.removeItem('drawer-panel-v1'); } catch (_) {}
    const tours = document.querySelectorAll('onboarding-tour');
    tours.forEach((n) => n.remove());
    try { document.documentElement.removeAttribute('data-tour-open'); } catch(_) {}
  });
  await page.waitForFunction(() => typeof window !== 'undefined' && 'DCA_DEV' in window);
  await page.waitForSelector('count-panel', { state: 'attached' });
  await page.waitForSelector('drawer-count', { state: 'attached' });
  // Disable animations/transitions for stable visual checks
  await page.addStyleTag({ content: `
    * { transition: none !important; animation: none !important; }
    .expanding, .collapsing { transition: none !important; }
  `});
}

test.describe('Summary appears first for completed days; editor for incomplete today', () => {
  test('yesterday (completed) shows summary first; today (incomplete) shows editor; completing today switches to summary', async ({ page }) => {
    await gotoHome(page);

    // Seed a few past days (completed) and switch to yesterday
  const { yesterdayKey } = await page.evaluate(async () => {
      const today = new Date();
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      const yKey = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;
      try {
        const mod = await import('/lib/days.js');
        mod.seedPreviousDays(3, { includeToday: false, overwrite: true });
      } catch(_) {}
      try {
        const p = await import('/lib/persistence.js');
        p.setActiveViewDateKey(yKey);
        p.restoreDay(yKey);
      } catch(_) {}
      // Ensure summary is shown for past completed day deterministically
  try { const panel = document.querySelector('count-panel'); panel?.showCompletedSummary?.(); panel?._renderSummary?.(); panel?.refresh?.(); } catch(_) {}
      return { yesterdayKey: yKey };
    });
  // Expect summary-first state for yesterday via class/visibility attributes
    const panel = page.locator('count-panel');
    const summaryYesterday = page.locator('count-panel .panel-summary');
    const bodyYesterday = page.locator('count-panel .panel-body');
    await page.waitForSelector('count-panel.completed.collapsed');
  await expect(panel).toHaveClass(/collapsed/);
  await summaryYesterday.waitFor({ state: 'visible' });
  await expect(summaryYesterday).toBeVisible();
  await expect(bodyYesterday).toBeHidden();

    // Switch to today and clear any saved data to enforce incomplete state
    await page.evaluate(async () => {
      try {
        const p = await import('/lib/persistence.js');
        const todayKey = p.getTodayKey();
        // Remove any saved state for today
        const key = p.DRAWER_DAYS_KEY || 'drawer-days-v1';
        const raw = localStorage.getItem(key);
        const data = raw ? JSON.parse(raw) : {};
        const pid = p.getActiveProfileId();
        if (data[pid] && data[pid].days && data[pid].days[todayKey]) {
          delete data[pid].days[todayKey];
          localStorage.setItem(key, JSON.stringify(data));
        }
        p.setActiveViewDateKey(todayKey);
        // Start a fresh count for today (incomplete)
        const panel = document.querySelector('count-panel');
        panel?._onStart?.();
      } catch(_) {}
    });

    // Expect editor-first state for incomplete today: not collapsed and not completed
    // Force refresh after start
  await page.evaluate(() => { try { document.querySelector('count-panel')?.refresh?.(); } catch(_) {} });
  await page.waitForTimeout(50);
    await page.waitForSelector('count-panel:not(.collapsed):not(.completed)');
    await expect(panel).not.toHaveClass(/collapsed/);
    await expect(panel).not.toHaveClass(/completed/);
    const bodyToday = page.locator('count-panel .panel-body');
    const summaryToday = page.locator('count-panel .panel-summary');
  await bodyToday.waitFor({ state: 'visible' });
  await expect(bodyToday).toBeVisible();
  await expect(summaryToday).toBeHidden();

    // Now complete today and verify summary appears first
    await page.evaluate(() => {
      const panel = document.querySelector('count-panel');
      panel?._onComplete?.();
    });
    // Wait for completed+collapsed state and verify summary-first again
    await page.waitForSelector('count-panel.completed.collapsed');
  await expect(panel).toHaveClass(/completed/);
  await expect(panel).toHaveClass(/collapsed/);
  await expect(summaryToday).toBeVisible();
  await expect(bodyToday).toBeHidden();
  });
});
