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
function applyTheme(theme, persist = true) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  if (persist) { try { localStorage.setItem(THEME_KEY, t); } catch (_) {} }
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
// Apply without persisting so that lack of stored value means "System" mode
applyTheme(getPreferredTheme(), false);

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
          <p>Drawer Count helps quickly total cash drawers with slips, checks, and bill/coin counts. It works offline and can be installed as an app. To use, get your cash sales and ROA amounts from the "Review Today's Sales" screen in TAMS, and input them into the appropriate fields. Then simply input the amounts from your credit card slips, checks received, and cash.</p>
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

// Web Component: <settings-modal> — app settings and data actions
class SettingsModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onThemeChange = this._onThemeChange.bind(this);
    this._onExport = this._onExport.bind(this);
    this._onImport = this._onImport.bind(this);
    // Daily history handlers
    this._onDayLoad = this._onDayLoad.bind(this);
    this._onDayDelete = this._onDayDelete.bind(this);
    this._populateDaysSelect = this._populateDaysSelect.bind(this);
    this._onDayRename = this._onDayRename.bind(this);
  }
  connectedCallback() {
    this._render();
    window.addEventListener('keydown', this._onKeyDown);
  }
  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
  _render() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    // system if no explicit localStorage setting
    let mode = 'system';
    try { const stored = localStorage.getItem(THEME_KEY); if (stored === 'light' || stored === 'dark') mode = stored; } catch(_) {}
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 12% auto auto 50%; transform: translateX(-50%);
          max-width: min(560px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden; background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 14px; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        .section { border-top: 1px solid var(--border, #2a345a); padding-top: 10px; margin-top: 10px; }
        .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 8px 0; flex-wrap: wrap; }
        .radios { display: flex; gap: 12px; align-items: center; }
        label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 8px 12px; cursor: pointer; min-height: 40px; font-weight: 600; }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Settings">
        <div class="hd">
          <h2>Settings</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <div class="content">
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
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      close: this._shadow.querySelector('.close'),
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
    };
    // Init radio state
    const chosen = mode || currentTheme;
    this._els.radios.forEach((r) => { r.checked = r.value === chosen; r.addEventListener('change', this._onThemeChange); });
    this._els.backdrop?.addEventListener('click', () => this.close());
    this._els.close?.addEventListener('click', () => this.close());
    this._els.exportBtn?.addEventListener('click', this._onExport);
    this._els.importBtn?.addEventListener('click', this._onImport);
    this._els.saveBtn?.addEventListener('click', () => {
      try { saveToActiveProfile(); const header = document.querySelector('app-header'); updateStatusPill(header); toast('Profile saved', { type: 'success', duration: 2000 }); } catch (_) {}
    });
    this._els.restoreBtn?.addEventListener('click', () => {
      try { const ok = restoreActiveProfile(); const header = document.querySelector('app-header'); updateStatusPill(header); toast(ok? 'Profile restored':'No saved state for profile', { type: ok?'success':'warning', duration: 2200 }); } catch (_) { toast('Restore failed', { type: 'error', duration: 2500 }); }
    });
    this._els.clearBtn?.addEventListener('click', () => {
      try { const comp = getDrawerComponent(); comp?.reset?.(); const header = document.querySelector('app-header'); updateStatusPill(header); toast('Cleared', { type: 'info', duration: 1500 }); } catch(_){}
    });
    // Daily history events
    this._els.dayLoadBtn?.addEventListener('click', this._onDayLoad);
    this._els.dayDeleteBtn?.addEventListener('click', this._onDayDelete);
    this._els.daySelect?.addEventListener('change', () => {
      const has = !!this._els.daySelect?.value;
      if (this._els.dayLoadBtn) this._els.dayLoadBtn.disabled = !has;
      if (this._els.dayDeleteBtn) this._els.dayDeleteBtn.disabled = !has;
      // sync label input with selected day's current label
      try {
        const key = this._els.daySelect?.value;
        const { entry } = _getActiveDaysEntry(false);
        const label = (key && entry.days?.[key]?.label) || '';
        if (this._els.dayLabel) this._els.dayLabel.value = label;
      } catch(_) {}
    });
    this._els.dayRenameBtn?.addEventListener('click', this._onDayRename);
    // Initialize the days UI state
    this._populateDaysSelect();
    if (this._els.dayLoadBtn) this._els.dayLoadBtn.disabled = !this._els.daySelect?.value;
    if (this._els.dayDeleteBtn) this._els.dayDeleteBtn.disabled = !this._els.daySelect?.value;
  }
  open() { this.setAttribute('open', ''); try { this._populateDaysSelect(); } catch(_) {} }
  close() { this.removeAttribute('open'); }
  _onKeyDown(e) { if (e.key === 'Escape') this.close(); }
  _onThemeChange(e) {
    const val = e.target?.value;
    try {
      if (val === 'system') { localStorage.removeItem(THEME_KEY); applyTheme(getPreferredTheme(), false); toast('Theme: System', { type:'info', duration: 1200}); }
      else if (val === 'light' || val === 'dark') { applyTheme(val); toast(`Theme: ${val[0].toUpperCase()}${val.slice(1)}`, { type:'info', duration: 1200}); }
    } catch (_) { /* ignore */ }
  }
  _onExport() { try { exportProfilesToFile(); } catch(_) { toast('Export failed', { type: 'error', duration: 2500 }); } }
  _onImport() { try { const header = document.querySelector('app-header'); openImportDialog(header); } catch(_) { toast('Import failed to start', { type: 'error', duration: 2500 }); } }
  _populateDaysSelect() {
    try {
      const sel = this._els?.daySelect; if (!sel) return;
      const list = listSavedDaysForActiveProfile();
      const { entry } = _getActiveDaysEntry(false);
      sel.innerHTML = '';
      if (!list.length) {
        const opt = document.createElement('option'); opt.value = ''; opt.textContent = 'No saved days'; sel.appendChild(opt);
      } else {
        for (const d of list) {
          const opt = document.createElement('option');
          opt.value = d.date;
          const dt = new Date(d.savedAt || Date.now());
          const label = entry?.days?.[d.date]?.label;
          const time = dt.toLocaleTimeString();
          const lbl = label && label.trim() ? `${d.date} • ${label} • ${time}` : `${d.date} • ${time}`;
          opt.textContent = lbl;
          sel.appendChild(opt);
        }
      }
    } catch(_) {}
  }
  _onDayLoad() {
    try {
      const key = this._els?.daySelect?.value; if (!key) return;
      const ok = restoreDay(key);
      const header = document.querySelector('app-header'); updateStatusPill(header);
      toast(ok ? `Loaded ${key}` : 'Load failed', { type: ok ? 'success' : 'error', duration: 1800 });
    } catch(_) { toast('Load failed', { type: 'error', duration: 2000 }); }
  }
  _onDayDelete() {
    try {
      const key = this._els?.daySelect?.value; if (!key) return;
      const ok = deleteDay(key);
      this._populateDaysSelect();
      toast(ok ? 'Deleted day' : 'Delete failed', { type: ok ? 'success' : 'error', duration: 1800 });
    } catch(_) { toast('Delete failed', { type: 'error', duration: 2000 }); }
  }
  _onDayRename() {
    try {
      const key = this._els?.daySelect?.value; if (!key) return;
      const label = (this._els?.dayLabel?.value || '').trim();
      const ok = setDayLabel(key, label);
      this._populateDaysSelect();
      toast(ok ? 'Renamed day' : 'Rename failed', { type: ok ? 'success' : 'error', duration: 1600 });
    } catch(_) { toast('Rename failed', { type: 'error', duration: 2000 }); }
  }
}
customElements.define('settings-modal', SettingsModal);

// Ensure a single settings modal exists in document
function getSettingsModal() {
  let m = document.querySelector('settings-modal');
  if (!m) { m = document.createElement('settings-modal'); document.body.appendChild(m); }
  return m;
}

// Web Component: <new-profile-modal> — prompt-like modal to create a profile
class NewProfileModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
  }
  connectedCallback() {
    this._render();
    window.addEventListener('keydown', this._onKeyDown);
  }
  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 12% auto auto 50%; transform: translateX(-50%);
         max-width: min(520px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden;
          background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 14px; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        form { display: grid; gap: 10px; }
        label { font-size: .95rem; }
        input[type="text"] {
          width: 100%; max-width: 100%; box-sizing: border-box;
          background: var(--input-bg-color);
          color: var(--input-fg-color);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          min-height: 44px; /* mobile tap target */
          font-size: 16px;  /* prevent iOS zoom */
        }
        .actions { display:flex; gap: 8px; justify-content: flex-end; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 8px 12px; cursor: pointer; min-height: 40px; font-weight: 600; }
        .btn[disabled] { opacity: .6; cursor: not-allowed; }
        @media (max-width: 480px) { .dialog { inset: 6% auto auto 50%; padding: 12px; } }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Create new profile">
        <div class="hd">
          <h2>Create Profile</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <form>
          <label for="np-name">Profile name</label>
          <input id="np-name" name="name" type="text" autocomplete="off" placeholder="e.g., Name" />
          <div class="actions">
            <button type="button" class="btn btn-cancel">Cancel</button>
            <button type="submit" class="btn btn-submit" disabled>Create</button>
          </div>
        </form>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      dialog: this._shadow.querySelector('.dialog'),
      close: this._shadow.querySelector('.close'),
      form: this._shadow.querySelector('form'),
      input: this._shadow.querySelector('#np-name'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      submit: this._shadow.querySelector('.btn-submit'),
    };
    this._els.backdrop?.addEventListener('click', () => this._cancel());
    this._els.close?.addEventListener('click', () => this._cancel());
    this._els.cancel?.addEventListener('click', () => this._cancel());
    this._els.input?.addEventListener('input', () => {
      const name = (this._els.input.value || '').trim();
      this._els.submit.disabled = name.length === 0;
    });
    this._els.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (this._els.input.value || '').trim();
      if (!name) { this._els.input.focus(); return; }
      this.removeAttribute('open');
      this._resolve(name);
    });
  }
  open(defaultValue = '') {
    this.setAttribute('open', '');
    if (!this._els) this._render();
    this._els.input.value = defaultValue || '';
    this._els.submit.disabled = (this._els.input.value.trim().length === 0);
    // Defer focus to after open paint
    setTimeout(() => { try { this._els.input.focus(); this._els.input.select(); } catch(_) {} }, 0);
    return new Promise((resolve) => { this._resolver = resolve; });
  }
  close() {
    this.removeAttribute('open');
    this._resolve(null);
  }
  _cancel() { this.close(); }
  _resolve(value) {
    const r = this._resolver; this._resolver = null;
    if (r) r(value);
  }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); }
}
customElements.define('new-profile-modal', NewProfileModal);

// Ensure a single new profile modal exists in document
function getNewProfileModal() {
  let m = document.querySelector('new-profile-modal');
  if (!m) { m = document.createElement('new-profile-modal'); document.body.appendChild(m); }
  return m;
}

// Web Component: <delete-profile-modal> — confirm UI for deleting a profile
class DeleteProfileModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._profileName = '';
  }
  connectedCallback() {
    this._render();
    window.addEventListener('keydown', this._onKeyDown);
  }
  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKeyDown);
  }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 12% auto auto 50%; transform: translateX(-50%);
         max-width: min(520px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden;
          background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 14px; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        .content { display: grid; gap: 10px; }
        .danger { color: #ffb4b4; }
        .actions { display:flex; gap: 8px; justify-content: flex-end; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 8px 12px; cursor: pointer; min-height: 40px; font-weight: 600; }
        .btn-danger { background: #5a2a2a; color: #ffd6d6; border-color: #7a3a3a; }
        @media (max-width: 480px) { .dialog { inset: 6% auto auto 50%; padding: 12px; } }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Delete profile">
        <div class="hd">
          <h2>Delete Profile</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <div class="content">
          <p>Are you sure you want to delete the profile <strong class="pname"></strong>? This action cannot be undone.</p>
          <p class="danger" aria-live="polite"></p>
          <div class="actions">
            <button type="button" class="btn btn-cancel">Cancel</button>
            <button type="button" class="btn btn-danger btn-delete">Delete</button>
          </div>
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      dialog: this._shadow.querySelector('.dialog'),
      close: this._shadow.querySelector('.close'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      del: this._shadow.querySelector('.btn-delete'),
      name: this._shadow.querySelector('.pname'),
      warn: this._shadow.querySelector('.danger'),
    };
    this._els.backdrop?.addEventListener('click', () => this._cancel());
    this._els.close?.addEventListener('click', () => this._cancel());
    this._els.cancel?.addEventListener('click', () => this._cancel());
    this._els.del?.addEventListener('click', () => this._confirm());
  }
  open(profileName = '') {
    if (!this._els) this._render();
    this._profileName = profileName || '';
    if (this._els.name) this._els.name.textContent = this._profileName || '—';
    // If only one profile exists, warn and disable delete (caller may check too)
    try {
      const data = loadProfilesData();
      const count = Object.keys(data.profiles || {}).length;
      if (count <= 1) {
        this._els.warn.textContent = 'You cannot delete the last remaining profile.';
        this._els.del.disabled = true;
      } else {
        this._els.warn.textContent = '';
        this._els.del.disabled = false;
      }
    } catch(_) {}
    this.setAttribute('open', '');
    return new Promise((resolve) => { this._resolver = resolve; });
  }
  close() { this.removeAttribute('open'); }
  _cancel() { this.close(); this._resolve(false); }
  _confirm() { this.close(); this._resolve(true); }
  _resolve(v) { const r = this._resolver; this._resolver = null; if (r) r(v); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this._cancel(); }
}
customElements.define('delete-profile-modal', DeleteProfileModal);

// Ensure a single delete profile modal exists in document
function getDeleteProfileModal() {
  let m = document.querySelector('delete-profile-modal');
  if (!m) { m = document.createElement('delete-profile-modal'); document.body.appendChild(m); }
  return m;
}

// Web Component: <app-header> with title, theme toggle, and help button
class AppHeader extends HTMLElement {
  constructor() {
    super();
    this._onTheme = this._onTheme.bind(this);
    this._onHelp = this._onHelp.bind(this);
    this._onSettings = this._onSettings.bind(this);
    this._onProfileChange = this._onProfileChange.bind(this);
    this._onNewProfile = this._onNewProfile.bind(this);
    this._onDeleteProfile = this._onDeleteProfile.bind(this);
    this._onClear = this._onClear.bind(this);
    this._onOpenDays = this._onOpenDays.bind(this);
    this._onToggleLock = this._onToggleLock.bind(this);
  }
  connectedCallback() {
    const title = this.getAttribute('title') || 'Drawer Count';
    this.innerHTML = `
      <style>
        :host { display: block; width: 100%; }
        /* Mobile-first: stack title on first row, actions below, allow wrapping */
        .bar { display: grid; align-items: center; gap: .35rem; grid-template-columns: 1fr auto; grid-template-areas: "title title" "left right"; }
        .title { grid-area: title; text-align: center; margin: 0; font-size: clamp(1rem, 3.5vw, 1.1rem); letter-spacing: .2px; }
        .left { grid-area: left; justify-self: start; display: flex; gap: .35rem; align-items: center; flex-wrap: wrap; }
        .right { grid-area: right; justify-self: end; display: flex; gap: .35rem; align-items: center; flex-wrap: wrap; }
        .icon-btn, .action-btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; cursor: pointer; min-height: 44px; }
        .action-btn { font-weight: 600; }
        select.profile-select { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; min-height: 44px; min-width: 0; max-width: min(55vw, 320px); }
        .status-pill { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border, #2a345a); font-size: .85rem; }
        .status-pill.saved { background: #12371f; color: #baf0c3; border-color: #2a5a3a; }
        .status-pill.dirty { background: #42201e; color: #ffd6d6; border-color: #5a2a2a; }
        /* Visually hidden but accessible label */
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,1px,1px); white-space: nowrap; border: 0; }
        
        /* Wider screens: put left | title | right on one row */
        @media (min-width: 600px) {
          .bar { grid-template-columns: 1fr auto 1fr; grid-template-areas: "left title right"; }
          .left, .right { flex-wrap: nowrap; }
        }
      </style>
      <div class="bar" role="toolbar" aria-label="App header">
        <div class="left">
          <label for="profile" class="sr-only">Profile</label>
          <select id="profile" class="profile-select" name="profile"></select>
          <button class="icon-btn new-profile-btn" aria-label="New profile" title="New profile">＋</button>
          <button class="icon-btn delete-profile-btn" aria-label="Delete profile" title="Delete profile">🗑️</button>
          <span class="status-pill" aria-live="polite">—</span>
        </div>
        <h1 class="title">${title}</h1>
        <div class="actions right">
          <button class="icon-btn days-btn" aria-label="Daily history" title="Daily history">📅</button>
          <button class="icon-btn lock-btn" aria-label="Toggle edit lock" title="Toggle edit lock">🔒</button>
          <button class="icon-btn clear-btn" aria-label="Clear inputs" title="Clear inputs">🧹</button>
          <button class="icon-btn settings-btn" aria-label="Settings" title="Settings">⚙️</button>
          <button class="icon-btn theme-toggle" aria-label="Toggle theme" title="Toggle theme">${(document.documentElement.getAttribute('data-theme')||getPreferredTheme())==='dark'?'🌙':'☀️'}</button>
          <button class="icon-btn info-btn" aria-label="Help" title="Help">?</button>
        </div>
      </div>`;
    this.querySelector('.settings-btn')?.addEventListener('click', this._onSettings);
    this.querySelector('.theme-toggle')?.addEventListener('click', this._onTheme);
    this.querySelector('.info-btn')?.addEventListener('click', this._onHelp);
    // actions moved into settings modal
    this.querySelector('.profile-select')?.addEventListener('change', this._onProfileChange);
    this.querySelector('.new-profile-btn')?.addEventListener('click', this._onNewProfile);
    this.querySelector('.delete-profile-btn')?.addEventListener('click', this._onDeleteProfile);
    this.querySelector('.clear-btn')?.addEventListener('click', this._onClear);
  this.querySelector('.days-btn')?.addEventListener('click', this._onOpenDays);
  this.querySelector('.lock-btn')?.addEventListener('click', this._onToggleLock);

    // Initialize profiles UI
    try { ensureProfilesInitialized(); populateProfilesSelect(this); updateStatusPill(this); } catch(_) {}
  }
  _onTheme() { toggleTheme(); }
  _onHelp() { getHelpModal().open(); }
  _onSettings() { getSettingsModal().open(); }
  // data actions now live in settings modal
  _onProfileChange(e) { try { const id = e.target?.value; if (!id) return; setActiveProfile(id); restoreActiveProfile(); ensureDayResetIfNeeded(this); setActiveViewDateKey(getTodayKey()); applyReadOnlyByActiveDate(this); populateProfilesSelect(this); updateStatusPill(this); toast('Switched profile', { type:'info', duration: 1200}); } catch(_){} }
  async _onNewProfile() { try { const modal = getNewProfileModal(); const name = await modal.open(''); if (!name) return; const id = createProfile(name); setActiveProfile(id); saveToActiveProfile(); populateProfilesSelect(this); updateStatusPill(this); toast('Profile created', { type: 'success', duration: 1800 }); } catch(_){} }
  async _onDeleteProfile() { try { const data = loadProfilesData(); const ids = Object.keys(data.profiles||{}); if (ids.length<=1) { toast('Cannot delete last profile', { type:'warning', duration: 2200}); return; } const active = data.activeId; const name = data.profiles[active]?.name || active; const modal = getDeleteProfileModal(); const ok = await modal.open(name); if (!ok) return; delete data.profiles[active]; const nextId = ids.find((x)=>x!==active) || 'default'; data.activeId = nextId; saveProfilesData(data); restoreActiveProfile(); populateProfilesSelect(this); updateStatusPill(this); toast('Profile deleted', { type:'success', duration: 1800}); } catch(_){} }
  _onClear() {
    try {
      const comp = getDrawerComponent();
      comp?.reset?.();
      updateStatusPill(this);
      toast('Cleared', { type: 'info', duration: 1500 });
      // focus first input inside component for convenience
      setTimeout(() => { try { comp?.shadowRoot?.querySelector('input')?.focus(); } catch(_) {} }, 0);
    } catch(_){}
  }
  _onOpenDays() {
    try {
      const modal = getDayPickerModal();
      modal.open();
    } catch(_) {}
  }
  _onToggleLock() {
    try {
      const today = getTodayKey();
      const key = getActiveViewDateKey();
      if (key === today) { toast('Today is always editable', { type: 'info', duration: 1400 }); return; }
      setDayEditUnlocked(!isDayEditUnlocked());
      applyReadOnlyByActiveDate(this);
      updateLockButtonUI(this);
      toast(isDayEditUnlocked() ? 'Editing unlocked for this day' : 'Editing locked for this day', { type: 'info', duration: 1600 });
    } catch(_) {}
  }
}
customElements.define('app-header', AppHeader);

// Web Component: <day-picker-modal> — calendar UI for picking saved days
class DayPickerModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._monthOffset = 0; // 0 = current month, -1 = prev, +1 = next
    this._onPrev = this._onPrev.bind(this);
    this._onNext = this._onNext.bind(this);
    this._onDayClick = this._onDayClick.bind(this);
    this._render = this._render.bind(this);
  }
  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  open() { this.setAttribute('open', ''); this._render(); }
  close() { this.removeAttribute('open'); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); }
  _getMonthInfo(offset = 0) {
    const base = new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const d = new Date(year, month + offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return { y, m, firstDow, daysInMonth };
  }
  // Compute the earliest allowed negative offset (in months) based on stored days
  _getEarliestOffset() {
    try {
      const { entry } = _getActiveDaysEntry(false);
      const keys = Object.keys(entry?.days || {});
      if (!keys.length) return 0; // no saved days => don't allow moving back
      // Find the earliest date key (YYYY-MM-DD). String sort works for ISO-like format.
      const earliestKey = keys.sort()[0];
      const [ey, em/*, ed*/] = earliestKey.split('-').map((x) => Number(x));
      if (!ey || !em) return 0;
      const today = new Date();
      const ty = today.getFullYear();
      const tm = today.getMonth() + 1; // 1-based to align with key
      // Offset from today month to earliest month (negative or zero)
      const offset = (ey - ty) * 12 + (em - tm);
      return Math.min(0, offset);
    } catch (_) { return 0; }
  }
  _onPrev() {
    const minOffset = this._getEarliestOffset();
    // move back one month but not beyond earliest saved month
    this._monthOffset = Math.max(minOffset, this._monthOffset - 1);
    this._render();
  }
  _onNext() {
    // Only allow moving forward up to current month (offset 0). Never beyond (no future months).
    this._monthOffset = Math.min(0, this._monthOffset + 1);
    this._render();
  }
  _onDayClick(e) {
    const key = e.currentTarget?.getAttribute('data-key');
    if (!key) return;
    const { entry } = _getActiveDaysEntry(false);
    if (!entry?.days?.[key]) {
      toast('No save for this day', { type: 'warning', duration: 1600 });
      return;
    }
    setActiveViewDateKey(key);
    const ok = restoreDay(key);
    const header = document.querySelector('app-header'); updateStatusPill(header);
    toast(ok ? `Loaded ${key}` : 'Load failed', { type: ok ? 'success' : 'error', duration: 1800 });
    this.close();
  }
  _render() {
    const { y, m, firstDow, daysInMonth } = this._getMonthInfo(this._monthOffset);
    const monthName = new Date(y, m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const todayKey = getTodayKey();
    const { entry } = _getActiveDaysEntry(false);
    const saved = new Set(Object.keys(entry?.days || {}));
    const minOffset = this._getEarliestOffset();
    // Build grid cells
    const blanks = Array.from({ length: firstDow }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const cells = [...blanks, ...days];
    const dayCell = (d) => {
      if (!d) return `<div class="cell empty"></div>`;
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSaved = saved.has(key);
      const isToday = key === todayKey;
      const classes = ['cell', 'day'];
      if (isSaved) classes.push('saved');
      if (isToday && this._monthOffset === 0) classes.push('today');
      return `<button class="${classes.join(' ')}" data-key="${key}" aria-label="${key}${isSaved ? ' (saved)' : ''}">${d}${isSaved ? '<span class="dot" aria-hidden="true"></span>' : ''}</button>`;
    };
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 10% auto auto 50%; transform: translateX(-50%);
          max-width: min(480px, 92vw); background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 12px; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; align-items:center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .title { font-size: 1.05rem; margin: 0; }
        .nav { display:flex; gap: 8px; }
  .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; cursor: pointer; min-height: 36px; }
  .btn:not([disabled]):hover { filter: brightness(1.08); }
  .btn[disabled] { background: var(--button-disabled-bg, #1a1f2e); color: var(--muted, #9aa3b2); border-color: var(--button-disabled-border, #2a345a); opacity: .7; cursor: not-allowed; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .dow { text-align: center; font-size: .85rem; color: var(--muted, #9aa3b2); }
        .cell { min-height: 40px; display:flex; align-items:center; justify-content:center; }
        .cell.empty { opacity: 0; }
        .cell.day { position: relative; }
        .cell.day.today { outline: 2px solid var(--accent, #3a86ff); outline-offset: 2px; border-radius: 8px; }
        .cell.day.saved { border: 1px solid var(--border, #2a345a); border-radius: 8px; }
        .cell.day .dot { width: 6px; height: 6px; border-radius: 50%; background: #3a86ff; position: absolute; bottom: 6px; right: 6px; }
        .cell.day.saved .dot { background: #2ecc71; }
        .row { margin-top: 8px; }
      </style>
      <div class="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Pick a day">
        <div class="hd">
          <div class="nav">
            <button class="btn prev" aria-label="Previous month">◀</button>
            <button class="btn next" aria-label="Next month">▶</button>
          </div>
          <h3 class="title">${monthName}</h3>
          <button class="btn close" aria-label="Close">Close</button>
        </div>
        <div class="grid">
          <div class="dow">Sun</div><div class="dow">Mon</div><div class="dow">Tue</div><div class="dow">Wed</div><div class="dow">Thu</div><div class="dow">Fri</div><div class="dow">Sat</div>
          ${cells.map(dayCell).join('')}
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      prev: this._shadow.querySelector('.prev'),
      next: this._shadow.querySelector('.next'),
      close: this._shadow.querySelector('.close'),
    };
    this._els.backdrop?.addEventListener('click', () => this.close());
    this._els.close?.addEventListener('click', () => this.close());
    this._els.prev?.addEventListener('click', this._onPrev);
    this._els.next?.addEventListener('click', this._onNext);
    this._shadow.querySelectorAll('button.day')?.forEach((b) => b.addEventListener('click', this._onDayClick));

    // Update nav button states:
    // - Prev disabled if we're already at or before earliest saved month.
    // - Next disabled if we're at current month (no future navigation allowed at all).
    if (this._els.prev) this._els.prev.disabled = (this._monthOffset <= minOffset);
    if (this._els.next) this._els.next.disabled = (this._monthOffset >= 0);
  }
}
customElements.define('day-picker-modal', DayPickerModal);

function getDayPickerModal() {
  let m = document.querySelector('day-picker-modal');
  if (!m) { m = document.createElement('day-picker-modal'); document.body.appendChild(m); }
  return m;
}

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
      .register('./sw.js')
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
  // Export both profiles and daily history in one file (backward compatible import)
  const profiles = loadProfilesData();
  const days = loadDaysData();
  const payload = { version: 1, profilesData: profiles, daysData: days };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'drawer-data.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('Exported data', { type: 'success', duration: 1800 });
}
function openImportDialog(headerEl) {
  let inp = document.getElementById('import-profiles-input');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json'; inp.id = 'import-profiles-input'; inp.style.display = 'none'; document.body.appendChild(inp); }
  inp.onchange = async () => {
    try {
      const file = inp.files && inp.files[0]; if (!file) return;
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!imported || typeof imported !== 'object') { toast('Invalid import file', { type: 'error', duration: 2500 }); return; }
      // Support new combined format { version, profilesData, daysData }
      if (imported.profilesData || imported.daysData) {
        const pCurrent = loadProfilesData();
        const dCurrent = loadDaysData();
        const pIn = imported.profilesData || { profiles: {}, activeId: 'default' };
        const dIn = imported.daysData || {};
        // Merge profiles
        pCurrent.profiles = { ...pCurrent.profiles, ...(pIn.profiles || {}) };
        if (pIn.activeId) pCurrent.activeId = pIn.activeId;
        saveProfilesData(pCurrent);
        // Merge days
        const dMerged = { ...dCurrent };
        for (const pid of Object.keys(dIn)) {
          const curEntry = dMerged[pid] || { lastVisitedDate: null, days: {} };
          const inEntry = dIn[pid] || { lastVisitedDate: null, days: {} };
          curEntry.days = { ...curEntry.days, ...(inEntry.days || {}) };
          // Prefer imported lastVisitedDate if provided
          curEntry.lastVisitedDate = inEntry.lastVisitedDate || curEntry.lastVisitedDate || null;
          dMerged[pid] = curEntry;
        }
        saveDaysData(dMerged);
        populateProfilesSelect(headerEl);
        restoreActiveProfile();
        updateStatusPill(headerEl);
        toast('Imported data', { type: 'success', duration: 2000 });
      } else if (imported.profiles) {
        // Backward-compat: old profiles-only format
        const current = loadProfilesData();
        current.profiles = { ...current.profiles, ...imported.profiles };
        if (imported.activeId) current.activeId = imported.activeId;
        saveProfilesData(current);
        populateProfilesSelect(headerEl);
        restoreActiveProfile();
        updateStatusPill(headerEl);
        toast('Imported profiles', { type: 'success', duration: 2000 });
      } else {
        toast('Invalid import file', { type: 'error', duration: 2500 });
        return;
      }
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
  // Update CSS var for header height so content padding matches fixed header
  const root = document.documentElement;
  const hdr = document.querySelector('header.app-header');
  const setHeaderVar = () => {
    if (!hdr) return;
    const h = hdr.offsetHeight || 64;
    root.style.setProperty('--header-h', `${h}px`);
  };
  setHeaderVar();
  // Observe header size changes (e.g., responsive wraps)
  try {
    if (window.ResizeObserver && hdr) {
      const ro = new ResizeObserver(() => setHeaderVar());
      ro.observe(hdr);
    } else {
      window.addEventListener('resize', setHeaderVar);
      setTimeout(setHeaderVar, 250); // after fonts/layout settle
    }
  } catch(_) { /* no-op */ }

  const comp = getDrawerComponent();
  if (!comp) return;
  ensureProfilesInitialized();
  // Restore from active profile if exists
  restoreActiveProfile();
  // If it's a new day, start fresh automatically
  ensureDayResetIfNeeded(document.querySelector('app-header'));
  // Ensure view date defaults to today on fresh load
  setActiveViewDateKey(getTodayKey());
  applyReadOnlyByActiveDate(document.querySelector('app-header'));
  const header = document.querySelector('app-header');
  // Update initial status
  if (header) { populateProfilesSelect(header); updateStatusPill(header); }
  // Listen for changes to update status and auto-save
  comp.addEventListener('change', () => {
    _debouncedSaveWithProfiles(header);
    // Auto-save snapshot for the active view day
    try {
      const key = getActiveViewDateKey();
      saveSpecificDay(key);
    } catch(_) {}
  });
});

// Daily history — per profile, keyed by local YYYY-MM-DD
const DRAWER_DAYS_KEY = 'drawer-days-v1';
function _formatDateLocalYMD(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}
function getTodayKey() { return _formatDateLocalYMD(new Date()); }
function loadDaysData() {
  try { const raw = localStorage.getItem(DRAWER_DAYS_KEY); const parsed = raw ? JSON.parse(raw) : {}; return parsed && typeof parsed==='object' ? parsed : {}; } catch(_) { return {}; }
}
function saveDaysData(data) { try { localStorage.setItem(DRAWER_DAYS_KEY, JSON.stringify(data)); return true; } catch(_) { return false; } }
function _getActiveDaysEntry(createIfMissing = true) {
  const data = loadDaysData(); const pid = getActiveProfileId();
  if (!data[pid] && createIfMissing) data[pid] = { lastVisitedDate: null, days: {} };
  return { data, pid, entry: data[pid] || { lastVisitedDate: null, days: {} } };
}
function listSavedDaysForActiveProfile() {
  const { entry } = _getActiveDaysEntry(false);
  const days = entry.days || {};
  const arr = Object.keys(days).map((k) => ({ date: k, savedAt: days[k]?.savedAt || 0 }));
  arr.sort((a,b) => (b.date.localeCompare(a.date)) || (b.savedAt - a.savedAt));
  return arr;
}
function saveTodayToDays() {
  const comp = getDrawerComponent(); if (!comp?.getState) return false;
  const { data, pid, entry } = _getActiveDaysEntry(true);
  const key = getTodayKey();
  entry.days = entry.days || {};
  // Preserve any existing label
  const prev = entry.days[key] || {};
  entry.days[key] = { state: comp.getState(), savedAt: Date.now(), label: prev.label || '' };
  entry.lastVisitedDate = key;
  data[pid] = entry;
  return saveDaysData(data);
}
function saveSpecificDay(key) {
  const comp = getDrawerComponent(); if (!comp?.getState) return false;
  const { data, pid, entry } = _getActiveDaysEntry(true);
  const k = key || getTodayKey();
  entry.days = entry.days || {};
  const prev = entry.days[k] || {};
  entry.days[k] = { state: comp.getState(), savedAt: Date.now(), label: prev.label || '' };
  data[pid] = entry; return saveDaysData(data);
}
function restoreDay(key) {
  const comp = getDrawerComponent(); if (!comp?.setState) return false;
  const { data, pid, entry } = _getActiveDaysEntry(false);
  const rec = entry.days?.[key]; if (!rec || !rec.state) return false;
  try { comp.setState(rec.state); // Update lastVisited to this key so subsequent loads don't auto-clear immediately
    entry.lastVisitedDate = getTodayKey(); // still track today for auto-clear behavior
    data[pid] = entry; saveDaysData(data);
    return true; } catch(_) { return false; }
}
function deleteDay(key) {
  const { data, pid, entry } = _getActiveDaysEntry(false);
  if (!entry.days || !entry.days[key]) return false;
  try { delete entry.days[key]; data[pid] = entry; return saveDaysData(data); } catch(_) { return false; }
}
function setDayLabel(key, label) {
  try {
    const { data, pid, entry } = _getActiveDaysEntry(false);
    if (!entry.days || !entry.days[key]) return false;
    entry.days[key].label = String(label || '');
    data[pid] = entry;
    return saveDaysData(data);
  } catch(_) { return false; }
}
function ensureDayResetIfNeeded(headerEl) {
  try {
    const { data, pid, entry } = _getActiveDaysEntry(true);
    const today = getTodayKey();
    if (entry.lastVisitedDate !== today) {
      const comp = getDrawerComponent();
      comp?.reset?.();
      entry.lastVisitedDate = today;
      data[pid] = entry;
      saveDaysData(data);
      if (headerEl) updateStatusPill(headerEl);
      toast('New day detected. Starting fresh.', { type: 'info', duration: 2200 });
    }
  } catch(_) { /* ignore */ }
}

// Active view date + edit lock management (per profile)
function getActiveViewDateKey() {
  try {
    const { data, pid, entry } = _getActiveDaysEntry(true);
    entry._activeViewDateKey = entry._activeViewDateKey || getTodayKey();
    data[pid] = entry; saveDaysData(data);
    return entry._activeViewDateKey;
  } catch(_) { return getTodayKey(); }
}
function setActiveViewDateKey(key) {
  try {
    const { data, pid, entry } = _getActiveDaysEntry(true);
    entry._activeViewDateKey = key || getTodayKey();
    data[pid] = entry; saveDaysData(data);
  } catch(_) { /* ignore */ }
}
function isDayEditUnlocked() {
  try {
    const { entry } = _getActiveDaysEntry(true);
    return !!entry._editUnlocked;
  } catch(_) { return false; }
}
function setDayEditUnlocked(flag) {
  try {
    const { data, pid, entry } = _getActiveDaysEntry(true);
    entry._editUnlocked = !!flag;
    data[pid] = entry; saveDaysData(data);
  } catch(_) { /* ignore */ }
}
function applyReadOnlyByActiveDate(headerEl) {
  try {
    const comp = getDrawerComponent(); if (!comp?.setReadOnly) return;
    const today = getTodayKey();
    const key = getActiveViewDateKey();
    const ro = key !== today && !isDayEditUnlocked();
    comp.setReadOnly(ro);
    updateLockButtonUI(headerEl);
  } catch(_) {}
}
function updateLockButtonUI(headerEl) {
  try {
    const header = headerEl || document.querySelector('app-header');
    const btn = header?.querySelector('.lock-btn');
    const today = getTodayKey();
    const key = getActiveViewDateKey();
    const ro = key !== today && !isDayEditUnlocked();
    if (btn) {
      btn.textContent = ro ? '🔒' : '🔓';
      btn.title = ro ? 'Toggle edit lock (locked)' : 'Toggle edit lock (unlocked)';
      btn.disabled = (key === today); // today always editable
    }
  } catch(_) {}
}
