#!/usr/bin/env node
// Bump versions across the app:
// - sw.js: CACHE_VERSION ('vX.Y.Z' or 'X.Y.Z')
// - HTML: main.js cache-busting query (?v=X.Y.Z) in index.html and offline.html
// - package.json: version (X.Y.Z)
// - package-lock.json: version (X.Y.Z) and packages[""]?.version
// Supports optional 'v' prefix input; preserves sw.js prefix.
// Usage: node scripts/bump-sw-cache.js [--dry] [--set X.Y.Z|vX.Y.Z] [--major|--minor|--patch]
//                                     [--no-git] [--no-commit] [--force-tag] [--push]
// Notes:
// - Git tagging is ON by default (tag-only). Use --no-git to disable.
// - By default, a release commit will be created; use --no-commit to skip committing before tagging.
//   --push pushes tags (and commit if created).

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const dry = process.argv.includes('--dry');
// Git tagging is enabled by default unless explicitly disabled; --push always implies git operations.
const doGit = process.argv.includes('--push') || process.argv.includes('--git') || !process.argv.includes('--no-git');
// Commit by default unless explicitly disabled
const commitChanges = !process.argv.includes('--no-commit');
const forceTag = process.argv.includes('--force-tag');
const doPush = process.argv.includes('--push');
// bump type flags (default patch)
let bumpType = 'patch';
if (process.argv.includes('--major')) bumpType = 'major';
else if (process.argv.includes('--minor')) bumpType = 'minor';
else if (process.argv.includes('--patch')) bumpType = 'patch';
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
const rootDir = path.join(__dirname, '..');
const swPath = path.join(rootDir, 'sw.js');
const htmlFiles = [
  path.join(rootDir, 'index.html'),
  path.join(rootDir, 'offline.html'),
];
const pkgJsonPath = path.join(rootDir, 'package.json');
const pkgLockPath = path.join(rootDir, 'package-lock.json');

function bumpVersionTag(tag, type = 'patch') {
  // Expect semver with optional 'v' prefix, e.g., 'v0.0.25' or '0.0.25'
  const m = /^(v)?(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (!m) throw new Error(`Unexpected CACHE_VERSION format (expected vX.Y.Z or X.Y.Z): ${tag}`);
  const prefix = m[1] || '';
  let major = parseInt(m[2], 10);
  let minor = parseInt(m[3], 10);
  let patch = parseInt(m[4], 10);
  if (type === 'major') {
    major += 1; minor = 0; patch = 0;
  } else if (type === 'minor') {
    minor += 1; patch = 0;
  } else { // patch
    patch += 1;
  }
  return `${prefix}${major}.${minor}.${patch}`;
}

function run() {
  const src = fs.readFileSync(swPath, 'utf8');
  const re = /(const\s+CACHE_VERSION\s*=\s*')([^']+)(')/;
  const match = src.match(re);
  if (!match) throw new Error('CACHE_VERSION not found in sw.js');

  const current = match[2];
  // Determine next version: either explicit or bumped patch.
  let next = explicitVersion ? explicitVersion : bumpVersionTag(current, bumpType);
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
    // In dry mode, also show what would change in package files and HTML files
    const nextNumeric = next.replace(/^v/, '');
    // package.json preview
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const willChange = pkg.version !== nextNumeric;
      console.log(`[dry] package.json: ${willChange ? `would update ${pkg.version} -> ${nextNumeric}` : 'already up-to-date'}`);
    } catch (e) {
      console.log(`[dry] package.json: skipped (${e.message || String(e)})`);
    }
    // package-lock.json preview
    try {
      const lock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
      const rootOld = lock.version;
      const pkgOld = lock.packages && lock.packages[''] ? lock.packages[''].version : undefined;
      const rootChange = rootOld !== undefined && rootOld !== nextNumeric;
      const pkgChange = pkgOld !== undefined && pkgOld !== nextNumeric;
      if (rootOld === undefined && pkgOld === undefined) {
        console.log('[dry] package-lock.json: no recognizable version fields');
      } else {
        if (rootOld !== undefined) {
          console.log(`[dry] package-lock.json (root): ${rootChange ? `would update ${rootOld} -> ${nextNumeric}` : 'already up-to-date'}`);
        }
        if (pkgOld !== undefined) {
          console.log(`[dry] package-lock.json (packages["\"]): ${pkgChange ? `would update ${pkgOld} -> ${nextNumeric}` : 'already up-to-date'}`);
        }
      }
    } catch (e) {
      console.log(`[dry] package-lock.json: skipped (${e.message || String(e)})`);
    }
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
    if (doGit) {
      const tagName = `v${nextNumeric}`;
  console.log(`[dry] git: would ${commitChanges ? 'commit changes and ' : ''}create tag ${tagName}${forceTag ? ' (force)' : ''}${doPush ? ' and push' : ''}.`);
      if (!commitChanges) console.log('[dry] note: tag will point to current HEAD (uncommitted file changes will not be included).');
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

  // Update package.json version
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const old = pkg.version;
    if (old !== nextNumeric) {
      pkg.version = nextNumeric;
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`Updated package.json version: ${old} -> ${nextNumeric}`);
    } else {
      console.log('package.json version already up-to-date');
    }
  } catch (e) {
    console.error(`Failed to update package.json: ${e.message || String(e)}`);
  }

  // Update package-lock.json version(s)
  try {
    const lockRaw = fs.readFileSync(pkgLockPath, 'utf8');
    const lock = JSON.parse(lockRaw);
    let changed = false;
    if (typeof lock.version === 'string' && lock.version !== nextNumeric) {
      lock.version = nextNumeric;
      changed = true;
      console.log('Updated package-lock.json (root version)');
    }
    if (lock.packages && lock.packages[''] && typeof lock.packages[''].version === 'string' && lock.packages[''].version !== nextNumeric) {
      lock.packages[''].version = nextNumeric;
      changed = true;
      console.log('Updated package-lock.json (packages["\"] version)');
    }
    if (changed) {
      fs.writeFileSync(pkgLockPath, JSON.stringify(lock, null, 2) + '\n');
    } else {
      console.log('package-lock.json versions already up-to-date');
    }
  } catch (e) {
    console.error(`Failed to update package-lock.json: ${e.message || String(e)}`);
  }

  // Optionally create git commit and tag
  if (doGit) {
    const nextNumeric = next.replace(/^v/, '');
    const tagName = `v${nextNumeric}`;
    const rel = (p) => path.relative(rootDir, p).replace(/\\/g, '/');
    const filesToStage = [swPath, ...htmlFiles, pkgJsonPath, pkgLockPath].map(rel);
    const exec = (cmd) => cp.execSync(cmd, { cwd: rootDir, stdio: 'pipe' }).toString().trim();
    const safeExec = (cmd) => {
      try { return exec(cmd); } catch (e) { throw new Error((e.stderr?.toString() || e.message || String(e)).trim()); }
    };
    try {
      // ensure git repo
      try { safeExec('git rev-parse --is-inside-work-tree'); }
      catch { console.warn('Not a git repository; skipping git commit/tag.'); return; }

      if (commitChanges) {
        // Stage only the files we know we changed
        for (const f of filesToStage) {
          try { safeExec(`git add -- "${f}"`); } catch (e) { console.warn(`git add failed for ${f}: ${e.message}`); }
        }
        // Commit; if nothing to commit, this will throw — catch and continue
        try {
          safeExec(`git commit -m "chore(release): bump to ${tagName}"`);
          console.log('Created release commit.');
        } catch (e) {
          console.log('No changes to commit or commit failed; proceeding to tag.');
        }
      } else {
        // Warn if working tree has unstaged or uncommitted changes
        try {
          const status = safeExec('git status --porcelain');
          if (status) console.warn('Warning: creating tag without committing; tag will not include working tree changes.');
        } catch (_) { /* ignore */ }
      }

      // Check if tag exists
      let tagExists = false;
      try { safeExec(`git rev-parse -q --verify refs/tags/${tagName}`); tagExists = true; } catch { tagExists = false; }
      if (tagExists && !forceTag) {
        console.warn(`Tag ${tagName} already exists. Use --force-tag to overwrite.`);
      } else {
        const force = forceTag ? ' -f' : '';
        safeExec(`git tag -a${force} ${tagName} -m "Release ${tagName}"`);
        console.log(`Created git tag ${tagName}.`);
      }

      if (doPush) {
        if (commitChanges) {
          try { safeExec('git push'); console.log('Pushed commit.'); } catch (e) { console.warn(`git push failed: ${e.message}`); }
        }
        try { safeExec(`git push ${forceTag ? '--force ' : ''}--tags`); console.log('Pushed tags.'); } catch (e) { console.warn(`git push --tags failed: ${e.message}`); }
      }
    } catch (e) {
      console.error(`Git operations failed: ${e.message}`);
    }
  }
}

try {
  run();
} catch (e) {
  console.error(e.message || String(e));
  process.exit(1);
}
