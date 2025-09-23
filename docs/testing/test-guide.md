# Test Suite for Drawer Count App Scripts

This directory contains comprehensive tests for all scripts in the Drawer Count App project.

## Overview

The test suite covers:
- **Build Script** (`scripts/build.js`) - Tests building and deployment preparation
- **Bump SW Cache Script** (`scripts/bump-sw-cache.js`) - Tests version bumping and release management
- **Generate Icons Script** (`scripts/generate-icons.js`) - Tests icon generation from SVG
- **Optimize Images Script** (`scripts/optimize-images.js`) - Tests image optimization and WebP generation
- **Server** (`server.js`) - Tests the Express server functionality
- **Package Scripts** - Tests all npm scripts defined in package.json

## Test Framework

Tests use **Node.js built-in test runner** (Node 18+), which means:
- ✅ No additional testing dependencies required
- ✅ Built-in assertions and test structure
- ✅ Native support for async/await and ES modules
- ✅ Isolated test execution

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Individual Test Files
```bash
# Test build script
node --test tests/scripts/build.test.js

# Test bump-sw-cache script
node --test tests/scripts/bump-sw-cache.test.js

# Test icon generation
node --test tests/scripts/generate-icons.test.js

# Test image optimization
node --test tests/scripts/optimize-images.test.js

# Test server functionality
node --test tests/scripts/server.test.js

# Test package.json scripts
node --test tests/scripts/package-scripts.test.js
```

### Run Tests with Coverage (Node 20+)
```bash
node --test --experimental-test-coverage tests/
```

## Test Structure

Each test file follows the pattern:
```javascript
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Script Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test('should do something specific', async () => {
    // Test implementation
    assert.equal(actual, expected);
  });
});
```

## Test Categories

### 1. Build Script Tests (`build.test.js`)
- ✅ Creates dist directory and copies files
- ✅ Preserves directory structure
- ✅ Updates paths for GitHub Pages deployment
- ✅ Handles custom domain configuration
- ✅ Validates critical files exist
- ✅ Cleans existing dist before building
- ✅ Error handling for missing source files

### 2. Version Bump Tests (`bump-sw-cache.test.js`)
- ✅ Dry run without making changes
- ✅ Patch, minor, and major version bumping
- ✅ Explicit version setting
- ✅ Updates all relevant files (sw.js, HTML, package.json, package-lock.json)
- ✅ Preserves version prefix patterns
- ✅ Handles missing files gracefully
- ✅ Input validation

### 3. Icon Generation Tests (`generate-icons.test.js`)
- ✅ Generates icons from SVG source
- ✅ Creates PWA-required icon sizes
- ✅ Generates favicon.ico in project root
- ✅ Creates platform-specific icons (Android, Apple, Windows)
- ✅ Handles missing source file
- ✅ Validates generated file integrity

### 4. Image Optimization Tests (`optimize-images.test.js`)
- ✅ Optimizes target PNG files
- ✅ Generates WebP versions with alpha support
- ✅ Processes all PNG files with --all flag
- ✅ Preserves transparency
- ✅ Handles missing or corrupted files
- ✅ Reports optimization results

### 5. Server Tests (`server.test.js`)
- ✅ Starts server and serves static files
- ✅ Handles production vs development modes
- ✅ CORS header configuration
- ✅ API routing and proxy configuration
- ✅ JSON request parsing
- ✅ Custom port configuration
- ✅ Graceful error handling

### 6. Package Scripts Tests (`package-scripts.test.js`)
- ✅ All defined scripts can be executed
- ✅ Build process creates expected outputs
- ✅ Clean script removes artifacts
- ✅ Version bump scripts work correctly
- ✅ Environment-specific script behavior
- ✅ Script dependency validation

## Test Utilities

### File Backup/Restore
Tests use backup utilities to preserve original files:
```javascript
const backup = new FileBackup();
backup.backup(filePath);
// ... run tests ...
backup.restore(filePath);
```

### Process Management
Helper functions manage child processes:
```javascript
const result = await runScript(scriptPath, args);
assert.equal(result.code, 0);
```

### Cleanup
Automatic cleanup prevents test pollution:
- Removes temporary files
- Restores original configurations
- Kills background processes

## Environment Requirements

### Required
- Node.js 18+ (for built-in test runner)
- All project dependencies installed (`npm install`)

### Optional (for full test coverage)
- MongoDB instance (for server API tests)
- Sharp package (for image optimization tests)
- Favicons package (for icon generation tests)

### Environment Variables
- `TEST_MONGODB_URI` - MongoDB connection for testing API functionality
- `CI=true` - Set automatically to disable interactive prompts

## Test Data

Tests create minimal test data:
- Temporary SVG files for icon generation
- Sample PNG files for optimization
- Mock configuration files
- Test HTML/CSS files

All test data is automatically cleaned up after test execution.

## Continuous Integration

Tests are designed to run in CI environments:
- ✅ No interactive prompts
- ✅ Deterministic outcomes
- ✅ Proper exit codes
- ✅ Isolated execution
- ✅ Resource cleanup

## Troubleshooting

### Common Issues

**Tests timeout**
- Increase timeout values in test files
- Check for hanging child processes

**Permission errors**
- Ensure write permissions to project directory
- Check file lock status

**Missing dependencies**
- Run `npm install` to install all dependencies
- Some tests skip when optional dependencies are missing

**Port conflicts**
- Tests use port 3001-3002 by default
- Ensure these ports are available

### Debug Mode
Run tests with additional logging:
```bash
NODE_DEBUG=test node --test tests/
```

## Contributing

When adding new scripts to the project:
1. Create corresponding test file in `tests/scripts/`
2. Follow existing test patterns
3. Include both positive and negative test cases
4. Test error conditions and edge cases
5. Update this README with new test descriptions

## Coverage Goals

Target test coverage:
- ✅ **100%** of package.json scripts
- ✅ **90%+** of script functionality
- ✅ **100%** of error conditions
- ✅ **100%** of configuration options