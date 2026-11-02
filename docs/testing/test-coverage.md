# Test coverage

The highest-risk sync paths are covered in `tests/functions/api.test.mjs`:

- health checks and missing configuration;
- key lookup and not-found behavior;
- server-timestamped upserts;
- input validation;
- safe mapping of Supabase failures.

Build, asset, release, package-script, and project-structure checks live under
`tests/scripts/` and `tests/setup.test.js`.

Run Node's experimental coverage report with:

```bash
npm run test:coverage
```

Coverage percentages are not used as a substitute for route and failure-mode
coverage.
