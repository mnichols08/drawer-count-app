# Deployment Strategies

This project now supports multiple deployment strategies to reduce CI/CD friction for solo development:

## 1. Fast Deploy (Recommended for Solo Development)

Use the **Fast Deploy** workflow for instant deployment when you've tested locally:

### Via GitHub Actions UI:
1. Go to **Actions** tab in GitHub
2. Select "Fast Deploy (Skip All Tests)" 
3. Click "Run workflow"
4. Enter a commit message
5. Deploy immediately without any tests

### Via Command Line:
```bash
# Quick deploy with skip ci flag
npm run deploy:skip-ci "Your commit message"
```

## 2. Standard Deploy (For Collaboration)

The standard deployment workflow still exists and runs when:
- Pushing to `main` branch 
- Manual deployment via "Build and Deploy to GitHub Pages" workflow

## 3. Development Testing

For development branch testing:
- CI runs automatically on `development` branch pushes
- E2E tests only run on pull requests or manual trigger
- Unit tests run on all CI builds

## Workflow Files:

- `fast-deploy.yml` - Instant deployment, no tests
- `deploy.yml` - Standard deployment with build
- `ci.yml` - Streamlined CI for development  
- `test.yml` - Comprehensive tests (manual trigger only)
- `quick-ci.yml` - Lightweight checks for main branch

## Migration Benefits:

✅ **Faster deployments** - Skip CI when tests pass locally  
✅ **Resource efficient** - Reduced GitHub Actions usage  
✅ **Flexible** - Can still run full tests when needed  
✅ **Solo-dev friendly** - No collaboration overhead  

## Usage Examples:

```bash
# Test locally first
npm test

# Then deploy fast (if tests pass)
npm run deploy:skip-ci "Fix button styling"

# Or use GitHub UI for manual fast deploy
# Actions → Fast Deploy → Run workflow
```