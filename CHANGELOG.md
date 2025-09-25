# Changelog

## v0.3.10 - 2025-09-25
### Developer Experience
- Added developer-only connectivity controls in `settings-modal` that let testers force offline, mixed, or online modes and broadcast the override to the UI for quick validation of connectivity-dependent flows.
- Introduced a one-click local storage reset in the developer tools panel to simulate a first-time load without needing server access.

### Build & CI
- Hardened `scripts/build.js` to warn-and-continue when GitHub Pages rewrites target a missing HTML or manifest file, allowing the subsequent critical file validation to fail builds with the intended error message instead of crashing the rewrite step in CI.

### Offline Sync & Data Hygiene
- Deleting profiles while offline now records tombstones that sync back to the server, ensuring remote data stays consistent when connectivity is restored.
- Associated day-history entries are pruned when a profile is removed so local storage stays lean and retains only live data.

### Testing
- Added Playwright spec `tests/e2e/profile-deletion-prunes.spec.js` that creates, deletes, and resyncs a profile to confirm day history pruning and tombstone propagation end to end.

### Documentation
- Updated the README E2E section to highlight the new pruning coverage and how to target the spec during focused runs.

## v0.3.9 - 2025-09-24
### Testing
- Added a regression check in `tests/scripts/build.test.js` to ensure `dist/icons/favicon.svg` is generated with valid SVG markup and remains referenced by the web app manifest after every build, preventing production 404s.
- Wired the build script suite into `npm test` so CI and local runs catch build regressions automatically.

### Documentation
- Updated `docs/testing/test-guide.md` to highlight the new favicon safeguard covered by the build tests.

## v0.3.8 - 2025-09-24
### Scripts
- Removed npm release helper scripts (`release:*`) and the `bump-sw:push` shortcut in favor of running `npm run bump-sw` with explicit flags when needed.
- Retired the `build:prod` alias; `npm run predeploy` now performs asset optimization (`optimize-images`) followed by the build step directly.
- Consolidated development commands: `npm run dev` now handles nodemon-based hot reload, so the redundant `start:dev` and `dev:server` scripts were removed.
- `npm run test` now runs the package-scripts suite alongside the other Node tests to keep script regressions visible in CI.
- Updated documentation and CI configuration to reference the streamlined `predeploy` workflow.

### Testing: Client E2E suite, offline, and no-console-errors
- Added robust end-to-end (E2E) browser tests using Playwright:
	- `drawer-balance.spec.js`: verifies drawer math and asserts no console/page errors.
	- `seeding-offline.spec.js`: seeds recent days with balanced entries, restores a past day, asserts summary itemization for slips/checks, verifies near-zero balance, and validates basic offline behavior via the service worker.
- Introduced `tests/e2e/config.js` to parameterize seeding (override with `SEED_COUNT` and `INCLUDE_TODAY` env vars).
- Hardened test helpers to avoid flakiness (programmatic panel startup, shadow DOM-safe reads, onboarding suppression, and SW-ready waits).

### Developer Experience
- Improved development seeding to be deterministic and consistently produce near‑zero balances for test data.
- Ensured E2E test artifacts are ignored by VCS and easy to clean:
	- `.gitignore`: `playwright-report/`, `test-results/`, `coverage/`, `*.log`.
	- Scripts: `clean:e2e` removes Playwright artifacts, `clean:all` removes both `dist/` and E2E artifacts.
- Documentation updates:
	- Root `README.md`: how to run E2E tests, configure seeds, and clean artifacts.
	- `docs/testing/README.md`: E2E section and link to `tests/e2e/README.md`.

No user-facing UI changes in this release; this is a test and DX-focused update.

## v0.3.7 - 2025-09-24
### Assets & UI
- Updated the base background image URI to point to the new optimized asset location for improved load performance and reliability.

## v0.3.6 - 2025-09-23
#### CI/CD & Deployment
- Fix: There was a duplicate workflow content starting at line 53. This change replaces the old one entirely, not appends to it.
## v0.3.5 - 2025-09-23
### CI/CD & Deployment
- Fix: GitHub Pages was serving the repository docs instead of the built site.
	- Added an official Pages workflow that builds the app and deploys the `dist/` folder using `actions/upload-pages-artifact` and `actions/deploy-pages`.
	- Pages settings should now use: Settings → Pages → Source: GitHub Actions.
	- Deploys are triggered on pushes to `main`; no deploys on PRs.

### Build
- Improve GitHub Pages base path handling when using a custom domain.
	- `scripts/build.js` now detects a `CNAME` file and forces `baseUrl` to `/`, avoiding unnecessary path rewrites for assets/manifest.
	- Prevents incorrect `/repo-name/` prefixes when deploying to a custom domain, ensuring icons, manifest, and service worker paths resolve correctly.
- Outcome: Visiting the production URL now serves the built PWA from `dist/` (not the docs), with correct paths for assets and installability.

## v0.3.4 - 2025-09-23
### CI/CD & Deployment
- Prevent PR-triggered deploys to GitHub Pages.
	- Removed `pull_request` trigger from `deploy.yml` so PRs never enter the Pages pipeline.
	- Added job-level branch guards so `build` and `deploy` only run when `github.ref` is `refs/heads/main` (also guards manual `workflow_dispatch` on non-main refs).
	- Kept artifact upload and `deploy-pages` steps gated to `push` on `main` for defense in depth.
- Outcome: PRs run build/test only; production deploys occur only on pushes to `main`, avoiding environment protection rejections on `development`.

No application code changes in this patch.

## v0.3.3 - 2025-09-23
### CI/CD & Deployment
- Adjusted GitHub Pages workflow to deploy only on pushes to `main`.
	- PRs targeting `main` and `development` still build, but skip the deploy step to avoid PR failures.
	- Upload of the Pages artifact is also gated to `push` on `main`.
	- Keeps production build aligned with local/Render: `npm run build:prod` producing `dist/`.

### Tests
- Simplified the Tests workflow to a single `npm test` job across Node 18/20/22.
	- Removed fragile per-category ESM invocations that were failing in CI.
	- CI now mirrors the local test runner behavior that passes consistently.

### Package Scripts
- Added missing script aliases referenced by CI and docs:
	- `test:build`, `test:bump`, `test:icons`, `test:images`, `test:server`, `test:scripts`.
	- These complement the consolidated `npm test` flow used by CI.

Developer note: If you want preview deployments for PRs in the future, we can add a separate preview job or environment without affecting `main`.

## v0.3.2 - 2025-09-23
### Developer Tooling & Code Quality
- Introduced ESLint v9 with a flat config (`eslint.config.cjs`) tailored per area:
	- `src/**`: Browser + ESM
	- `scripts/**` and `server.js`: Node + CommonJS
	- `tests/**`: ESM-friendly defaults
- Standardized an underscore convention for intentionally unused identifiers (variables, parameters, caught errors, and destructured placeholders) to keep the code expressive while avoiding noise.
- Added lint scripts:
	- `npm run lint:js` (ESLint)
	- `npm run lint:md` (markdownlint)
	- `npm run lint` (runs both)
- Reduced linter warnings from hundreds to zero via small, safe code cleanups (removing unused imports/vars, prefixing intentional unused values, and minor destructuring tweaks). No behavioral changes were introduced.
- Added a dedicated documentation page: `docs/testing/linting.md`, covering how linting works in this repo, how to run it, and our underscore naming convention.

### Build & Release
- Aligned `src/offline.html` script paths and version query with `index.html` (`./main.js?v=X.Y.Z` and `./sw-register.js`) so the release script can update cache-busting consistently across both pages.
- `scripts/bump-sw-cache.js` dry runs now correctly preview updates for both `index.html` and `offline.html` in this configuration.

### Miscellaneous Refinements
- Server list response now discards `clientId` via safe destructuring before returning items.
- Minor render/destructuring cleanups in components (e.g., `network-status`, `help-modal`, `count-panel`, confirmation modals) to satisfy lint rules without changing behavior.

Docs: See the new linting guide at `docs/testing/linting.md` and updated links in `docs/README.md`.

## v0.3.1 - 2025-09-23
### Documentation & Infrastructure
- **Enhanced README documentation**: Added comprehensive feature descriptions, detailed usage instructions, and improved project documentation for better user onboarding.
- **Added ISC License**: Included proper open source licensing to clarify usage terms and permissions.
- **GitHub Actions deployment**: Implemented automated deployment workflow for GitHub Pages to streamline release process and ensure consistent deployments.

### Bugfixes
- **Fixed service worker cache bump script**: Corrected file paths for service worker and HTML files in the version bump script, ensuring proper cache invalidation during releases.

## v0.3.0 - 2025-09-23
### Major Features
- **Always-enabled Enter key functionality**: Removed mobile-only preference setting for Enter key behavior. The Enter key now always automatically adds new slips/checks and focuses the new input field across all devices, providing consistent keyboard navigation without requiring users to toggle settings.
- **Enhanced profile management system**: Completely overhauled profile creation and deletion with robust modal handling, proper Promise resolution, and conflict-free event management for reliable multi-profile workflows.

### User Experience Improvements  
- **Centered initial welcome message**: The app's initial guidance message now appears vertically centered on screen instead of at the top, creating a more balanced and welcoming first impression for new users.
- **Streamlined settings interface**: Removed the mobile preference section from settings modal, simplifying the user interface and eliminating confusion about platform-specific behaviors.
- **Improved count panel state management**: Enhanced the logic for displaying save/cancel buttons, completed summaries, and panel collapse states with better handling of past dates, unsaved changes, and read-only modes.

### Technical Enhancements
- **Robust modal event handling**: Fixed critical modal close event conflicts that prevented proper Promise resolution in profile creation/deletion workflows. Modals now properly distinguish between user-initiated closes (escape/X button) and programmatic closes (form submission).
- **Enhanced auto-save and restore functionality**: Improved persistence across components with better state synchronization, automatic data recovery, and more reliable profile switching.
- **Better read-only state handling**: Refined logic for completed and reopened items across all dates with improved edit mode detection and appropriate UI feedback.

### UI/UX Polish
- **Enhanced theme contrast and readability**: Improved color schemes in both light and dark themes with better contrast ratios, more prominent start buttons, and refined empty state messaging for better accessibility.
- **Improved button functionality**: Added clear and optional field buttons with proper functionality, better disabled states, and enhanced visual feedback during user interactions.
- **Better modal backdrop effects**: Enhanced backdrop blur effects and improved light theme contrast for more polished modal presentations.

### Component Architecture Improvements
- **Count panel state refactoring**: Completely rewrote state management logic to handle complex scenarios including past date editing, completion states, unsaved changes, and panel visibility with proper error handling and edge case coverage.
- **Modal system standardization**: Standardized all profile-related modals to use consistent event handling patterns, Promise resolution strategies, and accessibility features.
- **Enhanced drawer count component**: Improved keyboard navigation, input validation, and state persistence with better integration into the overall count panel workflow.

### Bugfixes
- **Fixed profile creation conflicts**: Resolved issues where multiple event handlers would conflict during profile creation, causing Promise resolution failures and inconsistent UI states.
- **Fixed profile deletion reliability**: Eliminated race conditions in profile deletion modal that prevented proper confirmation handling and could leave the UI in inconsistent states.
- **Fixed unlock functionality after saving**: Resolved critical bug where the unlock button would not work on today's count after marking it complete. The unlock modal now properly appears and allows editing of completed counts on any date, including today.
- **Improved panel visibility logic**: Fixed edge cases where count panels would show incorrect states when switching between dates, profiles, or completion modes.
- **Enhanced lock button behavior**: Corrected lock button visibility and icon states based on edit modes for past days with proper read-only state enforcement.
- **Better empty state handling**: Fixed scenarios where empty count panels would display incorrectly or fail to show appropriate guidance messages to users.

### Development Experience
- **Cleaner debugging workflow**: Implemented comprehensive console logging during development and proper cleanup for production builds without debug noise.
- **Better event binding**: Improved event listener management with proper cleanup, prevention of memory leaks, and more reliable component lifecycle handling.
- **Enhanced error handling**: Added robust error boundaries and graceful degradation for edge cases in profile management and count panel operations.

### Performance Optimizations
- **Reduced DOM manipulation**: Optimized count panel rendering to minimize unnecessary updates and improve responsiveness during state changes.
- **Better event listener management**: Implemented more efficient event binding patterns with proper cleanup to prevent memory leaks during component lifecycle operations.
- **Improved state synchronization**: Enhanced data flow between components to reduce redundant operations and improve overall application responsiveness.

This release represents a significant maturation of the drawer counting application with major improvements to reliability, user experience, and technical architecture. The removal of mobile-specific preferences and enhancement of profile management make the app more intuitive and dependable for daily use across all devices.

## v0.2.26 - 2025-09-22
### Mobile Experience Enhancements
- **Improved mobile scrolling**: Enhanced drawer-count component with proper scrolling behavior on mobile devices to prevent content from being cut off on smaller screens.
- **Better viewport handling**: Added mobile-specific CSS optimizations including landscape mode support, proper touch targets, and improved container sizing.
- **Responsive animations**: All animations now respect mobile viewport constraints and reduced motion preferences for better accessibility.

### UI/UX Improvements
- **Hidden empty card state**: The card container now completely disappears when empty, eliminating the unpleasant blank card with blurred background. A helpful hint message guides users to start counting via the header menu.
- **Smooth expand/collapse animations**: Completely redesigned panel animations with Material Design-inspired easing curves, opacity transitions, and subtle transform effects for a more polished experience.
- **Intuitive toggle button**: Replaced confusing rotating + symbol with clear directional arrows (▼ for expand, ▲ for collapse) that indicate the action direction.

### Animation System Overhaul
- **Enhanced timing and easing**: Upgraded from simple linear transitions to sophisticated cubic-bezier curves (320ms) with coordinated height, opacity, and transform animations.
- **Fixed animation conflicts**: Resolved issues where panels would open then immediately close by properly managing animation states and preventing race conditions.
- **Better performance**: Added `will-change` optimizations and proper cleanup of animation event listeners for smoother performance.

### Accessibility Improvements
- **Reduced motion support**: All animations respect `prefers-reduced-motion` settings, providing simpler transitions for users with vestibular disorders.
- **Enhanced touch targets**: Improved button sizing and spacing for better mobile accessibility with 44px minimum touch targets.
- **Screen reader compatibility**: Maintained proper ARIA states and labels throughout all animation and visibility changes.

### Technical Implementation
- Refactored count-panel animation logic from compressed single-line functions to readable, maintainable methods with proper error handling.
- Added mobile-first responsive design with breakpoints at 640px, 480px, and 360px for comprehensive device coverage.
- Implemented CSS `:has()` selector with JavaScript fallback for broad browser compatibility in empty state management.
- Enhanced mobile stepper integration to work seamlessly with new scrolling and animation systems.
- Added smooth card appearance animations when transitioning from empty to active states.

## v0.2.25 - 2025-09-22
### Bugfixes
- **Fixed service worker OPEN_APP message handling**: Resolved issue where service worker would fail to send proper response messages when handling app open requests from web app manifests or external triggers. Improved message handling by removing problematic `waitUntil` usage for response messages and adding proper error handling with immediate response delivery.
- **Updated sitemap domain**: Changed sitemap URL from placeholder `your-domain.example.com` to the actual production domain `drawercounter.journeytocode.io` for proper SEO indexing.

### Technical Implementation
- Modified service worker OPEN_APP message handler to send responses immediately without using `event.waitUntil()` which was causing message delivery issues.
- Added proper error handling and response states (`OPEN_APP_DONE`, `OPEN_APP_ERROR`) for better debugging and user feedback.
- Enhanced client focus logic to check for closed message ports before attempting to send responses.
- Updated sitemap.xml to reference the correct production domain for search engine optimization.

## v0.2.24 - 2025-09-22
### UX Improvements
- **Enhanced date picker behavior**: Day picker modal now intelligently defaults to today's date when it has saved data, providing more intuitive navigation and selection.
- **Fresh app load improvements**: Application now consistently defaults to today's date on fresh loads instead of potentially showing random or cached dates.

### Bugfixes
- **Fixed modal click-outside behavior**: Resolved issue where clicking outside modal windows (date picker, help, onboarding, etc.) would not close them. All modals now properly close when clicking on the backdrop area outside the dialog, improving user experience and interaction consistency.
- **Fixed sitemap URL**: Updated robots.txt to reference the correct domain for sitemap accessibility.

### Code Cleanup
- **Removed legacy component**: Cleaned up duplicate drawer-count component file that was no longer in use, reducing bundle size and potential confusion.

### Technical Implementation
- Updated `app-modal` component to handle click events on the container element instead of the backdrop element, which was being obscured by the overlaid container.
- Added smart click detection that only closes modals when clicking directly outside the dialog content, preserving existing functionality for clicks within modal dialogs.
- Enhanced day picker selection logic to prioritize today's date when saved data exists.
- Added initialization logic to reset active view date to today on fresh application loads.
- Maintained all existing modal behaviors including Escape key dismissal, close button functionality, and proper focus management.

## v0.2.24 - 2025-09-22
### Documentation
- **Fixed changelog version history**: Corrected version attribution where v0.2.21 stepper completion features were incorrectly documented under v0.2.22, and properly separated bugfixes into their respective versions.

## v0.2.23 - 2025-09-22
### Bugfixes
- **Fixed modal accessibility violation**: Resolved `aria-hidden` attribute conflict that occurred when modals contained focused elements, eliminating browser accessibility warnings and improving screen reader compatibility.
- **Enhanced modal focus management**: Modal dialogs now properly remove `aria-hidden` attributes when open and set focus order correctly to prevent assistive technology conflicts.

## v0.2.22 - 2025-09-22
### Bugfixes
- **Fixed calendar date selection**: Calendar modal now properly returns selected dates instead of null, resolving issue where clicking calendar dates wouldn't change the active view.
- **Fixed seeding balance calculations**: Developer seed functions now generate perfectly balanced test data (balance = $0.00) using the correct mathematical formula.

## v0.2.21 - 2025-09-22
### Auto-Completion on Stepper Navigation Finish
- **Stepper completion workflow**: When using mobile stepper navigation, completing the final step (pressing "Done" or Enter on the last field) now automatically marks the drawer count as complete.
- **Seamless UX**: Users no longer need to manually tap "Mark complete" after finishing the stepper procedure - the completion happens automatically.
- **Smart completion logic**: Auto-completion only triggers when appropriate (drawer count started, not already completed, and not in read-only mode).
- **Existing workflows preserved**: Manual completion via "Mark complete" button continues to work as before.

### Technical Implementation
- Added `stepper-complete` event dispatch from drawer-count component when reaching end of stepper navigation.
- Enhanced count-panel component to listen for stepper completion events and trigger existing completion logic.
- Maintained all existing safeguards and state management for consistent behavior.

## v0.2.20 - 2025-09-22
### Mobile UX: Enhanced Stepper Navigation & Per-Profile Preferences
- **Fixed mobile stepper navigation**: Next/Prev buttons now reliably advance past entire slip/check groups instead of getting stuck on individual dynamic rows.
- **Enter key improvements**: On mobile, pressing Enter now triggers the Next button (Shift+Enter for Previous) instead of requiring manual taps.
- **Light theme stepper colors**: Mobile stepper bar and buttons now properly inherit theme variables for consistent appearance in both light and dark modes.
- **Per-profile preferences**: Added a new mobile-only setting "Mobile: Enter adds slip/check row" in Settings → Preferences.
  - When enabled, Enter on base Credit Cards/Checks with a value quickly adds a new row (legacy behavior).
  - When disabled (default), Enter always navigates to the next field for streamlined data entry.
  - Setting is stored per profile and updates live without reload.
- **Better keyboard navigation**: Arrow Up/Down also trigger stepper navigation; final field blurs to dismiss mobile keyboard.

### Technical Improvements
- Enhanced step computation logic to scan and skip over entire slip/check groups during navigation.
- Added global event system for preference changes with proper cleanup on component disconnect.
- Mobile-only UI elements are now properly hidden on desktop (≥641px) via responsive CSS.
- Improved mobile key event handling to use only `keydown` and avoid duplicate triggers on some browsers.

## v0.2.19 - 2025-09-22
### UI/Accessibility: Standardized, Scrollable Modals
- Introduced a reusable modal component `app-modal` with a scrollable body and sticky header/footer for consistent behavior across screens, especially mobile.
- Standardized all modals to use it: Optional Fields, Unlock Confirm, Revert Confirm, Help, Settings, Delete Profile, Day Picker, and New Profile.
- Features: background scroll lock while open, Escape/backdrop to close (when appropriate), focus trapping including slotted content, and ARIA-compliant dialog semantics.
- Day Picker maintains full keyboard navigation and saved/today indicators; selecting a saved day confirms immediately.

### Dev note
- Consider running `npm run bump-sw` before deploy so clients pick up the latest modal scripts/styles via an SW cache bump.

## v0.2.17 - 2025-09-22
### Mobile UX: Single-field Stepper (small screens)
- On viewports ≤ 640px, the drawer count now shows one field at a time with sticky Back/Next controls and a clear "X of Y" step indicator.
- Stepper activates by width (no touch requirement) so it works in desktop device emulation and on phones.
- Enter advances to the next field; Shift+Enter moves to the previous. Pressing Enter in the base Credit Cards or Checks field with a value quickly adds another row.
- The first field is guaranteed visible immediately via a CSS fallback (even before JS initializes), and step activation focuses, selects, and scrolls the active input into view.

### Bugfixes & Stability
- Fixed a NaN total issue by summing only numeric spans inside the main component (ignoring UI spans like the step indicator).
- Scoped the currency prefix (`$`) to value spans inside the content so non-value text (e.g., the step indicator) doesn’t get prefixed.
- Hardened mobile key handling by binding `keydown`/`keypress`/`keyup` for Enter navigation and re-binding after dynamic add/remove of slip/check rows.
- Removed an invalid reference in dynamic label renumbering and added the missing helper methods (`_onInputEvent`, `_getMultiplier`, `_focusInputIn`, `_focusAfterRemoval`) to stabilize event flows.
- Desktop behavior and styling remain unchanged (Tab to move; Enter on base slip/check adds a row).

### Dev note
- This is a PWA; if you don’t see the new stepper immediately, perform a hard refresh (Ctrl+F5) or temporarily bypass/unregister the service worker. Before deploy, consider `npm run bump-sw` so clients fetch the latest assets.

## v0.2.16 - 2025-09-22
### Bugfix/UX: Optional Fields button opens working modal
- Restored the original behavior for the Optional Fields (🧾) button: it now reliably opens a modal where you edit optional daily values directly.
- The modal pre-fills current values from the drawer and, on Apply, writes them back to the inline optional inputs inside `drawer-count`, dispatching `input` events so autosave/status logic runs.
- Accessor `getOptionalFieldsModal()` is available as a module export and on `window` for robust use from shadow DOM and legacy code paths; the button falls back to a lazy import if needed.

### Cleanup: Remove legacy modal duplicate
- Removed the unused `src/components/optional-fields-modal-legacy.js` (functionality fully replaced by `optional-fields-modal.js`).
	- Note: If the file persists locally due to tooling, it’s neutered to avoid duplicate customElements registrations.

### Dev note
- No data shape changes; optional values remain informative and do not affect totals/balance. No service worker bump required beyond normal releases.

## v0.2.15 - 2025-09-22
### Bugfix: Respect lock for Clear action
- The "Clear inputs" button now correctly does nothing when the drawer/day is locked (read-only). A small warning toast is shown instead.
- The clear button is disabled whenever read-only mode is active, matching other mutating controls.

### Cleanup: Consolidate DrawerCount source
- Removed legacy duplicate `src/drawer-count.js`; all logic now lives in `src/components/drawer-count.js`.
- Removed a redundant direct `<script>` include for the component in `index.html`; the component is imported via `main.js` and `count-panel`.

### Deploy note
- If the PWA still loads an older HTML/script, hard refresh (Ctrl+F5) or run `npm run bump-sw` before deploy to ensure clients fetch the latest assets.

## v0.2.14 - 2025-09-22
### Theme & UI Consistency
- Fixed light-mode Calendar: previous/past days no longer render with a blue background; day cells now use input theme variables for a neutral look in light mode and stay correct in dark mode.
- Standardized all surfaces to shared theme variables: `--card` (surface), `--fg` (foreground), and `--border` (stroke). Removed legacy `--panel-*` usages across components.
- Adopted a frosted-glass UI: translucent `--card` backgrounds with `backdrop-filter: blur(6px)` applied to dialogs, menus, onboarding, and toast notifications for a consistent feel.
- Tuned light theme contrast by slightly increasing the light `--card` alpha for readability.

### Overlays & Backdrops
- Introduced theme-aware backdrop variables: `--backdrop-bg` and `--backdrop-weak-bg`, replacing hard-coded rgba overlays in modals, header menus, and onboarding.

### Components touched (high level)
- Day Picker Modal, Settings Modal, New Profile, Optional Fields, Delete Profile, Unlock Confirm, Revert Confirm, Help Modal, App Header menu, Onboarding Tour, and Toasts.

### Developer notes
- If clients don’t immediately pick up the new styles, perform a hard refresh or bump the service worker cache before deploy.

## v0.2.13 - 2025-09-22
### UX / PWA: Onboarding-aware Install Banner
- Install banner now stays hidden while the onboarding tour is open (respects `html[data-tour-open]`).
- Suppresses the “You can install this app” toast during the tour to avoid noise.
- After the tour closes, the banner waits ~800ms before appearing to prevent abrupt UI changes.
- Implementation details:
	- `src/components/app-install-banner.js` observes `data-tour-open` via a `MutationObserver` and hides/shows accordingly.
	- `_onBeforeInstallPrompt` still stores the deferred prompt, but only shows UI/toast when onboarding isn’t open.
	- Observer is disconnected in `disconnectedCallback` to avoid leaks.

## v0.2.12 - 2025-09-22
### Bugfix: Stable Profile on Refresh
- Prevent active profile from changing on page refresh.
- Changed `initProfilesFromRemoteIfAvailable()` in `src/lib/sync.js` to only seed/overwrite local profiles when:
	- local profiles are missing/empty, or
	- the remote copy is newer than the local copy (based on stored `updatedAt` meta).
- This avoids clobbering `localStorage['drawer-profiles-v1']` (including `activeId`) on every load, which previously caused non-default profiles to “cycle.”

### Notes
- Remote still syncs in the background; newer remote data will update local, but local selections persist if local is current/newer.
- If you don’t see the fix immediately in production, hard refresh or bump the service worker cache.

## v0.2.11 - 2025-09-22
### Refactor
- Moved `DrawerCount` component from `src/drawer-count.js` to `src/components/drawer-count.js` to align with the modular components layout.
- Updated imports:
	- `src/main.js` now imports `./components/drawer-count.js`.
	- `src/components/count-panel.js` imports `./drawer-count.js` (relative within the components folder).

### PWA
- Updated `sw.js` precache list to reference `src/components/drawer-count.js` instead of `src/drawer-count.js`.
	- Note: Remember to bump the service worker cache version before deploy so clients fetch the new asset path.

### HTML
- Updated script tags in `index.html` and `offline.html` to load `./src/components/drawer-count.js`.

### Docs
- README updated to reflect the new component path (`src/components/drawer-count.js`).

## v0.2.10 - 2025-09-22
### Build/Dev Tooling
- Enhanced `scripts/bump-sw-cache.js`:
	- Updates versions across `sw.js` (`CACHE_VERSION`), `index.html` and `offline.html` (`?v=X.Y.Z`), `package.json` (`version`), and `package-lock.json` (both top-level `version` and `packages[""]?.version`).
	- Supports bump types: `--major`, `--minor`, and `--patch` (default), plus explicit `--set X.Y.Z`.
	- Git operations enabled by default: creates a release commit and annotated tag (e.g., `vX.Y.Z`) with message `chore(release): bump to vX.Y.Z`.
	- Opt-outs and extras: `--no-commit` (tag-only), `--no-git` (skip all git ops), `--push` (push tags and commit if created), and `--force-tag` (overwrite existing tag).
	- Dry run preview: `--dry` prints what would change without modifying files or git state.

### Scripts
- Added release convenience scripts in `package.json`:
	- `release:patch` → Patch bump, commit + tag.
	- `release:minor` → Minor bump, commit + tag.
	- `release:major` → Major bump, commit + tag.
	- `release:patch:push` → Patch bump, commit + tag, then push.
	- `release:tag-only` → Tag-only (no commit).

## v0.2.9 - 2025-09-21
### SEO & Social Sharing
- Added canonical URL, author, `robots`, and `color-scheme` meta to `index.html`.
- Added Open Graph and Twitter Card tags for rich previews.
- Added JSON-LD (`WebApplication`) structured data to improve search visibility.
- Created `robots.txt` and `sitemap.xml` (root) and wired them for production; offline page excluded from sitemap.
- Marked `offline.html` as `noindex` and gave it an explicit canonical URL.

### Server
- Serve `robots.txt`, `sitemap.xml`, and `manifest.webmanifest` with correct content types and caching.
- Added lightweight security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Improved cache-control: long-lived for static assets; limited for XML/manifest; no-store for HTML/config.

### Docs
- README: new SEO section with instructions to replace `https://your-domain.example.com` in meta tags, sitemap, and robots.

## v0.2.8 - 2025-09-21
### Features: Per-Profile Theme Preference
- Theme preference is now stored per profile. Each profile can choose `System`, `Light`, or `Dark`.
- Switching profiles immediately applies that profile’s saved theme.
- Settings → Theme now reads and writes the active profile’s theme preference.
- New profiles inherit the currently effective theme mode for a seamless experience.

### Behavior & Migration Notes
- One-time migration moves the legacy global `localStorage['theme']` value into the active profile’s theme (if that profile didn’t already choose one), then removes the global key.
- On initial load, the app applies `System` without persisting so OS dark mode is respected until a profile preference is set.
- Theme toggle now flips the active profile’s theme preference rather than a global setting.

## v0.2.7 - 2025-09-21
### UI / Cleanup
- Removed the header status pill (saved/unsaved indicator) as it wasn’t providing meaningful value.
- Cleaned up related CSS and references in `src/components/app-header.js`.

## v0.2.6 - 2025-09-21
### UI / Accessibility
- Onboarding tour backdrop no longer blurs the page. This keeps the header and background crisp and readable during the tour.
- While the tour is open, the header menu’s backdrop blur is temporarily disabled for clarity; normal blur effects return after the tour closes.

### Developer Notes
- Introduced a document-level flag `html[data-tour-open]` that is set during the onboarding tour and removed on close. Components can use this to adjust visual effects when the tour is active.

## v0.2.5 - 2025-09-21
### Calendar Day Picker Restoration & UX
- Replaced the temporary dropdown with a full calendar modal for picking saved days.
- Month navigation clamped between earliest saved month and current month; future days disabled.
- Saved-day indicator (green dot) and Today outline, matching the original interaction.
- Keyboard support: Arrow keys move by day/week; Enter selects; roving tabindex and `aria-selected` on grid cells.
- Added "Jump to Today" button to quickly return and focus today.
- Removed the redundant "Load" button in the modal; clicking a saved day loads immediately. Clicking a non-saved day shows a warning toast and keeps the modal open.

## v0.2.4 - 2025-09-21
### Refactor: Modular Web Components
- Split monolithic `src/main.js` into dedicated modules under `src/components/` and `src/lib/`.
	- Components extracted: `app-header`, `count-panel`, `app-install-banner`, `network-status`, plus all modals (`help`, `settings`, `new-profile`, `delete-profile`, `unlock-confirm`, `revert-confirm`, `optional-fields`, `day-picker`).
	- Shared libs: `theme.js`, `toast.js`, `persistence.js`, `sync.js`, and new `days.js` (dev seeding helper).
- Converted `src/main.js` into a lean app shell that imports libs/components and handles a minimal onboarding overlay.
- Settings Modal now imports dev seeding from `src/lib/days.js` to avoid circular dependencies.
- Minor polish to tooltips, ARIA labels, and processing button states across components.

### Docs
- README updated: new project structure, clearer app-shell responsibilities, and corrected Quick Start.

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