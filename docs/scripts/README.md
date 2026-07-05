# Scripts Documentation

This section documents all the build and utility scripts available in the Drawer Count App project.

## 📋 Available Scripts

### Development Scripts
- `npm run dev` - Start development server with hot reload
- `npm test` - Run the complete test suite
- `npm run clean` - Clean build artifacts

### Production Scripts
- `npm start` - Start production server
- `npm run build` - Build for production deployment
- `npm run predeploy` - Optimize assets and build for deployment

### Asset Management
- `npm run icons` - Generate all icon formats from SVG
- `npm run optimize-images` - Optimize PNG images and generate WebP

### Version Management
- `npm run bump-sw` - Bump cache version (supports `--dry`, `--push`, etc.)

### Deployment
- `npm run predeploy` - Pre-deployment preparation
- `npm run deploy` - Deploy to hosting provider

## 📖 Detailed Documentation

### Core Scripts
- [Build System](build.md) - Production build process and deployment preparation
- [Version Management](version-management.md) - Release automation and cache busting

### Asset Scripts  
- [Icon Generation](icons.md) - PWA icon creation from SVG source
- [Image Optimization](images.md) - PNG optimization and WebP generation

## 🎯 Quick Reference

### Most Common Commands
```bash
# Development workflow
npm run dev              # Start development
npm test                 # Run tests
npm run build           # Build for production

# Deployment workflow  
npm run bump-sw -- --dry # Preview service worker cache bump
npm run predeploy        # Optimize assets + build
npm run deploy           # Deploy to hosting
```

### Script Dependencies
```
predeploy → optimize-images → build
bump-sw → service worker cache + version updates
```

## 🔧 Script Configuration

### Environment Variables
- `NODE_ENV` - Set to 'production' for production builds
- `PORT` - Server port (default: 8080)
- `GITHUB_ACTIONS` - Automatically set in CI for GitHub Pages builds
- `BASE_URL` - Base URL for GitHub Pages deployment

### Script Customization
Most scripts accept additional parameters:
```bash
npm run bump-sw -- --dry --no-git    # Dry run without git operations
npm run optimize-images -- --all     # Process all images, not just targets
npm run icons                         # No parameters needed
```

## 🛠️ Adding New Scripts

When adding new scripts to the project:

1. **Add to package.json** in the appropriate section
2. **Create script file** in the `scripts/` directory
3. **Add documentation** to this folder
4. **Create tests** in the test suite
5. **Update CI/CD** if needed for the new script

### Script Naming Conventions
- Use kebab-case for script names (`bump-sw`, not `bumpSW`)
- Group related scripts with prefixes (`test:basic`, `lint:md`)
- Use descriptive names that indicate purpose
- Keep names concise but clear

## 📚 Implementation Details

### Script Architecture
- **Node.js based** - All scripts use Node.js for consistency
- **Cross-platform** - Work on Windows, macOS, and Linux
- **Error handling** - Proper exit codes and error messages
- **Logging** - Consistent logging format across scripts
- **Configuration** - Environment variable support

### Best Practices
- ✅ Use `process.exit()` with appropriate codes
- ✅ Provide helpful error messages
- ✅ Support dry-run modes where applicable
- ✅ Include progress logging for long operations
- ✅ Handle interruption signals gracefully

For specific script implementation details, see the individual documentation files in this folder.