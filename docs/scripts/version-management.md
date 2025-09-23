# Version Management Scripts

This document provides detailed information about the version management scripts in the project.

## 📋 Overview

The project includes sophisticated version management through the `bump-sw-cache.js` script, which automatically updates version numbers and cache identifiers for service worker management.

## ⚙️ Scripts

### `bump-sw-cache.js`

**Purpose**: Automatically increment version numbers and update service worker cache identifiers.

**Location**: `scripts/bump-sw-cache.js`

**Usage**:
```bash
npm run bump-sw-cache
# or
node scripts/bump-sw-cache.js
```

### How It Works

1. **Package Version**: Reads current version from `package.json`
2. **Automatic Increment**: Increments the patch version (e.g., `1.0.0` → `1.0.1`)
3. **Service Worker Update**: Updates cache name in `sw.js` to force cache refresh
4. **File Updates**: Writes new versions to both `package.json` and service worker

### Configuration

The script operates with these default settings:

```javascript
// Automatic patch version increment
// From: "1.2.3" → To: "1.2.4"

// Service worker cache naming
// Pattern: `drawer-count-v${version}`
// Example: `drawer-count-v1.2.4`
```

### Version Increment Rules

| Current Version | New Version | Increment Type |
|----------------|-------------|----------------|
| `1.0.0`        | `1.0.1`     | Patch          |
| `1.2.9`        | `1.2.10`    | Patch          |
| `2.1.15`       | `2.1.16`    | Patch          |

### Service Worker Integration

The script ensures that:

1. **Cache Invalidation**: Each version bump creates a new cache name
2. **Automatic Cleanup**: Old caches are cleaned up by service worker logic
3. **Progressive Web App**: Ensures users get latest version after update

### File Modifications

#### `package.json`
```json
{
  "version": "1.0.1"  // ← Updated automatically
}
```

#### `sw.js` (Service Worker)
```javascript
const CACHE_NAME = 'drawer-count-v1.0.1';  // ← Updated automatically
```

## 🎯 Best Practices

### When to Bump Versions

- **Before Production Deploy**: Always bump version before deploying to production
- **After Significant Changes**: Bump after major feature additions or bug fixes
- **Service Worker Changes**: Bump when modifying service worker behavior
- **Asset Updates**: Bump when changing cached assets (CSS, JS, images)

### Integration with Deployment

```bash
# Recommended deployment workflow
npm run bump-sw-cache    # Update versions
npm run build           # Build with new version
npm run deploy          # Deploy to production
```

### Automation Options

#### With npm scripts
```json
{
  "scripts": {
    "predeploy": "npm run bump-sw-cache && npm run build",
    "deploy": "node scripts/deploy.js"
  }
}
```

#### With GitHub Actions
```yaml
- name: Bump version and build
  run: |
    npm run bump-sw-cache
    npm run build
```

## 🔧 Customization

### Manual Version Control

For manual version control, you can modify the script behavior:

```javascript
// Edit scripts/bump-sw-cache.js
// Change increment type or pattern
```

### Alternative Version Schemes

The script can be adapted for:
- **Semantic Versioning**: Major.minor.patch
- **Date-based Versions**: YYYY.MM.DD
- **Build Numbers**: Incremental build IDs

### Custom Cache Naming

Modify the cache naming pattern:

```javascript
// Current: drawer-count-v1.0.1
// Custom: myapp-cache-v1.0.1
// Or: app-v20240101
```

## 🚀 Advanced Usage

### Pre-commit Hooks

Integrate with Git hooks:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run bump-sw-cache
git add package.json src/sw.js
```

### CI/CD Integration

Automated version bumping in continuous integration:

```yaml
# GitHub Actions example
name: Auto Version Bump
on:
  push:
    branches: [main]
jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run bump-sw-cache
      - run: npm run build
```

### Version Tracking

Monitor version changes:

```bash
# Check current version
npm run version-check

# View version history
git log --oneline --grep="bump version"
```

## 🐛 Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Solution: Check file permissions
   chmod +x scripts/bump-sw-cache.js
   ```

2. **Version Parse Errors**
   ```bash
   # Solution: Verify package.json format
   npm run validate-package
   ```

3. **Service Worker Not Updating**
   ```bash
   # Solution: Clear browser cache
   # Check cache name in DevTools
   ```

### Debug Mode

Run with debug output:

```bash
# Enable debug logging
DEBUG=true node scripts/bump-sw-cache.js
```

### Manual Recovery

If version bumping fails:

```bash
# Restore from git
git checkout -- package.json src/sw.js

# Manual version update
npm version patch
```

## 📊 Version History

Track your version history:

```bash
# View recent version changes
git log --oneline --grep="v[0-9]"

# Compare versions
git diff v1.0.0..v1.0.1
```

## 🔗 Related Documentation

- [Build Scripts](build.md) - Production build process
- [Deployment Guide](../deployment/README.md) - Production deployment
- [Testing Guide](../testing/README.md) - Testing version changes

## 📝 Version Management Checklist

- [ ] Version bumped in `package.json`
- [ ] Service worker cache name updated
- [ ] Build process completed successfully
- [ ] Service worker functions in development
- [ ] Production deployment verified
- [ ] Version change committed to git