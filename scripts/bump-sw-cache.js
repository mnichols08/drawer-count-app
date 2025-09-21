#!/usr/bin/env node
// Bump the CACHE_VERSION string in sw.js by patch (e.g., 'v0.0.25' -> 'v0.0.26').
// Supports optional 'v' prefix: 'vX.Y.Z' or 'X.Y.Z'.
// Usage: node scripts/bump-sw-cache.js [--dry]

const fs = require('fs');
const path = require('path');

const dry = process.argv.includes('--dry');
// Accept an explicit target version via --set X.Y.Z (or vX.Y.Z). Also allow a positional version.
let setIdx = process.argv.indexOf('--set');
let explicitVersion = null;
if (setIdx !== -1 && process.argv[setIdx + 1]) {
  explicitVersion = process.argv[setIdx + 1];
}
// If not provided via --set, check for a bare semver positional arg.
if (!explicitVersion) {
  const maybe = process.argv.find(a => /^(v)?\d+\.\d+\.\d+$/.test(a));
  if (maybe) explicitVersion = maybe;
}
const swPath = path.join(__dirname, '..', 'sw.js');
const rootDir = path.join(__dirname, '..');
const htmlFiles = [
  path.join(rootDir, 'index.html'),
  path.join(rootDir, 'offline.html'),
];

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
  // Determine next version: either explicit or bumped patch.
  let next = explicitVersion ? explicitVersion : bumpVersionTag(current);
  // Normalize: if current had a 'v' prefix and explicitVersion lacks it, preserve 'v'.
  const currentHasV = /^v/.test(current);
  const nextHasV = /^v/.test(next);
  if (currentHasV && !nextHasV) next = `v${next}`;
  if (!currentHasV && nextHasV) next = next.replace(/^v/, '');

  // Basic validation
  if (!/^(v)?\d+\.\d+\.\d+$/.test(next)) {
    throw new Error(`Invalid target version: ${next}`);
  }

  const updated = src.replace(re, `$1${next}$3`);

  if (dry) {
    console.log(`Current: ${current}`);
    console.log(`Next:     ${next}`);
    // In dry mode, also show what would change in HTML files
    const nextNumeric = next.replace(/^v/, '');
    for (const file of htmlFiles) {
      try {
        const html = fs.readFileSync(file, 'utf8');
        const tagRe = /(src=\"\.\/src\/main\.js\?v=)(\d+\.\d+\.\d+)(\")/g;
        if (!tagRe.test(html)) {
          console.log(`[dry] No main.js version tag found in ${path.basename(file)}`);
          continue;
        }
        const preview = html.replace(tagRe, `$1${nextNumeric}$3`);
        const changed = html !== preview;
        console.log(`[dry] ${path.basename(file)}: ${changed ? 'would update' : 'already up-to-date'} -> ?v=${nextNumeric}`);
      } catch (e) {
        console.log(`[dry] Skipped ${file}: ${e.message || String(e)}`);
      }
    }
    return;
  }

  fs.writeFileSync(swPath, updated);
  console.log(`Updated CACHE_VERSION: ${current} -> ${next}`);

  // Also bump cache-busting query param for main.js in HTML files
  const nextNumeric = next.replace(/^v/, '');
  const tagRe = /(src=\"\.\/src\/main\.js\?v=)(\d+\.\d+\.\d+)(\")/g;
  for (const file of htmlFiles) {
    try {
      const html = fs.readFileSync(file, 'utf8');
      if (!tagRe.test(html)) {
        console.warn(`No main.js version tag found in ${path.basename(file)}; skipping.`);
        continue;
      }
      const updatedHtml = html.replace(tagRe, `$1${nextNumeric}$3`);
      fs.writeFileSync(file, updatedHtml);
      console.log(`Updated ${path.basename(file)} main.js ?v= -> ${nextNumeric}`);
    } catch (e) {
      console.error(`Failed to update ${file}: ${e.message || String(e)}`);
    }
  }
}

try {
  run();
} catch (e) {
  console.error(e.message || String(e));
  process.exit(1);
}
