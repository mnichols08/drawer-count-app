import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BACKGROUND_OPTIONS,
  chooseBackgroundId,
  normalizeBackgroundChoice
} from '../../src/lib/backgrounds.mjs';

test('background catalog includes original and Southern variants', () => {
  const ids = BACKGROUND_OPTIONS.map(({ id }) => id);
  assert.deepEqual(ids, [
    '1g-eclipse-bg',
    'crownvic-bg',
    'eclipse-challenge-bg',
    'vw-bg',
    'crownvic-southern-bg',
    'eclipse-challenge-southern-bg',
    'vw-southern-bg',
    'vw-atlas-southern-bg'
  ]);
});

test('every background has PNG and WebP assets', () => {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const serviceWorker = fs.readFileSync(path.join(projectRoot, 'src', 'sw.js'), 'utf8');
  const optimizer = fs.readFileSync(path.join(projectRoot, 'scripts', 'optimize-images.js'), 'utf8');
  for (const { id } of BACKGROUND_OPTIONS) {
    assert.equal(fs.existsSync(path.join(projectRoot, 'src', 'images', `${id}.png`)), true, `${id}.png`);
    assert.equal(fs.existsSync(path.join(projectRoot, 'src', 'images', `${id}.webp`)), true, `${id}.webp`);
    assert.match(serviceWorker, new RegExp(`images/${id}\\.png`), `${id}.png should be precached`);
    assert.match(serviceWorker, new RegExp(`images/${id}\\.webp`), `${id}.webp should be precached`);
    assert.match(optimizer, new RegExp(`['"]${id}\\.png['"]`), `${id}.png should be optimized`);
  }
});

test('invalid background choices fall back to random', () => {
  assert.equal(normalizeBackgroundChoice('crownvic-southern-bg'), 'crownvic-southern-bg');
  assert.equal(normalizeBackgroundChoice('missing'), 'random');
  assert.equal(normalizeBackgroundChoice(null), 'random');
});

test('random choice uses the full catalog deterministically', () => {
  assert.equal(chooseBackgroundId('random', () => 0), BACKGROUND_OPTIONS[0].id);
  assert.equal(chooseBackgroundId('random', () => 0.999), BACKGROUND_OPTIONS.at(-1).id);
  assert.equal(chooseBackgroundId('vw-southern-bg'), 'vw-southern-bg');
});
