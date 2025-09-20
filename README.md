# Drawer Count App

A minimal, installable PWA to help count drawers at the end of the day. Works offline, supports profiles, daily history, and import/export.

Status: Vanilla JS + Web Components (no framework)

## Features

- Offline-first PWA (service worker with precache, runtime cache, offline fallback)
- Installable (manifest + in-app install banner); focuses an existing app window when possible
- Drawer calculator with dynamic rows for credit card slips and checks
- Optional daily fields captured for later reporting (do not affect totals): Charges, Total Received, Net Sales, Gross Profit $/%, Number of Invoices, Number of Voids
- Profiles: Save, Restore, and Clear the active profile
- Daily History: Save by day, Load, Delete, and Rename entries; auto reset on a new day
- Import/Export: Backup or restore your data as JSON
- Theme: Light/Dark/System with live `theme-color` updates
- Network status pill and toast notifications
- Keyboard shortcuts for faster entry
 - Visual polish: random background image with smooth fade-in; light/dark overlays for readability

## Quick start (Windows PowerShell)

```powershell
npm install
# Optional: create a local .env from the example
Copy-Item .env.example .env -ErrorAction SilentlyContinue
# Start with backend API + static hosting (recommended)
npm start

# Or just run the static dev server
npm run dev:static
```

By default `npm start` runs an Express server at `http://127.0.0.1:8080/` that serves the app and exposes a small API used for sync.
The service worker only works when served via HTTP(S) or `localhost`.

Alternative local servers:

- Node (no global install):
	```powershell
	npx http-server -p 8080 -c-1
	```
- Python:
	```powershell
	python -m http.server 8080
	```

## Using the app

- Enter `Cash Total` and `ROA Amount` from your POS reports.
- Add credit card `Slips` and `Checks` (use the `+` buttons for extra rows; each row totals automatically).
- Fill bill and coin counts; totals and `Balance` update live with color cues.
- Open `Settings` (gear icon) for profiles, daily history, import/export, and theme.

Optional Fields:
- At the bottom of the calculator you'll find optional inputs: `Charges`, `Total Received`, `Net Sales`, `Gross Profit Amount ($)`, `Gross Profit Percentage (%)`, `Number of Invoices`, and `Number of Voids`.
- These are stored with your daily history and profiles for future reporting or export, but they do not participate in any totals or balance calculations.

Profiles:
- `Save` stores the current drawer for the active profile; `Restore` loads it; `Clear` resets inputs.
- Changes are also auto-saved locally as you type.

Daily History:
- Save, Load, Delete, and Rename day entries; dates are stored per device/profile using local time `YYYY-MM-DD`.
- On a new day, inputs auto-reset so you can start fresh.

Import/Export:
- Export your profiles/history to a JSON file and import them later on the same or another device.

Keyboard Shortcuts:
- `Ctrl`+`Shift`+`S` → Add Slip
- `Ctrl`+`Shift`+`C` → Add Check
- `Ctrl`+`Shift`+`Backspace` → Remove last added row
- `Alt`+`Backspace` (focused in a row) → Remove that row

Install/Open as app:
- In Chrome/Edge, use the in-app `Install` button (when shown) or your browser’s menu.
- After installing, visiting the website shows an `Open in App` button that focuses the installed window (supported in Chromium via `launch_handler`/`capture_links`).

Background & images:
- A random background image is selected from `src/images/` on each load.
- Images are served as `.webp` (with alpha) when supported, and fall back to optimized `.png` otherwise.
- The image gently fades in on load; the light/dark overlay remains crisp when you toggle themes.

## Project structure

- `index.html` – app shell and UI composition
- `src/style.css` – base styles and theming (light/dark)
- `src/main.js` – app shell components (header, install banner, network status, modals), persistence, theme, SW registration
- `src/drawer-count.js` – `DrawerCount` web component (drawer calculator UI + logic)
- `src/images/` – background images (optimized `.png` plus generated `.webp`)
- `sw.js` – service worker (precache + runtime caching + offline fallback; scope-aware)
- `offline.html` – offline fallback page for navigations
- `manifest.webmanifest` – PWA manifest (standalone display, focus-existing)
- `src/icons/favicon.svg` – placeholder icon (add PNGs for better platform support)
 - `scripts/optimize-images.js` – utility to recompress PNGs and generate WebP with alpha

## PWA & service worker notes

- HTTPS/localhost required: service workers and install only work over HTTPS or `http://localhost`.
- Updates: after changing `sw.js`, reload and close/reopen the page to activate. In DevTools → Application → Service Workers you can `Update`/`Skip waiting`.
- Cache versioning: bump `CACHE_VERSION` in `sw.js` when you need to invalidate old caches.
	- Currently set to `v10`. Changing this forces clients to fetch new assets after activation.
- Query busting: `index.html` may add a version query (e.g., `src/main.js?v=5`). The SW handles this and serves the cached file correctly.
- Scope-aware paths: the SW normalizes URLs to its scope so cached assets work even under a subpath.
- API responses and config are not cached: the SW always fetches `/api/*` and `/config.js` from the network (JSON `503` when offline).
- Manifest scope and paths are now relative (e.g., `./manifest.webmanifest`, `./src/...`) so deployment under a subpath (like GitHub Pages `/your-repo/`) works out of the box. If you customize the base path, ensure `start_url`/`scope` in the manifest still point to `./` for your chosen directory.

## Icons

This project uses a single source icon at `src/icons/favicon.svg` and generates a full cross‑platform set (Android, iOS, Windows tiles, favicons):

```powershell
npm run icons
```

Outputs are written to `src/icons/` plus `favicon.ico` and `browserconfig.xml` in the project root. The manifest and `index.html` are wired to these assets so install prompts and app icons look correct across iOS, Android, Windows, and desktop browsers.

## Deployment

Any static host will work. Recommended:
- Paths are relative, so hosting from a subpath is supported (e.g., GitHub Pages). If you further nest the app, keep the manifest `start_url` and `scope` set to `./` so it scopes to the current directory.
- Ensure responses are served with correct MIME types (e.g., `application/manifest+json` for the manifest, `text/javascript` for `.js`).

Before deploying, optionally bump the service worker cache to ensure clients pick up new assets:

```powershell
npm run predeploy
```

Image optimization (optional but recommended):
- Optimize background PNGs and generate `.webp` variants with alpha using the provided script:

```powershell
npm run optimize-images
```

Adding new background images:
- Place new `.png` files in `src/images/`.
- Add the file’s base name (without extension) to the `BG_IMAGES` list in `src/main.js`.
- Run `npm run optimize-images` to generate `.webp` versions and recompress the PNGs.
- Add the new image filenames (both `.png` and `.webp`) to the precache array in `sw.js` so they’re available offline.

## License

ISC — see `LICENSE` (or the license field in `package.json`).

## Changelog

See `CHANGELOG.md`.

## Backend sync (optional)

This app remains fully functional offline using `localStorage`. If you provide a MongoDB connection, it will also sync your data to a backend so multiple devices can keep a server copy.

- Server: `server.js` (Express)
	- Env vars:
		- `PORT` (default `8080`)
		- `MONGODB_URI` (required to enable API)
		- `MONGODB_DB` (default `drawercount`)
	- Endpoints:
		- `GET /api/health`
		- `GET /api/kv` (list all keys with values; shared/global scope)
		- `GET /api/kv/:key` (shared/global scope)
		- `PUT /api/kv/:key` (body: `{ value, updatedAt? }`, shared/global scope)
	- Data scope:
		- All data is stored in a global/shared scope so every client sees the same profiles and days.
		- For migration, the server will fall back to the most recent legacy per-client value if a global value is missing.
- Client: stores two keys in `localStorage` and syncs them when online
	- `drawer-profiles-v1` and `drawer-days-v1`
	- For each, a meta entry `key + "__meta"` holds `{ updatedAt }`
	- Sync behavior: last-write-wins using `updatedAt` timestamps
	- When offline, changes are saved locally and pushed on reconnect

	API base (different origin/backend):
	- If you host the backend separately (e.g., Render at `https://drawer-counter.onrender.app`), set the API base via environment variable:
		- Server reads `API_BASE` and serves it at `/config.js`, which is loaded before the app.
		- Example (PowerShell):
			```powershell
			$env:API_BASE = 'https://drawer-counter.onrender.app/api'; npm start
			```
		- On Render, set `API_BASE` in the service’s environment variables.
		- You can still override locally at runtime if needed:
			```js
			localStorage.setItem('dca.apiBase', 'https://drawer-counter.onrender.app/api'); location.reload();
			```
		- Default is same-origin `'/api'` when no env or override is provided.
			- Additionally, the app has a built-in production fallback: when not on `localhost`, it defaults to `https://drawer-counter.onrender.app/api` unless overridden by `API_BASE` or the localStorage override.

Run locally with a Mongo connection (PowerShell):

```powershell
$env:MONGODB_URI = "mongodb+srv://<user>:<pass>@<cluster>/?retryWrites=true&w=majority"; npm start
```

If `MONGODB_URI` is not set, the API returns `503` and the app continues to operate offline against `localStorage`.

## Deploying backend on Render (MongoDB Atlas)

If you host the Express server on Render and your database is MongoDB Atlas, use these settings.

Environment variables (Render → your service → Environment):

- `MONGODB_URI` = your Atlas SRV URI, for example:
	- `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/drawercount?retryWrites=true&w=majority`
- `MONGODB_DB` = `drawercount`
- `MONGODB_TLS` = `true`
- Optional: `API_BASE` = your Render service URL + `/api` (e.g., `https://your-service.onrender.com/api`)

Notes for Atlas:
- Atlas uses public certificate authorities; you do NOT need to provide a custom CA for Atlas. Leave the `MONGODB_TLS_CA_*` variables unset.
- Prefer the `mongodb+srv://` URI. If you must use `mongodb://` hosts, ensure `tls=true` is present in the URI or keep `MONGODB_TLS=true` set.
- Do not use `MONGODB_TLS_INSECURE` in production. It’s only for short-term diagnostics.

Render service basics:
- Service type: a standard Node web service works fine.
- Start command: `npm start` (which runs `node server.js`).

Atlas network access:
- In Atlas → Network Access, allow your Render service’s outbound IPs, or temporarily allow `0.0.0.0/0` to validate connectivity.
- Ensure your Atlas database user has access to the `drawercount` database referenced by the URI.

Verify after deploy:
- Check logs for: `Server listening on http://localhost:PORT`.
- Open: `https://your-service.onrender.com/api/health` → expect `{ ok: true, db: { configured: true, connected: true } }`.
- The app should load at the root URL, and API calls to `/api/*` should succeed.

Troubleshooting TLS errors:
- If you see TLS handshake errors, first confirm `MONGODB_TLS=true` and that you’re using the Atlas SRV URI.
- Avoid setting any custom CA variables with Atlas. They’re not required and can cause negotiation issues.
- As a temporary diagnostic, you can set `MONGODB_TLS_INSECURE=true`. If this fixes it, revert it and keep `MONGODB_TLS=true` with the SRV URI.

