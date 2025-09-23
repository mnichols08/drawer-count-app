const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');

let cachedPkg = null;
function readPackageJson() {
  if (!cachedPkg) {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    cachedPkg = JSON.parse(raw);
  }
  return cachedPkg;
}

function hasDevDep(depName) {
  const pkg = readPackageJson();
  return Boolean(pkg.devDependencies && pkg.devDependencies[depName]);
}

function skipIfMissingDevDep(t, depName, reason) {
  if (!hasDevDep(depName)) {
    t.skip(reason || `Skipping: devDependency '${depName}' not installed`);
    return true;
  }
  return false;
}

function skipIfMissingAnyDevDep(t, depNames = [], reason) {
  for (const name of depNames) {
    if (!hasDevDep(name)) {
      t.skip(reason || `Skipping: missing devDependency '${name}'`);
      return true;
    }
  }
  return false;
}

function skipIfMissingFile(t, targetPath, reason) {
  const abs = path.isAbsolute(targetPath) ? targetPath : path.join(projectRoot, targetPath);
  if (!fs.existsSync(abs)) {
    t.skip(reason || `Skipping: file not found '${abs}'`);
    return true;
  }
  return false;
}

function skipIfNoEnv(t, varName, reason) {
  if (!process.env[varName]) {
    t.skip(reason || `Skipping: env var '${varName}' is not set`);
    return true;
  }
  return false;
}

module.exports = {
  projectRoot,
  packageJsonPath,
  hasDevDep,
  skipIfMissingDevDep,
  skipIfMissingAnyDevDep,
  skipIfMissingFile,
  skipIfNoEnv,
  skipIfNoCommand(t, cmd, args = ['--version'], reason) {
    try {
      const res = spawnSync(cmd, args, { stdio: 'ignore' });
      if (res.error || res.status !== 0) {
        t.skip(reason || `Skipping: command '${cmd}' not available`);
        return true;
      }
    } catch (e) {
      t.skip(reason || `Skipping: command '${cmd}' not available`);
      return true;
    }
    return false;
  },
};
