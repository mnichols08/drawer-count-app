import test from 'node:test';
import assert from 'node:assert/strict';

import { canApplyRemoteSync, hasMeaningfulLocalSyncData, migrateLegacySyncMeta } from '../../src/lib/sync-meta.mjs';

test('legacy metadata with local data is migrated as a dirty local revision', () => {
  assert.deepEqual(
    migrateLegacySyncMeta({ updatedAt: 100 }, { hasLocalData: true, now: 200 }),
    { updatedAt: 200, dirty: true, revision: 1 }
  );
});

test('current metadata is preserved', () => {
  const current = { updatedAt: 100, dirty: false, revision: 3 };
  assert.equal(migrateLegacySyncMeta(current, { hasLocalData: true, now: 200 }), current);
});

test('an empty client starts clean', () => {
  assert.deepEqual(
    migrateLegacySyncMeta(null, { hasLocalData: false, now: 200 }),
    { updatedAt: 0, dirty: false, revision: 0 }
  );
});

test('dirty local metadata blocks remote bootstrap and replacement', () => {
  const dirty = { updatedAt: 100, dirty: true, revision: 2 };
  assert.equal(canApplyRemoteSync(dirty, 200), false);
  assert.equal(canApplyRemoteSync(dirty, 200, { requireNewer: false }), false);
  assert.equal(canApplyRemoteSync({ ...dirty, dirty: false }, 200), true);
});

test('empty legacy storage does not become authoritative over remote data', () => {
  assert.equal(hasMeaningfulLocalSyncData('profiles', '{}'), false);
  assert.equal(hasMeaningfulLocalSyncData('profiles', '{"profiles":{}}'), false);
  assert.equal(hasMeaningfulLocalSyncData('days', '{}'), false);
  assert.equal(hasMeaningfulLocalSyncData('days', '{"default":{"days":{}}}'), false);
});

test('populated profiles and day records are meaningful local data', () => {
  assert.equal(hasMeaningfulLocalSyncData('profiles', '{"profiles":{"default":{"name":"Main"}}}'), true);
  assert.equal(hasMeaningfulLocalSyncData('days', '{"default":{"days":{"2026-11-02":{"state":{}}}}}'), true);
  assert.equal(hasMeaningfulLocalSyncData('days', 'not-json'), false);
});
