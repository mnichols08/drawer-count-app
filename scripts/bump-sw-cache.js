#!/usr/bin/env node
// Bump the CACHE_VERSION string in sw.js by patch (e.g., 'v0.0.25' -> 'v0.0.26').
// Supports optional 'v' prefix: 'vX.Y.Z' or 'X.Y.Z'.
// Usage: node scripts/bump-sw-cache.js [--dry]

const fs = require('fs');
const path = require('path');

const dry = process.argv.includes('--dry');
const swPath = path.join(__dirname, '..', 'sw.js');

function bumpVersionTag(tag) {
  // Expect semver with optional 'v' prefix, e.g., 'v0.0.25' or '0.0.25'
  const m = /^(v)?(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (!m) throw new Error(`Unexpected CACHE_VERSION format (expected vX.Y.Z or X.Y.Z): ${tag}`);
  const prefix = m[1] || '';
  const major = parseInt(m[2], 10);
  const minor = parseInt(m[3], 10);
  const patch = parseInt(m[4], 10) + 1;
  return `${prefix}${major}.${minor}.${patch}`;
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
