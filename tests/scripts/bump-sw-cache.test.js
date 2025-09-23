import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const bumpScript = path.join(projectRoot, 'scripts', 'bump-sw-cache.js');
const swPath = path.join(projectRoot, 'src', 'sw.js');
const indexPath = path.join(projectRoot, 'src', 'index.html');
const offlinePath = path.join(projectRoot, 'src', 'offline.html');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');

// Helper function to run the bump script
async function runBumpScript(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [bumpScript, ...args], {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    child.on('error', reject);
  });
}

// Helper to backup and restore files
class FileBackup {
  constructor() {
    this.backups = new Map();
  }

  backup(filePath) {
    if (fs.existsSync(filePath)) {
      this.backups.set(filePath, fs.readFileSync(filePath, 'utf8'));
    }
  }

  restore(filePath) {
    if (this.backups.has(filePath)) {
      fs.writeFileSync(filePath, this.backups.get(filePath), 'utf8');
    }
  }

  restoreAll() {
    for (const [filePath] of this.backups) {
      this.restore(filePath);
    }
  }
}

// Helper to create test versions of files
function createTestSw(version = 'v0.1.0') {
  const swContent = `
const CACHE_VERSION = '${version}';
const CACHE_NAME = 'drawer-count-cache-' + CACHE_VERSION;
// ... rest of service worker content
`;
  return swContent;
}

function createTestHtml(version = '0.1.0') {
  return `
<!DOCTYPE html>
<html>
<head>
  <script src="./main.js?v=${version}"></script>
</head>
<body>
  <h1>Test HTML</h1>
</body>
</html>
`;
}

function createTestPackageJson(version = '0.1.0') {
  return JSON.stringify({
    name: 'test-app',
    version: version,
    scripts: {
      test: 'echo test'
    }
  }, null, 2);
}

function createTestPackageLock(version = '0.1.0') {
  return JSON.stringify({
    name: 'test-app',
    version: version,
    lockfileVersion: 2,
    packages: {
      '': {
        name: 'test-app',
        version: version
      }
    }
  }, null, 2);
}

describe('bump-sw-cache.js script', () => {
  let backup;

  beforeEach(() => {
    backup = new FileBackup();
    
    // Backup original files
    backup.backup(swPath);
    backup.backup(indexPath);
    backup.backup(offlinePath);
    backup.backup(packageJsonPath);
    backup.backup(packageLockPath);
  });

  afterEach(() => {
    backup.restoreAll();
  });

  test('should show dry run output without making changes', async () => {
    // Create test files
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    const result = await runBumpScript(['--dry']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Current: v0.1.0'));
    assert.ok(result.stdout.includes('Next:     v0.1.1'));
    
    // Verify no files were changed
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_VERSION = 'v0.1.0'"));
  });

  test('should bump patch version by default', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    fs.writeFileSync(offlinePath, createTestHtml('0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    const result = await runBumpScript(['--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: v0.1.0 -> v0.1.1'));
    
    // Verify files were updated
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_VERSION = 'v0.1.1'"));
    
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    assert.ok(indexContent.includes('main.js?v=0.1.1'));
    
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.equal(pkg.version, '0.1.1');
  });

  test('should bump minor version when requested', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.5'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.5'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.5'));
    
    const result = await runBumpScript(['--minor', '--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: v0.1.5 -> v0.2.0'));
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_VERSION = 'v0.2.0'"));
    
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.equal(pkg.version, '0.2.0');
  });

  test('should bump major version when requested', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.5.10'));
    fs.writeFileSync(indexPath, createTestHtml('0.5.10'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.5.10'));
    
    const result = await runBumpScript(['--major', '--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: v0.5.10 -> v1.0.0'));
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_VERSION = 'v1.0.0'"));
    
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.equal(pkg.version, '1.0.0');
  });

  test('should set explicit version when provided', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    const result = await runBumpScript(['--set', 'v2.5.7', '--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: v0.1.0 -> v2.5.7'));
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_VERSION = 'v2.5.7'"));
    
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.equal(pkg.version, '2.5.7');
  });

  test('should handle version without v prefix in sw.js', async () => {
    fs.writeFileSync(swPath, createTestSw('0.1.0')); // No 'v' prefix
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    const result = await runBumpScript(['--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: 0.1.0 -> 0.1.1'));
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_VERSION = '0.1.1'"));
  });

  test('should preserve v prefix in sw.js when setting version without prefix', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    const result = await runBumpScript(['--set', '2.5.7', '--no-git']); // No 'v' prefix
    
    assert.equal(result.code, 0);
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_VERSION = 'v2.5.7'")); // Should preserve 'v'
  });

  test('should update package-lock.json when present', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    fs.writeFileSync(packageLockPath, createTestPackageLock('0.1.0'));
    
    const result = await runBumpScript(['--no-git']);
    
    assert.equal(result.code, 0);
    
    const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    assert.equal(lock.version, '0.1.1');
    assert.equal(lock.packages[''].version, '0.1.1');
  });

  test('should handle missing HTML files gracefully', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    // Remove HTML files
    if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
    if (fs.existsSync(offlinePath)) fs.unlinkSync(offlinePath);
    
    const result = await runBumpScript(['--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: v0.1.0 -> v0.1.1'));
  });

  test('should handle missing package.json gracefully', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    
    // Remove package.json
    if (fs.existsSync(packageJsonPath)) fs.unlinkSync(packageJsonPath);
    
    const result = await runBumpScript(['--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: v0.1.0 -> v0.1.1'));
  });

  test('should fail with invalid version format', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    
    const result = await runBumpScript(['--set', 'invalid-version', '--no-git']);
    
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes('Invalid target version'));
  });

  test('should fail when CACHE_VERSION not found in sw.js', async () => {
    fs.writeFileSync(swPath, 'const OTHER_VERSION = "1.0.0";');
    
    const result = await runBumpScript(['--no-git']);
    
    assert.equal(result.code, 1);
    assert.ok(result.stderr.includes('CACHE_VERSION not found in sw.js'));
  });

  test('should accept positional version argument', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.0'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    const result = await runBumpScript(['v3.2.1', '--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('Updated CACHE_VERSION: v0.1.0 -> v3.2.1'));
  });

  test('should skip HTML update when version tag not found', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.0'));
    fs.writeFileSync(indexPath, '<html><script src="./main.js"></script></html>'); // No version tag
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.0'));
    
    const result = await runBumpScript(['--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('No main.js version tag found in index.html; skipping'));
  });

  test('should handle already up-to-date versions', async () => {
    fs.writeFileSync(swPath, createTestSw('v0.1.1'));
    fs.writeFileSync(indexPath, createTestHtml('0.1.1'));
    fs.writeFileSync(packageJsonPath, createTestPackageJson('0.1.1'));
    
    const result = await runBumpScript(['--set', 'v0.1.1', '--no-git']);
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('package.json version already up-to-date'));
  });
});