const fs = require('fs');
const path = require('path');

// Build script for Drawer Count App
// Copies src/ folder to dist/ and prepares for production deployment

const srcDir = path.resolve(__dirname, '../src');
const distDir = path.resolve(__dirname, '../dist');

// Environment variables for GitHub Pages deployment
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
// If a custom domain is present (CNAME file), serve from root
const hasCustomDomain = fs.existsSync(path.join(srcDir, 'CNAME'));
const baseUrl = process.env.BASE_URL || (isGitHubPages && !hasCustomDomain && repoName ? `/${repoName}/` : '/');

console.log('[build] Build environment:', isGitHubPages ? 'GitHub Actions' : 'Local');
if (isGitHubPages) {
  console.log('[build] Repository:', process.env.GITHUB_REPOSITORY);
  console.log('[build] Base URL:', baseUrl);
}
if (hasCustomDomain) {
  console.log('[build] Detected custom domain via CNAME file. Using root (/) as base URL.');
}

// Helper to recursively copy directories
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper to update paths in HTML files for GitHub Pages
function updateHtmlPaths(filePath, baseUrl) {
  if (baseUrl === '/' || !baseUrl) return; // No changes needed for root deployment
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update relative paths to include base URL for GitHub Pages
  // Only update if we're not already using the custom domain
  if (!content.includes('drawercounter.journeytocode.io')) {
    // Update manifest reference
    content = content.replace('href="./manifest.webmanifest"', `href="${baseUrl}manifest.webmanifest"`);
    
    // Update icon references
    content = content.replace(/href="\.\/icons\//g, `href="${baseUrl}icons/`);
    content = content.replace(/src="\.\/icons\//g, `src="${baseUrl}icons/`);
    
    // Update other assets
    content = content.replace('href="./style.css"', `href="${baseUrl}style.css"`);
    content = content.replace('href="./favicon.ico"', `href="${baseUrl}favicon.ico"`);
    content = content.replace('href="./browserconfig.xml"', `href="${baseUrl}browserconfig.xml"`);
    
    // Update script sources
    content = content.replace('src="./config.js"', `src="${baseUrl}config.js"`);
    content = content.replace('src="./main.js', `src="${baseUrl}main.js`);
    content = content.replace('src="./sw-register.js"', `src="${baseUrl}sw-register.js"`);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[build] Updated paths in ${path.basename(filePath)} for base URL: ${baseUrl}`);
  }
}

// Helper to update manifest for GitHub Pages
function updateManifest(filePath, baseUrl) {
  if (baseUrl === '/' || !baseUrl) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const manifest = JSON.parse(content);
  
  // Update start_url and scope for GitHub Pages (only when not using custom domain/root)
  if (!manifest.start_url.startsWith('http')) {
    manifest.start_url = baseUrl;
    manifest.scope = baseUrl;
  }
  
  // Update icon paths if not using custom domain
  if (!content.includes('drawercounter.journeytocode.io')) {
    manifest.icons = manifest.icons.map(icon => ({
      ...icon,
      src: icon.src.replace('./icons/', `${baseUrl}icons/`)
    }));
  }
  
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[build] Updated manifest for base URL: ${baseUrl}`);
}

// Validate that source directory exists
if (!fs.existsSync(srcDir)) {
  console.error('[build] ERROR: Source directory does not exist:', srcDir);
  process.exit(1);
}

// Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

console.log('[build] Cleaning dist directory...');
console.log('[build] Copying src/ to dist/...');

// Copy entire src directory to dist
copyDir(srcDir, distDir);

// Update paths for deployment environment
if (isGitHubPages && baseUrl !== '/') {
  updateHtmlPaths(path.join(distDir, 'index.html'), baseUrl);
  updateHtmlPaths(path.join(distDir, 'offline.html'), baseUrl);
  updateManifest(path.join(distDir, 'manifest.webmanifest'), baseUrl);
}

// Validate critical files exist in dist
const criticalFiles = ['index.html', 'manifest.webmanifest', 'sw.js'];
for (const file of criticalFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`[build] ERROR: Critical file missing in dist: ${file}`);
    process.exit(1);
  }
}

console.log('[build] Build complete! Distribution files are in /dist');
console.log('[build] You can now deploy the dist/ folder to your hosting provider.');
if (!isGitHubPages) {
  console.log('[build] To test production build locally, run: npm start');
}