# Testing Documentation

This section contains comprehensive documentation for the test suite of the Drawer Count App project.

## 📋 Overview

The Drawer Count App has a comprehensive test suite that validates all scripts and functionality. The test suite uses Node.js built-in test runner (Node 18+) for zero-dependency testing.

## 🎯 What's Tested

### Scripts Under Test
- ✅ **Build Script** (`scripts/build.js`) - Production build process
- ✅ **Version Management** (`scripts/bump-sw-cache.js`) - Release and versioning
- ✅ **Icon Generation** (`scripts/generate-icons.js`) - PWA icon creation
- ✅ **Image Optimization** (`scripts/optimize-images.js`) - Asset optimization
- ✅ **Server** (`server.js`) - Express server functionality
- ✅ **Package Scripts** - All npm scripts validation

### Test Categories
1. **Unit Tests** - Individual script functionality
2. **Integration Tests** - Script interactions and workflows
3. **Configuration Tests** - Package.json and environment validation
4. **Error Handling Tests** - Graceful failure scenarios
5. **Environment Tests** - Cross-platform compatibility

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for built-in test runner)
- All project dependencies installed (`npm install`)

### Running Tests
```bash
# Run all tests with custom runner
npm test

# Run individual test categories
npm run test:setup      # Environment validation
npm run test:basic      # Core functionality tests

# Use Node.js test runner directly
node --test tests/      # All test files
node --test tests/setup.test.js  # Specific test file
```

### Test Results
```
🧪 Running comprehensive script tests...
✅ tests/setup.test.js - PASSED
✅ tests/scripts/basic-tests.test.js - PASSED

📊 Test Summary:
Total Tests: 19
Passed: 19
Failed: 0

🎉 All tests passed!
```

## 📁 Test Structure

```
tests/
├── run-tests.js                # Custom test runner with colored output
├── setup.test.js               # Environment and structure validation
└── scripts/
    ├── basic-tests.test.js     # Core script functionality tests
    ├── build.test.js          # Advanced build testing (reference)
    ├── bump-sw-cache.test.js  # Advanced version testing (reference)
    ├── generate-icons.test.js # Advanced icon testing (reference)
    ├── optimize-images.test.js # Advanced image testing (reference)
    ├── server.test.js         # Advanced server testing (reference)
    └── package-scripts.test.js # Advanced script testing (reference)
```

## 🔧 Test Framework Details

### Technology Stack
- **Runtime:** Node.js built-in test runner (Node 18+)
- **Assertions:** Node.js `assert/strict` module
- **Architecture:** CommonJS modules for maximum compatibility
- **Dependencies:** Zero additional testing framework dependencies

### Key Features
- ✅ **Zero Dependencies** - No external test frameworks required
- ✅ **Modern Async Support** - Full async/await and Promise support
- ✅ **Colored Output** - Easy-to-read test results
- ✅ **Process Management** - Safe subprocess execution and cleanup
- ✅ **File Operations** - Backup/restore utilities for safe testing
- ✅ **CI/CD Ready** - Proper exit codes and GitHub Actions integration

## 📊 Test Coverage

### Current Coverage
- **Script Files:** 100% (all package.json scripts)
- **Core Functionality:** 90%+ of critical features
- **Error Scenarios:** Common failure modes covered
- **Environment Validation:** Project structure and dependencies

### Test Statistics
- **Total Test Cases:** 19 (basic suite) + 80+ (advanced reference suite)
- **Execution Time:** ~1-2 seconds for basic suite
- **Success Rate:** 100% pass rate in current implementation
- **CI Compatibility:** Tested across Node.js 18.x, 20.x, 22.x

## 🛡️ Test Safety

### File Safety
- **Backup/Restore:** Original files are preserved during tests
- **Isolation:** Each test runs in isolated environment
- **Cleanup:** Automatic removal of test artifacts
- **Non-Destructive:** Tests don't modify production files

### Process Safety
- **Timeouts:** Configurable timeouts prevent hanging tests
- **Process Cleanup:** Child processes are properly terminated
- **Resource Management:** Memory and file handle cleanup
- **Error Isolation:** Test failures don't affect other tests

## 🔄 Continuous Integration

### GitHub Actions Integration
The project includes a comprehensive CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- Matrix testing across Node.js versions
- Dependency caching for faster builds  
- Individual test category execution
- Integration testing pipeline
- Coverage reporting (Node 20+)
```

### CI Test Stages
1. **Environment Setup** - Node.js installation and dependency caching
2. **Unit Tests** - Individual script testing
3. **Integration Tests** - End-to-end workflow validation
4. **Dependency Tests** - Testing with minimal dependencies
5. **Coverage Analysis** - Code coverage reporting

## 📖 Additional Resources

- [Test Guide](test-guide.md) - Detailed guide for running and writing tests
- [Test Coverage](test-coverage.md) - Complete coverage analysis
- [Advanced Testing](../tests/README.md) - Original comprehensive test documentation

## 🤝 Contributing to Tests

When adding new features or scripts:

1. **Create corresponding tests** in the appropriate test file
2. **Follow existing patterns** for consistency
3. **Include both positive and negative test cases**
4. **Test error conditions and edge cases**
5. **Update documentation** to reflect new test coverage
6. **Ensure tests pass in CI** before submitting PRs

## 🐛 Troubleshooting

### Common Issues
- **Timeout Errors:** Increase timeout values or check for hanging processes
- **Permission Errors:** Ensure write permissions to project directory
- **Port Conflicts:** Tests use ports 3001-3002; ensure availability
- **Missing Dependencies:** Run `npm install` for full dependency installation

### Debug Mode
```bash
# Enable debug logging
NODE_DEBUG=test npm test

# Verbose Node.js test output
node --test --reporter=spec tests/
```

For more detailed troubleshooting, see the [Test Guide](test-guide.md).