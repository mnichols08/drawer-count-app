# Drawer Count App

A small installable PWA for counting cash drawers. The app works offline with
`localStorage` and optionally syncs shared data through a Netlify Function backed
by Supabase Postgres.

## Architecture

```text
Browser/PWA -> same-origin /api/* -> Netlify Function -> Supabase REST -> Postgres
```

The browser never receives the Supabase secret. The sync interface remains:

- `GET /api/health`
- `GET /api/kv`
- `GET /api/kv/:key`
- `PUT /api/kv/:key` with `{ "value": "..." }`

Sync remains global/shared, matching the previous app behavior. The endpoint is
not an authentication layer; do not store sensitive or per-user data without
adding identity and authorization first.

## Local setup

Requirements: Node.js 22.13+ (required by the current Netlify CLI) and a
Supabase project.

```bash
npm install
```

Run [the database migration](supabase/migrations/20261102000000_create_drawer_kv.sql)
in the Supabase SQL editor, then copy `.env.example` to `.env` and set:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_replace_me
```

Use a current `sb_secret_...` key, not a publishable browser key. Never commit
the secret.

Start the static site and functions through Netlify Dev:

```bash
npm run dev
```

The first run may ask `npx` to install the Netlify CLI or prompt you to link a
Netlify site.

## Test and build

```bash
npm test
npm run test:functions
npm run build
npm run build:prod
```

The production build is written to `dist/`.

## Deploy to Netlify

1. Create or choose a Supabase project and apply the SQL migration.
2. Create a Netlify site from this repository.
3. In Netlify, configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` for Functions.
4. Deploy. [`netlify.toml`](netlify.toml) supplies the build, publish, function,
   redirect, and security-header configuration.
5. Verify `/api/health` returns a connected database status.

The Supabase secret bypasses Row Level Security and must exist only in Netlify's
server-side environment. The migration revokes direct browser access for the
`anon` and `authenticated` database roles.

## Existing cloud data

Deploying the new backend does not automatically copy records from the old
database. Before shutting it down, export `GET /api/kv` from the old deployment
and insert the returned keys through the new `PUT /api/kv/:key` endpoints. Local
device data is retained and will also seed missing remote keys on its first
successful sync.

## Project structure

```text
src/                         PWA source
netlify/functions/api.mjs    sync function
supabase/migrations/         database schema
scripts/                     build and asset scripts
tests/functions/             function contract tests
netlify.toml                 deployment and routing configuration
```

## Key features

- Cash denomination and optional reporting fields
- Multiple drawer profiles and day history
- Offline-first PWA behavior
- Light/dark themes and responsive UI
- Shared multi-device sync when Supabase is configured

## License

See [LICENSE](LICENSE).
