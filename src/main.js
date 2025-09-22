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

// Onboarding overlay (minimal)
function showOnboardingOverlay() {
  if (document.querySelector('.onboarding-overlay')) return;
  const style = document.createElement('style');
  style.textContent = `
  .onboarding-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); color: #fff; z-index: 1000; display: grid; place-items: center; }
  .onboarding-card { background: #1c2541; border: 1px solid #2a345a; border-radius: 12px; padding: 20px; max-width: 520px; margin: 16px; box-shadow: 0 20px 64px rgba(0,0,0,.5); }
  .onboarding-card h3 { margin-top: 0; }
  .onboarding-card .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
  .onboarding-card button { background: #243b55; color: #e0e6ff; border: 1px solid #2a345a; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
  `;
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.innerHTML = `
    <div class="onboarding-card" role="dialog" aria-modal="true" aria-label="Welcome">
      <h3>Welcome</h3>
      <p>This app works offline and lets you save daily drawer counts per profile.</p>
      <div class="actions">
        <button class="dismiss">Get started</button>
      </div>
    </div>
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);
  overlay.querySelector('.dismiss')?.addEventListener('click', () => removeOnboardingOverlay());
}

function removeOnboardingOverlay() {
  try { const el = document.querySelector('.onboarding-overlay'); el?.remove(); } catch (_) {}
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  try {
    const seenKey = 'onboarding-seen-v1';
    const seen = localStorage.getItem(seenKey) === '1';
    if (!seen) { showOnboardingOverlay(); localStorage.setItem(seenKey, '1'); }
  } catch (_) {}
  // Ensure header/panel exist if HTML didn't include them
  try { const header = document.querySelector('app-header'); if (!header) { const el = document.createElement('app-header'); document.querySelector('#app')?.prepend(el); } } catch (_) {}
  try { const panel = document.querySelector('count-panel'); if (!panel) { const el = document.createElement('count-panel'); document.querySelector('#app')?.appendChild(el); } } catch (_) {}
});

