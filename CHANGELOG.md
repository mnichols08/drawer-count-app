# Changelog

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