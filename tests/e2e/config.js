// E2E test configuration for seeding behavior
// You can override via environment variables:
//   SEED_COUNT=10 INCLUDE_TODAY=true npm run test:e2e

const toBool = (v, d = false) => {
  if (v === undefined || v === null) return d;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return d;
};

module.exports = {
  SEED_COUNT: Number(process.env.SEED_COUNT || 7),
  INCLUDE_TODAY: toBool(process.env.INCLUDE_TODAY, false),
};
