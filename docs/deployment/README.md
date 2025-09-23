# Deployment Documentation

This section contains comprehensive deployment guides for the Drawer Count App.

## 🚀 Deployment Options

The Drawer Count App supports multiple deployment strategies:

### 🆓 Free Hosting
- **GitHub Pages** - Automated deployment from repository
- **Netlify** - Deploy from Git with continuous deployment
- **Vercel** - Deploy with zero configuration
- **Surge.sh** - Simple static site deployment

### 🏢 Self-Hosted
- **VPS/Dedicated Server** - Full control with Node.js server
- **Docker Container** - Containerized deployment
- **Cloud Platforms** - AWS, Google Cloud, Azure

### 🔄 Hybrid
- **Static + API** - Static frontend with separate API server
- **CDN + Server** - Static assets on CDN, dynamic content on server

## 📁 Documentation Structure

- [GitHub Pages Deployment](github-pages.md) - Automated deployment with GitHub Actions
- [Server Setup](server-setup.md) - Self-hosted deployment guide

## ⚡ Quick Deployment

### GitHub Pages (Recommended)
1. Fork or create repository on GitHub
2. Enable GitHub Pages in repository settings
3. Push changes to trigger automatic deployment
4. Access at `https://username.github.io/repository-name`

### Manual Build & Deploy
```bash
npm run build:prod    # Build with optimization
# Upload dist/ folder to your hosting provider
```

## 🔧 Build Configuration

### Environment Variables
| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| `NODE_ENV` | Build environment | - | `production` |
| `BASE_URL` | Deployment base path | `/` | `/app/` |
| `API_BASE` | API server URL | - | `https://api.example.com` |

### Build Commands
```bash
npm run build        # Basic production build
npm run build:prod   # Build with image optimization
npm run predeploy    # Pre-deployment preparation
npm run deploy       # Deploy (shows instructions)
```

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] Run tests: `npm test`
- [ ] Build successfully: `npm run build:prod`
- [ ] Test production build locally: `npm start`
- [ ] Update version: `npm run release:patch`
- [ ] Check all assets load correctly

### Post-Deployment
- [ ] Verify site loads at deployment URL
- [ ] Test PWA installation
- [ ] Check service worker caching
- [ ] Verify offline functionality
- [ ] Test on mobile devices

## 🛡️ Security Considerations

### Static Deployment Security
- ✅ **HTTPS Required** - Always use HTTPS for PWAs
- ✅ **Content Security Policy** - Configure CSP headers
- ✅ **Asset Integrity** - Use subresource integrity when possible
- ✅ **Environment Variables** - Never expose secrets in client code

### Server Deployment Security
- ✅ **Environment Variables** - Use `.env` files for configuration
- ✅ **Database Security** - Secure MongoDB connection strings
- ✅ **CORS Configuration** - Restrict origins appropriately
- ✅ **Rate Limiting** - Implement API rate limiting
- ✅ **Input Validation** - Validate all user inputs

## 🔄 CI/CD Pipeline

The project includes GitHub Actions for automated deployment:

```yaml
# .github/workflows/deploy.yml (example)
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build:prod
      - uses: actions/deploy-pages@v2
```

## 📊 Performance Optimization

### Build Optimization
- **Image Optimization** - Automatic PNG compression and WebP generation
- **Code Minification** - Minimize JavaScript and CSS
- **Asset Compression** - Gzip/Brotli compression
- **Caching Strategy** - Aggressive caching with cache-busting

### Runtime Optimization
- **Service Worker** - Offline functionality and fast loading
- **Resource Hints** - Preload critical resources
- **Lazy Loading** - Load images and components on demand
- **CDN Usage** - Serve static assets from CDN

## 🌐 Multi-Environment Setup

### Development
```bash
npm run dev          # Development server with hot reload
# Serves from src/ directory
# API calls to local server or proxy
```

### Staging
```bash
npm run build        # Build for testing
npm start           # Test production build
# Deploy to staging environment
```

### Production
```bash
npm run build:prod   # Optimized production build
# Deploy to production environment
# Configure production API endpoints
```

## 🔍 Monitoring & Analytics

### Deployment Monitoring
- **Build Status** - Monitor GitHub Actions or CI/CD pipeline
- **Uptime Monitoring** - Use services like UptimeRobot
- **Performance Monitoring** - Web Vitals tracking
- **Error Tracking** - Client-side error monitoring

### Analytics Integration
- **Usage Analytics** - Google Analytics, Plausible, etc.
- **Performance Analytics** - Core Web Vitals
- **PWA Analytics** - Installation and engagement metrics

## 🐛 Troubleshooting

### Common Deployment Issues
1. **Build Failures** - Check Node.js version and dependencies
2. **Asset Loading** - Verify base URL configuration
3. **CORS Errors** - Check API server CORS settings
4. **PWA Issues** - Validate manifest and service worker
5. **Performance Issues** - Optimize images and enable compression

### Debug Commands
```bash
npm run build -- --verbose    # Verbose build output
npm test                      # Run tests before deployment
node --version                # Check Node.js version
npm list                      # Check installed dependencies
```

For specific deployment scenarios, see the detailed guides in this folder.