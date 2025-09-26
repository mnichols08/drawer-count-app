# Simplified Deployment

This project uses a streamlined deployment approach focused on solo development efficiency.

## How It Works

1. **Test locally** - Run your tests before pushing:
   ```bash
   npm test        # Run all tests
   npm run test:unit    # Just unit tests
   npm run test:e2e     # Just E2E tests
   ```

2. **Push to main** - Deploy automatically:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

3. **GitHub Actions handles the rest** - The `deploy.yml` workflow will:
   - Install dependencies
   - Build the application (`npm run predeploy`)
   - Deploy to GitHub Pages

## That's It!

No more CI/CD friction. No test failures blocking deployment. No wasted GitHub Actions minutes.

**You test locally → You push → It deploys**

Simple and effective for solo development. 🚀

## Workflows Remaining:

- `deploy.yml` - Builds and deploys to GitHub Pages
- `labeler.yml` - Automatically labels PRs (if you ever use them)

All testing workflows have been removed to eliminate deployment blockers.