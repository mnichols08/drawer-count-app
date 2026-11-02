import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTOSAVE_DELAY_MS,
  getDayRecordStatus,
  getLocalDateKey,
  isMatchingSyncRevision,
  millisecondsUntilNextLocalDay,
  shouldRolloverDay
} from '../../src/lib/daily-session.mjs';

test('getLocalDateKey uses the local calendar day', () => {
  const date = new Date(2026, 10, 2, 23, 59, 59);
  assert.equal(getLocalDateKey(date), '2026-11-02');
});

test('millisecondsUntilNextLocalDay schedules just after midnight', () => {
  const date = new Date(2026, 10, 2, 23, 59, 59, 500);
  assert.equal(millisecondsUntilNextLocalDay(date), 1500);
});

test('shouldRolloverDay only changes when the observed local day changes', () => {
  assert.equal(shouldRolloverDay('2026-11-02', new Date(2026, 10, 2, 23, 59)), false);
  assert.equal(shouldRolloverDay('2026-11-02', new Date(2026, 10, 3, 0, 0)), true);
});

test('autosave delay is short enough to feel immediate without saving each keystroke', () => {
  assert.equal(AUTOSAVE_DELAY_MS, 500);
});

test('legacy saved days remain completed while new drafts stay distinguishable', () => {
  assert.equal(getDayRecordStatus({ savedAt: 1, state: {} }), 'completed');
  assert.equal(getDayRecordStatus({ status: 'draft' }), 'draft');
  assert.equal(getDayRecordStatus({ status: 'completed' }), 'completed');
  assert.equal(getDayRecordStatus(null), 'missing');
});

test('sync status only accepts the exact pending local revision', () => {
  assert.equal(isMatchingSyncRevision(2, 1), false);
  assert.equal(isMatchingSyncRevision(2, 2), true);
  assert.equal(isMatchingSyncRevision(2, 3), false);
  assert.equal(isMatchingSyncRevision(0, 0), false);
});
