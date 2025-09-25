import { getPreferredTheme, applyTheme, getProfileThemeMode, setProfileThemeMode } from '../lib/theme.js';
import { toast } from '../lib/toast.js';
import { saveToActiveProfile, restoreActiveProfile, exportProfilesToFile, openImportDialog } from '../lib/persistence.js';
import { listSavedDaysForActiveProfile, _getActiveDaysEntry, getTodayKey, setDayLabel, setActiveViewDateKey, restoreDay, deleteDay } from '../lib/persistence.js';
import { getDrawerComponent, updateStatusPill, applyReadOnlyByActiveDate, saveDaysData } from '../lib/persistence.js';
import './app-modal.js';

const DEV_NET_MODE_KEY = 'dca.dev.netMode';

const isDevMode = () => { try { return !!window.DCA_DEV; } catch (_) { return false; } };

const getStoredDevNetMode = () => { try { return localStorage.getItem(DEV_NET_MODE_KEY) || null; } catch (_) { return null; } };

const setStoredDevNetMode = (mode) => {
  try {
    if (mode) localStorage.setItem(DEV_NET_MODE_KEY, mode);
    else localStorage.removeItem(DEV_NET_MODE_KEY);
  } catch (_) {}
};

const postDevNetworkMode = async (mode) => {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const payload = { type: 'DEV_SET_NETWORK_MODE', mode };
    let sent = false;
    const send = (target) => {
      if (!target) return;
      try { target.postMessage(payload); sent = true; } catch (_) {}
    };
    if (navigator.serviceWorker.controller) send(navigator.serviceWorker.controller);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        send(reg.active);
        send(reg.waiting);
      }
    } catch (_) {}
    return sent;
  } catch (_) { return false; }
};

const applyDevNetworkMode = async (mode, { persist = true, silent = false } = {}) => {
  const normalized = (mode === 'offline' || mode === 'mixed') ? mode : 'online';
  const success = await postDevNetworkMode(normalized);
  const effective = normalized === 'online' ? null : normalized;
  if (persist) setStoredDevNetMode(effective);
  try { window.__dcaDevNetMode = effective; } catch (_) {}
  try { window.dispatchEvent(new CustomEvent('dca-dev-network-mode', { detail: { mode: effective } })); } catch (_) {}
  if (!silent) {
    try { document.querySelector('network-status')?._tickHealth?.(); } catch (_) {}
  }
  return { success, mode: effective };
};

if (isDevMode()) {
  const storedMode = getStoredDevNetMode();
  if (storedMode) {
    try { window.__dcaDevNetMode = storedMode; } catch (_) {}
    setTimeout(() => { applyDevNetworkMode(storedMode, { persist: false, silent: true }); }, 0);
  }
}

class SettingsModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onThemeChange = this._onThemeChange.bind(this);
    this._onExport = this._onExport.bind(this);
    this._onImport = this._onImport.bind(this);
    this._onDayLoad = this._onDayLoad.bind(this);
    this._onDayDelete = this._onDayDelete.bind(this);
    this._populateDaysSelect = this._populateDaysSelect.bind(this);
    this._onDayRename = this._onDayRename.bind(this);
    this._setDevNetworkMode = this._setDevNetworkMode.bind(this);
    this._devNetMode = (() => {
      try { return window.__dcaDevNetMode || getStoredDevNetMode(); } catch (_) { return getStoredDevNetMode(); }
    })();
  }
  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  _render() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    const mode = getProfileThemeMode();
    const devMode = isDevMode();
    this._devNetMode = (() => {
      try { return window.__dcaDevNetMode || getStoredDevNetMode(); } catch (_) { return getStoredDevNetMode(); }
    })();
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .section { border-top: 1px solid var(--border, #2a345a); padding-top: 10px; margin-top: 10px; }
        .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 8px 0; flex-wrap: wrap; }
        .radios { display: flex; gap: 12px; align-items: center; }
        label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 44px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
  .btn.active, .btn[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--accent, #5aa0ff) inset; }
        .btn[disabled] { opacity: .7; cursor: not-allowed; }
        .day-label, .day-select { background: var(--input-bg-color, #0f1730); color: var(--input-fg-color, var(--fg)); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.75rem; min-height: 44px; font-size: 16px; }
        .btn.processing { position: relative; }
        .btn .dots { display: inline-block; width: 1.5em; text-align: left; }
        @keyframes dca-ellipsis { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; } }
        .btn.processing .dots::after { content: ''; display: inline-block; animation: dca-ellipsis 1.2s steps(4, end) infinite; }
        /* Only show mobile-only prefs on small screens */
        @media (min-width: 641px) {
          .mobile-only { display: none !important; }
        }
      </style>
      <app-modal title="Settings" closable>
        <div class="content" slot="body">
          <div class="section">
            <div class="row">
              <div>Theme</div>
              <div class="radios" role="radiogroup" aria-label="Theme">
                <label><input type="radio" name="theme" value="system"> <span>System</span></label>
                <label><input type="radio" name="theme" value="light"> <span>Light</span></label>
                <label><input type="radio" name="theme" value="dark"> <span>Dark</span></label>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="row">
              <div>Data</div>
              <div style="display:flex; gap:8px; flex-wrap: wrap;">
                <button class="btn export-btn" aria-label="Export data">Export</button>
                <button class="btn import-btn" aria-label="Import data">Import</button>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="row">
              <div>Profiles</div>
              <div style="display:flex; gap:8px; flex-wrap: wrap;">
                <button class="btn save-btn" aria-label="Save active profile">Save</button>
                <button class="btn restore-btn" aria-label="Restore active profile">Restore</button>
                <button class="btn clear-btn" aria-label="Clear current drawer">Clear</button>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="row" style="align-items: start; gap: 12px;">
              <div>Daily History</div>
              <div style="display:flex; gap:8px; flex-wrap: wrap; align-items: center;">
                <label for="saved-days" class="sr-only">Saved Days</label>
                <select id="saved-days" class="day-select" aria-label="Saved Days" style="min-width: 180px; max-width: 60vw;"></select>
                <button class="btn day-load-btn" aria-label="Load selected day">Load</button>
                <button class="btn day-delete-btn" aria-label="Delete selected day">Delete</button>
                <label for="day-label" class="sr-only">Day label</label>
                <input id="day-label" class="day-label" type="text" placeholder="Label (optional)" style="min-width: 180px; max-width: 60vw;" />
                <button class="btn day-rename-btn" aria-label="Rename selected day">Rename</button>
              </div>
            </div>
          </div>
          ${devMode ? `
          <div class="section">
            <div class="row" style="align-items: center; gap: 12px;">
              <div style="min-width: 120px;">Developer</div>
              <div style="display:flex; gap:8px; flex-wrap: wrap; align-items: center;">
                <button class="btn dev-seed-7" type="button" aria-label="Seed last 7 days">Seed last 7 days</button>
                <button class="btn dev-seed-14" type="button" aria-label="Seed last 14 days">Seed last 14 days</button>
                <button class="btn dev-clear-days" type="button" aria-label="Clear seeded days">Clear all days</button>
              </div>
            </div>
            <div class="row" style="align-items: center; gap: 12px;">
              <div style="min-width: 120px;">Connectivity</div>
              <div class="dev-network" style="display:flex; gap:8px; flex-wrap: wrap; align-items: center;">
                <button class="btn dev-net-btn" type="button" data-mode="offline" aria-pressed="false">Force Offline</button>
                <button class="btn dev-net-btn" type="button" data-mode="mixed" aria-pressed="false">Force Limited</button>
                <button class="btn dev-net-btn" type="button" data-mode="online" aria-pressed="false">Restore Online</button>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
      </app-modal>
    `;
    this._els = {
      modal: this._shadow.querySelector('app-modal'),
      radios: Array.from(this._shadow.querySelectorAll('input[name="theme"]')),
      exportBtn: this._shadow.querySelector('.export-btn'),
      importBtn: this._shadow.querySelector('.import-btn'),
      saveBtn: this._shadow.querySelector('.save-btn'),
      restoreBtn: this._shadow.querySelector('.restore-btn'),
      clearBtn: this._shadow.querySelector('.clear-btn'),
      daySelect: this._shadow.querySelector('.day-select'),
      dayLoadBtn: this._shadow.querySelector('.day-load-btn'),
      dayDeleteBtn: this._shadow.querySelector('.day-delete-btn'),
      dayLabel: this._shadow.querySelector('.day-label'),
      dayRenameBtn: this._shadow.querySelector('.day-rename-btn'),
      seed7: this._shadow.querySelector('.dev-seed-7'),
      seed14: this._shadow.querySelector('.dev-seed-14'),
      clearDays: this._shadow.querySelector('.dev-clear-days'),
      devNetButtons: Array.from(this._shadow.querySelectorAll('.dev-net-btn')),
    };
  const chosen = mode || currentTheme;
    this._els.radios.forEach((r) => { r.checked = r.value === chosen; r.addEventListener('change', this._onThemeChange); });
    this._els.modal?.addEventListener('modal-close', () => this.close());
    this._els.exportBtn?.addEventListener('click', this._onExport);
    this._els.importBtn?.addEventListener('click', this._onImport);
    this._els.saveBtn?.addEventListener('click', () => { try { saveToActiveProfile(); const header = document.querySelector('app-header'); updateStatusPill(header); toast('Profile saved', { type: 'success', duration: 2000 }); } catch (_) {} });
    this._els.restoreBtn?.addEventListener('click', () => { try { const ok = restoreActiveProfile(); const header = document.querySelector('app-header'); updateStatusPill(header); toast(ok? 'Profile restored':'No saved state for profile', { type: ok?'success':'warning', duration: 2200 }); } catch (_) { toast('Restore failed', { type: 'error', duration: 2500 }); } });
    this._els.clearBtn?.addEventListener('click', () => { try { const comp = getDrawerComponent(); comp?.reset?.(); const header = document.querySelector('app-header'); updateStatusPill(header); toast('Cleared', { type: 'info', duration: 1500 }); } catch(_){} });
  this._els.dayLoadBtn?.addEventListener('click', this._onDayLoad);
    this._els.dayDeleteBtn?.addEventListener('click', this._onDayDelete);
    this._els.daySelect?.addEventListener('change', () => {
      const has = !!this._els.daySelect?.value;
      if (this._els.dayLoadBtn) this._els.dayLoadBtn.disabled = !has;
      if (this._els.dayDeleteBtn) this._els.dayDeleteBtn.disabled = !has;
      try { const key = this._els.daySelect?.value; const { entry } = _getActiveDaysEntry(false); const label = (key && entry.days?.[key]?.label) || ''; if (this._els.dayLabel) this._els.dayLabel.value = label; } catch(_) {}
    });
    this._els.dayRenameBtn?.addEventListener('click', this._onDayRename);
    if (devMode) {
      this._els.seed7?.addEventListener('click', async () => { const { seedPreviousDays } = await import('../lib/days.js'); try { const keys = seedPreviousDays(7, { includeToday: false, overwrite: true }); this._populateDaysSelect(); toast(`Seeded ${keys.length} day(s)`, { type: 'success', duration: 1600 }); } catch(_) { toast('Seed failed', { type: 'error', duration: 1800 }); } });
      this._els.seed14?.addEventListener('click', async () => { const { seedPreviousDays } = await import('../lib/days.js'); try { const keys = seedPreviousDays(14, { includeToday: false, overwrite: true }); this._populateDaysSelect(); toast(`Seeded ${keys.length} day(s)`, { type: 'success', duration: 1600 }); } catch(_) { toast('Seed failed', { type: 'error', duration: 1800 }); } });
      this._els.clearDays?.addEventListener('click', () => { try { const { data, pid, entry } = _getActiveDaysEntry(true); entry.days = {}; data[pid] = entry; saveDaysData(data); this._populateDaysSelect(); toast('Cleared all days for profile', { type: 'warning', duration: 1600 }); } catch(_) { toast('Clear failed', { type: 'error', duration: 1800 }); } });
      if (Array.isArray(this._els.devNetButtons)) {
        this._els.devNetButtons.forEach((btn) => {
          if (!btn) return;
          btn.addEventListener('click', () => this._setDevNetworkMode(btn.dataset?.mode || 'online'));
        });
      }
      this._syncDevNetworkButtons();
    }
    this._populateDaysSelect();
    if (this._els.dayLoadBtn) this._els.dayLoadBtn.disabled = !this._els.daySelect?.value;
    if (this._els.dayDeleteBtn) this._els.dayDeleteBtn.disabled = !this._els.daySelect?.value;
  }
  open() { this.setAttribute('open', ''); try { this._populateDaysSelect(); } catch(_) {} this._els?.modal?.show(); }
  close() { this._els?.modal?.hide('programmatic'); this.removeAttribute('open'); }
  _onKeyDown(e) { if (e.key === 'Escape') this.close(); }
  _syncDevNetworkButtons() {
    if (!this._els || !Array.isArray(this._els.devNetButtons)) return;
    const mode = this._devNetMode || null;
    this._els.devNetButtons.forEach((btn) => {
      if (!btn) return;
      const btnMode = btn.dataset?.mode || '';
      const isActive = mode ? btnMode === mode : btnMode === 'online';
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.classList.toggle('active', isActive);
    });
  }
  async _setDevNetworkMode(mode, { silent = false } = {}) {
    try {
      const normalized = (mode === 'offline' || mode === 'mixed') ? mode : 'online';
      const result = await applyDevNetworkMode(normalized, { persist: true, silent });
      this._devNetMode = result.mode || null;
      this._syncDevNetworkButtons();
      if (silent) return;
      if (!result.success) {
        toast('Unable to reach service worker', { type: 'error', duration: 2200 });
        return;
      }
      if (normalized === 'offline') {
        toast('Connectivity forced offline (dev override)', { type: 'warning', duration: 2000 });
      } else if (normalized === 'mixed') {
        toast('Connectivity limited (dev override)', { type: 'info', duration: 2000 });
      } else {
        toast('Connectivity restored to live network', { type: 'success', duration: 1600 });
      }
    } catch (_) {
      if (!silent) toast('Network override failed', { type: 'error', duration: 2200 });
    }
  }
  _onThemeChange(e) {
    const val = e.target?.value;
    try {
      if (val === 'system') { setProfileThemeMode('system'); applyTheme('system', false); toast('Theme: System', { type:'info', duration: 1200}); }
      else if (val === 'light' || val === 'dark') { setProfileThemeMode(val); applyTheme(val, false); toast(`Theme: ${val[0].toUpperCase()}${val.slice(1)}`, { type:'info', duration: 1200}); }
    } catch (_) { /* ignore */ }
  }
  async _onExport() { const btn = this._els?.exportBtn; await this._withProcessing(btn, async () => { try { exportProfilesToFile(); } catch(_) { toast('Export failed', { type: 'error', duration: 2500 }); } await this._sleep(350); }); }
  async _onImport() { const btn = this._els?.importBtn; await this._withProcessing(btn, async () => { try { const header = document.querySelector('app-header'); openImportDialog(header); } catch(_) { toast('Import failed to start', { type: 'error', duration: 2500 }); } await this._sleep(600); }); }
  _populateDaysSelect() { try { const sel = this._els?.daySelect; if (!sel) return; const list = listSavedDaysForActiveProfile(); const { entry } = _getActiveDaysEntry(false); sel.innerHTML = ''; if (!list.length) { const opt = document.createElement('option'); opt.value = ''; opt.textContent = 'No saved days'; sel.appendChild(opt); } else { for (const d of list) { const opt = document.createElement('option'); opt.value = d.date; const dt = new Date(d.savedAt || Date.now()); const label = entry?.days?.[d.date]?.label; const time = dt.toLocaleTimeString(); const lbl = label && label.trim() ? `${d.date} • ${label} • ${time}` : `${d.date} • ${time}`; opt.textContent = lbl; sel.appendChild(opt); } } } catch(_) {} }
  _onDayLoad() { try { const key = this._els?.daySelect?.value; if (!key) return; setActiveViewDateKey(key); const ok = restoreDay(key); const header = document.querySelector('app-header'); updateStatusPill(header); applyReadOnlyByActiveDate(header); try { const today = getTodayKey(); if (key !== today) { const panel = document.querySelector('count-panel'); panel?.showCompletedSummary?.(); } } catch(_) {} try { document.querySelector('count-panel')?.refresh?.(); } catch(_) {} toast(ok ? `Loaded ${key}` : 'Load failed', { type: ok ? 'success' : 'error', duration: 1800 }); } catch(_) { toast('Load failed', { type: 'error', duration: 2000 }); } }
  _onDayDelete() { try { const key = this._els?.daySelect?.value; if (!key) return; const ok = deleteDay(key); this._populateDaysSelect(); toast(ok ? 'Deleted day' : 'Delete failed', { type: ok ? 'success' : 'error', duration: 1800 }); } catch(_) { toast('Delete failed', { type: 'error', duration: 2000 }); } }
  async _onDayRename() { const btn = this._els?.dayRenameBtn; await this._withProcessing(btn, async () => { try { const key = this._els?.daySelect?.value || getActiveViewDateKey(); const today = getTodayKey(); if (key && key !== today) { const panel = document.querySelector('count-panel'); panel?.showCompletedSummary?.(); } const label = (this._els?.dayLabel?.value || '').trim(); const ok = setDayLabel(key, label); this._populateDaysSelect(); toast(ok ? 'Renamed day' : 'Rename failed', { type: ok ? 'success' : 'error', duration: 1600 }); } catch(_) { toast('Rename failed', { type: 'error', duration: 2000 }); } await this._sleep(250); }); }
  async _withProcessing(btn, fn) { try { if (!btn) { await fn?.(); return; } const prev = { html: btn.innerHTML, disabled: btn.disabled, label: btn.textContent }; btn.classList.add('processing'); btn.innerHTML = `${prev.label} <span class="dots" aria-hidden="true"></span>`; btn.disabled = true; await fn?.(); await this._sleep(120); btn.classList.remove('processing'); btn.innerHTML = prev.html; btn.disabled = prev.disabled; } catch(_) { try { if (btn) { btn.classList.remove('processing'); btn.disabled = false; } } catch(_) {} } }
  _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
}

if (!customElements.get('settings-modal')) customElements.define('settings-modal', SettingsModal);

export function getSettingsModal() { let m = document.querySelector('settings-modal'); if (!m) { m = document.createElement('settings-modal'); document.body.appendChild(m); } return m; }
