const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '../..');

// Helper function to run scripts
async function runScript(scriptPath, args = [], timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';
    let timeoutId;
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ code, stdout, stderr });
    });
    
    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    });

    timeoutId = setTimeout(() => {
      child.kill();
      reject(new Error(`Script timed out after ${timeout}ms`));
    }, timeout);
  });
}

describe('Build Script Tests', () => {
  const buildScript = path.join(projectRoot, 'scripts', 'build.js');
  const distDir = path.join(projectRoot, 'dist');

  // Cleanup function
  function cleanupDist() {
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
  }

  test('build script should exist', () => {
    assert.ok(fs.existsSync(buildScript), 'Build script should exist');
  });

  test('build script should create dist directory', async () => {
    cleanupDist();
    
    const result = await runScript(buildScript);
    
    assert.equal(result.code, 0, `Build script failed: ${result.stderr}`);
    assert.ok(fs.existsSync(distDir), 'dist directory should be created');
    
    // Cleanup
    cleanupDist();
  });

  test('build script should copy critical files', async () => {
    cleanupDist();
    
    const result = await runScript(buildScript);
    
    if (result.code === 0) {
      const criticalFiles = ['index.html', 'manifest.webmanifest', 'sw.js'];
      for (const file of criticalFiles) {
        const filePath = path.join(distDir, file);
        assert.ok(fs.existsSync(filePath), `${file} should exist in dist`);
      }
    }
    
    // Cleanup
    cleanupDist();
  });
});

describe('Bump SW Cache Script Tests', () => {
  const bumpScript = path.join(projectRoot, 'scripts', 'bump-sw-cache.js');

  test('bump script should exist', () => {
    assert.ok(fs.existsSync(bumpScript), 'Bump SW cache script should exist');
  });

  test('bump script should show dry run', async () => {
    const result = await runScript(bumpScript, ['--dry', '--no-git']);
    
    assert.equal(result.code, 0, `Bump script failed: ${result.stderr}`);
    assert.ok(result.stdout.includes('Current:') && result.stdout.includes('Next:'), 
              'Should show version information');
  });
});

describe('Package.json Scripts Tests', () => {
  const packageJsonPath = path.join(projectRoot, 'package.json');

  test('package.json should exist and have scripts', () => {
    assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.ok(packageJson.scripts, 'package.json should have scripts section');
    
    const expectedScripts = ['test', 'build', 'start', 'dev'];
    for (const script of expectedScripts) {
      assert.ok(packageJson.scripts[script], `Script '${script}' should be defined`);
    }
  });

  test('clean script should be defined', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    assert.ok(packageJson.scripts.clean, 'Clean script should be defined');
    assert.ok(packageJson.scripts.clean.includes('rmSync'), 'Clean script should remove dist directory');
  });
});

describe('Other Scripts Tests', () => {
  test('generate-icons script should exist', () => {
    const iconScript = path.join(projectRoot, 'scripts', 'generate-icons.js');
    assert.ok(fs.existsSync(iconScript), 'Generate icons script should exist');
  });

  test('optimize-images script should exist', () => {
    const optimizeScript = path.join(projectRoot, 'scripts', 'optimize-images.js');
    assert.ok(fs.existsSync(optimizeScript), 'Optimize images script should exist');
  });

  test('server.js should exist', () => {
    const serverPath = path.join(projectRoot, 'server.js');
    assert.ok(fs.existsSync(serverPath), 'Server script should exist');
  });
});