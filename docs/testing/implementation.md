# Test implementation

Tests use `node:test` and `node:assert/strict`. CommonJS remains in the older
script tests; the Netlify Function tests use ESM to match the deployed module.

The sync function exports both its production default handler and a
`createHandler()` factory. Tests inject environment values, a fake Fetch
implementation, and a deterministic clock through that factory. This avoids
global mutation and makes every database interaction directly observable.
