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
  try {
    document.querySelectorAll('app-header .theme-toggle')
      .forEach((btn) => { btn.textContent = t === 'dark' ? '🌙' : '☀️'; });
  } catch (_) {}
  // Update theme-color meta for consistent PWA UI
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0b132b' : '#f7f9ff');
  // Sync body background overlay with current theme
  try { updateBodyBackground(t); } catch (_) {}
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}
// --- Random background image handling ---
// Available hero images (add filenames placed in ./src/images/)
const BG_IMAGES = [
  '1g-eclipse-bg',
  'crownvic-bg',
  'eclipse-challenge-bg',
  'vw-bg',
];
const BG_IMAGE_BASE = './src/images/';
let CURRENT_BG_URL = null;
let SUPPORTS_WEBP = null;
let BG_LAYER_EL = null;

function detectWebpSupport() {
  if (SUPPORTS_WEBP !== null) return SUPPORTS_WEBP;
  try {
    const c = document.createElement('canvas');
    if (!!(c.getContext && c.getContext('2d'))) {
      SUPPORTS_WEBP = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } else {
      SUPPORTS_WEBP = false;
    }
  } catch (_) { SUPPORTS_WEBP = false; }
  return SUPPORTS_WEBP;
}

function pickRandomBackgroundUrl() {
  try {
    const list = Array.isArray(BG_IMAGES) && BG_IMAGES.length ? BG_IMAGES : ['1g-eclipse-bg.png'];
    const idx = Math.floor(Math.random() * list.length);
    const base = list[idx] || list[0];
    const useWebp = detectWebpSupport();
    return `${BG_IMAGE_BASE}${base}${useWebp ? '.webp' : '.png'}`;
  } catch (_) {
    const useWebp = detectWebpSupport();
    return `${BG_IMAGE_BASE}1g-eclipse-bg${useWebp ? '.webp' : '.png'}`;
  }
}

function updateBodyBackground(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  if (!CURRENT_BG_URL) CURRENT_BG_URL = pickRandomBackgroundUrl();
  const overlay = t === 'light'
    ? 'linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7))'
    : 'linear-gradient(rgba(7, 10, 26, 0.50), rgba(7, 10, 26, 0.50))';
  // Ensure bg layer exists
  if (!BG_LAYER_EL) {
    BG_LAYER_EL = document.getElementById('bg-layer');
    if (!BG_LAYER_EL) {
      BG_LAYER_EL = document.createElement('div');
      BG_LAYER_EL.id = 'bg-layer';
      document.body.prepend(BG_LAYER_EL);
    }
  }

  // Preload image to avoid flashing, then apply and fade in
  const img = new Image();
  img.onload = () => {
    BG_LAYER_EL.style.backgroundImage = `url("${CURRENT_BG_URL}")`;
    // Trigger fade-in
    requestAnimationFrame(() => BG_LAYER_EL.classList.add('show'));
  };
  img.onerror = () => {
    // Fallback: set directly without fade to avoid blank bg
    BG_LAYER_EL.style.backgroundImage = `url("${CURRENT_BG_URL}")`;
    BG_LAYER_EL.classList.add('show');
  };
  // Start (re)loading
  BG_LAYER_EL.classList.remove('show');
  img.src = CURRENT_BG_URL;

  // Apply overlay to body (top layer)
  document.body.style.backgroundImage = `${overlay}`;
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundPosition = 'left 5vh';
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundAttachment = 'fixed';
}

// Apply theme (without persisting) so that lack of stored value means "System" mode
// Also initializes a random background image on first run.
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
      // Set the active view date to the selected key before restoring
      setActiveViewDateKey(key);
      const ok = restoreDay(key);
      const header = document.querySelector('app-header');
      updateStatusPill(header);
      applyReadOnlyByActiveDate(header); // ensure lock state and UI are in sync
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
    this._onOptional = this._onOptional.bind(this);
    this._onPanelToggle = this._onPanelToggle.bind(this);
    this._onProfileChange = this._onProfileChange.bind(this);
    this._onNewProfile = this._onNewProfile.bind(this);
    this._onDeleteProfile = this._onDeleteProfile.bind(this);
    this._onClear = this._onClear.bind(this);
    this._onOpenDays = this._onOpenDays.bind(this);
    this._onToggleLock = this._onToggleLock.bind(this);
    this._onMenuToggle = this._onMenuToggle.bind(this);
    this._onWindowKey = this._onWindowKey.bind(this);
    this._onOutsideClick = this._onOutsideClick.bind(this);
  }
  connectedCallback() {
    const title = this.getAttribute('title') || 'Drawer Count';
    this.innerHTML = `
      <style>
        :host { display: block; width: 100%; }
        /* Mobile-first: stack title on first row, actions below, allow wrapping */
        .bar { display: grid; align-items: center; gap: .35rem; grid-template-columns: 1fr auto; grid-template-areas: "title title" "left right"; position: relative; }
        .title { grid-area: title; text-align: center; margin: 0; font-size: clamp(1rem, 3.5vw, 1.1rem); letter-spacing: .2px; }
        .left { grid-area: left; justify-self: start; display: flex; gap: .35rem; align-items: center; flex-wrap: wrap; }
        .right { grid-area: right; justify-self: end; display: flex; gap: .35rem; align-items: center; flex-wrap: wrap; }
        .icon-btn, .action-btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; cursor: pointer; min-height: 44px; }
        .action-btn { font-weight: 600; }
    select.profile-select { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; min-height: 44px; min-width: 0; max-width: min(55vw, 320px); }
  .status-pill { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border, #2a345a); font-size: .85rem; }
        .status-pill.saved { background: #12371f; color: #baf0c3; border-color: #2a5a3a; }
        .status-pill.dirty { background: #42201e; color: #ffd6d6; border-color: #5a2a2a; }
  /* server status pill moved out of header */
        /* Visually hidden but accessible label */
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,1px,1px); white-space: nowrap; border: 0; }

        /* Hamburger + menu (mobile) */
        .menu-toggle { display: inline-flex; align-items: center; justify-content: center; background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 10px; cursor: pointer; min-height: 44px; }
        .menu-toggle[aria-expanded="true"] { filter: brightness(1.08); }
        .nav-menu { position: absolute; right: 0; top: 100%; margin-top: 8px; background: var(--card, #1c2541); color: var(--fg, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 8px; z-index: 50; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); min-width: 220px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; opacity: 0; transform: translateY(-6px) scale(0.98); visibility: hidden; pointer-events: none; transition: opacity 140ms ease, transform 140ms ease, visibility 0s linear 140ms; }
  .nav-menu.open { opacity: 1; transform: translateY(0) scale(1); visibility: visible; pointer-events: auto; transition-delay: 0s; }
        .nav-menu .row { display: contents; }
        .nav-menu .icon-btn { width: 100%; min-height: 40px; }

  /* Backdrop for focus when menu open with fade */
  /* Note: keep blur only when visible to avoid lingering blur artifacts on some browsers */
  .menu-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.25); z-index: 40; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 140ms ease, visibility 0s linear 140ms; }
  .menu-backdrop.show { opacity: 1; visibility: visible; transition-delay: 0s; backdrop-filter: blur(1px); pointer-events: auto; }

        /* Very small screens: single column for larger tap targets */
        @media (max-width: 380px) {
          .nav-menu { grid-template-columns: 1fr; min-width: 180px; }
        }

        /* On small screens, hide the inline right actions and show hamburger */
        .right.inline-actions { display: none; }
        .right.menu-area { display: inline-flex; }
        
        /* Wider screens: put left | title | right on one row */
        @media (min-width: 600px) {
          .bar { grid-template-columns: 1fr auto 1fr; grid-template-areas: "left title right"; }
          .left, .right { flex-wrap: nowrap; }
          .right.inline-actions { display: flex; }
          .right.menu-area { display: none; }
          .nav-menu { display: none !important; }
          .menu-backdrop { display: none !important; }
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
        <div class="actions right inline-actions">
          <button class="icon-btn panel-toggle-btn" aria-label="Show/Hide count panel" title="Show/Hide count panel">⬒</button>
          <button class="icon-btn optional-btn" aria-label="Optional fields" title="Optional fields">🧾</button>
          <button class="icon-btn days-btn" aria-label="Daily history" title="Daily history">📅</button>
          <button class="icon-btn lock-btn" aria-label="Toggle edit lock" title="Toggle edit lock">🔒</button>
          <button class="icon-btn clear-btn" aria-label="Clear inputs" title="Clear inputs">🧹</button>
          <button class="icon-btn settings-btn" aria-label="Settings" title="Settings">⚙️</button>
          <button class="icon-btn theme-toggle" aria-label="Toggle theme" title="Toggle theme">${(document.documentElement.getAttribute('data-theme')||getPreferredTheme())==='dark'?'🌙':'☀️'}</button>
          <button class="icon-btn info-btn" aria-label="Help" title="Help">?</button>
        </div>
        <div class="right menu-area">
          <button class="menu-toggle" aria-label="Menu" aria-expanded="false" aria-haspopup="true">☰</button>
          <div class="nav-menu" role="menu">
            <div class="row">
              <button class="icon-btn panel-toggle-btn" role="menuitem" aria-label="Show/Hide count panel" title="Show/Hide count panel">⬒</button>
              <button class="icon-btn optional-btn" role="menuitem" aria-label="Optional fields" title="Optional fields">🧾</button>
              <button class="icon-btn days-btn" role="menuitem" aria-label="Daily history" title="Daily history">📅</button>
              <button class="icon-btn lock-btn" role="menuitem" aria-label="Toggle edit lock" title="Toggle edit lock">🔒</button>
              <button class="icon-btn clear-btn" role="menuitem" aria-label="Clear inputs" title="Clear inputs">🧹</button>
              <button class="icon-btn settings-btn" role="menuitem" aria-label="Settings" title="Settings">⚙️</button>
              <button class="icon-btn theme-toggle" role="menuitem" aria-label="Toggle theme" title="Toggle theme">${(document.documentElement.getAttribute('data-theme')||getPreferredTheme())==='dark'?'🌙':'☀️'}</button>
              <button class="icon-btn info-btn" role="menuitem" aria-label="Help" title="Help">?</button>
            </div>
          </div>
          <div class="menu-backdrop" aria-hidden="true"></div>
        </div>
      </div>`;
    // Bind events for actions (both inline and in menu)
    this.querySelectorAll('.settings-btn')?.forEach((el) => el.addEventListener('click', this._onSettings));
    this.querySelectorAll('.theme-toggle')?.forEach((el) => el.addEventListener('click', this._onTheme));
    this.querySelectorAll('.info-btn')?.forEach((el) => el.addEventListener('click', this._onHelp));
  this.querySelectorAll('.panel-toggle-btn')?.forEach((el) => el.addEventListener('click', this._onPanelToggle));
    // actions moved into settings modal
    this.querySelector('.profile-select')?.addEventListener('change', this._onProfileChange);
    this.querySelector('.new-profile-btn')?.addEventListener('click', this._onNewProfile);
    this.querySelector('.delete-profile-btn')?.addEventListener('click', this._onDeleteProfile);
    this.querySelectorAll('.clear-btn')?.forEach((el) => el.addEventListener('click', this._onClear));
    this.querySelectorAll('.optional-btn')?.forEach((el) => el.addEventListener('click', this._onOptional));
    this.querySelectorAll('.days-btn')?.forEach((el) => el.addEventListener('click', this._onOpenDays));
    this.querySelectorAll('.lock-btn')?.forEach((el) => el.addEventListener('click', this._onToggleLock));
    // Menu interactions
    this.querySelector('.menu-toggle')?.addEventListener('click', this._onMenuToggle);
  window.addEventListener('keydown', this._onWindowKey);
  window.addEventListener('click', this._onOutsideClick, true);
  this.querySelector('.menu-backdrop')?.addEventListener('click', () => this._closeMenu());

    // Initialize profiles UI (prefer remote if available before seeding defaults)
    (async () => {
      try {
        await initProfilesFromRemoteIfAvailable();
      } catch (_) { /* ignore */ }
      try { ensureProfilesInitialized(); } catch (_) {}
      try { populateProfilesSelect(this); updateStatusPill(this); updateLockButtonUI(this); } catch (_) {}
    })();
  }
  _onTheme() { toggleTheme(); }
  _onHelp() { getHelpModal().open(); }
  _onSettings() { getSettingsModal().open(); }
  _onOptional() { getOptionalFieldsModal().open(); }
  _onPanelToggle() {
    try {
      const panel = document.querySelector('count-panel');
      if (panel && typeof panel.toggleCollapsed === 'function') {
        panel.toggleCollapsed();
      } else if (panel) {
        // Fallback: flip aria-expanded based on current state
        const body = panel.querySelector('.panel-body');
        const summary = panel.querySelector('.panel-summary');
        const visible = panel.classList.contains('completed') ? summary : body;
        const isCollapsed = (visible?.getAttribute('aria-hidden') === 'true') || (visible?.hidden === true);
        const btn = panel.querySelector('.toggle-btn');
        btn?.click?.(); // reuse panel’s own toggle logic
      }
    } catch(_) {}
  }
  // data actions now live in settings modal
  _onProfileChange(e) { try { const id = e.target?.value; if (!id) return; setActiveProfile(id); restoreActiveProfile(); ensureDayResetIfNeeded(this); setActiveViewDateKey(getTodayKey()); applyReadOnlyByActiveDate(this); populateProfilesSelect(this); updateStatusPill(this); toast('Switched profile', { type:'info', duration: 1200}); } catch(_){} }
  async _onNewProfile() { try { const modal = getNewProfileModal(); const name = await modal.open(''); if (!name) return; const id = createProfile(name); setActiveProfile(id); saveToActiveProfile(); populateProfilesSelect(this); updateStatusPill(this); applyReadOnlyByActiveDate(this); toast('Profile created', { type: 'success', duration: 1800 }); } catch(_){} }
  async _onDeleteProfile() { try { const data = loadProfilesData(); const ids = Object.keys(data.profiles||{}); if (ids.length<=1) { toast('Cannot delete last profile', { type:'warning', duration: 2200}); return; } const active = data.activeId; const name = data.profiles[active]?.name || active; const modal = getDeleteProfileModal(); const ok = await modal.open(name); if (!ok) return; delete data.profiles[active]; const nextId = ids.find((x)=>x!==active) || 'default'; data.activeId = nextId; saveProfilesData(data); restoreActiveProfile(); populateProfilesSelect(this); updateStatusPill(this); applyReadOnlyByActiveDate(this); toast('Profile deleted', { type:'success', duration: 1800}); } catch(_){} }
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
  _closeMenu() {
    try {
      const menu = this.querySelector('.nav-menu');
      const btn = this.querySelector('.menu-toggle');
      if (menu && menu.classList.contains('open')) {
        menu.classList.remove('open');
        btn?.setAttribute('aria-expanded', 'false');
        this.querySelector('.menu-backdrop')?.classList.remove('show');
      }
    } catch(_) {}
  }
  disconnectedCallback() {
    // Clean up global listeners added for menu
    window.removeEventListener('keydown', this._onWindowKey);
    window.removeEventListener('click', this._onOutsideClick, true);
  }
  _onMenuToggle(e) {
    try {
      const btn = this.querySelector('.menu-toggle');
      const menu = this.querySelector('.nav-menu');
      if (!btn || !menu) return;
  const open = menu.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  const backdrop = this.querySelector('.menu-backdrop');
  if (backdrop) backdrop.classList.toggle('show', open);
      if (open) {
        // focus first item for accessibility
        setTimeout(() => { try { menu.querySelector('button')?.focus(); } catch(_) {} }, 0);
      }
      e?.stopPropagation?.();
    } catch(_) {}
  }
  _onWindowKey(e) {
    if (e.key === 'Escape') {
      const menu = this.querySelector('.nav-menu');
      const btn = this.querySelector('.menu-toggle');
      if (menu && menu.classList.contains('open')) {
        menu.classList.remove('open');
        btn?.setAttribute('aria-expanded', 'false');
        this.querySelector('.menu-backdrop')?.classList.remove('show');
      }
    }
  }
  _onOutsideClick(e) {
    try {
      const menu = this.querySelector('.nav-menu');
      const btn = this.querySelector('.menu-toggle');
      if (!menu || !btn) return;
      if (!menu.classList.contains('open')) return;
      const path = e.composedPath ? e.composedPath() : [];
      const backdrop = this.querySelector('.menu-backdrop');
      const clickedInside = path.includes(menu) || path.includes(btn) || path.includes(backdrop);
      if (!clickedInside) {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        this.querySelector('.menu-backdrop')?.classList.remove('show');
      }
    } catch(_) {}
  }
}
customElements.define('app-header', AppHeader);

// Web Component: <optional-fields-modal> — edit optional daily fields in a modal
class OptionalFieldsModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onSave = this._onSave.bind(this);
  }
  connectedCallback() { if (!this._rendered) this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 10% auto auto 50%; transform: translateX(-50%);
          max-width: min(560px, 92vw); background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 14px; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        .grid { display: grid; gap: .5rem; }
        .row { display: grid; grid-template-columns: 1fr auto; gap: .5rem; align-items: center; }
        label { font-size: .95rem; }
        input { min-width: 140px; justify-self: end; background: var(--input-bg-color, #0000000f); color: var(--fg, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 6px 8px; }
        .actions { display:flex; justify-content: end; gap: 8px; margin-top: 10px; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 8px; padding: 8px 12px; cursor: pointer; min-height: 40px; font-weight: 600; }
        .note { color: var(--muted, #9aa3b2); font-size: .9rem; margin: 4px 0 8px; }
      </style>
      <div class="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Optional fields">
        <div class="hd">
          <h2>Optional Daily Fields</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <div class="note">These values are saved with the day but do not affect totals.</div>
        <div class="grid">
          <div class="row"><label for="m-charges">Charges</label><input id="m-charges" type="number" step="0.01" inputmode="decimal" /></div>
          <div class="row"><label for="m-total-received">Total Received</label><input id="m-total-received" type="number" step="0.01" inputmode="decimal" /></div>
          <div class="row"><label for="m-net-sales">Net Sales</label><input id="m-net-sales" type="number" step="0.01" inputmode="decimal" /></div>
          <div class="row"><label for="m-gp-amount">Gross Profit Amount ($)</label><input id="m-gp-amount" type="number" step="0.01" inputmode="decimal" /></div>
          <div class="row"><label for="m-gp-percent">Gross Profit Percentage (%)</label><input id="m-gp-percent" type="number" step="0.01" inputmode="decimal" /></div>
          <div class="row"><label for="m-num-invoices">Number of Invoices</label><input id="m-num-invoices" type="number" step="1" min="0" inputmode="numeric" /></div>
          <div class="row"><label for="m-num-voids">Number of Voids</label><input id="m-num-voids" type="number" step="1" min="0" inputmode="numeric" /></div>
        </div>
        <div class="actions">
          <button class="btn cancel-btn" aria-label="Cancel">Cancel</button>
          <button class="btn save-btn" aria-label="Save">Save</button>
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      close: this._shadow.querySelector('.close'),
      save: this._shadow.querySelector('.save-btn'),
      cancel: this._shadow.querySelector('.cancel-btn'),
      charges: this._shadow.querySelector('#m-charges'),
      totalReceived: this._shadow.querySelector('#m-total-received'),
      netSales: this._shadow.querySelector('#m-net-sales'),
      gpAmount: this._shadow.querySelector('#m-gp-amount'),
      gpPercent: this._shadow.querySelector('#m-gp-percent'),
      numInvoices: this._shadow.querySelector('#m-num-invoices'),
      numVoids: this._shadow.querySelector('#m-num-voids')
    };
    this._els.backdrop?.addEventListener('click', () => this.close());
    this._els.close?.addEventListener('click', () => this.close());
    this._els.cancel?.addEventListener('click', () => this.close());
    this._els.save?.addEventListener('click', this._onSave);
    this._rendered = true;
  }
  open() {
    // Populate from drawer component's hidden inputs/state
    try {
      const comp = getDrawerComponent();
      const sr = comp?.shadowRoot;
      const getVal = (sel) => Number(sr?.querySelector(sel)?.value || 0);
      this._els.charges.value = getVal('#opt-charges') || 0;
      this._els.totalReceived.value = getVal('#opt-total-received') || 0;
      this._els.netSales.value = getVal('#opt-net-sales') || 0;
      this._els.gpAmount.value = getVal('#opt-gp-amount') || 0;
      this._els.gpPercent.value = getVal('#opt-gp-percent') || 0;
      this._els.numInvoices.value = getVal('#opt-num-invoices') || 0;
      this._els.numVoids.value = getVal('#opt-num-voids') || 0;
      // Respect read-only state
      const ro = !!sr?.querySelector('input')?.disabled && !isDayEditUnlocked();
      const disabled = ro;
      [this._els.charges, this._els.totalReceived, this._els.netSales, this._els.gpAmount, this._els.gpPercent, this._els.numInvoices, this._els.numVoids, this._els.save]
        .forEach((el) => { if (el) el.disabled = disabled; });
    } catch(_) {}
    this.setAttribute('open', '');
  }
  close() { this.removeAttribute('open'); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); }
  _onSave() {
    try {
      const comp = getDrawerComponent(); const sr = comp?.shadowRoot; if (!sr) return;
      const set = (sel, v) => { const el = sr.querySelector(sel); if (el) { el.value = Number(v) || 0; el.dispatchEvent(new Event('input', { bubbles: true })); } };
      set('#opt-charges', this._els.charges.value);
      set('#opt-total-received', this._els.totalReceived.value);
      set('#opt-net-sales', this._els.netSales.value);
      set('#opt-gp-amount', this._els.gpAmount.value);
      set('#opt-gp-percent', this._els.gpPercent.value);
      set('#opt-num-invoices', this._els.numInvoices.value);
      set('#opt-num-voids', this._els.numVoids.value);
      // Auto-save snapshot for active day
      try { const key = getActiveViewDateKey(); saveSpecificDay(key); } catch(_) {}
      // Update status pill
      try { const header = document.querySelector('app-header'); updateStatusPill(header); } catch(_) {}
      toast('Optional fields saved', { type: 'success', duration: 1600 });
    } catch(_) { toast('Save failed', { type: 'error', duration: 2000 }); }
    this.close();
  }
}
customElements.define('optional-fields-modal', OptionalFieldsModal);

function getOptionalFieldsModal() {
  let m = document.querySelector('optional-fields-modal');
  if (!m) { m = document.createElement('optional-fields-modal'); document.body.appendChild(m); }
  return m;
}

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
    const header = document.querySelector('app-header');
    updateStatusPill(header);
    // Apply readonly rules and update lock button/icon/tooltip for the newly selected day
    applyReadOnlyByActiveDate(header);
    // If selecting a previous date (not today), show the Completed summary panel
    try {
      const today = getTodayKey();
      if (key !== today) {
        const panel = document.querySelector('count-panel');
        if (panel && typeof panel.showCompletedSummary === 'function') {
          panel.showCompletedSummary();
        }
      }
    } catch (_) { /* ignore */ }
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
    this._onIOSHelp = this._onIOSHelp.bind(this);
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
    this._iosMode = false; // when true, show iOS instructions instead of prompt
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

  _isDismissed() {
    return this._dismissed === true;
  }
  _isIOS() {
    // iOS Safari doesn’t fire beforeinstallprompt; detect iPhone/iPad/iPod and iPadOS (Mac UA + touch)
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isIOSUA = /iphone|ipad|ipod/i.test(ua);
    const isIpadOSMasquerade = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isIOSUA || isIpadOSMasquerade;
  }
  _onIOSHelp() {
    // Brief instructions via toast; keep it simple and non-blocking
    try {
      const isIpad = /ipad/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const device = isIpad ? 'iPad' : 'iPhone';
      toast(`Install on ${device}: In Safari, tap Share (square with ↑), then "Add to Home Screen".`, { type: 'info', duration: 5000 });
    } catch (_) {}
  }
  _showIOS() {
    // Show instructions banner for iOS devices where install prompt isn’t available
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
    this._tickHealth = this._tickHealth.bind(this);
    this._offline = null; // unknown initially
    this._server = { cls: 'warn', short: 'N/A', title: 'Server: n/a' };
    this._timer = null;
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

    // Start server health polling
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
    this._render();
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

  async _tickHealth() {
    try {
      const offline = !navigator.onLine;
      let cls = 'warn';
      let short = 'N/A';
      let title = 'Server: n/a';
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
    } catch (_) { /* ignore */ }
  }

  _render() {
    const offline = !!this._offline;
    const label = offline ? 'Offline' : 'Online';
    const { cls, short, title } = this._server || { cls: 'warn', short: 'N/A', title: 'Server: n/a' };
    this.innerHTML = `
      <span class="dot" aria-hidden="true"></span>
      <span class="label">${label}</span>
      <span class="server-badge ${cls}" title="${title}"><span class="icon" aria-hidden="true">🗄️</span><span class="text">${short}</span></span>
    `;
  }
}
customElements.define('network-status', NetworkStatus);

// Collapsible wrapper for <drawer-count>: <count-panel>
// Allows a simple flow: Start → (counting) → Mark complete → Reopen, with Hide/Show toggle.
// Persists UI state per active profile and day.
class CountPanel extends HTMLElement {
  constructor() {
    super();
    this._els = {};
    this._state = { started: false, collapsed: true, completed: false };
    this._onStart = this._onStart.bind(this);
    this._onToggle = this._onToggle.bind(this);
    this._onComplete = this._onComplete.bind(this);
    this._onReopen = this._onReopen.bind(this);
    this._onVisibilityRefresh = this._onVisibilityRefresh.bind(this);
  }

  connectedCallback() {
    this._render();
    this._cacheEls();
    this._bind();
    // Ensure a drawer element exists inside panel body (light DOM so existing code sees it)
    if (!this.querySelector('drawer-count')) {
      const dc = document.createElement('drawer-count');
      this._els.body.appendChild(dc);
    }
  // Initial hydrate from persisted state (no animation on first paint)
  this._refresh(true);
    // Keep in sync if profile/day changes elsewhere
    window.addEventListener('storage', this._onVisibilityRefresh);
    window.addEventListener('focus', this._onVisibilityRefresh);
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._onVisibilityRefresh);
    window.removeEventListener('focus', this._onVisibilityRefresh);
  }

  // --- Rendering ---
  _render() {
    // Simple light-DOM markup so other modules can query <drawer-count>
    this.classList.add('count-panel');
    this.innerHTML = `
      <div class="panel-header" role="group" aria-label="Drawer count controls">
        <div class="panel-title">Today's Count</div>
        <div class="panel-actions">
          <button class="start-btn" type="button">Start count</button>
          <button class="toggle-btn" type="button" aria-expanded="false">Show</button>
          <button class="complete-btn" type="button">Mark complete</button>
          <button class="reopen-btn" type="button">Reopen</button>
        </div>
      </div>
      <div class="panel-body" aria-hidden="true"></div>
      <div class="panel-summary" aria-hidden="true" hidden></div>
      <p class="hint done-hint" hidden>Completed for this day. Tap Reopen to edit.</p>
    `;
  }

  _cacheEls() {
    this._els.header = this.querySelector('.panel-header');
    this._els.title = this.querySelector('.panel-title');
    this._els.actions = this.querySelector('.panel-actions');
    this._els.start = this.querySelector('.start-btn');
    this._els.toggle = this.querySelector('.toggle-btn');
    this._els.complete = this.querySelector('.complete-btn');
    this._els.reopen = this.querySelector('.reopen-btn');
    this._els.body = this.querySelector('.panel-body');
    this._els.doneHint = this.querySelector('.done-hint');
    this._els.summary = this.querySelector('.panel-summary');
  }

  _bind() {
    this._els.start.addEventListener('click', this._onStart);
    this._els.toggle.addEventListener('click', this._onToggle);
    this._els.complete.addEventListener('click', this._onComplete);
    this._els.reopen.addEventListener('click', this._onReopen);
  }

  // --- Persistence helpers (local to this component) ---
  _panelKey() {
    try {
      // Prefer existing helpers if present in this module
      const pid = (typeof getActiveProfileId === 'function') ? getActiveProfileId() : null;
      const dkey = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null;
      if (pid && dkey) return `${pid}::${dkey}`;
    } catch (_) {}
    // Fallback to today + default profile
    const today = new Date();
    const d = today.toISOString().slice(0,10);
    return `default::${d}`;
  }

  _loadPersisted() {
    try {
      const raw = localStorage.getItem('drawer-panel-v1');
      const all = raw ? JSON.parse(raw) : {};
      const key = this._panelKey();
      return all[key] || { started: false, collapsed: true, completed: false };
    } catch (_) {
      return { started: false, collapsed: true, completed: false };
    }
  }

  _savePersisted(next) {
    try {
      const raw = localStorage.getItem('drawer-panel-v1');
      const all = raw ? JSON.parse(raw) : {};
      const key = this._panelKey();
      all[key] = { ...all[key], ...next };
      localStorage.setItem('drawer-panel-v1', JSON.stringify(all));
    } catch (_) {}
  }

  // Public API for external controls (header toggle)
  isCollapsed() { return !!this._state.collapsed; }
  expand() {
    // Do not auto-start; expand only if already started, otherwise keep hidden
    if (!this._state.started) return false;
    this._state.collapsed = false;
    // Do not persist transient expands triggered externally
    this._refresh();
    return true;
  }
  collapse() {
    if (!this._state.started) return false;
    this._state.collapsed = true;
    this._refresh();
    return true;
  }
  toggleCollapsed() {
    if (!this._state.started) return false; // require Start first
    this._state.collapsed = !this._state.collapsed;
    // Persist user-driven toggles during the session/day
    this._savePersisted({ collapsed: this._state.collapsed, started: this._state.started });
    this._refresh();
    return true;
  }

  // Public API: force show the Completed summary for the active profile/day
  // Intended for when a previous date is selected so the user immediately sees the saved result
  showCompletedSummary() {
    this._state.started = true;
    this._state.completed = true;
    this._state.collapsed = false;
    // Persist started/completed for this day; do not persist the expanded state
    this._savePersisted({ started: true, completed: true });
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch (_) {}
    this._refresh();
  }

  // --- UI sync ---
  _refresh(noAnim = false) {
    // Merge persisted into memory state
    this._state = { ...{ started: false, collapsed: true, completed: false }, ...this._loadPersisted() };
    const { started, completed } = this._state;
    // Never show content before start; force collapsed in-memory
    if (!started) this._state.collapsed = true;
    const collapsed = this._state.collapsed;

    // Classes
    this.classList.toggle('collapsed', !!collapsed);
    this.classList.toggle('completed', !!completed);

    // Buttons visibility
    this._els.start.hidden = !!started;
    this._els.toggle.hidden = !started; // only makes sense after start
    this._els.complete.hidden = !started || !!completed;
    this._els.reopen.hidden = !completed;

    // Toggle labels/ARIA
    this._els.toggle.textContent = collapsed ? 'Show' : 'Hide';
    this._els.toggle.setAttribute('aria-expanded', String(!collapsed));

  // Decide which container is visible (summary when completed, body otherwise)
  const container = this._visibleContainer();
  this._syncContainersVisibility();
  // (Re)render summary if needed
  if (completed) this._renderSummary();
  // Animate the currently visible container
  if (collapsed) this._collapseEl(container, !noAnim); else this._expandEl(container, !noAnim);

    // Done hint
    this._els.doneHint.hidden = !completed;
  }

  _expandBody(animate = true) { this._expandEl(this._els.body, animate); }
  _collapseBody(animate = true) { this._collapseEl(this._els.body, animate); }

  _visibleContainer() { return this._state.completed ? this._els.summary : this._els.body; }

  _syncContainersVisibility() {
    const { completed, collapsed } = this._state;
    // When completed: show summary container, hide body content fully
    if (completed) {
      this._els.body.hidden = true;
      this._els.body.setAttribute('aria-hidden', 'true');
      this._els.summary.hidden = !!collapsed; // hidden when collapsed
      this._els.summary.setAttribute('aria-hidden', String(!!collapsed));
    } else {
      this._els.summary.hidden = true;
      this._els.summary.setAttribute('aria-hidden', 'true');
      this._els.body.hidden = !!collapsed;
      this._els.body.setAttribute('aria-hidden', String(!!collapsed));
    }
  }

  _expandEl(el, animate = true) {
    el.setAttribute('aria-hidden', 'false');
    el.hidden = false;
    // If no animation, snap open
    if (!animate) {
      el.style.height = 'auto';
      return;
    }
    // Prepare from 0 to scrollHeight
    el.style.overflow = 'hidden';
    // If height is 'auto', compute current height first
    const target = el.scrollHeight;
    el.style.height = '0px';
    requestAnimationFrame(() => {
      el.style.height = `${target}px`;
      const onEnd = () => {
        el.style.height = 'auto';
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);
    });
  }

  _collapseEl(el, animate = true) {
    el.setAttribute('aria-hidden', 'true');
    // If no animation, snap closed
    if (!animate) {
      el.style.height = '0px';
      el.hidden = false; // keep in DOM for a11y and animations
      return;
    }
    // From current height (might be auto) to 0
    el.style.overflow = 'hidden';
    // Set to current pixel height if auto
    const current = el.scrollHeight;
    el.style.height = `${current}px`;
    // Force a browser reflow by reading offsetHeight.
    // This ensures the transition from the current height to 0px is properly animated.
    el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.height = '0px';
      const onEnd = () => {
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);
    });
  }

  _renderSummary() {
    try {
      const dc = this.querySelector('drawer-count');
      if (!dc || !dc.getCount) return;
      const c = dc.getCount();
      // Optional details require full state
      let st = null;
      try { st = dc.getState?.(); } catch(_) { st = null; }
      const fmt = (n) => {
        const v = Number(n || 0);
        return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
      };
      const ts = c.timestamp ? new Date(c.timestamp) : new Date();
      const cashTotal = [c.hundreds, c.fifties, c.twenties, c.tens, c.fives, c.ones, c.quarters, c.dimes, c.nickels, c.pennies, c.qRolls, c.dRolls, c.nRolls, c.pRolls]
        .map((x) => Number(x || 0)).reduce((a, b) => a + b, 0);
      // Build slips and checks detailed lists if present in state.extra
      const slipsList = Array.isArray(st?.extra?.slips) && st.extra.slips.length
        ? `<ul class="list">${st.extra.slips.map((v,i) => `<li><span class="label">Slip ${i+1}</span><span class="val">${fmt(v)}</span></li>`).join('')}</ul>`
        : '';
      const checksList = Array.isArray(st?.extra?.checks) && st.extra.checks.length
        ? `<ul class="list">${st.extra.checks.map((v,i) => `<li><span class="label">Check ${i+1}</span><span class="val">${fmt(v)}</span></li>`).join('')}</ul>`
        : '';
      // Optional fields if any (non-zero)
      const opt = st?.optional || {};
      const optEntries = [
        ['Charges', opt.charges],
        ['Total Received', opt.totalReceived],
        ['Net Sales', opt.netSales],
        ['Gross Profit ($)', opt.grossProfitAmount],
        ['Gross Profit (%)', opt.grossProfitPercent],
        ['# Invoices', opt.numInvoices],
        ['# Voids', opt.numVoids],
      ].filter(([,v]) => Number(v || 0) !== 0);
      const optList = optEntries.length
        ? `<ul class="list">${optEntries.map(([k,v]) => `<li><span class="label">${k}</span><span class="val">${k.includes('%') ? (Number(v||0).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%') : (k.startsWith('#') ? Number(v||0).toLocaleString() : fmt(v))}</span></li>`).join('')}</ul>`
        : '';

      // Build a richer summary
      this._els.summary.innerHTML = `
        <div class="sum-grid">
          <div class="row"><span class="k">Total Count</span><span class="v">${fmt(c.count)}</span></div>
          <div class="row"><span class="k">Cash</span><span class="v">${fmt(cashTotal)}</span></div>
          <div class="row"><span class="k">Slips</span><span class="v">${fmt(c.slips)}</span></div>
          <div class="row"><span class="k">Checks</span><span class="v">${fmt(c.checks)}</span></div>
          <div class="row"><span class="k">ROA</span><span class="v">${fmt(c.roa)}</span></div>
          <div class="row"><span class="k">Balance</span><span class="v">${fmt(c.balance)}</span></div>
          <div class="row ts"><span class="k">Counted</span><span class="v">${ts.toLocaleString()}</span></div>
        </div>
        ${slipsList ? `<div class="section"><h4>Recorded Slips</h4>${slipsList}</div>` : ''}
        ${checksList ? `<div class="section"><h4>Recorded Checks</h4>${checksList}</div>` : ''}
        ${optList ? `<div class="section"><h4>Optional Fields</h4>${optList}</div>` : ''}
      `;
    } catch (_) { /* ignore */ }
  }

  _focusFirstInput() {
    try {
      const dc = this.querySelector('drawer-count');
      const first = dc?.shadowRoot?.querySelector('input, button, [tabindex="0"]')
        || dc?.querySelector('input, button, [tabindex="0"]');
      if (first && typeof first.focus === 'function') first.focus();
    } catch (_) {}
  }

  // --- Event handlers ---
  _onStart() {
    this._state.started = true;
    this._state.collapsed = false;
    this._state.completed = false;
    this._savePersisted(this._state);
    // Ensure day is editable when starting
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(true); } catch (_) {}
    this._refresh();
    // Focus the first input for quick entry
    queueMicrotask(() => this._focusFirstInput());
  }

  _onToggle() {
    if (!this._state.started) return; // ignore toggles before Start
    this._state.collapsed = !this._state.collapsed;
    this._savePersisted({ collapsed: this._state.collapsed, started: this._state.started });
    this._refresh();
  }

  _onComplete() {
    // Mark complete, collapse, and lock edits
    this._state.completed = true;
    // Auto-expand summary for this session ONLY; do not persist collapsed=false
    // Persist only that it is completed and started
    this._savePersisted({ completed: true, started: true });
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch (_) {}
    // Save snapshot for current day if helpers exist
    try {
      if (typeof getActiveViewDateKey === 'function' && typeof saveSpecificDay === 'function') {
        const key = getActiveViewDateKey();
        if (key) saveSpecificDay(key);
      }
    } catch (_) {}
    // Toast if available
    try { if (typeof toast === 'function') toast('Marked complete for this day.'); } catch (_) {}
    // Show summary now but don't save that it's expanded
    this._state.collapsed = false;
    this._refresh();
  }

  _onReopen() {
    // Reopen edits, expand
    this._state.completed = false;
    this._state.collapsed = false;
    this._state.started = true;
    this._savePersisted(this._state);
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(true); } catch (_) {}
    try { if (typeof toast === 'function') toast('Reopened for editing.'); } catch (_) {}
    this._refresh();
    queueMicrotask(() => this._focusFirstInput());
  }

  _onVisibilityRefresh() {
    // Recalculate in case active profile/day changed
    this._refresh();
  }
}
customElements.define('count-panel', CountPanel);

// ------------------------------
// Drawer persistence — profiles and view/lock state
// ------------------------------
// Storage keys used throughout the app and sync layer
const DRAWER_PROFILES_KEY = 'drawer-profiles-v1';
const DRAWER_DAYS_KEY = 'drawer-days-v1';

function getDrawerComponent() { try { return document.querySelector('drawer-count'); } catch(_) { return null; } }

function loadProfilesData() {
  try {
    const raw = localStorage.getItem(DRAWER_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch(_) { return {}; }
}

function saveProfilesData(data) {
  try {
    localStorage.setItem(DRAWER_PROFILES_KEY, JSON.stringify(data || {}));
    try { _setLocalMeta(DRAWER_PROFILES_KEY, { updatedAt: Date.now() }); _scheduleSyncPush(DRAWER_PROFILES_KEY); } catch(_) {}
    return true;
  } catch(_) { return false; }
}

function ensureProfilesInitialized() {
  // Ensure there is always at least one profile ("default") and a valid activeId
  try {
    const data = loadProfilesData() || {};
    let changed = false;
    const now = Date.now();

    // Ensure profiles map exists
    if (!data.profiles || typeof data.profiles !== 'object') {
      data.profiles = {};
      changed = true;
    }

    // Seed default profile if none exist
    if (Object.keys(data.profiles).length === 0) {
      data.profiles.default = { name: 'Default', state: null, updatedAt: now };
      changed = true;
    }

    // Ensure activeId exists and points to a valid profile
    if (!data.activeId || !data.profiles[data.activeId]) {
      data.activeId = 'default';
      // Also ensure the default profile exists in case activeId was invalid
      if (!data.profiles.default) {
        data.profiles.default = { name: 'Default', state: null, updatedAt: now };
      }
      changed = true;
    }

    if (changed) {
      data.updatedAt = now;
      saveProfilesData(data);
      return true;
    }
    return false;
  } catch (_) {
    // As a last resort, write a minimal default structure
    try {
      const now = Date.now();
      const init = { profiles: { default: { name: 'Default', state: null, updatedAt: now } }, activeId: 'default', updatedAt: now };
      saveProfilesData(init);
    } catch (_) {}
    return true;
  }
}

function getActiveProfileId() { try { const d = loadProfilesData(); return d.activeId || 'default'; } catch(_) { return 'default'; } }
function setActiveProfile(id) { const d = loadProfilesData(); d.activeId = id; d.updatedAt = Date.now(); saveProfilesData(d); }

function saveToActiveProfile() {
  try {
    const comp = getDrawerComponent();
    const state = comp?.getState?.();
    if (!state) return false;
    const d = loadProfilesData();
    const id = d.activeId || 'default';
    d.profiles = d.profiles || {};
    d.profiles[id] = d.profiles[id] || { name: id, state: null };
    d.profiles[id].state = state;
    d.profiles[id].updatedAt = Date.now();
    d.updatedAt = Date.now();
    saveProfilesData(d);
    return true;
  } catch(_) { return false; }
}

function restoreActiveProfile() {
  try {
    const comp = getDrawerComponent(); if (!comp) return false;
    const d = loadProfilesData();
    const id = d.activeId || 'default';
    const st = d.profiles?.[id]?.state;
    if (!st) return false;
    comp.setState?.(st);
    return true;
  } catch(_) { return false; }
}

function createProfile(name) {
  const d = loadProfilesData(); d.profiles = d.profiles || {};
  const base = (name || 'Profile').toString().trim() || 'Profile';
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'profile';
  let id = slug; let i = 2;
  while (d.profiles[id]) { id = `${slug}-${i++}`; }
  d.profiles[id] = { name: base, state: null, updatedAt: Date.now() };
  d.activeId = id;
  d.updatedAt = Date.now();
  saveProfilesData(d);
  return id;
}

function populateProfilesSelect(headerEl) {
  try {
    const sel = headerEl?.querySelector?.('.profile-select'); if (!sel) return;
    let d = loadProfilesData(); let active = d.activeId || 'default'; let profiles = d.profiles || {};
    let entries = Object.entries(profiles);
    // Defensive: if no profiles present, try to initialize and reload
    if (entries.length === 0) {
      try { ensureProfilesInitialized(); } catch(_) {}
      d = loadProfilesData(); active = d.activeId || 'default'; profiles = d.profiles || {}; entries = Object.entries(profiles);
      // As a last resort, synthesize a default option in UI to avoid empty select
      if (entries.length === 0) {
        profiles = { default: { name: 'Default', state: null, updatedAt: Date.now() } };
        active = 'default';
        entries = Object.entries(profiles);
      }
    }
    sel.innerHTML = '';
    for (const [id, info] of entries) {
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = info?.name || id; if (id === active) opt.selected = true; sel.appendChild(opt);
    }
  } catch(_) {}
}

function updateStatusPill(headerEl) {
  try {
    const pill = headerEl?.querySelector?.('.status-pill'); if (!pill) return;
    const d = loadProfilesData(); const id = d.activeId || 'default'; const saved = d.profiles?.[id]?.state;
    const comp = getDrawerComponent(); const cur = comp?.getState?.();
    const same = saved && cur ? JSON.stringify(saved) === JSON.stringify(cur) : !!saved === !!cur;
    pill.textContent = same ? 'Saved' : 'Dirty';
    pill.classList.toggle('saved', same);
    pill.classList.toggle('dirty', !same);
  } catch(_) {}
}

function exportProfilesToFile() {
  try {
    const data = loadProfilesData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'drawer-profiles.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch(_) { toast?.('Export failed', { type: 'error' }); }
}

function openImportDialog(headerEl) {
  try {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
    inp.addEventListener('change', async () => {
      const file = inp.files?.[0]; if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') throw new Error('Bad file');
        saveProfilesData(parsed);
        populateProfilesSelect(headerEl);
        updateStatusPill(headerEl);
        toast?.('Imported profiles', { type: 'success' });
      } catch(e) { toast?.('Import failed', { type: 'error' }); }
    });
    inp.click();
  } catch(_) { /* ignore */ }
}

// Active view date + edit lock management (per profile)
function getActiveViewDateKey() {
  try { const { entry } = _getActiveDaysEntry(false); return entry?._activeViewDateKey || getTodayKey(); } catch(_) { return getTodayKey(); }
}
function setActiveViewDateKey(key) {
  try { const { data, pid, entry } = _getActiveDaysEntry(true); entry._activeViewDateKey = key || getTodayKey(); data[pid] = entry; saveDaysData(data); } catch(_) {}
}
function isDayEditUnlocked() {
  try { const { entry } = _getActiveDaysEntry(false); return !!entry?._editUnlocked; } catch(_) { return false; }
}
function setDayEditUnlocked(flag) {
  try { const { data, pid, entry } = _getActiveDaysEntry(true); entry._editUnlocked = !!flag; data[pid] = entry; saveDaysData(data); } catch(_) {}
}
function applyReadOnlyByActiveDate(headerEl) {
  try {
    const comp = getDrawerComponent(); if (!comp) return;
    const key = getActiveViewDateKey(); const today = getTodayKey();
    const readOnly = key !== today && !isDayEditUnlocked();
    comp.setReadOnly?.(readOnly);
    updateLockButtonUI(headerEl);
  } catch(_) {}
}
function updateLockButtonUI(headerEl) {
  try {
    const btns = headerEl ? headerEl.querySelectorAll('.lock-btn') : document.querySelectorAll('app-header .lock-btn');
    const key = getActiveViewDateKey(); const today = getTodayKey();
    const isToday = key === today; const unlocked = isDayEditUnlocked();
    const title = isToday ? 'Today is always editable' : (unlocked ? 'Editing unlocked (tap to lock)' : 'Editing locked (tap to unlock)');
    btns.forEach((b) => { b.title = title; b.setAttribute('aria-label', title); });
  } catch(_) {}
}

// Placeholder for potential future logic when switching profiles; currently a no-op
function ensureDayResetIfNeeded(_headerEl) { /* no-op */ }

// Debounced push scheduler for sync
const _debouncedPushers = {};
function _scheduleSyncPush(key) {
  try {
    const delay = 500;
    if (_debouncedPushers[key]) clearTimeout(_debouncedPushers[key]);
    _debouncedPushers[key] = setTimeout(() => { try { _syncKeyOnce(key); } catch(_) {} }, delay);
  } catch(_) {}
}

// --- Server status pill ---
// API base resolution: window.DCA_API_BASE or localStorage override; default
// - localhost: '/api' (proxied by local server)
// - production (non-localhost): hard-coded Render domain
function getApiBase() {
  try {
    const winBase = (typeof window !== 'undefined' && window.DCA_API_BASE) ? String(window.DCA_API_BASE) : '';
    const lsBase = (typeof localStorage !== 'undefined') ? (localStorage.getItem('dca.apiBase') || '') : '';
    const isLocal = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
  const defaultBase = isLocal ? '/api' : 'https://drawer-count-app.onrender.com/api';
    const base = (winBase || lsBase || defaultBase).trim();
    return base || defaultBase;
  } catch (_) { return '/api'; }
}
function apiUrl(path) {
  const resolved = (typeof window !== 'undefined' && window.DCA_API_BASE_RESOLVED) ? String(window.DCA_API_BASE_RESOLVED) : '';
  const b = (resolved || getApiBase()).replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

function _apiCandidatesFor(path) {
  try {
    const candidates = [];
    const primaryFull = apiUrl(path);
    candidates.push(primaryFull);
    // If the current base is a Render domain, add toggled .app/.com variant
    try {
      const base = (typeof window !== 'undefined' && window.DCA_API_BASE_RESOLVED) ? String(window.DCA_API_BASE_RESOLVED) : getApiBase();
      if (/^https?:\/\//i.test(base) && /\.onrender\.(app|com)/i.test(base)) {
        const alt = base.includes('.onrender.app')
          ? base.replace('.onrender.app', '.onrender.com')
          : base.replace('.onrender.com', '.onrender.app');
        const altFull = `${alt.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        if (altFull !== primaryFull) candidates.push(altFull);
      }
    } catch (_) {}
    // If we're using local '/api', try the known production default as a fallback
    try {
      const base = getApiBase();
      const isLocalBase = !/^https?:\/\//i.test(base); // '/api' or similar
      if (isLocalBase) {
        const prod = 'https://drawer-count-app.onrender.com/api';
        const prodFull = `${prod.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        if (!candidates.includes(prodFull)) candidates.push(prodFull);
        // also add toggled render domain
        const prodAlt = prod.includes('.onrender.app') ? prod.replace('.onrender.app', '.onrender.com') : prod.replace('.onrender.com', '.onrender.app');
        const prodAltFull = `${prodAlt.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        if (!candidates.includes(prodAltFull)) candidates.push(prodAltFull);
      }
    } catch (_) {}
    return candidates;
  } catch (_) { return [apiUrl(path)]; }
}
async function fetchServerHealth() {
  try {
    const primary = getApiBase();
    const primaryUrl = apiUrl('/health'); // resolves to '<apiBase>/health' e.g., '/api/health'
    const candidates = [primary];
    // Derive a fallback between .onrender.app <-> .onrender.com when using our hard-coded default
    try {
      if (/^https?:\/\//i.test(primary) && /\.onrender\.(app|com)/i.test(primary)) {
        const alt = primary.includes('.onrender.app')
          ? primary.replace('.onrender.app', '.onrender.com')
          : primary.replace('.onrender.com', '.onrender.app');
        if (alt !== primary) candidates.push(alt);
      }
    } catch(_) {}
    let lastErr = null;
    // First, try the explicit primary URL ('/api/health' via apiUrl)
    try {
      const res = await fetch(primaryUrl, { cache: 'no-store' });
      if (!res.ok) {
        try { console.warn('[health] HTTP', res.status, res.statusText, 'url=', res.url); } catch(_) {}
      } else {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      lastErr = e;
      try { console.warn('[health] fetch error for primary', primaryUrl, e); } catch(_) {}
    }

    // Next, try fallback candidates with toggled Render domains
    for (const base of candidates) {
      try {
        const url = `${base.replace(/\/+$/, '')}/health`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          try { console.warn('[health] HTTP', res.status, res.statusText, 'url=', res.url); } catch(_) {}
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        // Remember working base if it differs from primary
        if (typeof window !== 'undefined' && base !== primary) {
          try { window.DCA_API_BASE_RESOLVED = base; console.info('[health] using API base', base); } catch(_) {}
        }
        return data;
      } catch (e) {
        lastErr = e;
        try { console.warn('[health] fetch error for', base, e); } catch(_) {}
      }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(err) {
    try { console.warn('[health] fatal error', err); } catch(_) {}
    return { ok: false };
  }
}
// server status now displayed inline within <network-status>

// --- Online sync with backend API (/api/kv/:key) ---
const SYNC_KEYS = [DRAWER_PROFILES_KEY, DRAWER_DAYS_KEY];
const META_SUFFIX = '__meta';

function _getLocalMeta(key) {
  try { const raw = localStorage.getItem(key + META_SUFFIX); return raw ? JSON.parse(raw) : null; } catch(_) { return null; }
}
function _setLocalMeta(key, meta) {
  try { localStorage.setItem(key + META_SUFFIX, JSON.stringify(meta || {})); } catch(_) {}
}
function _getClientId() {
  const CID_KEY = 'sync-client-id';
  try {
    let id = localStorage.getItem(CID_KEY);
    if (id) return id;
    const tpl = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    try {
      if (window.crypto?.getRandomValues) {
        const buf = new Uint8Array(16); window.crypto.getRandomValues(buf);
        let i = 0;
        id = tpl.replace(/[xy]/g, (c) => {
          const r = buf[i++] % 16;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      } else {
        id = tpl.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    } catch(_) { id = `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
    localStorage.setItem(CID_KEY, id);
    return id;
  } catch(_) { return 'anonymous'; }
}

async function _fetchRemoteKV(key) {
  try {
    const path = `/kv/${encodeURIComponent(key)}`;
    const urls = _apiCandidatesFor(path);
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.status === 404) return { ok: true, missing: true };
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const data = await res.json();
        return { ok: true, value: data.value, updatedAt: Number(data.updatedAt || 0) };
      } catch (e) { lastErr = e; }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(_) { return { ok: false }; }
}

// List all KV entries from the server as a fallback (e.g., if the exact profiles key is unknown)
async function _listRemoteKV() {
  try {
    const path = `/kv`;
    const urls = _apiCandidatesFor(path);
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const data = await res.json();
        // Expect shape { ok: true, items: [{ key, value, updatedAt }...] }
        const items = Array.isArray(data.items) ? data.items : [];
        return { ok: true, items };
      } catch (e) { lastErr = e; }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(_) { return { ok: false }; }
}

async function _pushRemoteKV(key, rawValue, updatedAt) {
  try {
    const path = `/kv/${encodeURIComponent(key)}`;
    const urls = _apiCandidatesFor(path);
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: rawValue, updatedAt: Number(updatedAt) || Date.now() })
        });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const data = await res.json();
        return { ok: true, updatedAt: Number(data.updatedAt || Date.now()) };
      } catch (e) { lastErr = e; }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(_) { return { ok: false }; }
}

async function _syncKeyOnce(key) {
  try {
    const localRaw = localStorage.getItem(key);
    const localMeta = _getLocalMeta(key) || { updatedAt: 0 };
    const remote = await _fetchRemoteKV(key);
    if (!remote.ok) return false;
    if (remote.missing) {
      if (localRaw != null) {
        const push = await _pushRemoteKV(key, localRaw, localMeta.updatedAt || Date.now());
        if (push.ok) _setLocalMeta(key, { updatedAt: push.updatedAt });
      }
      return true;
    }
    const rAt = Number(remote.updatedAt || 0);
    const lAt = Number(localMeta.updatedAt || 0);
    if (localRaw == null) {
      localStorage.setItem(key, remote.value);
      _setLocalMeta(key, { updatedAt: rAt });
      return true;
    }
    if (rAt > lAt) {
      localStorage.setItem(key, remote.value);
      _setLocalMeta(key, { updatedAt: rAt });
    } else if (lAt > rAt) {
      const push = await _pushRemoteKV(key, localRaw, lAt);
      if (push.ok) _setLocalMeta(key, { updatedAt: push.updatedAt });
    }
    return true;
  } catch(_) { return false; }
}

async function _syncAllKeys() {
  for (const k of SYNC_KEYS) { try { await _syncKeyOnce(k); } catch(_) {} }
}

function initOnlineSync() {
  try {
    for (const k of SYNC_KEYS) { if (!_getLocalMeta(k)) _setLocalMeta(k, { updatedAt: 0 }); }
    _syncAllKeys();
    window.addEventListener('online', () => { _syncAllKeys(); });
  } catch(_) { /* ignore */ }
}

// Attempt to prime local profiles from remote before UI renders, so all server profiles appear
async function initProfilesFromRemoteIfAvailable() {
  try {
    // Try primary remote key first, then fall back to known legacy aliases
    const candidateKeys = [
      DRAWER_PROFILES_KEY,
      'drawer-profiles',
      'drawer_profiles',
      'profiles',
      'drawer-profiles-v0'
    ];

    let remote = await _fetchRemoteKV(DRAWER_PROFILES_KEY);
    if (!remote.ok || remote.missing) {
      for (const altKey of candidateKeys) {
        if (altKey === DRAWER_PROFILES_KEY) continue;
        try {
          const r = await _fetchRemoteKV(altKey);
          if (r.ok && !r.missing) { remote = r; break; }
        } catch (_) { /* try next */ }
      }
    }
    // Fallback: if still missing, list all remote KV entries and pick the best match
    if (!remote.ok || remote.missing) {
      try {
        const list = await _listRemoteKV();
        if (list.ok && Array.isArray(list.items) && list.items.length) {
          // Rank candidates: exact known keys first, then any whose parsed value exposes a profiles map
          const knownSet = new Set(candidateKeys);
          const scored = [];
          for (const it of list.items) {
            const key = String(it.key || '');
            const updatedAt = Number(it.updatedAt || 0);
            let score = 0;
            if (knownSet.has(key)) score += 10; // prefer known keys
            // Try to inspect value to see if it looks like profiles
            let parsed = null;
            try {
              const raw = typeof it.value === 'string' ? it.value : JSON.stringify(it.value);
              parsed = JSON.parse(raw);
            } catch(_) { parsed = null; }
            const looksWrapped = parsed && typeof parsed === 'object' && parsed.profiles && typeof parsed.profiles === 'object';
            const looksBareMap = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length && !('days' in parsed) && !('state' in parsed);
            if (looksWrapped) score += 5;
            else if (looksBareMap) score += 3;
            // Add recency as a tiebreaker
            score += Math.min(2, Math.max(0, Math.floor((updatedAt || 0) / 1e13))); // tiny contribution
            scored.push({ it, score, updatedAt, parsed });
          }
          scored.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt);
          const pick = scored[0];
          if (pick && pick.it) {
            remote = { ok: true, value: pick.it.value, updatedAt: Number(pick.it.updatedAt || 0) };
          }
        }
      } catch(_) { /* ignore */ }
    }
    if (!remote.ok || remote.missing) {
      try { console.info('[profiles:init] no remote data available'); } catch(_) {}
      return false;
    }

    const rAt = Number(remote.updatedAt || 0);
    const rVal = remote.value;
    const rText = (typeof rVal === 'string') ? rVal : JSON.stringify(rVal);
    let rObj = null;
    try { rObj = JSON.parse(rText); } catch (_) { rObj = null; }
    // If remote stored just the profiles map (legacy), wrap it to expected shape
    if (rObj && !rObj.profiles && typeof rObj === 'object') {
      rObj = { profiles: rObj, activeId: Object.keys(rObj)[0] || 'default', updatedAt: rAt || Date.now() };
    }

    // Inspect local
    const localRaw = localStorage.getItem(DRAWER_PROFILES_KEY);
    const localMeta = _getLocalMeta(DRAWER_PROFILES_KEY) || { updatedAt: 0 };
    const lAt = Number(localMeta.updatedAt || 0);
    let lObj = null;
    try { lObj = localRaw ? JSON.parse(localRaw) : null; } catch (_) { lObj = null; }

    const localProfiles = (lObj && lObj.profiles && typeof lObj.profiles === 'object') ? lObj.profiles : {};
    const remoteProfiles = (rObj && rObj.profiles && typeof rObj.profiles === 'object') ? rObj.profiles : {};
    const localCount = Object.keys(localProfiles).length;
    const remoteCount = Object.keys(remoteProfiles).length;

    // Decision matrix:
    // - If no local data: adopt remote
    // - If local has 0 or 1 profile(s) (default-only scenarios) and remote has more: adopt remote
    // - Else, if remote updatedAt is newer than local: adopt remote
    // - Otherwise, keep local
    const localLooksDefaultOnly = (localCount <= 1);
    const remoteHasMore = (remoteCount > localCount);
    try { console.info('[profiles:init] localCount=', localCount, 'remoteCount=', remoteCount, 'rAt=', rAt, 'lAt=', lAt); } catch(_) {}
    if (!localRaw || (localLooksDefaultOnly && remoteHasMore) || (rAt > lAt)) {
      // Persist normalized remote object
      const normalized = rObj && rObj.profiles ? JSON.stringify(rObj) : rText;
      localStorage.setItem(DRAWER_PROFILES_KEY, normalized);
      _setLocalMeta(DRAWER_PROFILES_KEY, { updatedAt: rAt || Date.now() });
      try { console.info('[profiles:init] adopted remote profiles'); } catch(_) {}
      return true;
    }
    try { console.info('[profiles:init] kept local profiles'); } catch(_) {}
    return false;
  } catch (_) { return false; }
}

// ------------------------------
// Daily history persistence (per profile)
// ------------------------------
// Shapes:
// - Stored under DRAWER_DAYS_KEY in localStorage as an object keyed by profileId
//   { [profileId]: { lastVisitedDate: 'YYYY-MM-DD' | null,
//                    _activeViewDateKey?: string,
//                    _editUnlocked?: boolean,
//                    days: { [dateKey]: { state, savedAt: number, label?: string } } } }

function loadDaysData() {
  try {
    const raw = localStorage.getItem(DRAWER_DAYS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (_) { return {}; }
}

function saveDaysData(data) {
  try {
    localStorage.setItem(DRAWER_DAYS_KEY, JSON.stringify(data || {}));
    try { _setLocalMeta(DRAWER_DAYS_KEY, { updatedAt: Date.now() }); _scheduleSyncPush(DRAWER_DAYS_KEY); } catch (_) {}
    return true;
  } catch (_) { return false; }
}

function _saveDaysDataAndSync(data) {
  return saveDaysData(data);
}

function getTodayKey() {
  try {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch (_) { return '1970-01-01'; }
}

function _getActiveDaysEntry(createIfMissing = true) {
  const data = loadDaysData();
  const pid = getActiveProfileId();
  let entry = data[pid];
  if (!entry && createIfMissing) {
    entry = { lastVisitedDate: null, days: {}, _activeViewDateKey: getTodayKey(), _editUnlocked: false };
    data[pid] = entry;
    saveDaysData(data);
  }
  // Always return a sane shape even when not created
  return { data, pid, entry: entry || { lastVisitedDate: null, days: {}, _activeViewDateKey: getTodayKey(), _editUnlocked: false } };
}

function listSavedDaysForActiveProfile() {
  try {
    const { entry } = _getActiveDaysEntry(false);
    const days = entry?.days || {};
    // Map to comparable array, sort by savedAt desc then date desc
    const list = Object.keys(days).map((k) => ({ date: k, savedAt: Number(days[k]?.savedAt || 0) }));
    list.sort((a, b) => (b.savedAt - a.savedAt) || (a.date < b.date ? 1 : -1));
    return list;
  } catch (_) { return []; }
}

// Alias for older calls expecting a separate function name
function saveSpecificDay(key) { return saveDay(key); }

// Kick off initial online sync shortly after load
try { window.addEventListener('load', () => { try { initOnlineSync(); } catch (_) {} }); } catch (_) {}

// --- Day helpers used by settings modal and elsewhere ---
function saveDay(key) {
  try {
    const k = key || getActiveViewDateKey();
    const comp = getDrawerComponent(); const state = comp?.getState?.(); if (!state) return false;
    const { data, pid, entry } = _getActiveDaysEntry(true);
    entry.days[k] = entry.days[k] || { state: null, savedAt: 0 };
    entry.days[k].state = state;
    entry.days[k].savedAt = Date.now();
    data[pid] = entry; return saveDaysData(data);
  } catch(_) { return false; }
}

function restoreDay(key) {
  try {
    const k = key || getActiveViewDateKey();
    const comp = getDrawerComponent(); if (!comp) return false;
    const { entry } = _getActiveDaysEntry(false); const rec = entry?.days?.[k];
    if (!rec?.state) return false;
    comp.setState?.(rec.state);
    return true;
  } catch(_) { return false; }
}

function deleteDay(key) {
  try {
    const k = key || getActiveViewDateKey();
    const { data, pid, entry } = _getActiveDaysEntry(false); if (!entry?.days?.[k]) return false;
    delete entry.days[k]; data[pid] = entry; return saveDaysData(data);
  } catch(_) { return false; }
}

function setDayLabel(key, label) {
  try {
    const k = key || getActiveViewDateKey();
    const { data, pid, entry } = _getActiveDaysEntry(true);
    if (!entry.days[k]) entry.days[k] = { state: null, savedAt: Date.now(), label: '' };
    entry.days[k].label = String(label || '');
    data[pid] = entry; return saveDaysData(data);
  } catch(_) { return false; }
}

// ------------------------------
// Test utilities — seed previous days with sample data
// ------------------------------
// Create a minimal but valid v2 DrawerCount state object
function _createSampleDrawerState(seed = 1) {
  const n = (v) => Number((v).toFixed(2));
  const baseCash = 100 + (seed % 5) * 20;
  const slips = (seed % 4) * 25;
  const checks = (seed % 3) * 30;
  const roa = (seed % 6) * 10;
  return {
    version: 2,
    timestamp: Date.now() - seed * 86400000 + 18 * 3600000, // ~6pm that day
    base: {
      drawer: n(baseCash),
      roa: n(roa),
      slips: n(slips),
      checks: n(checks),
      hundreds: 0,
      fifties: 0,
      twenties: n((seed % 5) * 20),
      tens: n((seed % 7) * 10),
      fives: n((seed % 9) * 5),
      dollars: n((seed % 11) * 1),
      quarters: n(((seed + 1) % 4) * 0.25),
      dimes: n(((seed + 2) % 5) * 0.10),
      nickels: n(((seed + 3) % 4) * 0.05),
      pennies: n(((seed + 4) % 10) * 0.01),
      quarterrolls: 0,
      dimerolls: 0,
      nickelrolls: 0,
      pennyrolls: 0,
    },
    extra: {
      slips: (seed % 2) ? [n(12.34), n(23.45)] : [n(11.11)],
      checks: (seed % 3) ? [n(45.67)] : [],
    },
    optional: {
      charges: 0,
      totalReceived: n(100 + seed * 3.5),
      netSales: n(200 + seed * 5.25),
      grossProfitAmount: n(50 + seed * 1.75),
      grossProfitPercent: n(30 + (seed % 10) * 0.5),
      numInvoices: (seed % 20) + 5,
      numVoids: seed % 3,
    },
  };
}

function _dateKeyNDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Seed previous days for the active profile
// Usage from console: seedPreviousDays(7) or seedPreviousDays(14, { includeToday: false, overwrite: false })
function seedPreviousDays(count = 7, options = {}) {
  try {
    const opts = options || {};
    const includeToday = !!opts.includeToday;
    const overwrite = (opts.overwrite !== false); // default true
    const max = Math.max(1, Math.min(90, Number(count) || 1));

    const { data, pid, entry } = _getActiveDaysEntry(true);
    const seededKeys = [];
    const start = includeToday ? 0 : 1;
    for (let i = start; i < start + max; i++) {
      const key = _dateKeyNDaysAgo(i);
      if (!overwrite && entry.days[key]) continue;
      const state = _createSampleDrawerState(i);
      entry.days[key] = { state, savedAt: Date.now() - i * 3600000, label: `Test Day -${i}` };
      seededKeys.push(key);
    }
    data[pid] = entry;
    saveDaysData(data);
    // Optionally, set active view to the most recent seeded day
    if (seededKeys.length) {
      const mostRecent = seededKeys.reduce((a, b) => (a > b ? a : b));
      setActiveViewDateKey(mostRecent);
    }
    try { toast?.(`Seeded ${seededKeys.length} day(s)` , { type: 'success', duration: 1800 }); } catch(_) {}
    return seededKeys;
  } catch (e) {
    try { toast?.('Seeding failed', { type: 'error', duration: 2000 }); } catch(_) {}
    return [];
  }
}

// Expose for easy manual testing in the browser console
try { window.seedPreviousDays = seedPreviousDays; } catch (_) { /* ignore */ }

