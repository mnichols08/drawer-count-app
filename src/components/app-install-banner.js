import { toast } from '../lib/toast.js';

class AppInstallBanner extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onInstallClick = this._onInstallClick.bind(this);
    this._onOpenClick = this._onOpenClick.bind(this);
    this._onIOSHelp = this._onIOSHelp.bind(this);
    this._onBeforeInstallPrompt = this._onBeforeInstallPrompt.bind(this);
    this._onAppInstalled = this._onAppInstalled.bind(this);
    this._onSwMessage = this._onSwMessage.bind(this);
    this._onDismiss = this._onDismiss.bind(this);
    this._update = this._update.bind(this);
    this._tryCloseTab = this._tryCloseTab.bind(this);
    this._onTourMutation = this._onTourMutation.bind(this);
    this._deferredPrompt = null;
    this._installed = false;
    this._dismissed = false;
    this._autoHideTimer = null;
    this._iosMode = false;
    this._mo = null;
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
      if (this._installed) this._onOpenClick();
      else if (this._iosMode) this._onIOSHelp();
      else this._onInstallClick();
    });
    this._el.dismiss.addEventListener('click', this._onDismiss);

    window.addEventListener('beforeinstallprompt', this._onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this._onAppInstalled);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this._onSwMessage);
    }
    // Observe onboarding tour open/close state
    try {
      this._mo = new MutationObserver(this._onTourMutation);
      this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tour-open'] });
    } catch (_) { /* ignore */ }

    this._installed = this._isAppInstalled();
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      try { localStorage.setItem('pwa-installed', '1'); } catch (_) {}
      this._installed = true;
    }
    if (window.matchMedia) {
      const mm = window.matchMedia('(display-mode: standalone)');
      mm?.addEventListener?.('change', (e) => { if (e.matches) { try { localStorage.setItem('pwa-installed','1'); } catch(_) {} this._installed = true; this._update(); } });
    }
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
    try { this._mo?.disconnect(); this._mo = null; } catch (_) { /* ignore */ }
  }

  _onBeforeInstallPrompt(e) {
    e.preventDefault();
    this._deferredPrompt = e;
    // If onboarding is open, defer showing until it closes (no toast yet)
    if (!this._installed && !this._isDismissed() && !this._isOnboardingOpen()) {
      this._showInstall();
      toast('You can install this app', { type: 'info', duration: 2500 });
    } else {
      // Ensure current UI reflects hidden state during onboarding
      this._update();
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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    // Suppress banner entirely while onboarding tour is open
    if (this._isOnboardingOpen()) { this._el.wrap.style.display = 'none'; this._clearAutoHide(); return; }
    if (isStandalone || this._isDismissed()) { this._el.wrap.style.display = 'none'; this._clearAutoHide(); return; }

    if (this._installed) {
      this._showOpen();
    } else if (this._deferredPrompt) {
      this._showInstall();
    } else if (this._isIOS()) {
      this._showIOS();
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
    this._iosMode = false;
    this._scheduleAutoHide();
  }

  _isDismissed() { return this._dismissed === true; }
  _isOnboardingOpen() {
    try { return document.documentElement?.hasAttribute('data-tour-open'); } catch (_) { return false; }
  }
  _onTourMutation() { this._update(); }
  _isIOS() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isIOSUA = /iphone|ipad|ipod/i.test(ua);
    const isIpadOSMasquerade = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIOSUA || isIpadOSMasquerade;
  }
  _onIOSHelp() {
    try {
      const isIpad = /ipad/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const device = isIpad ? 'iPad' : 'iPhone';
      toast(`Install on ${device}: In Safari, tap Share (square with ↑), then "Add to Home Screen".`, { type: 'info', duration: 5000 });
    } catch (_) {}
  }
  _showIOS() {
    const isIpad = /ipad/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const device = isIpad ? 'iPad' : 'iPhone';
    this._el.msg.textContent = `Install this app: On your ${device}, tap the Share button, then "Add to Home Screen".`;
    this._el.primary.textContent = 'How to Install';
    this._el.primary.setAttribute('aria-label', `How to install on ${device}`);
    this._el.wrap.style.display = 'block';
    this._iosMode = true;
    this._scheduleAutoHide();
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
      this._dismissed = true;
      this._el.wrap.style.display = 'none';
      this._clearAutoHide();
    }, 20000);
  }
  _clearAutoHide() { if (this._autoHideTimer) { clearTimeout(this._autoHideTimer); this._autoHideTimer = null; } }
}

if (!customElements.get('app-install-banner')) customElements.define('app-install-banner', AppInstallBanner);

export default AppInstallBanner;
