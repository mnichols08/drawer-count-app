const { test, expect } = require('@playwright/test');

async function prepareApp(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) {}
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    try { localStorage.setItem('onboarding-complete-v2', '1'); } catch (_) {}
    document.querySelectorAll('onboarding-tour').forEach((n) => n.remove());
    try { document.documentElement.removeAttribute('data-tour-open'); } catch (_) {}
  });
  await page.waitForFunction(() => !!document.querySelector('app-header'));
  await page.waitForSelector('count-panel', { state: 'attached' });
}

async function confirmDeleteProfile(page) {
  await page.click('app-header .delete-profile-btn');
  await page.waitForFunction(() => {
    const modal = document.querySelector('delete-profile-modal');
    return modal && modal.hasAttribute('open');
  });
  await page.evaluate(() => {
    const modal = document.querySelector('delete-profile-modal');
    if (modal && typeof modal._confirm === 'function') {
      modal._confirm();
    }
  });
  await page.waitForFunction(() => {
    const modal = document.querySelector('delete-profile-modal');
    return !modal || !modal.hasAttribute('open');
  });
}

async function waitForActiveProfile(page, predicate) {
  await page.waitForFunction(predicate);
  return page.evaluate(() => {
    const raw = localStorage.getItem('drawer-profiles-v1');
    const data = raw ? JSON.parse(raw) : {};
    return data.activeId || 'default';
  });
}

test.describe('Profile deletion removes associated day history', () => {
  test('deleting a profile prunes its day entries and records a tombstone', async ({ page }) => {
    await prepareApp(page);

    // Ensure dev flag present so developer tooling remains accessible
    await page.evaluate(() => { window.DCA_DEV = true; });

    const profileName = `Playwright Profile ${Date.now()}`;
    const createdId = await page.evaluate(async (name) => {
      const mod = await import('/lib/persistence.js');
      try { mod.ensureProfilesInitialized && mod.ensureProfilesInitialized(); } catch (_) {}
      const header = document.querySelector('app-header');
      const id = mod.createProfile(name);
      if (header && typeof mod.populateProfilesSelect === 'function') {
        mod.populateProfilesSelect(header);
      }
      try { const select = header?.querySelector('.profile-select'); select && (select.value = id); } catch (_) {}
      return id;
    }, profileName);

    await waitForActiveProfile(page, () => {
      try {
        const raw = localStorage.getItem('drawer-profiles-v1');
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data.activeId && data.activeId !== 'default';
      } catch (_) {
        return false;
      }
    });

    expect(createdId).not.toBe('default');

    const profileCount = await page.evaluate(() => {
      const raw = localStorage.getItem('drawer-profiles-v1');
      const data = raw ? JSON.parse(raw) : {};
      return Object.keys(data.profiles || {}).length;
    });
    expect(profileCount).toBeGreaterThan(1);

    const seeded = await page.evaluate(async ({ profileId }) => {
      try {
        const mod = await import('/lib/persistence.js');
        const today = (window.getTodayKey && window.getTodayKey()) || mod.getTodayKey();
        const prior = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const data = mod.loadDaysData();
        data[profileId] = data[profileId] || { lastVisitedDate: null, _activeViewDateKey: today, _editUnlocked: false, days: {} };
        data[profileId].days = data[profileId].days || {};
        const savedAt = Date.now();
        data[profileId].days[prior] = { state: { counts: { drawer: 123 } }, savedAt, label: 'Prior Day' };
        mod.saveDaysData(data);
        return { dayKey: prior, savedAt };
      } catch (err) {
        return { dayKey: 'error', savedAt: 0, error: String(err) };
      }
    }, { profileId: createdId });

    expect(seeded.dayKey).not.toBe('error');
    expect(seeded.savedAt).toBeGreaterThan(0);

    // Verify the day entry exists before deletion
    await page.waitForFunction(({ profileId, dayKey }) => {
      try {
        const raw = localStorage.getItem('drawer-days-v1');
        if (!raw) return false;
        const data = JSON.parse(raw);
        return !!(data && data[profileId] && data[profileId].days && data[profileId].days[dayKey]);
      } catch (_) {
        return false;
      }
    }, { profileId: createdId, dayKey: seeded.dayKey });

    await confirmDeleteProfile(page);

    const activeAfter = await waitForActiveProfile(page, () => {
      try {
        const raw = localStorage.getItem('drawer-profiles-v1');
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data.activeId !== undefined && data.activeId !== null;
      } catch (_) {
        return false;
      }
    });

  expect(activeAfter).not.toBe(createdId);

    const pruneResult = await page.evaluate(({ profileId }) => {
      const daysRaw = localStorage.getItem('drawer-days-v1');
      const daysData = daysRaw ? JSON.parse(daysRaw) : {};
      const tombstone = daysData.__deletedProfiles ? daysData.__deletedProfiles[profileId] : undefined;
      return {
        hasDays: !!daysData[profileId],
        tombstone,
      };
    }, { profileId: createdId });

    expect(pruneResult.hasDays).toBe(false);
    expect(pruneResult.tombstone).toBeDefined();
    expect(Number(pruneResult.tombstone)).toBeGreaterThanOrEqual(seeded.savedAt);

    const profileResult = await page.evaluate(({ profileId }) => {
      const raw = localStorage.getItem('drawer-profiles-v1');
      const data = raw ? JSON.parse(raw) : {};
      const deleted = data.deletedProfiles ? data.deletedProfiles[profileId] : undefined;
      const exists = !!(data.profiles && data.profiles[profileId]);
      return { exists, deleted };
    }, { profileId: createdId });

    expect(profileResult.exists).toBe(false);
    expect(profileResult.deleted).toBeDefined();
    expect(Number(profileResult.deleted)).toBeGreaterThanOrEqual(seeded.savedAt);
  });
});
