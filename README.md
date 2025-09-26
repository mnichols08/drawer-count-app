# Drawer Count App

A modern, installable Progressive Web App (PWA) for counting cash drawers at the end of business day. Built with vanilla JavaScript and Web Components, featuring offline-first architecture, multi-profile support, and optional cloud sync.

**Status**: Production-ready vanilla JS + Web Components (framework-free)

## Quick Start

### Installation & Development
```bash
# Clone and install dependencies
git clone https://github.com/mnichols08/drawer-count-app.git
cd drawer-count-app
npm install

# Start development server with auto-reload
npm run dev

# Or start production server
npm start
```

The app runs at `http://localhost:8080` by default. Change the port with `PORT=3000 npm start`.

### Basic Usage
1. **Cash Counting**: Enter bills and coins in the calculator
2. **Credit Cards**: Add slip amounts using the + button for multiple entries
3. **Checks**: Add check amounts with dedicated rows
4. **Balance**: Watch the real-time balance calculation with color indicators
5. **Profiles**: Save your drawer setup for reuse via Settings → Profiles  
6. **History**: Access daily records via Settings → Daily History

### Optional Features
- **Cloud Sync**: Set up MongoDB connection for multi-device sync
- **Install as App**: Use the install banner for native app experience
- **Keyboard Shortcuts**: `Ctrl+Shift+S` (add slip), `Ctrl+Shift+C` (add check)
- **Themes**: Switch between Light/Dark/Auto in Settings

## Features

### Core Functionality
- **Cash Drawer Calculator**: Dynamic counting interface with bills, coins, credit card slips, and checks
- **Real-time Balance Calculation**: Live total updates with color-coded balance indicators
- **Smart Row Management**: Add/remove credit card and check rows with keyboard shortcuts

### Data Management
- **Multiple Profiles**: Save, restore, and manage different drawer configurations
- **Daily History**: Automatic day-based storage with save/load/delete/rename functionality
- **Import/Export**: Full data backup and restore via JSON files
- **Auto-reset**: Fresh start each new business day

### PWA Features
- **Offline-first**: Full functionality without internet connection using service worker
- **Installable**: Native app-like experience on desktop and mobile
- **Background Sync**: Optional cloud synchronization when online
- **Smart Window Management**: Focus existing windows instead of opening duplicates

### User Experience
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Theme Support**: Light/Dark/System themes with live updates
- **Keyboard Shortcuts**: Fast data entry with customizable hotkeys
- **Visual Polish**: Random background images with smooth transitions
- **Network Status**: Real-time connectivity and server health indicators
- **Toast Notifications**: User-friendly feedback for all actions

### Developer Features
- **Modern Web Standards**: ES6 modules, Web Components, Service Workers
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **SEO Optimized**: Complete meta tags, structured data, and sitemap
- **Cross-platform Icons**: Generated icon sets for all platforms
- **Image Optimization**: WebP support with PNG fallbacks

### Optional Reporting Fields
The app includes optional daily tracking fields for business reporting (these don't affect drawer totals):
- **Charges**: Total charge transactions
- **Total Received**: Complete payment received
- **Net Sales**: Sales after returns/adjustments  
- **Gross Profit**: Both dollar amount and percentage
- **Transaction Counts**: Number of invoices and voids

These fields are saved with your daily history and can be exported for reporting purposes.

## SEO & Production Setup

This app includes sensible defaults for search and sharing:

- Canonical URL, Open Graph, and Twitter meta tags in `index.html`.
- JSON-LD (`WebApplication`) structured data in `index.html`.
- `offline.html` is marked `noindex` and excluded from the sitemap.
- Root `robots.txt` and `sitemap.xml` are served with proper content types.

Before deploying to production, replace `https://drawercounter.journeytocode.io` in:

- `index.html`: `link rel="canonical"`, `og:*`, `twitter:*`, and JSON-LD `url`/`image`.
- `offline.html`: canonical link.
- `robots.txt`: `Sitemap:` URL.
- `sitemap.xml`: `<loc>` entries. Add any other top-level routes if you introduce them.

The Express server sets security headers and cache policies. Static assets get long-term caching, while HTML and configuration endpoints avoid caching to ensure fresh content.

Local API base note (avoiding CORS): when the app is served to `localhost` (or `127.0.0.1`), the server responds from `/config.js` with `window.DCA_API_BASE = '/api'` regardless of any `API_BASE` environment variable. This ensures the frontend talks to the same-origin Express API during local development and avoids browser CORS errors. In production (non-localhost), `API_BASE` will be respected if set; otherwise it defaults to the built-in Render URL.

Alternative: if you only need to serve static files, any simple HTTP server on port 8080 works. Ensure the service worker is reachable at the root scope.

### Environment Configuration
- **Development**: Uses `NODE_ENV=development` (or unset) to serve from `/src`
- **Production**: Uses `NODE_ENV=production` to serve from `/dist` 
- **Port**: Set `PORT` environment variable (default: 8080)
- **API Configuration**: See Backend Sync section for MongoDB setup

Local API note: When served on `localhost`, the API base defaults to same-origin `/api` to avoid CORS issues during development.

## Build & Deployment

The app supports both development and production builds:

### Development
```bash
npm run dev          # Development with auto-reload (serves from /src)
```

### Production Build
```bash
npm run build        # Build /dist folder from /src
npm run predeploy    # Optimize assets, then build /dist
npm start            # Production mode (serves from /dist)
```

The build process:
1. Cleans the `/dist` directory
2. Copies all files from `/src` to `/dist`
3. Validates that critical files exist
4. Creates a production-ready distribution
5. Logs a warning (instead of crashing) if GitHub Pages path rewrites skip a missing HTML/manifest file, so the subsequent critical-file check surfaces the build failure cleanly in CI.

### Available Scripts
```bash
# Development
npm run dev          # Development server with auto-reload (nodemon)

# Production  
npm start            # Production server (NODE_ENV=production)
npm run build        # Build /dist folder from /src
npm run predeploy    # Optimize assets, then build /dist

# Assets
npm run icons        # Generate icon set from favicon.svg
npm run optimize-images  # Optimize PNGs and generate WebP variants

# Release Management
# Use flags for publish flow (e.g., npm run bump-sw -- --minor --push)
npm run bump-sw      # Bump service worker cache version / SW assets

# Deployment
npm run predeploy    # Full production build with optimizations
npm run deploy       # Deploy (shows instructions)
npm run clean        # Remove /dist folder

# Linting
npm run lint         # Run JS + Markdown linters
npm run lint:js      # ESLint (flat config)
npm run lint:md      # markdownlint (relaxed rules)

# Testing
npm test              # Run Node + Playwright suites
npm run test:e2e      # Run Playwright E2E suite
npm run test:watch    # Watch Node + Playwright suites
npm run test:ui       # Playwright UI alongside watch mode

# End-to-End (E2E) Tests
npm run e2e:install  # One-time: install Playwright browsers
npm run test:e2e     # Run E2E tests (headless)
npm run test:watch   # Headless watch mode for Node + Playwright
npm run test:ui      # Launch Playwright UI with watch mode

# Housekeeping
npm run clean:e2e    # Remove Playwright artifacts (playwright-report/, test-results/)
npm run clean:all    # Remove dist/ and Playwright artifacts
```

The server automatically serves:
- `/src` folder in development mode (`npm run dev`)
- `/dist` folder in production mode (`npm start` with NODE_ENV=production)

Deploy the `/dist` folder to your hosting provider after running `npm run predeploy`.

### E2E Testing

This project includes Playwright-based E2E tests that drive the app in a real browser.

Basics:
- One-time: `npm run e2e:install`
- Run: `npm run test:e2e`
- Watch: `npm run test:watch`
- UI mode: `npm run test:ui`

Focus on a single scenario by appending the spec filename, for example `npm run test:e2e -- profile-deletion-prunes.spec.js`.

Current Playwright coverage highlights:
- `drawer-balance.spec.js` checks math accuracy and asserts the page stays free of console errors.
- `seeding-offline.spec.js` seeds deterministic history, restores past days, and verifies baseline offline behavior.
- `profile-deletion-prunes.spec.js` exercises offline profile deletion, ensures day-history pruning, and confirms tombstones sync once connectivity returns.

Seeding configuration used by E2E:
- Tests seed recent days with balanced values for determinism.
- You can override defaults via env:
	- `SEED_COUNT=10 INCLUDE_TODAY=true npm run test:e2e`
	- Backed by `tests/e2e/config.js`.

Artifacts and cleanup:
- Test artifacts live in `playwright-report/` and `test-results/` and are git-ignored.
- Use `npm run clean:e2e` to remove artifacts, or `npm run clean:all` to also clear `dist/`.

### GitHub Pages Deployment

This repository includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages:

1. **Automatic Deployment**: Pushes to `main` branch trigger automatic build and deploy
2. **Manual Deployment**: Use the "Actions" tab to manually trigger deployment
3. **Custom Domain**: Configured to use `drawercounter.journeytocode.io`

**Recommended Workflow**:
- Develop on `development` branch
- Create Pull Request to merge `development` → `main`
- Merge PR triggers automatic deployment to production

The GitHub Actions workflow:
- Installs dependencies
- Runs `npm run predeploy` (includes image optimization)
- Deploys the `/dist` folder to GitHub Pages
- Handles path updates automatically for GitHub Pages environment

To enable GitHub Pages for your repository:
1. Go to Repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The workflow will handle the rest automatically

### Continuous Integration

- The `Test Suite` workflow runs on Node.js 18 and 20, mirroring the officially supported runtime targets.
- When a run is triggered from or targeting the `development` branch, the workflow exports `NODE_ENV=development` and `DCA_DEV=true` so the Express server serves assets directly from `src/` without requiring a production build.
- npm dependencies are cached automatically through `actions/setup-node`, and Playwright browser binaries live under a pinned temp directory (`$RUNNER_TEMP/ms-playwright`) that is cached between runs to reduce install time.
- Managed database credentials (`MONGODB_URI`, optional TLS flags) are pulled from GitHub Actions secrets or variables—add them under **Settings → Secrets and variables → Actions** and the workflow exports them before tests start.
- See `.github/workflows/test.yml` for the latest configuration and reusable cache keys.

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
- The app shows a small install banner when eligible. After install, it automatically switches to an `Open in App` action that focuses an existing window when possible.
- Chromium-based browsers use `launch_handler: focus-existing` and `capture_links: existing-client-nav` to reduce duplicate windows.
- iOS Safari doesn’t prompt; the banner provides a brief “how to install” helper.

Background & images:
- A random background image is selected from `src/images/` on each load.
- Images are served as `.webp` (with alpha) when supported, and fall back to optimized `.png` otherwise.
- The image gently fades in on load; the light/dark overlay remains crisp when you toggle themes.

Network and Server status:
- A single pill at the bottom-right shows both network status and a server health badge.
- Badge codes: `OK` (connected), `NODB` (configured but DB not connected), `ERR` (health check failed), `OFF` (browser offline), `N/A` (not configured).
- Updates every ~20 seconds and also responds immediately to online/offline events; tooltip shows the API base.

## Project Structure

### Core Application
- **`src/index.html`** – Main application shell and UI layout
- **`src/main.js`** – Application entry point and component initialization  
- **`src/style.css`** – Global styles, themes, and responsive design
- **`server.js`** – Express server for development and production

### Components (`src/components/`)
**Main Components:**
- **`drawer-count.js`** – Core calculator with all counting logic
- **`count-panel.js`** – Display panel for totals and balance
- **`app-header.js`** – Navigation and branding
- **`app-install-banner.js`** – PWA installation prompts
- **`network-status.js`** – Connection and server health display

**Modal Components:**
- **`settings-modal.js`** – Main settings interface
- **`help-modal.js`** – User documentation and shortcuts
- **`new-profile-modal.js`** – Profile creation interface
- **`delete-profile-modal.js`** – Profile deletion confirmation
- **`day-picker-modal.js`** – Daily history navigation
- **`optional-fields-modal.js`** – Business reporting fields
- **`onboarding-tour.js`** – First-time user guidance
- **`unlock-confirm-modal.js`** – Security confirmations
- **`revert-confirm-modal.js`** – Data reversion warnings

### Utilities (`src/lib/`)
- **`persistence.js`** – Local storage and data management
- **`sync.js`** – Cloud synchronization logic
- **`theme.js`** – Theme switching and background management
- **`toast.js`** – User notification system
- **`days.js`** – Date utilities and development seeding

### Assets
- **`src/icons/`** – Complete icon set for all platforms (generated from `favicon.svg`)
- **`src/images/`** – Background images (optimized PNG + WebP variants)
- **`src/sw.js`** – Service worker for offline functionality
- **`src/manifest.webmanifest`** – PWA configuration
- **`src/offline.html`** – Fallback page for offline navigation

### Build System (`scripts/`)
- **`build.js`** – Production build process
- **`generate-icons.js`** – Icon generation from SVG source
- **`optimize-images.js`** – Image compression and WebP conversion
- **`bump-sw-cache.js`** – Service worker cache versioning

## PWA & service worker notes

- HTTPS/localhost required: service workers and install only work over HTTPS or `http://localhost`.
- Updates: after changing `sw.js`, reload and close/reopen the page to activate. In DevTools → Application → Service Workers you can `Update`/`Skip waiting`.
- Cache versioning: bump `CACHE_VERSION` in `sw.js` when you need to invalidate old caches.
	- Currently set to `v17`. Changing this forces clients to fetch new assets after activation.
- Query busting: `index.html` may add a version query (e.g., `src/main.js?v=5`). The SW handles this and serves the cached file correctly.
- Scope-aware paths: the SW normalizes URLs to its scope so cached assets work even under a subpath.
- API responses and config are not cached: the SW always fetches `/api/*` and `/config.js` from the network (JSON `503` when offline). The SW also broadcasts connectivity state to the page so the UI reflects network changes quickly.
- Manifest scope and paths are now relative (e.g., `./manifest.webmanifest`, `./src/...`) so deployment under a subpath (like GitHub Pages `/your-repo/`) works out of the box. If you customize the base path, ensure `start_url`/`scope` in the manifest still point to `./` for your chosen directory.

## Icons

This project uses a single source icon at `src/icons/favicon.svg` and generates a full cross‑platform set (Android, iOS, Windows tiles, favicons):

```bash
npm run icons
```

Outputs are written to `src/icons/` plus `favicon.ico` and `browserconfig.xml` in the project root. The manifest and `index.html` are wired to these assets so install prompts and app icons look correct across iOS, Android, Windows, and desktop browsers.

## Deployment

Any static host will work. Recommended:
- Paths are relative, so hosting from a subpath is supported (e.g., GitHub Pages). If you further nest the app, keep the manifest `start_url` and `scope` set to `./` so it scopes to the current directory.
- Ensure responses are served with correct MIME types (e.g., `application/manifest+json` for the manifest, `text/javascript` for `.js`).

Before deploying, optionally bump the service worker cache to ensure clients pick up new assets:

```bash
npm run predeploy
```

Image optimization (optional but recommended):
- Optimize background PNGs and generate `.webp` variants with alpha using the provided script:

```bash
npm run optimize-images
```

Adding new background images:
- Place new `.png` files in `src/images/`.
- Run `npm run optimize-images` to generate `.webp` versions and recompress the PNGs.
- Add the new image filenames (both `.png` and `.webp`) to the precache array in `sw.js` so they’re available offline.
	- Note: background overlay and theme handling live in `src/lib/theme.js`.

### Deploy to Render (quick checklist)

1) Create a new Web Service on Render pointing to this repo.
2) Environment → add:
	- `MONGODB_URI` = Atlas SRV URI (e.g., `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/`)
	- `MONGODB_DB` = `drawer-count-app`
	- `MONGODB_TLS` = `true`
	- Optional: `MONGODB_SERVER_SELECTION_TIMEOUT_MS` = `3000`
	- Optional: `API_BASE` = `https://<your-service>.onrender.com/api`
3) Start command: `npm start` (default in `package.json`).
4) In Atlas → Network Access: allow Render’s egress IP or temporarily `0.0.0.0/0` to validate.
5) After deploy, verify `https://<your-service>.onrender.com/api/health` shows DB connected.

## 📚 Documentation

This project includes comprehensive documentation in the `/docs` folder for developers, deployment, and testing.

### 📖 Quick Navigation

- **[📁 Documentation Hub](/docs/README.md)** - Main documentation index with complete overview
- **[🧪 Testing Guide](/docs/testing/README.md)** - Complete testing documentation and guides
- **[⚙️ Scripts Reference](/docs/scripts/README.md)** - Detailed script documentation and usage
- **[🚀 Deployment Guide](/docs/deployment/README.md)** - Comprehensive deployment instructions

### 📋 What's Documented

#### Testing & Quality Assurance
- Comprehensive test suite (19 tests covering all build scripts)
- Testing framework details and best practices
- CI/CD integration with GitHub Actions
- Test coverage reports and debugging guides

#### Build Scripts & Automation
- All package.json scripts with detailed explanations
- Build system architecture and customization
- Asset optimization (images, icons, SW cache)
- Version management and deployment automation

#### Deployment & Production
- Multiple deployment options (GitHub Pages, Render, self-hosted)
- Environment configuration and security
- Performance optimization techniques
- Multi-environment setup (dev/staging/production)

### 🎯 For New Contributors

1. **Start Here**: Read the [Documentation Hub](/docs/README.md) for overview
2. **Development**: Check [Scripts Reference](/docs/scripts/README.md) for build commands
3. **Testing**: Follow [Testing Guide](/docs/testing/README.md) to run and understand tests
4. **Deployment**: Use [Deployment Guide](/docs/deployment/README.md) for production setup

## 🤝 Community & Support

- Code of Conduct: see `.github/CODE_OF_CONDUCT.md`
- Contributing Guide: see `.github/CONTRIBUTING.md`
- Security Policy: see `.github/SECURITY.md`
- Support: see `.github/SUPPORT.md`
- Issue Templates: see `.github/ISSUE_TEMPLATE/*`
- Pull Request Template: see `.github/pull_request_template.md`

### 🔧 Documentation Standards

All documentation follows consistent formatting and includes:
- Clear navigation and cross-references
- Code examples with explanations
- Troubleshooting sections
- Best practices and conventions

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
		- `MONGODB_DB` (default `drawer-count-app`)
		- `MONGODB_TLS` (`false` locally; set `true` for most cloud providers like Atlas)
		- `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (default `3000`)
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
	- If you host the backend separately (e.g., Render at `https://drawer-count-app.onrender.com`), set the API base via environment variable:
		- Server reads `API_BASE` and serves it at `/config.js`, which is loaded before the app.
		- Example:
			```bash
			API_BASE='https://drawer-count-app.onrender.com/api' npm start
			```
		- On Render, set `API_BASE` in the service’s environment variables.
		- You can still override locally at runtime if needed:
			```js
			localStorage.setItem('dca.apiBase', 'https://drawer-count-app.onrender.com/api'); location.reload();
			```
		- Default is same-origin `'/api'` when no env or override is provided.
			- Additionally, the app has a built-in production fallback: when not on `localhost`, it defaults to `https://drawer-count-app.onrender.com/api` unless overridden by `API_BASE` or the localStorage override.

Run locally with a Mongo connection:

```bash
MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/" \
MONGODB_DB="drawer-count-app" \
MONGODB_TLS="true" \
npm start
```

If `MONGODB_URI` is not set, the API returns `503` and the app continues to operate offline against `localStorage`.

## Deploying backend on Render (MongoDB Atlas)

If you host the Express server on Render and your database is MongoDB Atlas, use these settings.

Environment variables (Render → your service → Environment):

- `MONGODB_URI` = your Atlas SRV URI, for example:
	- `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/`
- `MONGODB_DB` = `drawer-count-app`
- `MONGODB_TLS` = `true`
- Optional: `API_BASE` = your Render service URL + `/api` (e.g., `https://your-service.onrender.com/api`)
 - Optional: `MONGODB_SERVER_SELECTION_TIMEOUT_MS` = `3000`

Notes for Atlas:
- Atlas uses public certificate authorities; you do NOT need to provide a custom CA for Atlas. Leave the `MONGODB_TLS_CA_*` variables unset.
- Prefer the `mongodb+srv://` URI. If you must use `mongodb://` hosts, ensure `tls=true` is present in the URI or keep `MONGODB_TLS=true` set. Do not include the database path in the URI; set it via `MONGODB_DB`.
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

