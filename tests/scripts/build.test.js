const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const projectRoot = path.resolve(__dirname, '../..');
const buildScript = path.join(projectRoot, 'scripts', 'build.js');
const srcDir = path.join(projectRoot, 'src');
const distDir = path.join(projectRoot, 'dist');

// Helper function to run the build script
async function runBuildScript(env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [buildScript], {
      cwd: projectRoot,
      env: { ...process.env, ...env },
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

// Helper to clean up test files
function cleanupDist() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
}

describe('build.js script', () => {
  beforeEach(() => {
    cleanupDist();
  });

  afterEach(() => {
    cleanupDist();
  });

  test('should create dist directory and copy files from src', async () => {
    const result = await runBuildScript();
    
    assert.equal(result.code, 0, `Build script failed with stderr: ${result.stderr}`);
    assert.ok(fs.existsSync(distDir), 'dist directory should exist');
    
    // Check that critical files were copied
    const criticalFiles = ['index.html', 'manifest.webmanifest', 'sw.js', 'style.css'];
    for (const file of criticalFiles) {
      const filePath = path.join(distDir, file);
      assert.ok(fs.existsSync(filePath), `${file} should exist in dist`);
    }
  });

  test('should preserve directory structure when copying', async () => {
    const result = await runBuildScript();
    
    assert.equal(result.code, 0);
    
    // Check subdirectories
    const subdirs = ['components', 'lib', 'icons', 'images'];
    for (const dir of subdirs) {
      const dirPath = path.join(distDir, dir);
      assert.ok(fs.existsSync(dirPath), `${dir} directory should exist in dist`);
    }
  });

  test('should update paths for GitHub Pages deployment', async () => {
    const indexPath = path.join(srcDir, 'index.html');
    const originalIndexContent = fs.readFileSync(indexPath, 'utf8');

    // Simulate a repository without a custom domain so build script rewrites paths
    const sanitizedIndexContent = originalIndexContent.replace(/drawercounter\.journeytocode\.io/g, 'example.com');
    fs.writeFileSync(indexPath, sanitizedIndexContent);

    try {
      const result = await runBuildScript({
        GITHUB_ACTIONS: 'true',
        GITHUB_REPOSITORY: 'testuser/test-repo'
      });
      
      assert.equal(result.code, 0);
      
      const distIndexPath = path.join(distDir, 'index.html');
      const indexContent = fs.readFileSync(distIndexPath, 'utf8');
      
      // Check that paths were updated for GitHub Pages
      assert.ok(indexContent.includes('/test-repo/'), 'Should contain base URL for GitHub Pages');
    } finally {
      fs.writeFileSync(indexPath, originalIndexContent);
    }
  });

  test('should not modify paths for root deployment', async () => {
    const result = await runBuildScript({
      BASE_URL: '/'
    });
    
    assert.equal(result.code, 0);
    
    const indexPath = path.join(distDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check that relative paths are preserved for root deployment
    assert.ok(indexContent.includes('href="./style.css"'), 'Should preserve relative paths for root deployment');
  });

  test('should update manifest for GitHub Pages', async () => {
    const result = await runBuildScript({
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'testuser/test-repo'
    });
    
    assert.equal(result.code, 0);
    
    const manifestPath = path.join(distDir, 'manifest.webmanifest');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    assert.equal(manifest.start_url, '/test-repo/', 'Manifest start_url should be updated');
    assert.equal(manifest.scope, '/test-repo/', 'Manifest scope should be updated');
  });

  test('should exit with error if source directory does not exist', async () => {
    // Temporarily rename src directory
    const tempSrcDir = path.join(projectRoot, 'src_temp');
    fs.renameSync(srcDir, tempSrcDir);
    
    try {
      const result = await runBuildScript();
      assert.equal(result.code, 1, 'Should exit with error code 1');
      assert.ok(result.stderr.includes('Source directory does not exist'), 'Should show error message');
    } finally {
      // Restore src directory
      fs.renameSync(tempSrcDir, srcDir);
    }
  });

  test('should exit with error if critical files are missing after copy', async () => {
    // Create a temporary src directory without critical files
    const tempSrcDir = path.join(projectRoot, 'src_temp_empty');
    fs.mkdirSync(tempSrcDir, { recursive: true });
    
    // Temporarily rename real src directory
    const realSrcDir = path.join(projectRoot, 'src_real');
    fs.renameSync(srcDir, realSrcDir);
    fs.renameSync(tempSrcDir, srcDir);
    
    try {
      const result = await runBuildScript();
      assert.equal(result.code, 1, 'Should exit with error code 1');
      assert.ok(result.stderr.includes('Critical file missing'), 'Should show critical file missing error');
    } finally {
      // Restore real src directory
      fs.rmSync(srcDir, { recursive: true, force: true });
      fs.renameSync(realSrcDir, srcDir);
    }
  });

  test('should clean existing dist directory before building', async () => {
    // Create dist directory with some files
    fs.mkdirSync(distDir, { recursive: true });
    const testFile = path.join(distDir, 'test-file.txt');
    fs.writeFileSync(testFile, 'test content');
    
    const result = await runBuildScript();
    
    assert.equal(result.code, 0);
    assert.ok(!fs.existsSync(testFile), 'Old files should be removed');
    assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'New files should be present');
  });

  test('should handle custom domain configuration', async () => {
    // Create a version of index.html with custom domain
    const indexPath = path.join(srcDir, 'index.html');
    const originalContent = fs.readFileSync(indexPath, 'utf8');
    const customDomainContent = originalContent.replace(
      'href="./manifest.webmanifest"',
      'href="https://drawercounter.journeytocode.io/manifest.webmanifest"'
    );
    
    fs.writeFileSync(indexPath, customDomainContent);
    
    try {
      const result = await runBuildScript({
        GITHUB_ACTIONS: 'true',
        GITHUB_REPOSITORY: 'testuser/test-repo'
      });
      
      assert.equal(result.code, 0);
      
      const distIndexPath = path.join(distDir, 'index.html');
      const distContent = fs.readFileSync(distIndexPath, 'utf8');
      
      // Should not modify paths when custom domain is detected
      assert.ok(distContent.includes('drawercounter.journeytocode.io'), 'Should preserve custom domain');
    } finally {
      // Restore original content
      fs.writeFileSync(indexPath, originalContent);
    }
  });

  test('should log appropriate messages during build process', async () => {
    const result = await runBuildScript();
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('[build] Cleaning dist directory'), 'Should log cleaning message');
    assert.ok(result.stdout.includes('[build] Copying src/ to dist/'), 'Should log copying message');
    assert.ok(result.stdout.includes('[build] Build complete!'), 'Should log completion message');
  });

  test('should include favicon asset referenced by manifest', async () => {
    const result = await runBuildScript();

    assert.equal(result.code, 0, `Build script failed with stderr: ${result.stderr}`);

    const faviconPath = path.join(distDir, 'icons', 'favicon.svg');
    assert.ok(fs.existsSync(faviconPath), 'favicon.svg should exist in dist/icons');

    const faviconStat = fs.statSync(faviconPath);
    assert.ok(faviconStat.size > 0, 'favicon.svg should not be empty');

    const faviconContent = fs.readFileSync(faviconPath, 'utf8');
    assert.ok(/<svg[\s>]/i.test(faviconContent), 'favicon.svg should contain SVG markup');

    const manifestPath = path.join(distDir, 'manifest.webmanifest');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.icons), 'manifest.icons should be an array');
    const faviconIcon = manifest.icons.find((icon = {}) => {
      const src = String(icon.src || '');
      return src.endsWith('icons/favicon.svg');
    });

    assert.ok(faviconIcon, 'manifest should reference icons/favicon.svg');
  });
});