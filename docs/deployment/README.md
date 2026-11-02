# Deployment

Production is a Netlify static site plus a Netlify Function, with Supabase as
the database.

## Required configuration

1. Apply `supabase/migrations/20261102000000_create_drawer_kv.sql` in Supabase.
2. Connect the repository to Netlify.
3. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to the Netlify environment.
4. Deploy and verify `GET /api/health`.

`netlify.toml` defines `npm run build:prod`, publishes `dist/`, discovers
functions in `netlify/functions`, and rewrites `/api/*` to the sync function.

For local end-to-end testing, copy `.env.example` to `.env` and run:

```bash
npm run dev
```

The PWA still works offline without Supabase; cloud sync reports unavailable
until both environment values and the table are present.

GitHub Pages can host only the static/offline portion. It cannot run the
Netlify Function, so `/api` sync will not be available there.
