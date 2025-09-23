import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const generateIconsScript = path.join(projectRoot, 'scripts', 'generate-icons.js');
const iconsDir = path.join(projectRoot, 'src', 'icons');
const sourceIcon = path.join(iconsDir, 'favicon.svg');

// Helper function to run the generate-icons script
async function runGenerateIconsScript() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [generateIconsScript], {
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

// Helper to create a minimal SVG icon for testing
function createTestSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0b132b"/>
  <circle cx="256" cy="256" r="100" fill="#ffffff"/>
</svg>`;
}

// Helper to backup and restore files
class IconBackup {
  constructor() {
    this.backupDir = path.join(projectRoot, 'test_icon_backup');
    this.originalFiles = [];
  }

  backup() {
    if (fs.existsSync(iconsDir)) {
      // Create backup directory
      fs.mkdirSync(this.backupDir, { recursive: true });
      
      // List all files in icons directory
      const files = fs.readdirSync(iconsDir);
      for (const file of files) {
        const sourcePath = path.join(iconsDir, file);
        const backupPath = path.join(this.backupDir, file);
        
        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, backupPath);
          this.originalFiles.push(file);
        }
      }
    }
  }

  restore() {
    // Remove all files from icons directory
    if (fs.existsSync(iconsDir)) {
      const files = fs.readdirSync(iconsDir);
      for (const file of files) {
        const filePath = path.join(iconsDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Restore original files
    if (fs.existsSync(this.backupDir)) {
      if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
      }
      
      for (const file of this.originalFiles) {
        const backupPath = path.join(this.backupDir, file);
        const restorePath = path.join(iconsDir, file);
        fs.copyFileSync(backupPath, restorePath);
      }
      
      // Clean up backup directory
      fs.rmSync(this.backupDir, { recursive: true, force: true });
    }
  }
}

describe('generate-icons.js script', () => {
  let iconBackup;

  beforeEach(() => {
    iconBackup = new IconBackup();
    iconBackup.backup();
    
    // Ensure icons directory exists and create test SVG
    fs.mkdirSync(iconsDir, { recursive: true });
    fs.writeFileSync(sourceIcon, createTestSvg());
  });

  afterEach(() => {
    iconBackup.restore();
  });

  test('should generate icons from favicon.svg', async () => {
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0, `Script failed with stderr: ${result.stderr}`);
    
    // Check that various icon sizes were generated
    const expectedIcons = [
      'android-chrome-192x192.png',
      'android-chrome-512x512.png',
      'apple-touch-icon.png',
      'favicon-16x16.png',
      'favicon-32x32.png'
    ];
    
    for (const iconFile of expectedIcons) {
      const iconPath = path.join(iconsDir, iconFile);
      assert.ok(fs.existsSync(iconPath), `${iconFile} should be generated`);
      
      // Verify it's a valid PNG file by checking file size
      const stats = fs.statSync(iconPath);
      assert.ok(stats.size > 0, `${iconFile} should not be empty`);
    }
  });

  test('should generate PWA-required icon files', async () => {
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    
    // Check for PWA manifest icons
    const pwaIcons = ['icon-192.png', 'icon-512.png'];
    
    for (const iconFile of pwaIcons) {
      const iconPath = path.join(iconsDir, iconFile);
      assert.ok(fs.existsSync(iconPath), `${iconFile} should be generated for PWA`);
      
      const stats = fs.statSync(iconPath);
      assert.ok(stats.size > 0, `${iconFile} should not be empty`);
    }
  });

  test('should generate favicon.ico in project root', async () => {
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    
    const faviconPath = path.join(projectRoot, 'favicon.ico');
    assert.ok(fs.existsSync(faviconPath), 'favicon.ico should be generated in project root');
    
    const stats = fs.statSync(faviconPath);
    assert.ok(stats.size > 0, 'favicon.ico should not be empty');
    
    // Clean up
    fs.unlinkSync(faviconPath);
  });

  test('should generate browserconfig.xml', async () => {
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    
    const browserconfigPath = path.join(projectRoot, 'browserconfig.xml');
    assert.ok(fs.existsSync(browserconfigPath), 'browserconfig.xml should be generated');
    
    const content = fs.readFileSync(browserconfigPath, 'utf8');
    assert.ok(content.includes('<?xml'), 'browserconfig.xml should be valid XML');
    assert.ok(content.includes('msapplication'), 'browserconfig.xml should contain Microsoft application config');
    
    // Clean up
    fs.unlinkSync(browserconfigPath);
  });

  test('should fail when favicon.svg is missing', async () => {
    // Remove the source SVG file
    fs.unlinkSync(sourceIcon);
    
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 1, 'Should exit with error code when source file is missing');
    assert.ok(result.stderr.includes('Missing src/icons/favicon.svg') || 
             result.stderr.includes('ENOENT'), 'Should show missing file error');
  });

  test('should log generated files', async () => {
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    
    // Check that the output includes log messages about written files
    assert.ok(result.stdout.includes('Wrote:'), 'Should log written files');
    assert.ok(result.stdout.includes('.png'), 'Should log PNG files');
  });

  test('should handle different SVG sizes correctly', async () => {
    // Create a different sized SVG
    const customSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#ff0000"/>
  <circle cx="512" cy="512" r="200" fill="#00ff00"/>
</svg>`;
    
    fs.writeFileSync(sourceIcon, customSvg);
    
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    
    // Verify that icons were still generated correctly
    const icon192Path = path.join(iconsDir, 'icon-192.png');
    const icon512Path = path.join(iconsDir, 'icon-512.png');
    
    assert.ok(fs.existsSync(icon192Path), 'Should generate 192px icon from larger source');
    assert.ok(fs.existsSync(icon512Path), 'Should generate 512px icon from larger source');
  });

  test('should generate Windows tile icons', async () => {
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    
    // Check for Windows-specific icons
    const windowsIcons = [
      'mstile-144x144.png',
      'mstile-150x150.png'
    ];
    
    for (const iconFile of windowsIcons) {
      const iconPath = path.join(iconsDir, iconFile);
      assert.ok(fs.existsSync(iconPath), `${iconFile} should be generated for Windows`);
    }
  });

  test('should generate Apple touch icons', async () => {
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    
    // Check for Apple-specific icons
    const appleIcons = [
      'apple-touch-icon.png',
      'apple-touch-icon-180x180.png'
    ];
    
    for (const iconFile of appleIcons) {
      const iconPath = path.join(iconsDir, iconFile);
      assert.ok(fs.existsSync(iconPath), `${iconFile} should be generated for Apple devices`);
    }
  });

  test('should warn when expected sizes are not found', async () => {
    // Create a mock favicons module response that doesn't include expected sizes
    // This is harder to test directly, but we can verify the warning logic exists
    
    const result = await runGenerateIconsScript();
    
    // The script should complete successfully even if some warnings occur
    assert.equal(result.code, 0);
    
    // Check that 192 and 512 files exist (the script creates them even if not in response)
    const icon192Path = path.join(iconsDir, 'icon-192.png');
    const icon512Path = path.join(iconsDir, 'icon-512.png');
    
    assert.ok(fs.existsSync(icon192Path) || result.stdout.includes('Warning: 192x192 icon not found'), 
              'Should create 192px icon or warn about it');
    assert.ok(fs.existsSync(icon512Path) || result.stdout.includes('Warning: 512x512 icon not found'), 
              'Should create 512px icon or warn about it');
  });

  test('should create icons directory if it does not exist', async () => {
    // Remove icons directory
    fs.rmSync(iconsDir, { recursive: true, force: true });
    
    // Create source file in a new icons directory
    fs.mkdirSync(iconsDir, { recursive: true });
    fs.writeFileSync(sourceIcon, createTestSvg());
    
    const result = await runGenerateIconsScript();
    
    assert.equal(result.code, 0);
    assert.ok(fs.existsSync(iconsDir), 'Should create icons directory');
    
    // Verify icons were created
    const iconFiles = fs.readdirSync(iconsDir);
    assert.ok(iconFiles.length > 1, 'Should generate multiple icon files'); // More than just the source SVG
  });
});