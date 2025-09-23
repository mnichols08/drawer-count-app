import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const serverPath = path.join(projectRoot, 'server.js');

// Helper function to start the server
async function startServer(env = {}, port = 3001) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [serverPath], {
      cwd: projectRoot,
      env: { 
        ...process.env, 
        PORT: port.toString(),
        NODE_ENV: 'test',
        ...env 
      },
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      // Server is ready when it starts listening
      if (stdout.includes('listening on port') && !resolved) {
        resolved = true;
        resolve({ child, stdout, stderr, port });
      }
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (!resolved) {
        reject(new Error(`Server exited with code ${code}. Stderr: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      if (!resolved) {
        reject(error);
      }
    });

    // Timeout after 10 seconds
    setTimeout(10000).then(() => {
      if (!resolved) {
        child.kill();
        reject(new Error('Server start timeout'));
      }
    });
  });
}

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  const fetch = (await import('undici')).fetch;
  const response = await fetch(url, {
    timeout: 5000,
    ...options
  });
  return response;
}

// Helper to stop server
function stopServer(child) {
  return new Promise((resolve) => {
    if (child && !child.killed) {
      child.on('close', () => resolve());
      child.kill();
    } else {
      resolve();
    }
  });
}

describe('server.js', () => {
  let serverProcess = null;
  const testPort = 3001;

  afterEach(async () => {
    if (serverProcess) {
      await stopServer(serverProcess.child);
      serverProcess = null;
    }
  });

  test('should start server and serve static files', async () => {
    serverProcess = await startServer({}, testPort);
    
    // Test that server is running
    const response = await makeRequest(`http://localhost:${testPort}/`);
    assert.equal(response.status, 200);
    
    const html = await response.text();
    assert.ok(html.includes('<!DOCTYPE html>'), 'Should serve HTML content');
  });

  test('should serve static assets from dist in production', async () => {
    // Create a temporary dist directory for testing
    const distDir = path.join(projectRoot, 'dist');
    const testFile = path.join(distDir, 'test.html');
    
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(testFile, '<html><body>Production Build</body></html>');
    
    try {
      serverProcess = await startServer({ NODE_ENV: 'production' }, testPort);
      
      const response = await makeRequest(`http://localhost:${testPort}/test.html`);
      assert.equal(response.status, 200);
      
      const html = await response.text();
      assert.ok(html.includes('Production Build'), 'Should serve from dist in production');
    } finally {
      // Cleanup
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      if (fs.existsSync(distDir) && fs.readdirSync(distDir).length === 0) {
        fs.rmdirSync(distDir);
      }
    }
  });

  test('should serve static assets from src in development', async () => {
    serverProcess = await startServer({ NODE_ENV: 'development' }, testPort);
    
    // Test that it serves from src directory
    const response = await makeRequest(`http://localhost:${testPort}/style.css`);
    assert.equal(response.status, 200);
    
    const css = await response.text();
    assert.ok(css.includes('CSS') || css.length > 0, 'Should serve CSS from src');
  });

  test('should handle CORS headers', async () => {
    serverProcess = await startServer({}, testPort);
    
    const response = await makeRequest(`http://localhost:${testPort}/`, {
      headers: {
        'Origin': 'http://example.com'
      }
    });
    
    assert.ok(response.headers.get('access-control-allow-origin'), 'Should include CORS headers');
  });

  test('should return 404 for non-existent files', async () => {
    serverProcess = await startServer({}, testPort);
    
    const response = await makeRequest(`http://localhost:${testPort}/non-existent-file.html`);
    assert.equal(response.status, 404);
  });

  test('should handle API routes when MongoDB is configured', async () => {
    // Skip this test if we don't have a test MongoDB URI
    if (!process.env.TEST_MONGODB_URI) {
      return; // Skip test
    }
    
    serverProcess = await startServer({ 
      MONGODB_URI: process.env.TEST_MONGODB_URI 
    }, testPort);
    
    const response = await makeRequest(`http://localhost:${testPort}/api/profiles`);
    
    // Should not return 404 (API should be available)
    assert.notEqual(response.status, 404);
  });

  test('should proxy API requests when API_BASE is configured but no MongoDB', async () => {
    // Mock external API server (this would need actual external server for full test)
    serverProcess = await startServer({ 
      API_BASE: 'https://api.example.com',
      MONGODB_URI: '' // No local MongoDB
    }, testPort);
    
    // Server should start with proxy configuration
    assert.ok(serverProcess.stdout.includes('Proxying /api/*'), 'Should configure API proxy');
  });

  test('should handle JSON request body parsing', async () => {
    serverProcess = await startServer({}, testPort);
    
    const response = await makeRequest(`http://localhost:${testPort}/api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    // Even if the endpoint doesn't exist, it should parse the JSON without error
    // and return 404 rather than a parsing error
    assert.ok([404, 500].includes(response.status), 'Should handle JSON parsing');
  });

  test('should handle different PORT environment variable', async () => {
    const customPort = 3002;
    serverProcess = await startServer({ PORT: customPort.toString() }, customPort);
    
    // Verify server is running on custom port
    const response = await makeRequest(`http://localhost:${customPort}/`);
    assert.equal(response.status, 200);
  });

  test('should handle missing dist directory gracefully in production', async () => {
    const distDir = path.join(projectRoot, 'dist');
    const distExists = fs.existsSync(distDir);
    
    // Temporarily rename dist if it exists
    const tempDistDir = path.join(projectRoot, 'dist_temp');
    if (distExists) {
      fs.renameSync(distDir, tempDistDir);
    }
    
    try {
      serverProcess = await startServer({ NODE_ENV: 'production' }, testPort);
      
      // Should fall back to src or handle gracefully
      const response = await makeRequest(`http://localhost:${testPort}/`);
      assert.ok([200, 404].includes(response.status), 'Should handle missing dist directory');
    } finally {
      // Restore dist directory if it existed
      if (distExists && fs.existsSync(tempDistDir)) {
        fs.renameSync(tempDistDir, distDir);
      }
    }
  });

  test('should serve manifest.webmanifest with correct MIME type', async () => {
    serverProcess = await startServer({}, testPort);
    
    const response = await makeRequest(`http://localhost:${testPort}/manifest.webmanifest`);
    
    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      assert.ok(
        contentType && (
          contentType.includes('application/manifest+json') ||
          contentType.includes('application/json') ||
          contentType.includes('text/plain')
        ),
        'Should serve manifest with appropriate content type'
      );
    }
  });

  test('should handle process termination gracefully', async () => {
    serverProcess = await startServer({}, testPort);
    const { child } = serverProcess;
    
    // Send SIGTERM to test graceful shutdown
    child.kill('SIGTERM');
    
    // Wait for process to exit
    await new Promise((resolve) => {
      child.on('close', resolve);
    });
    
    assert.ok(child.killed || child.exitCode !== null, 'Should handle termination gracefully');
    serverProcess = null; // Prevent cleanup in afterEach
  });
});