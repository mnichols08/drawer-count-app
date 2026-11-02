# Testing

The project uses Node's built-in test runner on Node.js 22.13+.

```bash
npm test
npm run test:functions
```

The default runner covers project structure, core scripts, and the Netlify sync
function. Focused suites are also available through the `test:*` scripts in
`package.json`.

The function tests inject a fake `fetch` implementation, so they exercise route
handling, validation, Supabase request construction, upserts, and safe failure
responses without using a real database or secret.

```text
tests/
├── functions/api.test.mjs
├── scripts/
├── setup.test.js
└── run-tests.js
```

Some script tests create and remove `dist/`; do not keep uncommitted work there.
