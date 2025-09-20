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
          display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px;
          transform: translateY(8px); opacity: 0; transition: transform .15s ease, opacity .15s ease;
        }
        .toast.show { transform: translateY(0); opacity: 1; }
        .msg { font-size: 0.95rem; }
        .btnx { background: transparent; color: inherit; border: none; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
        .btnx:focus { outline: 2px solid var(--accent, #3a86ff); outline-offset: 2px; }
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
    const { type = 'info', duration = 3000 } = opts;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="msg">${message}</div>
      <button class="btnx" aria-label="Close">✕</button>
    `;
    const btn = toast.querySelector('button');
    const dispose = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 150);
    };
    btn.addEventListener('click', dispose);
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

// Web Component: <app-header> handles title + PWA install prompt
class AppHeader extends HTMLElement {
  connectedCallback() {
    const title = this.getAttribute('title') || 'Drawer Count';
    this.innerHTML = `<h1>${title}</h1>`;
  }
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
        .wrap { display: none; background: #152041; border-bottom: 1px solid #2a345a; padding: 10px 12px; }
        .inner { max-width: 980px; margin: 0 auto; display: flex; gap: 10px; align-items: center; justify-content: space-between; }
        .msg { color: var(--fg, #e0e6ff); }
        .actions { display: flex; gap: 8px; }
        .primary { background: var(--btn, #3a506b); color: var(--fg, #e0e6ff); border: 1px solid #2a345a; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
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
    // As a floating pill: only render text when offline and toggle class for CSS visibility
    if (offline) {
      this.textContent = 'Offline';
      this.classList.add('offline');
      this.setAttribute('aria-live', 'polite');
      this.setAttribute('role', 'status');
    } else {
      this.textContent = '';
      this.classList.remove('offline');
      this.removeAttribute('role');
    }
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
