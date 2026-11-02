# Test guide

Install dependencies, then run the default suite:

```bash
npm install
npm test
```

Useful focused commands:

```bash
npm run test:functions
npm run test:build
npm run test:scripts
npm run test:coverage
```

Function tests should call `createHandler()` from
`netlify/functions/api.mjs` with injected `env`, `fetchImpl`, and `now`
dependencies. This keeps the function's public interface and the test surface
the same while avoiding live Supabase calls.

Every route should have success, invalid-input, missing-resource, and upstream
failure coverage. Never put real Supabase keys in fixtures or test output.
