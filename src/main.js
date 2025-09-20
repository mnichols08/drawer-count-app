/* Drawer Count - Web Components PWA shell */

// Web Component: <app-toaster> — simple toast notifications
class AppToaster extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._shadow.innerHTML = `
      <style>
        :host { position: fixed; inset: auto 1rem 1rem auto; z-index: 9999; pointer-events: none; }
        .stack { display: grid; gap: 8px; }
        .toast {
          pointer-events: auto;
          min-width: 220px; max-width: min(92vw, 420px);
          padding: 10px 12px; border-radius: 10px; border: 1px solid #2a345a;
          background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px;
          transform: translateY(8px); opacity: 0; transition: transform .15s ease, opacity .15s ease;
        }
        .toast.show { transform: translateY(0); opacity: 1; }
        .msg { font-size: 0.95rem; }
        .btnx, .act { background: transparent; color: inherit; border: 1px solid var(--border, #2a345a); cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .btnx { border: none; padding: 4px 6px; }
        .act:hover { filter: brightness(1.08); }
        .btnx:focus, .act:focus { outline: 2px solid var(--accent, #3a86ff); outline-offset: 2px; }
        .info { }
        .success { border-color: #2a5a3a; box-shadow: 0 10px 30px rgba(20,80,40,0.45); }
        .warning { border-color: #5a4a2a; box-shadow: 0 10px 30px rgba(80,60,20,0.45); }
        .error { border-color: #5a2a2a; box-shadow: 0 10px 30px rgba(80,20,20,0.45); }
      </style>
      <div class="stack" role="region" aria-label="Notifications"></div>
    `;
    this._stack = this._shadow.querySelector('.stack');
  }
  show(message, opts = {}) {
    const { type = 'info', duration = 3000, action } = opts;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="msg">${message}</div>
      ${action && action.label ? '<button class="act" aria-label="Action"></button>' : ''}
      <button class="btnx" aria-label="Close">\u2715</button>
    `;
    const btnClose = toast.querySelector('.btnx');
    const btnAct = toast.querySelector('.act');
    const dispose = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 150);
    };
    btnClose.addEventListener('click', dispose);
    if (btnAct) {
      btnAct.textContent = action.label;
      btnAct.addEventListener('click', () => {
        try { action.onClick?.(); } catch (_) {}
        dispose();
      });
    }
    this._stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    if (duration > 0) setTimeout(dispose, duration);
    return { close: dispose };
  }
}
customElements.define('app-toaster', AppToaster);

function getToaster() {
  let t = document.querySelector('app-toaster');
  if (!t) {
    t = document.createElement('app-toaster');
    document.body.appendChild(t);
  }
  return t;
}
function toast(message, opts) { try { getToaster().show(message, opts); } catch (_) {} }

// Theme management
const THEME_KEY = 'theme';
function getPreferredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) {}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
  // Update header icon if present
  const btn = document.querySelector('app-header .theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? '🌙' : '☀️';
  // Update theme-color meta for consistent PWA UI
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0b132b' : '#f7f9ff');
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}
applyTheme(getPreferredTheme());

// Web Component: <help-modal> simple modal dialog
class HelpModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
  }
  connectedCallback() {
    const content = this.getAttribute('content') || '';
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 10% auto auto 50%; transform: translateX(-50%);
          max-width: min(640px, 92vw); background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 14px; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 8px; }
        .hd h2 { margin: 0; font-size: 1.2rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; cursor: pointer; }
        .content { font-size: .95rem; line-height: 1.5; color: var(--fg); }
        .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--kbd-bg, #0f1730); color: var(--kbd-fg, #e7ecff); border:1px solid var(--kbd-border, #2a345a); border-radius:6px; padding:2px 6px; font-weight: 600; }
        ul { margin: .25rem 0 .5rem 1.25rem; }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Help and shortcuts">
        <div class="hd">
          <h2>About & Shortcuts</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <div class="content">
          <p>Drawer Count helps quickly total cash drawers with slips, checks, and bill/coin counts. It works offline and can be installed as an app.</p>
          <p><strong>Keyboard Shortcuts</strong></p>
          <ul>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">S</span> &rarr; Add Slip</li>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">C</span> &rarr; Add Check</li>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">Backspace</span> &rarr; Remove last added row</li>
            <li><span class="kbd">Alt</span>+<span class="kbd">Backspace</span> (in a row) &rarr; Remove that row</li>
          </ul>
          <p><strong>Install</strong>: Use the browser’s install option or the banner when available. Once installed, it opens in its own window and works offline.</p>
        </div>
      </div>
    `;
    this._shadow.querySelector('.backdrop')?.addEventListener('click', () => this.close());
    this._shadow.querySelector('.close')?.addEventListener('click', () => this.close());
    window.addEventListener('keydown', this._onKeyDown);
  }
  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
  open() { this.setAttribute('open', ''); }
  close() { this.removeAttribute('open'); }
  _onKeyDown(e) { if (e.key === 'Escape') this.close(); }
}
customElements.define('help-modal', HelpModal);

// Ensure a single help modal exists in document
function getHelpModal() {
  let m = document.querySelector('help-modal');
  if (!m) { m = document.createElement('help-modal'); document.body.appendChild(m); }
  return m;
}

// Web Component: <app-header> with title, theme toggle, and help button
class AppHeader extends HTMLElement {
  constructor() {
    super();
    this._onTheme = this._onTheme.bind(this);
    this._onHelp = this._onHelp.bind(this);
    this._onSave = this._onSave.bind(this);
    this._onRestore = this._onRestore.bind(this);
    this._onClear = this._onClear.bind(this);
    this._onExport = this._onExport.bind(this);
    this._onImport = this._onImport.bind(this);
    this._onProfileChange = this._onProfileChange.bind(this);
    this._onNewProfile = this._onNewProfile.bind(this);
    this._onDeleteProfile = this._onDeleteProfile.bind(this);
  }
  connectedCallback() {
    const title = this.getAttribute('title') || 'Drawer Count';
    this.innerHTML = `
      <style>
        :host { display: block; width: 100%; }
        .bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: .35rem; }
        .title { grid-column: 2; text-align: center; margin: 0; font-size: 1.1rem; letter-spacing: .2px; }
        .left { grid-column: 1; justify-self: start; display: inline-flex; gap: .35rem; align-items: center; }
        .right { grid-column: 3; justify-self: end; display: inline-flex; gap: .35rem; }
        .icon-btn, .action-btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        .action-btn { font-weight: 600; }
        select.profile-select { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; }
        .status-pill { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border, #2a345a); font-size: .85rem; }
        .status-pill.saved { background: #12371f; color: #baf0c3; border-color: #2a5a3a; }
        .status-pill.dirty { background: #42201e; color: #ffd6d6; border-color: #5a2a2a; }
      </style>
      <div class="bar" role="toolbar" aria-label="App header">
        <div class="left">
          <label for="profile" class="sr-only">Profile</label>
          <select class="profile-select" name="profile" aria-label="Select profile"></select>
          <button class="icon-btn new-profile-btn" aria-label="New profile" title="New profile">＋</button>
          <button class="icon-btn delete-profile-btn" aria-label="Delete profile" title="Delete profile">🗑️</button>
          <span class="status-pill" aria-live="polite">—</span>
        </div>
        <h1 class="title">${title}</h1>
        <div class="actions right">
          <button class="icon-btn theme-toggle" aria-label="Toggle theme" title="Toggle theme">${(document.documentElement.getAttribute('data-theme')||getPreferredTheme())==='dark'?'🌙':'☀️'}</button>
          <button class="icon-btn info-btn" aria-label="Help" title="Help">?</button>
          <button class="action-btn save-btn" aria-label="Save drawer" title="Save drawer">Save</button>
          <button class="action-btn restore-btn" aria-label="Restore drawer" title="Restore drawer">Restore</button>
          <button class="action-btn clear-btn" aria-label="Clear drawer" title="Clear drawer">Clear</button>
          <button class="action-btn export-btn" aria-label="Export profiles" title="Export profiles">Export</button>
          <button class="action-btn import-btn" aria-label="Import profiles" title="Import profiles">Import</button>
        </div>
      </div>`;
    this.querySelector('.theme-toggle')?.addEventListener('click', this._onTheme);
    this.querySelector('.info-btn')?.addEventListener('click', this._onHelp);
    this.querySelector('.save-btn')?.addEventListener('click', this._onSave);
    this.querySelector('.restore-btn')?.addEventListener('click', this._onRestore);
    this.querySelector('.clear-btn')?.addEventListener('click', this._onClear);
    this.querySelector('.export-btn')?.addEventListener('click', this._onExport);
    this.querySelector('.import-btn')?.addEventListener('click', this._onImport);
    this.querySelector('.profile-select')?.addEventListener('change', this._onProfileChange);
    this.querySelector('.new-profile-btn')?.addEventListener('click', this._onNewProfile);
    this.querySelector('.delete-profile-btn')?.addEventListener('click', this._onDeleteProfile);

    // Initialize profiles UI
    try { ensureProfilesInitialized(); populateProfilesSelect(this); updateStatusPill(this); } catch(_) {}
  }
  _onTheme() { toggleTheme(); }
  _onHelp() { getHelpModal().open(); }
  _onSave() { try { saveToActiveProfile(); updateStatusPill(this); toast('Profile saved', { type: 'success', duration: 2000 }); } catch (_) {} }
  _onRestore() { try { const ok = restoreActiveProfile(); updateStatusPill(this); toast(ok? 'Profile restored':'No saved state for profile', { type: ok?'success':'warning', duration: 2200 }); } catch (_) { toast('Restore failed', { type: 'error', duration: 2500 }); } }
  _onClear() { try { const comp = getDrawerComponent(); comp?.reset?.(); updateStatusPill(this); toast('Cleared', { type: 'info', duration: 1500 }); } catch(_){} }
  _onExport() { try { exportProfilesToFile(); } catch(_) { toast('Export failed', { type: 'error', duration: 2500 }); } }
  _onImport() { try { openImportDialog(this); } catch(_) { toast('Import failed to start', { type: 'error', duration: 2500 }); } }
  _onProfileChange(e) { try { const id = e.target?.value; if (!id) return; setActiveProfile(id); restoreActiveProfile(); populateProfilesSelect(this); updateStatusPill(this); toast('Switched profile', { type:'info', duration: 1200}); } catch(_){} }
  _onNewProfile() { try { const name = prompt('New profile name?'); if (!name) return; const id = createProfile(name); setActiveProfile(id); saveToActiveProfile(); populateProfilesSelect(this); updateStatusPill(this); toast('Profile created', { type: 'success', duration: 1800 }); } catch(_){} }
  _onDeleteProfile() { try { const data = loadProfilesData(); const ids = Object.keys(data.profiles||{}); if (ids.length<=1) { toast('Cannot delete last profile', { type:'warning', duration: 2200}); return; } const active = data.activeId; const name = data.profiles[active]?.name || active; if (!confirm(`Delete profile "${name}"?`)) return; delete data.profiles[active]; const nextId = ids.find((x)=>x!==active) || 'default'; data.activeId = nextId; saveProfilesData(data); restoreActiveProfile(); populateProfilesSelect(this); updateStatusPill(this); toast('Profile deleted', { type:'success', duration: 1800}); } catch(_){} }
}
customElements.define('app-header', AppHeader);

// Web Component: <app-install-banner> — top banner offering Install or Open in App
class AppInstallBanner extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onInstallClick = this._onInstallClick.bind(this);
    this._onOpenClick = this._onOpenClick.bind(this);
    this._onBeforeInstallPrompt = this._onBeforeInstallPrompt.bind(this);
    this._onAppInstalled = this._onAppInstalled.bind(this);
    this._onSwMessage = this._onSwMessage.bind(this);
    this._onDismiss = this._onDismiss.bind(this);
    this._update = this._update.bind(this);
    this._tryCloseTab = this._tryCloseTab.bind(this);
    this._deferredPrompt = null;
    this._installed = false;
  this._dismissed = false;
    this._autoHideTimer = null;
  }

  connectedCallback() {
    this._shadow.innerHTML = `
      <style>
        :host { position: sticky; top: 0; z-index: 20; display: block; }
        .wrap { display: none; background: var(--banner-bg, #152041); border-bottom: 1px solid var(--banner-border, #2a345a); padding: 10px 12px; }
        .inner { max-width: 980px; margin: 0 auto; display: flex; gap: 10px; align-items: center; justify-content: space-between; }
        .msg { color: var(--banner-fg, #e0e6ff); }
        .actions { display: flex; gap: 8px; }
        .primary { background: var(--banner-primary-bg, #3a86ff); color: var(--banner-primary-fg, #0b132b); border: 1px solid var(--banner-border, #2a345a); border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 600; }
        .dismiss { background: transparent; color: var(--muted, #9aa3b2); border: none; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
        .primary:focus, .dismiss:focus { outline: 2px solid var(--accent, #3a86ff); outline-offset: 2px; }
      </style>
      <div class="wrap" role="region" aria-label="App install banner">
        <div class="inner">
          <div class="msg"></div>
          <div class="actions">
            <button class="primary"></button>
            <button class="dismiss" aria-label="Dismiss">✕</button>
          </div>
        </div>
      </div>
    `;
    this._el = {
      wrap: this._shadow.querySelector('.wrap'),
      msg: this._shadow.querySelector('.msg'),
      primary: this._shadow.querySelector('.primary'),
      dismiss: this._shadow.querySelector('.dismiss'),
    };
    this._el.primary.addEventListener('click', () => {
      if (this._installed) this._onOpenClick(); else this._onInstallClick();
    });
  this._el.dismiss.addEventListener('click', this._onDismiss);

    window.addEventListener('beforeinstallprompt', this._onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this._onAppInstalled);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this._onSwMessage);
    }

  // Initial state
    this._installed = this._isAppInstalled();
    // Persist if currently in standalone
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      try { localStorage.setItem('pwa-installed', '1'); } catch (_) {}
      this._installed = true;
    }
    if (window.matchMedia) {
      const mm = window.matchMedia('(display-mode: standalone)');
      mm?.addEventListener?.('change', (e) => { if (e.matches) { try { localStorage.setItem('pwa-installed','1'); } catch(_) {} this._installed = true; this._update(); } });
    }
  // Restore dismissal from storage (persist across sessions for less noise)
  try { this._dismissed = localStorage.getItem('install-banner-dismissed') === '1'; } catch (_) {}
  this._update();
  }

  disconnectedCallback() {
    window.removeEventListener('beforeinstallprompt', this._onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this._onAppInstalled);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this._onSwMessage);
    }
    this._clearAutoHide();
  }

  _onBeforeInstallPrompt(e) {
    e.preventDefault();
    this._deferredPrompt = e;
    if (!this._installed && !this._isDismissed()) {
      this._showInstall();
      toast('You can install this app', { type: 'info', duration: 2500 });
    }
  }

  async _onInstallClick() {
    if (!this._deferredPrompt) return;
    try {
      this._deferredPrompt.prompt();
      const choice = await this._deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        try { localStorage.setItem('pwa-installed', '1'); } catch (_) {}
        this._installed = true;
        toast('Installed!', { type: 'success', duration: 3000 });
      }
    } catch (_) { /* ignore */ }
    this._deferredPrompt = null;
    this._update();
  }

  _onAppInstalled() {
    try { localStorage.setItem('pwa-installed', '1'); } catch (_) {}
    this._installed = true;
    this._update();
    toast('Installed!', { type: 'success', duration: 3000 });
  }

  _isAppInstalled() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    let persisted = false;
    try { persisted = localStorage.getItem('pwa-installed') === '1'; } catch (_) {}
    return isStandalone || persisted;
  }

  async _onOpenClick() {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({ type: 'OPEN_APP' });
      }
      const url = new URL('/', location.origin).toString();
      window.open(url, '_blank', 'noopener');
      toast('Opening in app…', { type: 'info', duration: 2000 });
      setTimeout(this._tryCloseTab, 120);
    } catch (_) { /* ignore */ }
  }

  _onSwMessage(event) {
    const data = event.data;
    if (!data) return;
    if (data.type === 'OPEN_APP_DONE') {
      this._tryCloseTab();
      toast('Opened in app. You can close this tab.', { type: 'success', duration: 3500 });
    }
  }

  _tryCloseTab() {
    try {
      window.close();
      window.open('', '_self');
      window.close();
    } catch (_) { /* ignored */ }
  }

  _update() {
    // Do not show inside standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone || this._isDismissed()) { this._el.wrap.style.display = 'none'; this._clearAutoHide(); return; }

    if (this._installed) {
      this._showOpen();
    } else if (this._deferredPrompt) {
      this._showInstall();
    } else {
      this._el.wrap.style.display = 'none';
      this._clearAutoHide();
    }
  }

  _showInstall() {
    this._el.msg.textContent = 'Install this app for a faster, offline experience.';
    this._el.primary.textContent = 'Install App';
    this._el.primary.setAttribute('aria-label', 'Install this app');
    this._el.wrap.style.display = 'block';
    this._scheduleAutoHide();
  }

  _showOpen() {
    this._el.msg.textContent = 'This app is installed.';
    this._el.primary.textContent = 'Open in App';
    this._el.primary.setAttribute('aria-label', 'Open in installed app');
    this._el.wrap.style.display = 'block';
    this._scheduleAutoHide();
  }

  _isDismissed() {
    return this._dismissed === true;
  }
  _onDismiss() {
    this._dismissed = true;
    this._el.wrap.style.display = 'none';
    this._clearAutoHide();
    try { localStorage.setItem('install-banner-dismissed', '1'); } catch (_) {}
  }

  _scheduleAutoHide() {
    this._clearAutoHide();
    this._autoHideTimer = setTimeout(() => {
      this._dismissed = true; // session-only
      this._el.wrap.style.display = 'none';
      this._clearAutoHide();
    }, 20000); // 20s
  }

  _clearAutoHide() {
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
  }
}
customElements.define('app-install-banner', AppInstallBanner);

// Web Component: <network-status> shows online/offline and updates document title
class NetworkStatus extends HTMLElement {
  constructor() {
    super();
    this._update = this._update.bind(this);
    this._onSwMessage = this._onSwMessage.bind(this);
    this._askSwStatus = this._askSwStatus.bind(this);
    this._offline = null; // unknown initially
  }

  connectedCallback() {
    this._baseTitle = (document.title || 'Drawer Count').replace(/\s*\u2022\s*Offline$/i, '');
    window.addEventListener('online', this._update);
    window.addEventListener('offline', this._update);

    // Listen for Service Worker network status broadcasts
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this._onSwMessage);
      navigator.serviceWorker.addEventListener('controllerchange', this._askSwStatus);
      // Ask for current status from the active SW (if any)
      this._askSwStatus();
    }

    // Set initial state from navigator, will be corrected by SW if needed
    this._setStatus(!navigator.onLine);
  }

  disconnectedCallback() {
    window.removeEventListener('online', this._update);
    window.removeEventListener('offline', this._update);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this._onSwMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', this._askSwStatus);
    }
  }

  _update() {
    // Fallback to navigator events (SW will override when it knows better)
    this._setStatus(!navigator.onLine);
  }

  _setStatus(offline) {
    if (this._offline === offline) return;
    this._offline = offline;
    // Subtle title hint only when offline
    document.title = offline ? `${this._baseTitle} \u2022 Offline` : this._baseTitle;
    // Always show with a dot and label, color via classes
    this.classList.toggle('offline', !!offline);
    this.classList.toggle('online', !offline);
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('role', 'status');
    this.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="label">${offline ? 'Offline' : 'Online'}</span>`;
  }

  _onSwMessage(event) {
    const data = event.data;
    if (!data || data.type !== 'NETWORK_STATUS') return;
    // Combine SW signal with browser connectivity; never show online if navigator says offline
    const swOffline = Boolean(data.offline);
    const browserOffline = !navigator.onLine;
    this._setStatus(swOffline || browserOffline);
  }

  async _askSwStatus() {
    try {
      if (!('serviceWorker' in navigator)) return;
      // Ask the current controller first, if present
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'GET_NETWORK_STATUS' });
      }
      // Also ask the active worker when ready (covers first load after install)
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'GET_NETWORK_STATUS' });
    } catch (_) {
      // ignore
    }
  }
}
customElements.define('network-status', NetworkStatus);

// PWA: register service worker (unchanged)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('SW registration failed', err));
  });
}

// Drawer persistence — profiles
const DRAWER_PROFILES_KEY = 'drawer-profiles-v1';
function getDrawerComponent() { return document.querySelector('drawer-count'); }
function loadProfilesData() {
  try {
    const raw = localStorage.getItem(DRAWER_PROFILES_KEY);
    if (!raw) return { activeId: 'default', profiles: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { activeId: 'default', profiles: {} };
    parsed.profiles = parsed.profiles || {};
    parsed.activeId = parsed.activeId || 'default';
    return parsed;
  } catch (_) { return { activeId: 'default', profiles: {} }; }
}
function saveProfilesData(data) {
  try { localStorage.setItem(DRAWER_PROFILES_KEY, JSON.stringify(data)); return true; } catch(_) { return false; }
}
function ensureProfilesInitialized() {
  const comp = getDrawerComponent();
  let data = loadProfilesData();
  if (!data.profiles || Object.keys(data.profiles).length === 0) {
    data = { activeId: 'default', profiles: { default: { id: 'default', name: 'Default', state: comp?.getState?.() || null, updatedAt: Date.now() } } };
    saveProfilesData(data);
  }
  if (!data.profiles[data.activeId]) {
    data.activeId = Object.keys(data.profiles)[0];
    saveProfilesData(data);
  }
}
function getActiveProfileId() { return loadProfilesData().activeId; }
function setActiveProfile(id) { const data = loadProfilesData(); if (!data.profiles[id]) return; data.activeId = id; saveProfilesData(data); }
function saveToActiveProfile() {
  const comp = getDrawerComponent(); if (!comp?.getState) return false;
  const data = loadProfilesData(); const id = data.activeId; if (!id) return false;
  const state = comp.getState();
  data.profiles[id] = { id, name: data.profiles[id]?.name || id, state, updatedAt: Date.now() };
  return saveProfilesData(data);
}
function restoreActiveProfile() {
  const comp = getDrawerComponent(); if (!comp?.setState) return false;
  const data = loadProfilesData(); const id = data.activeId; const prof = data.profiles[id]; if (!prof || !prof.state) return false;
  try { comp.setState(prof.state); return true; } catch(_) { return false; }
}
function createProfile(name) {
  const data = loadProfilesData();
  const idBase = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g,'') || 'profile';
  let id = idBase; let i = 1; while (data.profiles[id]) { id = `${idBase}-${i++}`; }
  data.profiles[id] = { id, name, state: null, updatedAt: Date.now() };
  saveProfilesData(data);
  return id;
}
function populateProfilesSelect(headerEl) {
  try {
    const sel = headerEl.querySelector('.profile-select'); if (!sel) return;
    const data = loadProfilesData(); const { profiles, activeId } = data;
    sel.innerHTML = '';
    Object.values(profiles).forEach((p) => {
      const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name || p.id; if (p.id === activeId) opt.selected = true; sel.appendChild(opt);
    });
  } catch(_){}
}
function updateStatusPill(headerEl) {
  try {
    const pill = headerEl.querySelector('.status-pill'); if (!pill) return;
    const comp = getDrawerComponent(); if (!comp?.getState) return;
    const cur = comp.getState();
    const data = loadProfilesData(); const prof = data.profiles[data.activeId];
    const saved = JSON.stringify((prof && prof.state) || null);
    const now = JSON.stringify(cur);
    const isSaved = saved === now;
    pill.textContent = isSaved ? `Saved${prof?.updatedAt ? ' • ' + new Date(prof.updatedAt).toLocaleTimeString() : ''}` : 'Unsaved changes';
    pill.classList.toggle('saved', isSaved);
    pill.classList.toggle('dirty', !isSaved);
  } catch(_){}
}
function exportProfilesToFile() {
  const data = loadProfilesData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'drawer-profiles.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('Exported profiles', { type: 'success', duration: 1800 });
}
function openImportDialog(headerEl) {
  let inp = document.getElementById('import-profiles-input');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json'; inp.id = 'import-profiles-input'; inp.style.display = 'none'; document.body.appendChild(inp); }
  inp.onchange = async () => {
    try {
      const file = inp.files && inp.files[0]; if (!file) return;
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!imported || typeof imported !== 'object' || !imported.profiles) { toast('Invalid import file', { type: 'error', duration: 2500 }); return; }
      const current = loadProfilesData();
      // Merge: imported profiles override on id conflicts
      current.profiles = { ...current.profiles, ...imported.profiles };
      if (imported.activeId) current.activeId = imported.activeId;
      saveProfilesData(current);
      populateProfilesSelect(headerEl);
      restoreActiveProfile();
      updateStatusPill(headerEl);
      toast('Imported profiles', { type: 'success', duration: 2000 });
    } catch(_) { toast('Import failed', { type: 'error', duration: 2500 }); }
    finally { inp.value = ''; }
  };
  inp.click();
}

// Auto-save on changes (debounced) per active profile
let _saveTimer = null;
function _debouncedSaveWithProfiles(headerEl) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { saveToActiveProfile(); if (headerEl) updateStatusPill(headerEl); }, 500);
}
window.addEventListener('DOMContentLoaded', () => {
  const comp = getDrawerComponent();
  if (!comp) return;
  ensureProfilesInitialized();
  // Restore from active profile if exists
  restoreActiveProfile();
  const header = document.querySelector('app-header');
  // Update initial status
  if (header) { populateProfilesSelect(header); updateStatusPill(header); }
  // Listen for changes to update status and auto-save
  comp.addEventListener('change', () => _debouncedSaveWithProfiles(header));
});
