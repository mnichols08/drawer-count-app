# Build Script Documentation

The build script (`scripts/build.js`) handles production build preparation and deployment configuration for the Drawer Count App.

## 📋 Overview

The build script:
- Copies the `src/` directory to `dist/` for production deployment
- Updates file paths for different deployment environments (GitHub Pages, custom domains)
- Validates that critical files exist after the build
- Supports both local and CI/CD environments

## 🚀 Usage

### Basic Usage
```bash
npm run build
```

### Production Build (with optimization)
```bash
npm run build:prod  # Runs optimize-images then build
```

### Direct Script Execution
```bash
node scripts/build.js
```

## 🔧 Environment Configuration

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GITHUB_ACTIONS` | Detected automatically in GitHub Actions | `false` | `true` |
| `GITHUB_REPOSITORY` | Repository name for GitHub Pages | - | `username/repo-name` |
| `BASE_URL` | Base URL for deployment | `/` | `/repo-name/` |
| `NODE_ENV` | Build environment | - | `production` |

### Deployment Modes

#### Local Development
```bash
npm run build
# Serves from root path (/)
```

#### GitHub Pages (Automatic)
```bash
# In GitHub Actions environment
npm run build
# Automatically configures for /repository-name/ path
```

#### GitHub Pages (Manual)
```bash
GITHUB_ACTIONS=true GITHUB_REPOSITORY=user/repo npm run build
# Forces GitHub Pages configuration
```

#### Custom Domain
```bash
BASE_URL=https://example.com npm run build
# Preserves custom domain references
```

## 📁 Build Process

### 1. Directory Preparation
```javascript
// Clean existing dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
```

### 2. File Copying
```javascript
// Recursively copy src/ to dist/
copyDir(srcDir, distDir);
```

### 3. Path Updates (GitHub Pages)
For GitHub Pages deployment, the script updates:
- Manifest references: `href="./manifest.webmanifest"` → `href="/repo/manifest.webmanifest"`
- Icon references: `href="./icons/"` → `href="/repo/icons/"`
- Asset references: `href="./style.css"` → `href="/repo/style.css"`
- Script sources: `src="./main.js"` → `src="/repo/main.js"`

### 4. Manifest Updates
```javascript
// Update PWA manifest for GitHub Pages
manifest.start_url = baseUrl;
manifest.scope = baseUrl;
manifest.icons = manifest.icons.map(icon => ({
  ...icon,
  src: icon.src.replace('./icons/', `${baseUrl}icons/`)
}));
```

### 5. Validation
```javascript
// Ensure critical files exist
const criticalFiles = ['index.html', 'manifest.webmanifest', 'sw.js'];
for (const file of criticalFiles) {
  if (!fs.existsSync(path.join(distDir, file))) {
    console.error(`Critical file missing: ${file}`);
    process.exit(1);
  }
}
```

## 🎯 File Processing

### HTML Files Updated
- `dist/index.html` - Main application file
- `dist/offline.html` - Offline fallback page

### Manifest Updates
- `dist/manifest.webmanifest` - PWA manifest file

### Files Preserved As-Is
- All files in `dist/components/`
- All files in `dist/lib/`
- All files in `dist/icons/`
- All files in `dist/images/`
- Service worker (`dist/sw.js`)
- Stylesheets (`dist/style.css`)

## 🔍 Custom Domain Handling

The build script detects custom domain usage and preserves those configurations:

```javascript
// Detects custom domain in HTML
if (!content.includes('drawercounter.journeytocode.io')) {
  // Apply GitHub Pages path updates
} else {
  // Preserve custom domain paths
}
```

### Custom Domain Detection
- Looks for `drawercounter.journeytocode.io` in HTML content
- Skips path updates when custom domain is detected
- Preserves absolute URLs for custom domains

## 📊 Build Outputs

### Success Output
```
[build] Build environment: Local
[build] Cleaning dist directory...
[build] Copying src/ to dist/...
[build] Build complete! Distribution files are in /dist
[build] You can now deploy the dist/ folder to your hosting provider.
[build] To test production build locally, run: npm start
```

### GitHub Pages Output
```
[build] Build environment: GitHub Actions
[build] Repository: username/repo-name
[build] Base URL: /repo-name/
[build] Updated paths in index.html for base URL: /repo-name/
[build] Updated paths in offline.html for base URL: /repo-name/
[build] Updated manifest for base URL: /repo-name/
[build] Build complete! Distribution files are in /dist
```

## 🐛 Error Handling

### Missing Source Directory
```
[build] ERROR: Source directory does not exist: /path/to/src
Exit Code: 1
```

### Missing Critical Files
```
[build] ERROR: Critical file missing in dist: manifest.webmanifest
Exit Code: 1
```

### Common Fixes
1. **Source not found:** Ensure you're running from project root
2. **Critical files missing:** Check that all required files exist in `src/`
3. **Permission errors:** Ensure write permissions to project directory

## 🔧 Customization

### Adding New Critical Files
```javascript
const criticalFiles = [
  'index.html', 
  'manifest.webmanifest', 
  'sw.js',
  'new-critical-file.json'  // Add here
];
```

### Custom Path Updates
```javascript
// Add new path pattern
content = content.replace(
  /href="\.\/new-asset\.css"/g, 
  `href="${baseUrl}new-asset.css"`
);
```

### Environment-Specific Logic
```javascript
if (process.env.CUSTOM_ENV === 'staging') {
  // Add staging-specific logic
}
```

## 🚀 Integration

### With Other Scripts
```bash
# Full production pipeline
npm run optimize-images  # First optimize assets
npm run build            # Then build
npm run deploy           # Finally deploy
```

### In CI/CD
```yaml
- name: Build for production
  run: npm run build:prod
  env:
    NODE_ENV: production
```

### Local Testing
```bash
npm run build           # Build
npm start              # Test production build locally
```

## 📈 Performance

### Build Speed
- **Small projects:** ~100-500ms
- **Medium projects:** ~500ms-2s
- **Large projects:** ~2-5s

### Optimization Tips
- Keep `src/` directory organized
- Minimize file count when possible
- Use `.gitignore` to exclude unnecessary files from `src/`

The build script is designed to be fast, reliable, and adaptable to different deployment scenarios while maintaining the integrity of your PWA.