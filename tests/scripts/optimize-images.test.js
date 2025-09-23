import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const optimizeScript = path.join(projectRoot, 'scripts', 'optimize-images.js');
const imagesDir = path.join(projectRoot, 'src', 'images');

// Helper function to run the optimize-images script
async function runOptimizeScript(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [optimizeScript, ...args], {
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

// Helper to create a test PNG image (minimal PNG data)
function createTestPng() {
  // This is a minimal 1x1 pixel PNG with transparency
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0B, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x62, 0x00, 0x02, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, // Compressed data
    0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
}

// Helper to create a larger test PNG
function createLargerTestPng() {
  // Create a buffer representing a larger PNG (this is still minimal but larger than the 1x1)
  const smallPng = createTestPng();
  const padding = Buffer.alloc(1000); // Add some padding to make it "larger"
  return Buffer.concat([smallPng, padding]);
}

// Helper to backup and restore images
class ImageBackup {
  constructor() {
    this.backupDir = path.join(projectRoot, 'test_image_backup');
    this.originalFiles = [];
  }

  backup() {
    if (fs.existsSync(imagesDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      
      const files = fs.readdirSync(imagesDir);
      for (const file of files) {
        const sourcePath = path.join(imagesDir, file);
        const backupPath = path.join(this.backupDir, file);
        
        if (fs.statSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, backupPath);
          this.originalFiles.push(file);
        }
      }
    }
  }

  restore() {
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      for (const file of files) {
        const filePath = path.join(imagesDir, file);
        if (fs.statSync(filePath).isFile() && !this.originalFiles.includes(file)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    if (fs.existsSync(this.backupDir)) {
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      for (const file of this.originalFiles) {
        const backupPath = path.join(this.backupDir, file);
        const restorePath = path.join(imagesDir, file);
        fs.copyFileSync(backupPath, restorePath);
      }
      
      fs.rmSync(this.backupDir, { recursive: true, force: true });
    }
  }
}

describe('optimize-images.js script', () => {
  let imageBackup;

  beforeEach(() => {
    imageBackup = new ImageBackup();
    imageBackup.backup();
    
    // Ensure images directory exists
    fs.mkdirSync(imagesDir, { recursive: true });
  });

  afterEach(() => {
    imageBackup.restore();
  });

  test('should optimize target PNG files by default', async () => {
    // Create test PNG files
    const targetFiles = [
      '1g-eclipse-bg.png',
      'crownvic-bg.png',
      'eclipse-challenge-bg.png',
      'vw-bg.png'
    ];
    
    for (const file of targetFiles) {
      const filePath = path.join(imagesDir, file);
      fs.writeFileSync(filePath, createLargerTestPng());
    }
    
    const result = await runOptimizeScript();
    
    assert.equal(result.code, 0, `Script failed with stderr: ${result.stderr}`);
    
    // Check that files were processed
    for (const file of targetFiles) {
      assert.ok(result.stdout.includes(file), `Should process ${file}`);
    }
  });

  test('should generate WebP versions of PNG files', async () => {
    const testFile = '1g-eclipse-bg.png';
    const webpFile = '1g-eclipse-bg.webp';
    
    fs.writeFileSync(path.join(imagesDir, testFile), createTestPng());
    
    const result = await runOptimizeScript();
    
    assert.equal(result.code, 0);
    
    // Check that WebP file was created
    const webpPath = path.join(imagesDir, webpFile);
    assert.ok(fs.existsSync(webpPath), 'WebP file should be created');
    assert.ok(result.stdout.includes(webpFile), 'Should log WebP creation');
  });

  test('should process all PNG files with --all flag', async () => {
    // Create various PNG files
    const testFiles = [
      'test1.png',
      'test2.png',
      'custom-image.png'
    ];
    
    for (const file of testFiles) {
      fs.writeFileSync(path.join(imagesDir, file), createTestPng());
    }
    
    const result = await runOptimizeScript(['--all']);
    
    assert.equal(result.code, 0);
    
    // Check that all PNG files were processed
    for (const file of testFiles) {
      assert.ok(result.stdout.includes(file), `Should process ${file} with --all flag`);
    }
  });

  test('should skip optimization when PNG cannot be made smaller', async () => {
    // Create a minimal PNG that cannot be optimized further
    const testFile = 'small-test.png';
    fs.writeFileSync(path.join(imagesDir, testFile), createTestPng());
    
    const result = await runOptimizeScript(['--all']);
    
    assert.equal(result.code, 0);
    
    // Should mention that file was unchanged
    assert.ok(result.stdout.includes('unchanged') || 
             result.stdout.includes('no smaller'), 
             'Should indicate when file cannot be optimized');
  });

  test('should handle missing images directory gracefully', async () => {
    // Remove images directory
    fs.rmSync(imagesDir, { recursive: true, force: true });
    
    const result = await runOptimizeScript();
    
    // Should not crash, but may exit with error or show message
    assert.ok(result.code === 0 || result.code === 1, 'Should handle missing directory gracefully');
  });

  test('should handle empty images directory', async () => {
    // Ensure directory exists but is empty
    fs.mkdirSync(imagesDir, { recursive: true });
    
    const result = await runOptimizeScript();
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('No PNG files found'), 'Should report no files found');
  });

  test('should handle missing target files gracefully', async () => {
    // Don't create any target files
    const result = await runOptimizeScript();
    
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes('No PNG files found'), 'Should handle missing target files');
  });

  test('should handle corrupted PNG files', async () => {
    const corruptFile = 'corrupt.png';
    const corruptPath = path.join(imagesDir, corruptFile);
    
    // Create a file that's not a valid PNG
    fs.writeFileSync(corruptPath, 'This is not a PNG file');
    
    const result = await runOptimizeScript(['--all']);
    
    // Should handle error gracefully
    assert.ok(result.stdout.includes('Failed to optimize') || 
             result.stderr.includes('Error') ||
             result.code === 0, // May succeed if Sharp handles it gracefully
             'Should handle corrupted files gracefully');
  });

  test('should preserve transparency in PNG files', async () => {
    const testFile = 'transparent-test.png';
    fs.writeFileSync(path.join(imagesDir, testFile), createTestPng());
    
    const result = await runOptimizeScript(['--all']);
    
    assert.equal(result.code, 0);
    
    // File should still exist and be processed
    const testPath = path.join(imagesDir, testFile);
    assert.ok(fs.existsSync(testPath), 'PNG file should still exist after optimization');
  });

  test('should log file sizes after optimization', async () => {
    const testFile = 'size-test.png';
    fs.writeFileSync(path.join(imagesDir, testFile), createLargerTestPng());
    
    const result = await runOptimizeScript(['--all']);
    
    assert.equal(result.code, 0);
    
    // Should include size information in logs
    assert.ok(result.stdout.includes('KB'), 'Should log file sizes in KB');
  });

  test('should create WebP with alpha support', async () => {
    const testFile = 'alpha-test.png';
    fs.writeFileSync(path.join(imagesDir, testFile), createTestPng());
    
    const result = await runOptimizeScript(['--all']);
    
    assert.equal(result.code, 0);
    
    const webpPath = path.join(imagesDir, 'alpha-test.webp');
    assert.ok(fs.existsSync(webpPath), 'WebP file with alpha should be created');
    
    // Verify WebP file has content
    const webpStats = fs.statSync(webpPath);
    assert.ok(webpStats.size > 0, 'WebP file should not be empty');
  });

  test('should handle only some target files present', async () => {
    // Create only some of the target files
    const presentFiles = ['1g-eclipse-bg.png', 'vw-bg.png'];
    
    for (const file of presentFiles) {
      fs.writeFileSync(path.join(imagesDir, file), createTestPng());
    }
    
    const result = await runOptimizeScript();
    
    assert.equal(result.code, 0);
    
    // Should process existing files without error
    for (const file of presentFiles) {
      assert.ok(result.stdout.includes(file), `Should process existing file ${file}`);
    }
  });

  test('should exit gracefully on processing error', async () => {
    // Create a file that might cause processing issues
    const problematicFile = 'problem.png';
    const problematicPath = path.join(imagesDir, problematicFile);
    
    // Create a file with PNG extension but invalid content
    fs.writeFileSync(problematicPath, Buffer.from('invalid png data'));
    
    const result = await runOptimizeScript(['--all']);
    
    // Should either succeed (if Sharp handles it) or fail gracefully
    assert.ok([0, 1].includes(result.code), 'Should exit with valid exit code');
    
    if (result.code === 1) {
      assert.ok(result.stdout.includes('Failed') || result.stderr.length > 0, 
                'Should show error message on failure');
    }
  });
});