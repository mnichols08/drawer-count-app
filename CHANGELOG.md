# Changelog

## v0.2.1 - 2025-09-21
### Features & Enhancements
- Onboarding overlay for improved user guidance
- Completed summary panel for previous date selection
- Developer mode for seeding and clearing days
- Test utilities for seeding previous days
- Seed previous days with random data for testing
- Service worker registration and cache version bump

## v0.2.2 - 2025-09-21
### Refactors & UI Improvements
- Refactored DrawerCount component for better null/undefined handling
- Moved action buttons to drawer panel for improved UI
- Enhanced modals with responsive design and onboarding hints
- Improved network status tooltip and mixed state display
- Updated DB connection state tracking and full sync logic
- Enhanced dry run mode in bump-sw-cache.js
- Optimized expand/collapse animations and refresh logic in CountPanel
- Improved cancel button visibility logic
- Updated toggle button icons and panel toggle functionality
- Enhanced button styles and accessibility in modals
- Improved persistence logic in CountPanel
- Save/mark complete toggle functionality in CountPanel
- Unlock confirmation modal for editing past days
- Auto-show completed summary for previous days

## v0.2.3 - 2025-09-21
### Bugfixes & Maintenance
- Fixed save mode logic in CountPanel to default to 'Mark complete' when no active view date is set
- Prevented unnecessary state changes in CountPanel
- Updated lock button visibility logic
- Fixed environment configuration for MongoDB settings
- Improved UI clarity and read-only state handling

## v0.2.1 - 2025-09-21
### Added
- Seed previous days with random data for testing
- Onboarding overlay for improved user guidance
- Service worker registration and cache version bump
- Completed summary panel for previous date selection
- Developer mode for seeding and clearing days
- Test utilities for seeding previous days

### Changed
- Refactored DrawerCount component for better null/undefined handling
- Moved action buttons to drawer panel for improved UI
- Enhanced modals with responsive design and onboarding hints
- Improved network status tooltip and mixed state display
- Updated DB connection state tracking and full sync logic
- Enhanced dry run mode in bump-sw-cache.js
- Optimized expand/collapse animations and refresh logic in CountPanel
- Improved cancel button visibility logic
- Updated toggle button icons and panel toggle functionality
- Enhanced button styles and accessibility in modals
- Improved persistence logic in CountPanel
- Save/mark complete toggle functionality in CountPanel
- Unlock confirmation modal for editing past days
- Auto-show completed summary for previous days

### Fixed
- Fixed save mode logic in CountPanel to default to 'Mark complete' when no active view date is set
- Prevented unnecessary state changes in CountPanel
- Updated lock button visibility logic
- Fixed environment configuration for MongoDB settings
- Improved UI clarity and read-only state handling

## v0.1.5 - 2025-09-20
### Added
- Install banner that offers Install (when supported) or Open in App once installed; persists dismissal and supports iOS “how to install” guidance.
- Service Worker message channel to focus an existing client window (OPEN_APP), used by the banner’s Open in App action.

### Changed
- Service worker cache bumped to `v17`; improved scope-aware precache and navigation fallbacks for subpath deployments.
- Always bypass cache for `/config.js` and all `/api/*` requests; SW now broadcasts connectivity changes to clients.
- Title shows a subtle "• Offline" suffix when offline.

### Docs
- README: correct Quick Start (remove non-existent `dev:static` script), update SW cache version reference to `v17`, and document the Install/Open-in-App flow.
 - Correct API base URL references to use `https://drawer-count-app.onrender.com/api` (replacing previous `*.onrender.app` examples). Also updated the production default fallback URL in docs.

## v0.1.4 - 2025-09-20
### Added
- Collapsible Count Panel wrapper around the drawer component with a Show/Hide toggle; state persists per profile/day.
- Manifest enhancements: `launch_handler: { client_mode: "focus-existing" }` and `capture_links: "existing-client-nav"` for better installed-app behavior.

### UI
- Background image fade-in refined and overlay contrast tuned for light/dark themes.
- Minor accessibility and keyboard interaction polish across header actions and modals.

## v0.1.3 - 2025-09-20
### Changed
- Server status is now displayed inside the same bottom-right network status pill as a small badge (icon + short code).
- Removed the separate server status pill from the header and the temporary floating server pill.

### UI
- The combined pill updates every 20s and on online/offline events. Badge codes: `OK`, `NODB`, `ERR`, `OFF`, and `N/A`.

## v0.1.2 - 2025-09-20
### Added
- Server supports configurable MongoDB TLS via env vars: `MONGODB_TLS`, `MONGODB_TLS_INSECURE`, and optional CA inputs (`MONGODB_TLS_CA_FILE`, `MONGODB_TLS_CA_PEM`, `MONGODB_TLS_CA_BASE64`).
- `.env.example` with local and Render/Atlas-friendly defaults.
- README: new sections for Render + Atlas deployment and a quick deploy checklist.

### Fixed
- Avoid TLS handshake failures on providers that require explicit TLS flags by allowing configuration via env vars.

## v0.1.1 - 2025-09-20
### Added
- Backend runtime config endpoint: `GET /config.js` exposes `window.DCA_API_BASE` derived from the `API_BASE` environment variable.
- Client-side API base resolution: app now reads `window.DCA_API_BASE`, optional `localStorage['dca.apiBase']`, and defaults to `'/api'`.
 - Production default: when not on localhost, the app falls back to `https://drawer-count-app.onrender.com/api` unless overridden.

### Changed
- Backend storage is now global/shared across all clients (no `X-Client-Id` needed). Legacy per-client records are still read if a global value is missing.
- Frontend sync switched to the new global scope and uses `apiUrl()` for all requests (`/health`, `/kv/:key`).

### PWA
- Service worker always bypasses caching for `/api/*` requests and for `/config.js`; returns JSON `503` when offline.

### Docs
- README updated with environment-based `API_BASE` config (works with Render), global/shared data behavior, and SW caching notes.

## v0.0.11 - 2025-09-20
### Added
- Random background image chosen from `src/images/` on load.
- Smooth fade-in animation for background image via a dedicated background layer.

### Performance
- Image optimization pipeline using `sharp`: recompress PNGs (preserve alpha) and generate `.webp` variants with transparency.
- Runtime prefers `.webp` when supported, falls back to optimized `.png`.

### PWA
- Bump service worker cache version to `v10` and precache both `.png` and `.webp` background assets for offline use.

### Scripts & Docs
- New `npm run optimize-images` script and docs for adding/optimizing background images.
- `predeploy` now runs `bump-sw` and `optimize-images`.

## v0.0.10 - 2025-09-20
- Adds a background image and transluceny to UI so that it remains visible.
## v0.0.9 - 2025-09-20
### Added
- Optional Daily Fields modal (🧾 button in header) for entering: Charges, Total Received, Net Sales, Gross Profit Amount ($), Gross Profit Percentage (%), Number of Invoices, Number of Voids.
- Optional values are saved per day and included in profiles/export but do not affect totals or balance.

### Changed
- Drawer state upgraded to version 2 with a new `optional` section; backward-compatible with normalization when comparing saved/unsaved status.
- Inline optional section is now hidden in `DrawerCount` (kept for state hydration and autosave hooks).
- Header UI updated with Optional Fields button; disabled when viewing locked (read-only) days.

### Fixed
- Prevent false "Unsaved changes" indicator by normalizing state (ignoring timestamps and defaulting missing optional fields) when computing header status.

### PWA
- Bump service worker cache version to `v9` to ensure clients fetch updated assets.


## v0.0.8 - 2025-09-20
- Add iOS installation instructions and adjust banner height handling

## v0.0.7 - 2025-09-20
- Add daily history in `SettingsModal` (save, load, delete days)
- Add read-only toggle and day renaming in `SettingsModal`
- Introduce `NewProfileModal` (keyboard accessible) and `DeleteProfileModal` with confirmation
- Add "Clear inputs" action in `AppHeader`
- Dynamic label renumbering for slip/check rows in `DrawerCount`
- Add explicit labels to inputs for improved accessibility
- Improve header styling and responsive layout; add dynamic padding
- Enhance theme management; add input color CSS variables for modals
- Update `DayPickerModal` navigation with earliest-offset logic and disabled buttons
- Support relative deployment paths in manifest, HTML, and service worker registration
- Add icon generation scripts and new icons; update tile sizes
- Add `bump-sw-cache` script and predeploy step; update dependencies
- Refresh `README` and `HelpModal` text with clearer instructions and deployment notes

## v0.0.6 - 2025-09-20
- Save/Restore drawer state (manual buttons in header) with auto-save to `localStorage`.
- Restores dynamic slip/check rows and all base inputs.

## v0.0.5 - 2025-09-19
- Add press-and-hold support for continuous increment/decrement with configurable acceleration
- Fix precision issues for fractional step sizes; normalize and format values per locale
- Expose CustomEvents (count-change, count-reset) with old/new values for integrations
- Add theming via CSS custom properties and improve dark/high-contrast mode support
- Enhance keyboard interactions and ARIA hints; refine focus ring for accessibility
- Harden storage access to handle private mode/quota errors with in-memory fallback
- Resolve debounce race causing missed updates during rapid input
- Improve service worker cache invalidation and post-update refresh behavior
- Generate TypeScript declarations and ship dual ESM/CJS builds
- Reduce bundle size via treeshaking and removal of dev-only code; update dependencies
- Add Playwright end-to-end tests and expand CI matrix with artifacts
- Refresh docs with API/events, theming guidance, and troubleshooting
## v0.0.4 - 2025-09-19
- Persist counter value with localStorage and restore on load
- Add reset button and configurable step size via component attribute
- Improve accessibility with ARIA labels, focus states, and keyboard support
- Optimize rendering and debounce rapid increments for smoother updates
- Update service worker to use stale-while-revalidate and refresh precache
- Add unit tests for component logic and set up GitHub Actions CI
- Fix ESM build warnings and update dependencies to address vulnerabilities
- Refresh documentation with setup/usage examples and contribution notes
## v0.0.3 - 2025-09-19
- Initalize npm package for development
- Create and implement Drawer Counter Web Component
## 0.0.2 - 2025-09-19
- Add initial project files including HTML, CSS, JS, and service worker for PWA functionality
- Adds web components for banners, toasts, network status, install and launch app buttons
## 0.0.1 - 2025-09-19
- Initialize repository and base project setup.
- Add README file with minimal description