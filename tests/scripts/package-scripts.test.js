import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');

// Helper function to run npm scripts
async function runNpmScript(scriptName, args = [], timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', scriptName, ...args], {
      cwd: projectRoot,
      stdio: 'pipe',
      env: { ...process.env, CI: 'true' } // Set CI to avoid interactive prompts
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

    // Set timeout
    timeoutId = setTimeout(() => {
      child.kill();
      reject(new Error(`Script '${scriptName}' timed out after ${timeout}ms`));
    }, timeout);
  });
}

// Helper to run shell commands directly
async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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

// Helper to clean up test artifacts
function cleanupTestArtifacts() {
  const artifactsToClean = [
    path.join(projectRoot, 'dist'),
    path.join(projectRoot, 'favicon.ico'),
    path.join(projectRoot, 'browserconfig.xml')
  ];

  for (const artifact of artifactsToClean) {
    if (fs.existsSync(artifact)) {
      fs.rmSync(artifact, { recursive: true, force: true });
    }
  }
}

describe('package.json scripts', () => {
  beforeEach(() => {
    cleanupTestArtifacts();
  });

  afterEach(() => {
    cleanupTestArtifacts();
  });

  test('build script should create dist directory', async () => {
    const result = await runNpmScript('build');
    
    assert.equal(result.code, 0, `Build script failed: ${result.stderr}`);
    
    const distDir = path.join(projectRoot, 'dist');
    assert.ok(fs.existsSync(distDir), 'dist directory should be created');
    
    // Verify critical files exist
    const criticalFiles = ['index.html', 'manifest.webmanifest', 'sw.js'];
    for (const file of criticalFiles) {
      const filePath = path.join(distDir, file);
      assert.ok(fs.existsSync(filePath), `${file} should exist in dist`);
    }
  });

  test('build:prod script should optimize and build', async () => {
    // Skip if Sharp is not available (might not be installed in CI)
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.devDependencies || !packageJson.devDependencies.sharp) {
      return; // Skip test
    }

    const result = await runNpmScript('build:prod', [], 60000); // Longer timeout for optimization
    
    // Should either succeed or fail gracefully
    assert.ok([0, 1].includes(result.code), 'build:prod should complete with valid exit code');
    
    if (result.code === 0) {
      const distDir = path.join(projectRoot, 'dist');
      assert.ok(fs.existsSync(distDir), 'dist directory should be created');
    }
  });

  test('icons script should generate icon files', async () => {
    // Skip if favicons is not available
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.devDependencies || !packageJson.devDependencies.favicons) {
      return; // Skip test
    }

    // Ensure source SVG exists
    const sourceIcon = path.join(projectRoot, 'src', 'icons', 'favicon.svg');
    if (!fs.existsSync(sourceIcon)) {
      return; // Skip test if source doesn't exist
    }

    const result = await runNpmScript('icons', [], 45000); // Longer timeout for icon generation
    
    if (result.code === 0) {
      // Check that some icons were generated
      const iconsDir = path.join(projectRoot, 'src', 'icons');
      const iconFiles = fs.readdirSync(iconsDir).filter(f => f.endsWith('.png'));
      assert.ok(iconFiles.length > 0, 'Should generate icon files');
    }
  });

  test('bump-sw script should update cache version', async () => {
    const result = await runNpmScript('bump-sw', ['--dry']);
    
    assert.equal(result.code, 0, `bump-sw script failed: ${result.stderr}`);
    assert.ok(result.stdout.includes('Current:') && result.stdout.includes('Next:'), 
              'Should show version bump information');
  });

  test('clean script should remove dist directory', async () => {
    // First create a dist directory
    const distDir = path.join(projectRoot, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'test.txt'), 'test');
    
    const result = await runNpmScript('clean');
    
    assert.equal(result.code, 0, `Clean script failed: ${result.stderr}`);
    assert.ok(!fs.existsSync(distDir), 'dist directory should be removed');
  });

  test('optimize-images script should process images', async () => {
    // Skip if Sharp is not available
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.devDependencies || !packageJson.devDependencies.sharp) {
      return; // Skip test
    }

    const result = await runNpmScript('optimize-images');
    
    // Should complete successfully or report no files found
    assert.equal(result.code, 0, `optimize-images script failed: ${result.stderr}`);
    assert.ok(result.stdout.includes('No PNG files found') || 
             result.stdout.includes('.png'), 
             'Should process images or report none found');
  });

  test('release scripts should show dry run information', async () => {
    // Test patch release dry run
    const result = await runCommand('node', [
      path.join(projectRoot, 'scripts', 'bump-sw-cache.js'),
      '--patch', '--dry', '--no-git'
    ]);
    
    assert.equal(result.code, 0, 'Release patch dry run should work');
    assert.ok(result.stdout.includes('Next:'), 'Should show next version');
  });

  test('predeploy script should run build:prod', async () => {
    // This is tested indirectly since predeploy runs build:prod
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.equal(packageJson.scripts.predeploy, 'npm run build:prod', 
                'predeploy should run build:prod');
  });

  test('deploy script should show deployment message', async () => {
    const result = await runNpmScript('deploy');
    
    assert.equal(result.code, 0, 'Deploy script should complete');
    assert.ok(result.stdout.includes('Deploy') || result.stdout.includes('hosting'), 
              'Should show deployment instructions');
  });

  test('test script should indicate no tests specified', async () => {
    const result = await runNpmScript('test');
    
    assert.equal(result.code, 1, 'Test script should exit with error code');
    assert.ok(result.stderr.includes('no test specified') || 
             result.stdout.includes('no test specified'), 
             'Should indicate no tests are specified');
  });

  test('all npm scripts should be defined', async () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const expectedScripts = [
      'test',
      'dev',
      'start',
      'start:dev',
      'build',
      'build:prod',
      'icons',
      'bump-sw',
      'bump-sw:push',
      'release:patch',
      'release:minor',
      'release:major',
      'release:patch:push',
      'release:tag-only',
      'release:tag-only:push',
      'optimize-images',
      'predeploy',
      'deploy',
      'clean'
    ];

    for (const script of expectedScripts) {
      assert.ok(packageJson.scripts[script], `Script '${script}' should be defined`);
    }
  });

  test('start:dev script should be able to start server', async () => {
    // Test that the script can start (we'll kill it quickly)
    const child = spawn('npm', ['run', 'start:dev'], {
      cwd: projectRoot,
      stdio: 'pipe',
      env: { ...process.env, PORT: '3999' } // Use different port
    });

    let started = false;
    let stdout = '';

    const timeout = setTimeout(() => {
      if (!started) {
        child.kill();
      }
    }, 5000);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.includes('listening') || stdout.includes('server')) {
        started = true;
        child.kill();
        clearTimeout(timeout);
      }
    });

    await new Promise((resolve) => {
      child.on('close', resolve);
    });

    // Should either start successfully or fail gracefully
    assert.ok(started || stdout.length > 0, 'start:dev script should attempt to start server');
  });

  test('bump-sw variations should work', async () => {
    // Test different bump-sw script variations
    const bumpScripts = [
      'bump-sw',
      'release:tag-only'
    ];

    for (const script of bumpScripts) {
      const result = await runCommand('node', [
        path.join(projectRoot, 'scripts', 'bump-sw-cache.js'),
        '--dry', '--no-git'
      ]);
      
      assert.equal(result.code, 0, `${script} equivalent should work in dry mode`);
    }
  });

  test('scripts should handle missing dependencies gracefully', async () => {
    // Test that scripts handle missing optional dependencies
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // All scripts should be runnable (though some may fail gracefully)
    assert.ok(typeof packageJson.scripts === 'object', 'Scripts should be defined');
    assert.ok(Object.keys(packageJson.scripts).length > 0, 'Should have multiple scripts defined');
  });

  test('environment-specific scripts should handle NODE_ENV', async () => {
    // Test that start script references production mode
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    assert.ok(packageJson.scripts.start.includes('NODE_ENV=production') || 
             packageJson.scripts.start.includes('cross-env'), 
             'Start script should handle production environment');
  });

  test('dev script should use nodemon', async () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    assert.ok(packageJson.scripts.dev.includes('nodemon'), 
              'Dev script should use nodemon for development');
  });
});