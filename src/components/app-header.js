import { toggleTheme, getPreferredTheme, applyTheme, getProfileThemeMode } from '../lib/theme.js';
import { toast } from '../lib/toast.js';
import { ensureProfilesInitialized, populateProfilesSelect, updateLockButtonUI, applyReadOnlyByActiveDate, ensureDayResetIfNeeded } from '../lib/persistence.js';
import { getTodayKey, setActiveViewDateKey, restoreDay, getActiveProfileId, setActiveProfile, saveToActiveProfile, loadProfilesData, saveProfilesData, createProfile, restoreActiveProfile } from '../lib/persistence.js';
import { initProfilesFromRemoteIfAvailable } from '../lib/sync.js';
import { getHelpModal } from './help-modal.js';
import { getSettingsModal } from './settings-modal.js';
import { getNewProfileModal } from './new-profile-modal.js';
import { getDeleteProfileModal } from './delete-profile-modal.js';
import { getDayPickerModal } from './day-picker-modal.js';
import { listSavedDaysForActiveProfile, getActiveViewDateKey } from '../lib/persistence.js';

class AppHeader extends HTMLElement {
  constructor() {
    super();
    this._onTheme = this._onTheme.bind(this);
    this._onHelp = this._onHelp.bind(this);
    this._onSettings = this._onSettings.bind(this);
    this._onPanelToggle = this._onPanelToggle.bind(this);
    this._updatePanelBtnUI = this._updatePanelBtnUI.bind(this);
    this._onProfileChange = this._onProfileChange.bind(this);
    this._onNewProfile = this._onNewProfile.bind(this);
    this._onDeleteProfile = this._onDeleteProfile.bind(this);
    this._onOpenDays = this._onOpenDays.bind(this);
    this._onMenuToggle = this._onMenuToggle.bind(this);
    this._onWindowKey = this._onWindowKey.bind(this);
    this._onOutsideClick = this._onOutsideClick.bind(this);
  }
  connectedCallback() {
    const title = this.getAttribute('title') || 'Drawer Count';
    this.innerHTML = `
      <style>
        :host { display: block; width: 100%; }
        .bar { display: grid; align-items: center; gap: .4rem; grid-template-columns: 1fr auto; grid-template-areas: "title title" "left right"; position: relative; }
        .title { grid-area: title; text-align: center; margin: 0; font-size: clamp(1rem, 3.5vw, 1.1rem); letter-spacing: .2px; }
        .left { grid-area: left; justify-self: start; display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
        .right { grid-area: right; justify-self: end; display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
        .icon-btn, .action-btn { background: var(--button-bg-color, var(--btn)); color: var(--button-color, var(--fg)); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 6px 10px; cursor: pointer; min-height: 44px; }
        .icon-btn:hover, .action-btn:hover { filter: brightness(1.08); }
        .icon-btn:focus, .action-btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
        .action-btn { font-weight: 600; }
        select.profile-select { background: var(--button-bg-color, var(--btn)); color: var(--button-color, var(--fg)); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 6px 10px; min-height: 44px; min-width: 0; max-width: min(55vw, 320px); }
        
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,1px,1px); white-space: nowrap; border: 0; }
        .menu-toggle { display: inline-flex; align-items: center; justify-content: center; background: var(--button-bg-color, var(--btn)); color: var(--button-color, var(--fg)); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 6px 10px; cursor: pointer; min-height: 44px; }
        .menu-toggle[aria-expanded="true"] { filter: brightness(1.08); }
        .nav-menu { position: absolute; right: 0; top: 100%; margin-top: 8px; background: var(--panel-bg, var(--card)); color: var(--panel-fg, var(--fg)); border: 1px solid var(--panel-border, var(--border)); border-radius: 14px; padding: 10px; z-index: 50; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); min-width: 220px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; opacity: 0; transform: translateY(-6px) scale(0.98); visibility: hidden; pointer-events: none; transition: opacity 140ms ease, transform 140ms ease, visibility 0s linear 140ms; }
        .nav-menu.open { opacity: 1; transform: translateY(0) scale(1); visibility: visible; pointer-events: auto; transition-delay: 0s; }
        .nav-menu .row { display: contents; }
        .nav-menu .icon-btn { width: 100%; min-height: 40px; }
        .menu-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.25); z-index: 40; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 140ms ease, visibility 0s linear 140ms; }
        .menu-backdrop.show { opacity: 1; visibility: visible; transition-delay: 0s; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); pointer-events: auto; }
        html[data-tour-open] app-header .menu-backdrop.show { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
        @media (max-width: 380px) { .nav-menu { grid-template-columns: 1fr; min-width: 180px; } }
        .right.inline-actions { display: none; }
        .right.menu-area { display: inline-flex; }
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
          
        </div>
        <h1 class="title">${title}</h1>
        <div class="actions right inline-actions">
          <button class="icon-btn panel-toggle-btn" aria-label="Today’s count" title="Today’s count">⬒</button>
          <button class="icon-btn days-btn" aria-label="Daily history" title="Daily history">📅</button>
          <button class="icon-btn settings-btn" aria-label="Settings" title="Settings">⚙️</button>
          <button class="icon-btn theme-toggle" aria-label="Toggle theme" title="Toggle theme">${(document.documentElement.getAttribute('data-theme')||getPreferredTheme())==='dark'?'🌙':'☀️'}</button>
          <button class="icon-btn info-btn" aria-label="Help" title="Help">?</button>
        </div>
        <div class="right menu-area">
          <button class="menu-toggle" aria-label="Menu" aria-expanded="false" aria-haspopup="true">☰</button>
          <div class="nav-menu" role="menu">
            <div class="row">
              <button class="icon-btn panel-toggle-btn" role="menuitem" aria-label="Today’s count" title="Today’s count">⬒</button>
              <button class="icon-btn days-btn" role="menuitem" aria-label="Daily history" title="Daily history">📅</button>
              <button class="icon-btn settings-btn" role="menuitem" aria-label="Settings" title="Settings">⚙️</button>
              <button class="icon-btn theme-toggle" role="menuitem" aria-label="Toggle theme" title="Toggle theme">${(document.documentElement.getAttribute('data-theme')||getPreferredTheme())==='dark'?'🌙':'☀️'}</button>
              <button class="icon-btn info-btn" role="menuitem" aria-label="Help" title="Help">?</button>
            </div>
          </div>
          <div class="menu-backdrop" aria-hidden="true"></div>
        </div>
      </div>`;

    this.querySelectorAll('.settings-btn')?.forEach((el) => el.addEventListener('click', this._onSettings));
    this.querySelectorAll('.theme-toggle')?.forEach((el) => el.addEventListener('click', this._onTheme));
    this.querySelectorAll('.info-btn')?.forEach((el) => el.addEventListener('click', this._onHelp));
    this.querySelectorAll('.panel-toggle-btn')?.forEach((el) => el.addEventListener('click', this._onPanelToggle));
    this.querySelector('.profile-select')?.addEventListener('change', this._onProfileChange);
    this.querySelector('.new-profile-btn')?.addEventListener('click', this._onNewProfile);
    this.querySelector('.delete-profile-btn')?.addEventListener('click', this._onDeleteProfile);
    this.querySelectorAll('.days-btn')?.forEach((el) => el.addEventListener('click', this._onOpenDays));
    this.querySelector('.menu-toggle')?.addEventListener('click', this._onMenuToggle);
    window.addEventListener('keydown', this._onWindowKey);
    window.addEventListener('click', this._onOutsideClick, true);
    this.querySelector('.menu-backdrop')?.addEventListener('click', () => this._closeMenu());

    (async () => {
      try { await initProfilesFromRemoteIfAvailable(); } catch (_) {}
      try { ensureProfilesInitialized(); } catch (_) {}
  try { populateProfilesSelect(this); updateLockButtonUI(this); this._updatePanelBtnUI(); } catch (_) {}
      // Ensure theme reflects active profile preference
      try { const mode = getProfileThemeMode(); applyTheme(mode, false); } catch(_) {}
      try { window.addEventListener('storage', this._updatePanelBtnUI); window.addEventListener('focus', this._updatePanelBtnUI); } catch(_) {}
    })();
  }

  _onTheme() { toggleTheme(); }
  _onHelp() { getHelpModal().open(); }
  _onSettings() { getSettingsModal().open(); }
  _closeMenu() {
    try { const menu = this.querySelector('.nav-menu'); const btn = this.querySelector('.menu-toggle'); if (menu && menu.classList.contains('open')) { menu.classList.remove('open'); btn?.setAttribute('aria-expanded', 'false'); this.querySelector('.menu-backdrop')?.classList.remove('show'); } } catch(_) {}
  }
  disconnectedCallback() { window.removeEventListener('keydown', this._onWindowKey); window.removeEventListener('click', this._onOutsideClick, true); }
  _onMenuToggle(e) {
    try { const btn = this.querySelector('.menu-toggle'); const menu = this.querySelector('.nav-menu'); if (!btn || !menu) return; const open = menu.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); const backdrop = this.querySelector('.menu-backdrop'); if (backdrop) backdrop.classList.toggle('show', open); if (open) { setTimeout(() => { try { menu.querySelector('button')?.focus(); } catch(_) {} }, 0); } e?.stopPropagation?.(); } catch(_) {}
  }
  _onWindowKey(e) { if (e.key === 'Escape') { const menu = this.querySelector('.nav-menu'); const btn = this.querySelector('.menu-toggle'); if (menu && menu.classList.contains('open')) { menu.classList.remove('open'); btn?.setAttribute('aria-expanded', 'false'); this.querySelector('.menu-backdrop')?.classList.remove('show'); } } }
  _onOutsideClick(e) {
    try { const menu = this.querySelector('.nav-menu'); const btn = this.querySelector('.menu-toggle'); if (!menu || !btn) return; if (!menu.classList.contains('open')) return; const path = e.composedPath ? e.composedPath() : []; const backdrop = this.querySelector('.menu-backdrop'); const clickedInside = path.includes(menu) || path.includes(btn) || path.includes(backdrop); if (!clickedInside) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); this.querySelector('.menu-backdrop')?.classList.remove('show'); } } catch(_) {}
  }

  _onPanelToggle() {
    try {
      const today = getTodayKey();
      try { setActiveViewDateKey(today); } catch(_) {}
      try { restoreDay(today); } catch(_) {}
      const panel = document.querySelector('count-panel');
      let started = false, completed = false;
      try { const pid = getActiveProfileId?.(); const key = `${pid || 'default'}::${today}`; const raw = localStorage.getItem('drawer-panel-v1'); const all = raw ? JSON.parse(raw) : {}; const st = all[key]; if (st && typeof st === 'object') { started = !!st.started; completed = !!st.completed; } } catch(_) {}
      if (panel) {
        if (completed && typeof panel.showCompletedSummary === 'function') { panel.showCompletedSummary(); }
        else if (!started) { try { panel.querySelector('.start-btn')?.click?.(); } catch(_) {} }
        else { try { if (typeof panel.expand === 'function') panel.expand(); else panel.querySelector('.toggle-btn')?.click?.(); } catch(_) {} }
      }
      try { applyReadOnlyByActiveDate(this); updateLockButtonUI(this); } catch(_) {}
      this._closeMenu();
      this._updatePanelBtnUI();
    } catch(_) {}
  }

  _updatePanelBtnUI() {
    try {
      const btns = this.querySelectorAll('.panel-toggle-btn'); if (!btns || !btns.length) return;
      const today = getTodayKey(); let started = false, completed = false; try { const pid = getActiveProfileId?.(); const key = `${pid || 'default'}::${today}`; const raw = localStorage.getItem('drawer-panel-v1'); const all = raw ? JSON.parse(raw) : {}; const st = all[key]; if (st && typeof st === 'object') { started = !!st.started; completed = !!st.completed; } } catch(_) {}
      const title = completed ? 'Show today’s count summary' : (started ? 'Continue today’s count' : 'Start today’s count');
      btns.forEach((b)=>{ try { b.title = title; b.setAttribute('aria-label', title); } catch(_) {} });
    } catch(_) {}
  }

  _onProfileChange(e) { try { const id = e.target?.value; if (!id) return; setActiveProfile(id); restoreActiveProfile(); ensureDayResetIfNeeded(this); setActiveViewDateKey(getTodayKey()); applyReadOnlyByActiveDate(this); populateProfilesSelect(this); try { const mode = getProfileThemeMode(); applyTheme(mode, false); } catch(_) {} toast('Switched profile', { type:'info', duration: 1200}); } catch(_){} }
  async _onNewProfile() { try { const modal = getNewProfileModal(); const name = await modal.open(''); if (!name) return; const currentMode = getProfileThemeMode?.() || 'system'; const id = createProfile(name); setActiveProfile(id); try { if (currentMode) applyTheme(currentMode, true); } catch(_) {} saveToActiveProfile(); populateProfilesSelect(this); applyReadOnlyByActiveDate(this); toast('Profile created', { type: 'success', duration: 1800 }); } catch(_){} }
  async _onDeleteProfile() { try { const data = loadProfilesData(); const ids = Object.keys(data.profiles||{}); if (ids.length<=1) { toast('Cannot delete last profile', { type:'warning', duration: 2200}); return; } const active = data.activeId; const name = data.profiles[active]?.name || active; const modal = getDeleteProfileModal(); const ok = await modal.open(name); if (!ok) return; delete data.profiles[active]; const nextId = ids.find((x)=>x!==active) || 'default'; data.activeId = nextId; saveProfilesData(data); restoreActiveProfile(); populateProfilesSelect(this); applyReadOnlyByActiveDate(this); try { const mode = getProfileThemeMode?.(); applyTheme(mode, false); } catch(_) {} toast('Profile deleted', { type: 'success', duration: 1800}); } catch(_){} }
  async _onOpenDays() {
    try {
      const days = (listSavedDaysForActiveProfile() || []).map(d => d.date);
      const selected = getActiveViewDateKey?.() || getTodayKey();
      const modal = getDayPickerModal();
      const picked = await modal.open({ days, selected });
      if (!picked) return;
      setActiveViewDateKey(picked);
      const ok = restoreDay(picked);
  const header = this;
  applyReadOnlyByActiveDate(header);
      try {
        const today = getTodayKey();
        if (picked !== today) { document.querySelector('count-panel')?.showCompletedSummary?.(); }
      } catch(_) {}
      try { document.querySelector('count-panel')?.refresh?.(); } catch(_) {}
      toast(ok ? `Loaded ${picked}` : 'Load failed', { type: ok ? 'success' : 'error', duration: 1500 });
    } catch(_) {}
  }
}

if (!customElements.get('app-header')) customElements.define('app-header', AppHeader);

export default AppHeader;
