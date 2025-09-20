# Drawer Count App

A minimal, installable PWA to help count drawers at the end of the day. Works offline, supports profiles, daily history, and import/export.

Status: Vanilla JS + Web Components (no framework)

## Features

- Offline-first PWA (service worker with precache, runtime cache, offline fallback)
- Installable (manifest + in-app install banner); focuses an existing app window when possible
- Drawer calculator with dynamic rows for credit card slips and checks
- Profiles: Save, Restore, and Clear the active profile
- Daily History: Save by day, Load, Delete, and Rename entries; auto reset on a new day
- Import/Export: Backup or restore your data as JSON
- Theme: Light/Dark/System with live `theme-color` updates
- Network status pill and toast notifications
- Keyboard shortcuts for faster entry

## Quick start (Windows PowerShell)

The app is static—no build step required. A dev server is included.

```powershell
npm install
npm start
```

This runs `live-server` on `http://127.0.0.1:8080/` and opens `index.html` automatically. The service worker only works when served via HTTP(S) or `localhost`.

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

## Project structure

- `index.html` – app shell and UI composition
- `src/style.css` – base styles and theming (light/dark)
- `src/main.js` – app shell components (header, install banner, network status, modals), persistence, theme, SW registration
- `src/drawer-count.js` – `DrawerCount` web component (drawer calculator UI + logic)
- `sw.js` – service worker (precache + runtime caching + offline fallback; scope-aware)
- `offline.html` – offline fallback page for navigations
- `manifest.webmanifest` – PWA manifest (standalone display, focus-existing)
- `src/icons/favicon.svg` – placeholder icon (add PNGs for better platform support)

## PWA & service worker notes

- HTTPS/localhost required: service workers and install only work over HTTPS or `http://localhost`.
- Updates: after changing `sw.js`, reload and close/reopen the page to activate. In DevTools → Application → Service Workers you can `Update`/`Skip waiting`.
- Cache versioning: bump `CACHE_VERSION` in `sw.js` when you need to invalidate old caches.
	- Currently set to `v7`. Changing this forces clients to fetch new assets after activation.
- Query busting: `index.html` may add a version query (e.g., `src/main.js?v=5`). The SW handles this and serves the cached file correctly.
- Scope-aware paths: the SW normalizes URLs to its scope so cached assets work even under a subpath.
- Manifest scope and paths are now relative (e.g., `./manifest.webmanifest`, `./src/...`) so deployment under a subpath (like GitHub Pages `/your-repo/`) works out of the box. If you customize the base path, ensure `start_url`/`scope` in the manifest still point to `./` for your chosen directory.

## Icons

An SVG favicon is included. For best install UX across platforms, generate PNG icons:

```powershell
npm run icons
```

This creates `src/icons/icon-192.png` and `src/icons/icon-512.png` and keeps the SVG as a scalable icon.

## Deployment

Any static host will work. Recommended:
- Paths are relative, so hosting from a subpath is supported (e.g., GitHub Pages). If you further nest the app, keep the manifest `start_url` and `scope` set to `./` so it scopes to the current directory.
- Ensure responses are served with correct MIME types (e.g., `application/manifest+json` for the manifest, `text/javascript` for `.js`).

## License

ISC — see `LICENSE` (or the license field in `package.json`).

## Changelog

See `CHANGELOG.md`.

