# Drawer Count App

A minimal, installable PWA to help count drawers at the end of the day.

Status: Initial scaffold (vanilla, no framework)

## Features

- Offline-first PWA (service worker + cache)
- Installable (manifest + install prompt)
- Simple counter: increment, decrement, reset, and quick set
- Save and Restore drawers manually
- Auto-saves changes locally via `localStorage`

## Project structure

- `index.html` – app shell and UI
- `src/style.css` – base styles
- `src/main.js` – app logic, persistence, SW registration
- `src/drawer-count.js` - Custom Drawer Count App
- `sw.js` – service worker (precache + runtime caching + offline fallback)
- `offline.html` – displayed when offline and navigation fails
- `manifest.webmanifest` – web app manifest
- `src/icons/favicon.svg` – placeholder icon (add PNGs later if desired)

## Run locally (static server)

This repo doesn't require a build tool. Use any static HTTP server. On Windows PowerShell, two options:

1) Node http-server (if you have Node):

```powershell
npm i -g http-server
http-server -p 5173 -c-1
```

2) Python (if you have Python installed):

```powershell
python -m http.server 5174
```

Then open `http://localhost:5174/`. The service worker only works when served via HTTP(S), not from the `file://` protocol.

## Install or open the app
## Save and Restore

- Click `Save` in the header to store your current drawer (including all slips/checks and bill/coin counts).
- Click `Restore` to load the last saved drawer.
- Changes are auto-saved as you type; `Save` provides a confirmation toast on demand.


- Load the site in Chrome/Edge.
- When not installed, an `Install` button appears in the header (or use the browser menu to install).
- After installation, returning to the website will show an `Open in App` button instead. Clicking it focuses an existing app window or opens a new one.
- If you open the installed app window itself (display-mode standalone), the button is hidden.

## Icons

An SVG favicon is included. For best results on various platforms, add PNG icons (192x192, 512x512) under `src/icons/` and reference them from `manifest.webmanifest`.

## Notes

- If you update `sw.js`, reload and then close/reopen the page to activate the new service worker. You can also use the DevTools Application > Service Workers panel to update/skip waiting.
 - The `manifest.webmanifest` uses `launch_handler` and `capture_links` to prefer focusing an existing app client when opening from the website (supported in Chromium-based browsers).

