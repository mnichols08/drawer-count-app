const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.join(__dirname, '../../src/lib/sync-merger.mjs')).href;

async function loadMerger() {
  return import(moduleUrl);
}

describe('sync-merger payload helpers', () => {
  test('prefers remote profile state when local is freshly seeded', async () => {
    const { mergeProfilesPayload } = await loadMerger();
    const localRaw = JSON.stringify({
      profiles: {
        default: { name: 'Default', state: null, updatedAt: 2000, prefs: {} }
      },
      activeId: 'default',
      updatedAt: 2000
    });
    const remoteRaw = JSON.stringify({
      profiles: {
        default: { name: 'Default', state: { count: 42 }, updatedAt: 1000, prefs: { theme: 'dark' } }
      },
      activeId: 'default',
      updatedAt: 1000
    });

    const result = mergeProfilesPayload({ localRaw, remoteRaw });
    assert.equal(result.merged.profiles.default.state.count, 42);
    assert.equal(result.merged.profiles.default.prefs.theme, 'dark');
    assert.equal(result.merged.profiles.default.updatedAt, 2000);
    assert.equal(result.localChanged, true);
    assert.equal(result.remoteChanged, true);
  });

  test('retains remote-only profiles and keeps active profile valid', async () => {
    const { mergeProfilesPayload } = await loadMerger();
    const localRaw = JSON.stringify({
      profiles: { default: { name: 'Default', state: null, updatedAt: 3000, prefs: {} } },
      activeId: 'default',
      updatedAt: 3000
    });
    const remoteRaw = JSON.stringify({
      profiles: {
        default: { name: 'Default', state: { count: 5 }, updatedAt: 2500, prefs: {} },
        crew: { name: 'Crew', state: { count: 9 }, updatedAt: 2600, prefs: { showTips: true } }
      },
      activeId: 'crew',
      updatedAt: 2600
    });

    const result = mergeProfilesPayload({ localRaw, remoteRaw });
    assert.ok(result.merged.profiles.crew, 'remote profile should exist locally');
    assert.equal(result.merged.activeId, 'default');
    assert.deepEqual(result.merged.profiles.crew.prefs, { showTips: true });
    assert.equal(result.localChanged, true);
    assert.equal(result.remoteChanged, true);
  });

  test('creates default profile when none exist', async () => {
    const { mergeProfilesPayload } = await loadMerger();
    const result = mergeProfilesPayload({ localRaw: null, remoteRaw: null });
    assert.ok(result.merged.profiles.default, 'default profile should be created');
    assert.equal(result.merged.activeId, 'default');
    assert.equal(result.localChanged, true);
    assert.equal(result.remoteChanged, true);
  });

  test('merges day records preferring newer local entries', async () => {
    const { mergeDaysPayload } = await loadMerger();
    const localRaw = JSON.stringify({
      default: {
        days: {
          '2024-09-01': { savedAt: 2000, state: { total: 11 } },
          '2024-09-02': { savedAt: 3000, state: { total: 13 } }
        }
      }
    });
    const remoteRaw = JSON.stringify({
      default: {
        days: {
          '2024-09-01': { savedAt: 1500, state: { total: 10 } },
          '2024-08-31': { savedAt: 1200, state: { total: 8 } }
        }
      }
    });

    const result = mergeDaysPayload({ localRaw, remoteRaw });
    assert.equal(result.merged.default.days['2024-09-01'].state.total, 11);
    assert.equal(result.merged.default.days['2024-09-01'].savedAt, 2000);
    assert.equal(result.merged.default.days['2024-08-31'].state.total, 8);
    assert.ok(result.merged.default.days['2024-09-02'], 'local-only day should persist');
    assert.equal(result.localChanged, true);
    assert.equal(result.remoteChanged, true);
  });
});
