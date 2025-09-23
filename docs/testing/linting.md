# Linting & Code Quality

This project uses ESLint (JavaScript) and markdownlint (Markdown) to maintain a consistent, readable codebase with low noise and high signal.

## Why linting?

- Catch bugs early (unused variables, shadowing, accidental globals)
- Enforce consistent patterns and conventions
- Keep reviews focused on behavior instead of style

## Commands

```bash
# JavaScript lint (ESLint)
npm run lint:js

# Markdown lint (markdownlint)
npm run lint:md

# Run both
npm run lint
```

## ESLint configuration

ESLint v9 flat config lives in `eslint.config.cjs` and applies tailored environments and parser options to different parts of the repo:

- `src/**`: Browser + ESM modules
- `scripts/**` and `server.js`: Node.js + CommonJS
- `tests/**`: ESM-friendly config

Key rules and conventions:
- `no-unused-vars` is enabled and tuned to ignore names that start with an underscore. This allows us to:
  - Keep function signatures stable (e.g., `_req`, `_res`, `_next`)
  - Preserve destructured placeholders (e.g., `{ clientId: _clientId, ...rest }`)
  - Quietly capture and inspect errors in a debugger without logging (`catch (_e) {}`)
- Other rules are kept pragmatic to minimize churn in legacy files while still surfacing valuable findings.

## Underscore convention

Use a leading underscore for any variable/parameter that is intentionally unused, e.g.:

```js
function example(_unusedParam) {
  try {
    // ...
  } catch (_err) {
    // swallow on purpose
  }
}

const { clientId: _clientId, ...rest } = item;
```

This keeps intent clear and satisfies the linter without needing `eslint-disable` comments.

## Markdown linting

We use `markdownlint-cli` with a relaxed config to avoid churning long-standing docs. It focuses on preventing egregious issues while tolerating historic formatting. You can still run `npm run lint:md` to see suggestions.

## CI integration

The CI workflow runs tests and both linters. Lint steps are non-blocking for now to avoid friction during active refactors—but they provide visibility so we can keep quality high.

## Tips

- Prefer fixing a warning by renaming to an underscore (e.g., `e` → `_e`) rather than disabling rules.
- When refactoring, remove genuinely unused imports and variables instead of renaming.
- If you add new packages or files, make sure they match the intended environment (browser vs node) so ESLint parses them correctly.
