/* Drawer Count - App Shell */

// Import shared libs (they register or export side effects as needed)
import './lib/theme.js';
import './lib/toast.js';
import './lib/persistence.js';
import './lib/sync.js';

// Import Web Components (each module registers its custom element)
import './components/help-modal.js';
import './components/settings-modal.js';
import './components/new-profile-modal.js';
import './components/delete-profile-modal.js';
import './components/unlock-confirm-modal.js';
import './components/revert-confirm-modal.js';
import './components/optional-fields-modal.js';
import './components/day-picker-modal.js';
import './components/app-install-banner.js';
import './components/network-status.js';
import './components/app-header.js';
import './components/count-panel.js';

// Keep drawer-count component available (used inside <count-panel>)
import './drawer-count.js';
// Onboarding walkthrough component
import './components/onboarding-tour.js';
import { getOnboardingTour } from './components/onboarding-tour.js';

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  try {
    const seenKey = 'onboarding-complete-v2';
    const seen = localStorage.getItem(seenKey) === '1';
    if (!seen) { getOnboardingTour().open(0); }
  } catch (_) {}
  // Ensure header/panel exist if HTML didn't include them
  try { const header = document.querySelector('app-header'); if (!header) { const el = document.createElement('app-header'); document.querySelector('#app')?.prepend(el); } } catch (_) {}
  try { const panel = document.querySelector('count-panel'); if (!panel) { const el = document.createElement('count-panel'); document.querySelector('#app')?.appendChild(el); } } catch (_) {}
});

