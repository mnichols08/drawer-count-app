#!/usr/bin/env node
// Bump the CACHE_VERSION string in sw.js (e.g., 'v7' -> 'v8').
// Usage: node scripts/bump-sw-cache.js [--dry]

const fs = require('fs');
const path = require('path');

const dry = process.argv.includes('--dry');
const swPath = path.join(__dirname, '..', 'sw.js');

function bumpVersionTag(tag) {
  // Expect 'v<number>'
  const m = /^v(\d+)$/.exec(tag);
  if (!m) throw new Error(`Unexpected CACHE_VERSION format: ${tag}`);
  const n = parseInt(m[1], 10) + 1;
  return 'v' + n;
}

function run() {
  const src = fs.readFileSync(swPath, 'utf8');
  const re = /(const\s+CACHE_VERSION\s*=\s*')([^']+)(')/;
  const match = src.match(re);
  if (!match) throw new Error('CACHE_VERSION not found in sw.js');

  const current = match[2];
  const next = bumpVersionTag(current);
  const updated = src.replace(re, `$1${next}$3`);

  if (dry) {
    console.log(`Current: ${current}`);
    console.log(`Next:     ${next}`);
    return;
  }

  fs.writeFileSync(swPath, updated);
  console.log(`Updated CACHE_VERSION: ${current} -> ${next}`);
}

try {
  run();
} catch (e) {
  console.error(e.message || String(e));
  process.exit(1);
}
