import { fetchServerHealth, _syncAllKeys } from '../lib/sync.js';

class NetworkStatus extends HTMLElement {
  constructor() {
    super();
    this._update = this._update.bind(this);
    this._onSwMessage = this._onSwMessage.bind(this);
    this._askSwStatus = this._askSwStatus.bind(this);
    this._tickHealth = this._tickHealth.bind(this);
    this._offline = null;
    this._server = { cls: 'warn', short: 'N/A', title: 'Server: n/a' };
    this._timer = null;
  }

  connectedCallback() {
    this._baseTitle = (document.title || 'Drawer Count').replace(/\s*\u2022\s*Offline$/i, '');
    window.addEventListener('online', this._update);
    window.addEventListener('offline', this._update);

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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this._onSwMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', this._askSwStatus);
    }
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _update() { this._setStatus(!navigator.onLine); }

  _setStatus(offline) {
    if (this._offline === offline) return;
    this._offline = offline;
    document.title = offline ? `${this._baseTitle} \u2022 Offline` : this._baseTitle;
    this.classList.toggle('offline', !!offline);
    this.classList.toggle('online', !offline);
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('role', 'status');
    this._render();
  }

  _onSwMessage(event) {
    const data = event.data;
    if (!data || data.type !== 'NETWORK_STATUS') return;
    const swOffline = Boolean(data.offline);
    const browserOffline = !navigator.onLine;
    this._setStatus(swOffline || browserOffline);
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

  async _tickHealth() {
    try {
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
    const offline = !!this._offline;
    const { cls, short, title } = this._server || { cls: 'warn', short: 'N/A', title: 'Server: n/a' };
    const mixed = (!offline && cls !== 'ok');
    const label = offline ? 'Offline' : (mixed ? 'Limited' : 'Online');

    try {
      this.classList.toggle('offline', offline);
      this.classList.toggle('mixed', mixed);
      this.classList.toggle('online', !offline && !mixed);
    } catch (_) {}

    let tooltip = '';
    if (mixed) { if (cls === 'warn') tooltip = 'Network OK, DB unavailable'; else if (cls === 'err') tooltip = 'Network OK, DB error'; else tooltip = 'Network OK, DB status unknown'; }
    else if (offline) { tooltip = 'Offline'; } else { tooltip = 'Online'; }
    this.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span class="label" title="${tooltip}">${label}</span>
    `;
  }
}

if (!customElements.get('network-status')) customElements.define('network-status', NetworkStatus);

export default NetworkStatus;
