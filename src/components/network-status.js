import { fetchServerHealth, _syncAllKeys } from '../lib/sync.js';

class NetworkStatus extends HTMLElement {
  constructor() {
    super();
    this._update = this._update.bind(this);
    this._onSwMessage = this._onSwMessage.bind(this);
    this._askSwStatus = this._askSwStatus.bind(this);
    this._tickHealth = this._tickHealth.bind(this);
    this._onDevNetMode = this._onDevNetMode.bind(this);
    this._offline = null;
    this._server = { cls: 'warn', short: 'N/A', title: 'Server: n/a' };
    this._timer = null;
    this._forcedMode = null;
    this._lastForcedMode = null;
  }

  connectedCallback() {
    this._baseTitle = (document.title || 'Drawer Count').replace(/\s*\u2022\s*Offline$/i, '');
    window.addEventListener('online', this._update);
    window.addEventListener('offline', this._update);
    window.addEventListener('dca-dev-network-mode', this._onDevNetMode);

    try {
      this._forcedMode = (typeof window !== 'undefined' && window.__dcaDevNetMode) ? window.__dcaDevNetMode : null;
    } catch (_) {
      this._forcedMode = null;
    }
    this._lastForcedMode = null;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this._onSwMessage);
      navigator.serviceWorker.addEventListener('controllerchange', this._askSwStatus);
      this._askSwStatus();
    }

    this._setStatus(!navigator.onLine);

    this._tickHealth();
    this._timer = setInterval(this._tickHealth, 20000);
  }

  disconnectedCallback() {
    window.removeEventListener('online', this._update);
    window.removeEventListener('offline', this._update);
     window.removeEventListener('dca-dev-network-mode', this._onDevNetMode);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this._onSwMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', this._askSwStatus);
    }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _update() { this._setStatus(!navigator.onLine); }

  _setStatus(offline) {
    const forced = this._forcedMode;
    const effectiveOffline = forced === 'offline' ? true : offline;
    const stateChanged = this._offline !== effectiveOffline || this._lastForcedMode !== forced;
    if (!stateChanged) return;
    this._offline = effectiveOffline;
    this._lastForcedMode = forced;
    document.title = effectiveOffline ? `${this._baseTitle} \u2022 Offline` : this._baseTitle;
    this.classList.toggle('offline', !!effectiveOffline);
    this.classList.toggle('online', !effectiveOffline);
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('role', 'status');
    this._render();
  }

  _onSwMessage(event) {
    const data = event.data;
    if (!data || data.type !== 'NETWORK_STATUS') return;
    const forcedRaw = typeof data.forced === 'string' ? data.forced.toLowerCase() : null;
    if (forcedRaw === 'offline' || forcedRaw === 'mixed') {
      this._forcedMode = forcedRaw;
    } else {
      this._forcedMode = null;
    }
    const swOffline = data.offline === true;
    const browserOffline = !navigator.onLine;
    const effectiveOffline = this._forcedMode === 'offline' ? true : (swOffline || browserOffline);
    this._setStatus(effectiveOffline);
  }

  async _askSwStatus() {
    try {
      if (!('serviceWorker' in navigator)) return;
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'GET_NETWORK_STATUS' });
      }
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'GET_NETWORK_STATUS' });
    } catch (_) {}
  }

  _onDevNetMode(event) {
    try {
      const detailMode = event?.detail?.mode;
      if (detailMode === 'offline' || detailMode === 'mixed') {
        this._forcedMode = detailMode;
      } else {
        this._forcedMode = null;
      }
    } catch (_) {
      this._forcedMode = null;
    }
    const offline = this._forcedMode === 'offline' ? true : !navigator.onLine;
    this._setStatus(offline);
    if (!this._forcedMode) {
      this._tickHealth();
    }
  }

  async _tickHealth() {
    try {
      if (this._forcedMode === 'offline') {
        this._server = { cls: 'warn', short: 'OFF', title: 'Server: offline (dev override)' };
        this._render();
        return;
      }
      if (this._forcedMode === 'mixed') {
        this._server = { cls: 'warn', short: 'DEV', title: 'Server: limited (dev override)' };
        this._render();
        return;
      }

      const offline = !navigator.onLine;
      let cls = 'warn'; let short = 'N/A'; let title = 'Server: n/a';
      const prevDbConnected = !!(this._server && this._server.cls === 'ok');
      if (offline) { cls = 'warn'; short = 'OFF'; title = 'Server: offline'; }
      else {
        const health = await fetchServerHealth();
        if (!health || health.ok !== true) { cls = 'err'; short = 'ERR'; title = 'Server: error'; }
        else if (health.db && health.db.configured && health.db.connected) { cls = 'ok'; short = 'OK'; title = 'Server: connected'; }
        else if (health.db && health.db.configured && !health.db.connected) { cls = 'warn'; short = 'NODB'; title = 'Server: DB not connected'; }
        else { cls = 'warn'; short = 'N/A'; title = 'Server: not configured'; }
      }
      this._server = { cls, short, title };
      this._render();
      const nowDbConnected = (cls === 'ok');
      if (!prevDbConnected && nowDbConnected) { try { await _syncAllKeys(); } catch (_) {} }
    } catch (_) {}
  }

  _render() {
    const forced = this._forcedMode;
    const offline = !!this._offline;
    const { cls } = this._server || { cls: 'warn', short: 'N/A', title: 'Server: n/a' };
    const mixed = (!offline && ((forced === 'mixed') || cls !== 'ok'));
    const label = offline ? 'Offline' : (mixed ? 'Limited' : 'Online');

    try {
      this.classList.toggle('offline', offline);
      this.classList.toggle('mixed', mixed);
      this.classList.toggle('online', !offline && !mixed);
      this.classList.toggle('forced', !!forced);
    } catch (_) {}

    let tooltip = '';
    if (forced === 'mixed') {
      tooltip = 'Limited (dev override)';
    } else if (mixed) {
      if (cls === 'warn') tooltip = 'Network OK, DB unavailable';
      else if (cls === 'err') tooltip = 'Network OK, DB error';
      else tooltip = 'Network OK, DB status unknown';
    } else if (offline) {
      tooltip = forced === 'offline' ? 'Offline (dev override)' : 'Offline';
    } else {
      tooltip = 'Online';
    }
    this.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span class="label" title="${tooltip}">${label}</span>
    `;
  }
}

if (!customElements.get('network-status')) customElements.define('network-status', NetworkStatus);

export default NetworkStatus;
