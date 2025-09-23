# GitHub Pages Deployment Guide

This document provides comprehensive instructions for deploying the drawer-count-app to GitHub Pages.

## 📋 Overview

GitHub Pages provides free static hosting for your Progressive Web App, with automatic deployments from your repository. This guide covers both manual and automated deployment strategies.

## 🚀 Quick Deployment

### Prerequisites

- GitHub repository with your project
- Pages enabled in repository settings
- Node.js environment for building

### Basic Setup

1. **Enable GitHub Pages**
   ```
   Repository → Settings → Pages
   Source: Deploy from a branch
   Branch: gh-pages / (root)
   ```

2. **Build and Deploy**
   ```bash
   npm run build        # Build production files
   npm run deploy       # Deploy to GitHub Pages
   ```

3. **Access Your App**
   ```
   https://username.github.io/repository-name
   ```

## ⚙️ Deployment Configuration

### GitHub Pages Settings

#### Repository Configuration
```
Settings → Pages
├── Source: Deploy from a branch
├── Branch: gh-pages
├── Folder: / (root)
└── Custom domain: (optional)
```

#### Build Configuration

The project includes a deployment script that:
- Builds optimized production files
- Creates a gh-pages branch
- Pushes built files to GitHub Pages
- Maintains deployment history

### Manual Deployment Process

```bash
# 1. Build production assets
npm run build

# 2. Version bump (optional)
npm run bump-sw-cache

# 3. Deploy to GitHub Pages
npm run deploy

# 4. Verify deployment
open https://username.github.io/repository-name
```

## 🔧 Automated CI/CD Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Build application
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
        cname: your-custom-domain.com  # Optional
```

### Advanced CI/CD Configuration

```yaml
name: Advanced GitHub Pages Deploy

on:
  push:
    branches: [ main ]
    paths-ignore:
      - 'docs/**'
      - '*.md'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Optimize images
        run: npm run optimize-images
        
      - name: Generate icons
        run: npm run generate-icons
        
      - name: Bump version
        run: npm run bump-sw-cache
        
      - name: Build production
        run: npm run build
        
      - name: Test production build
        run: npm run test:build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          user_name: 'github-actions[bot]'
          user_email: 'github-actions[bot]@users.noreply.github.com'
          commit_message: 'Deploy ${{ github.sha }}'
```

## 🌐 Custom Domain Setup

### Using Custom Domain

1. **DNS Configuration**
   ```
   Type: CNAME
   Name: www
   Value: username.github.io
   
   Type: A (for apex domain)
   Name: @
   Values: 
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
   ```

2. **Repository Settings**
   ```
   Settings → Pages → Custom domain
   Enter: your-domain.com
   ✓ Enforce HTTPS
   ```

3. **CNAME File**
   Create `public/CNAME`:
   ```
   your-domain.com
   ```

### SSL/HTTPS Configuration

GitHub Pages provides free SSL certificates:

- **Automatic**: GitHub automatically provisions SSL
- **Enforcement**: Enable "Enforce HTTPS" in settings
- **Verification**: Check green lock icon in browser

## ⚡ Performance Optimization

### Build Optimization

```bash
# Optimize before deployment
npm run optimize-images    # Compress images
npm run generate-icons     # Generate optimized icons
npm run bump-sw-cache      # Update service worker
npm run build             # Production build
```

### Service Worker Configuration

Ensure service worker works on GitHub Pages:

```javascript
// In sw.js - handle GitHub Pages path
const GITHUB_PAGES = location.hostname.includes('github.io');
const BASE_PATH = GITHUB_PAGES ? '/repository-name' : '';

const CACHE_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/main.js`
];
```

### Progressive Web App (PWA)

Ensure PWA features work on GitHub Pages:

```json
{
  "start_url": "/repository-name/",
  "scope": "/repository-name/",
  "icons": [
    {
      "src": "/repository-name/icons/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 🔍 Monitoring & Analytics

### GitHub Pages Analytics

Monitor deployment and usage:

1. **Repository Insights**
   - Traffic overview
   - Popular content
   - Referring sites
   - Clones and views

2. **Actions Analytics**
   - Deployment frequency
   - Build success rate
   - Deployment duration

### External Analytics Integration

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>

<!-- Plausible Analytics (privacy-focused) -->
<script defer data-domain="your-domain.com" src="https://plausible.io/js/plausible.js"></script>
```

### Performance Monitoring

```javascript
// Web Vitals tracking
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_category: 'Web Vitals',
    event_label: metric.id,
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## 🐛 Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   ```bash
   # Check Node.js version
   node --version  # Should be 16+
   
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Test build locally
   npm run build
   ```

2. **Path Issues**
   ```bash
   # Incorrect base path
   Error: Failed to load resource: 404
   
   # Solution: Update base path in build config
   # For repository "my-app" at username.github.io/my-app
   BASE_PATH="/my-app"
   ```

3. **Service Worker Issues**
   ```javascript
   // Service worker not updating
   // Solution: Check cache names and scope
   
   const CACHE_NAME = 'drawer-count-v1.0.1';  // Unique per deploy
   const SCOPE = '/repository-name/';           // Match GitHub Pages path
   ```

4. **PWA Install Issues**
   ```json
   // Manifest scope/start_url mismatch
   {
     "start_url": "/repository-name/",
     "scope": "/repository-name/",
     "display": "standalone"
   }
   ```

### Debug Deployment

```bash
# Enable debug mode
DEBUG=true npm run deploy

# Check deployment logs
git log --oneline gh-pages

# Test production build locally
npm run build
npx serve dist
```

### GitHub Pages Limits

- **File Size**: 100 MB per file
- **Repository Size**: 1 GB soft limit
- **Bandwidth**: 100 GB per month
- **Build Time**: 10 minutes max
- **Builds**: 10 per hour

## 📊 Deployment Best Practices

### Pre-deployment Checklist

- [ ] Tests passing locally and in CI
- [ ] Images optimized for web
- [ ] Icons generated for all platforms
- [ ] Service worker cache updated
- [ ] Version bumped appropriately
- [ ] Production build tested locally
- [ ] PWA features working correctly
- [ ] Analytics configured
- [ ] Custom domain configured (if applicable)

### Security Considerations

```yaml
# Secure deployment workflow
- name: Security audit
  run: npm audit

- name: Dependency check
  run: npm run security-check

- name: Build verification
  run: npm run verify-build
```

### Performance Checklist

- [ ] Images compressed and optimized
- [ ] CSS and JavaScript minified
- [ ] Service worker caching strategy optimized
- [ ] Progressive loading implemented
- [ ] Core Web Vitals measured and optimized

## 🔄 Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy to staging branch first
git checkout -b staging
npm run build
npm run deploy:staging

# Test staging deployment
npm run test:staging

# Deploy to production
git checkout main
npm run deploy:production
```

### Rollback Strategy

```bash
# Rollback to previous deployment
git checkout gh-pages
git log --oneline           # Find previous commit
git reset --hard COMMIT_HASH
git push --force origin gh-pages
```

### Environment-specific Builds

```javascript
// Build configuration
const config = {
  development: {
    baseUrl: 'http://localhost:3000',
    analytics: false
  },
  staging: {
    baseUrl: 'https://username.github.io/staging',
    analytics: false
  },
  production: {
    baseUrl: 'https://username.github.io/repository-name',
    analytics: true
  }
};
```

## 📈 Advanced Features

### Progressive Deployment

```yaml
# Gradual rollout
- name: Deploy to 10% traffic
  run: npm run deploy:canary

- name: Monitor metrics
  run: npm run monitor:canary
  
- name: Full deployment
  if: success()
  run: npm run deploy:production
```

### A/B Testing Setup

```javascript
// Feature flag configuration
const featureFlags = {
  newUI: Math.random() < 0.5,  // 50% traffic
  enhancedAnalytics: true
};
```

## 🔗 Related Documentation

- [Build Scripts](../scripts/build.md) - Production build process
- [Testing Guide](../testing/README.md) - Pre-deployment testing
- [Performance Optimization](../deployment/README.md) - Performance best practices

## 📚 External Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions for Pages](https://github.com/marketplace/actions/github-pages-action)
- [Custom Domain Configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [PWA on GitHub Pages](https://web.dev/pwa-github-pages/)

## 📝 Deployment Summary

GitHub Pages provides an excellent platform for hosting Progressive Web Apps with:

- **Free hosting** for public repositories
- **Automatic SSL** certificates
- **Global CDN** for fast delivery
- **CI/CD integration** with GitHub Actions
- **Custom domain** support
- **PWA compatibility** for app-like experience

Follow this guide to deploy your drawer-count-app to GitHub Pages with optimal performance and reliability.