# Changelog

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