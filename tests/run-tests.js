#!/usr/bin/env node
/**
 * Test runner for all script tests
 * Uses Node.js built-in test runner (Node 18+)
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTests() {
  log('🧪 Running comprehensive script tests...', 'blue');
  log('========================================', 'blue');

  const testFiles = [
    'tests/setup.test.js',
    'tests/scripts/basic-tests.test.js'
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const testFile of testFiles) {
    log(`\n📝 Running ${testFile}...`, 'yellow');
    
    const result = await runSingleTest(testFile);
    
    if (result.success) {
      log(`✅ ${testFile} - PASSED`, 'green');
      passedTests += result.testCount;
    } else {
      log(`❌ ${testFile} - FAILED`, 'red');
      failedTests += result.testCount;
      
      // Show error details
      if (result.stderr) {
        log(`Error output:`, 'red');
        console.log(result.stderr);
      }
    }
    
    totalTests += result.testCount;
  }

  // Summary
  log('\n========================================', 'blue');
  log('📊 Test Summary:', 'bold');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, 'red');
  
  if (failedTests === 0) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n💥 ${failedTests} test(s) failed!`, 'red');
    process.exit(1);
  }
}

async function runSingleTest(testFile) {
  return new Promise((resolve) => {
    const testPath = path.join(projectRoot, testFile);
    
    const child = spawn('node', ['--test', testPath], {
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
      // Parse test results from Node.js test runner output
      const testCount = parseTestCount(stdout + stderr);
      
      resolve({
        success: code === 0,
        testCount: testCount,
        stdout: stdout,
        stderr: stderr
      });
    });
  });
}

function parseTestCount(output) {
  // Try to parse test count from Node.js test runner output
  const lines = output.split('\n');
  let testCount = 0;
  
  for (const line of lines) {
    // Look for lines that indicate test execution
    if (line.includes('✓') || line.includes('×') || line.includes('ok ') || line.includes('not ok ')) {
      testCount++;
    }
  }
  
  // If we can't parse specific count, return 1 as minimum
  return Math.max(testCount, 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`❌ Unhandled Rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run the tests
runTests().catch((error) => {
  log(`❌ Test runner failed: ${error.message}`, 'red');
  process.exit(1);
});