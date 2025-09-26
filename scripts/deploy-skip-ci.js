#!/usr/bin/env node

/**
 * Quick deployment script that pushes to main with [skip ci] flag
 * Usage: node scripts/deploy-skip-ci.js "Your commit message"
 */

const { execSync } = require('child_process');
const process = require('process');

const commitMessage = process.argv[2] || 'Quick deploy';
const fullMessage = `${commitMessage} [skip ci]`;

try {
  console.log('🚀 Deploying with skip CI...');
  
  // Add all changes
  execSync('git add .', { stdio: 'inherit' });
  
  // Commit with skip ci flag
  execSync(`git commit -m "${fullMessage}"`, { stdio: 'inherit' });
  
  // Push to main
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('✅ Deployed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}