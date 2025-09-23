const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

describe('Test Suite Setup', () => {
  test('should have all required test files', () => {
    const testFiles = [
      'tests/scripts/build.test.js',
      'tests/scripts/bump-sw-cache.test.js',
      'tests/scripts/generate-icons.test.js',
      'tests/scripts/optimize-images.test.js',
      'tests/scripts/server.test.js',
      'tests/scripts/package-scripts.test.js'
    ];

    for (const testFile of testFiles) {
      const testPath = path.join(projectRoot, testFile);
      assert.ok(fs.existsSync(testPath), `Test file ${testFile} should exist`);
    }
  });

  test('should have all scripts under test', () => {
    const scriptFiles = [
      'scripts/build.js',
      'scripts/bump-sw-cache.js',
      'scripts/generate-icons.js',
      'scripts/optimize-images.js',
      'server.js'
    ];

    for (const scriptFile of scriptFiles) {
      const scriptPath = path.join(projectRoot, scriptFile);
      assert.ok(fs.existsSync(scriptPath), `Script file ${scriptFile} should exist`);
    }
  });

  test('should have package.json with scripts', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.ok(packageJson.scripts, 'package.json should have scripts section');
    assert.ok(Object.keys(packageJson.scripts).length > 0, 'Should have at least one script');
  });

  test('project structure should be valid', () => {
    const requiredDirs = [
      'src',
      'scripts'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(projectRoot, dir);
      assert.ok(fs.existsSync(dirPath), `Directory ${dir} should exist`);
    }

    const requiredFiles = [
      'package.json',
      'server.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      assert.ok(fs.existsSync(filePath), `File ${file} should exist`);
    }
  });
});