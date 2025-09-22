import { toast } from '../lib/toast.js';
import '../drawer-count.js';
import { getActiveViewDateKey, getTodayKey, isDayEditUnlocked, setDayEditUnlocked, saveSpecificDay, restoreDay, updateStatusPill, applyReadOnlyByActiveDate, getActiveProfileId } from '../lib/persistence.js';
import { _getActiveDaysEntry } from '../lib/persistence.js';
import { getUnlockConfirmModal } from './unlock-confirm-modal.js';
import { getRevertConfirmModal } from './revert-confirm-modal.js';

class CountPanel extends HTMLElement {
  constructor() {
    super();
    this._els = {};
    this._state = { started: false, collapsed: true, completed: false, reopened: false };
    this._isProcessing = false;
    this._onStart = this._onStart.bind(this);
    this._onToggle = this._onToggle.bind(this);
    this._onComplete = this._onComplete.bind(this);
    this._onReopen = this._onReopen.bind(this);
    this._onVisibilityRefresh = this._onVisibilityRefresh.bind(this);
    this._onDrawerChange = this._onDrawerChange.bind(this);
  }

  connectedCallback() {
    this._render();
    this._cacheEls();
    this._bind();
    if (!this.querySelector('drawer-count')) {
      const dc = document.createElement('drawer-count');
      this._els.body.appendChild(dc);
    }
    this._refresh(true);
    window.addEventListener('storage', this._onVisibilityRefresh);
    window.addEventListener('focus', this._onVisibilityRefresh);
    try { this._dc = this.querySelector('drawer-count'); this._dc?.addEventListener('change', this._onDrawerChange); } catch(_) {}
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._onVisibilityRefresh);
    window.removeEventListener('focus', this._onVisibilityRefresh);
    try { this._dc?.removeEventListener('change', this._onDrawerChange); } catch(_) {}
  }

  _render() {
    this.classList.add('count-panel');
    this.innerHTML = `
      <div class="panel-header" role="group" aria-label="Drawer count controls">
        <div class="panel-title">Today's Count</div>
        <div class="panel-actions">
          <button class="start-btn" type="button">Start count</button>
          <button class="toggle-btn" type="button" aria-expanded="false" aria-label="Expand">＋</button>
          <button class="lock-btn" type="button" aria-label="Toggle edit lock" title="Toggle edit lock">🔒</button>
          <button class="complete-btn" type="button">Mark complete</button>
          <button class="reopen-btn" type="button">Reopen</button>
          <button class="cancel-btn" type="button">Cancel</button>
        </div>
      </div>
      <div class="panel-body" aria-hidden="true"></div>
      <div class="panel-summary" aria-hidden="true" hidden></div>
      <p class="hint done-hint" hidden>Completed for this day. Tap Reopen to edit.</p>
      <p class="hint lock-hint" hidden>Editing is locked for this saved day. To make changes, click the lock button (🔒) in this card to unlock.</p>
    `;
  }

  _cacheEls() {
    this._els.header = this.querySelector('.panel-header');
    this._els.title = this.querySelector('.panel-title');
    this._els.actions = this.querySelector('.panel-actions');
    this._els.start = this.querySelector('.start-btn');
    this._els.toggle = this.querySelector('.toggle-btn');
    this._els.lock = this.querySelector('.lock-btn');
    this._els.complete = this.querySelector('.complete-btn');
    this._els.reopen = this.querySelector('.reopen-btn');
    this._els.cancel = this.querySelector('.cancel-btn');
    this._els.body = this.querySelector('.panel-body');
    this._els.doneHint = this.querySelector('.done-hint');
    this._els.summary = this.querySelector('.panel-summary');
    this._els.lockHint = this.querySelector('.lock-hint');
  }

  _bind() {
    this._els.start.addEventListener('click', this._onStart);
    this._els.toggle.addEventListener('click', this._onToggle);
    this._els.lock.addEventListener('click', this._onToggleLock.bind(this));
    this._els.complete.addEventListener('click', this._onComplete);
    this._els.reopen.addEventListener('click', this._onReopen);
    this._els.cancel.addEventListener('click', this._onCancel.bind(this));
  }

  _panelKey() {
    try { const pid = (typeof getActiveProfileId === 'function') ? getActiveProfileId() : null; const dkey = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (pid && dkey) return `${pid}::${dkey}`; } catch (_) {}
    const today = new Date(); const d = today.toISOString().slice(0,10); return `default::${d}`;
  }

  _loadPersisted() {
    try { const raw = localStorage.getItem('drawer-panel-v1'); const all = raw ? JSON.parse(raw) : {}; const key = this._panelKey(); return all[key] || { started: false, collapsed: true, completed: false, reopened: false }; } catch (_) { return { started: false, collapsed: true, completed: false, reopened: false }; }
  }
  _savePersisted(next) { try { const raw = localStorage.getItem('drawer-panel-v1'); const all = raw ? JSON.parse(raw) : {}; const key = this._panelKey(); all[key] = { ...all[key], ...next }; localStorage.setItem('drawer-panel-v1', JSON.stringify(all)); } catch (_) {} }

  isCollapsed() { return !!this._state.collapsed; }
  refresh() { this._refresh(); }
  expand() { if (!this._state.started) return false; this._state.collapsed = false; this._refresh(); return true; }
  collapse() { if (!this._state.started) return false; this._state.collapsed = true; this._refresh(); return true; }
  toggleCollapsed() { if (!this._state.started) return false; this._state.collapsed = !this._state.collapsed; this._savePersisted({ collapsed: this._state.collapsed, started: this._state.started }); this._refresh(); return true; }

  showCompletedSummary() { this._state.started = true; this._state.completed = true; this._state.collapsed = false; this._savePersisted({ started: true, completed: true, collapsed: false }); try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch (_) {} this._refresh(); }

  _refresh(noAnim = false) {
    this._state = { ...{ started: false, collapsed: true, completed: false, reopened: false }, ...this._loadPersisted() };
    const { started, completed } = this._state;
    if (!started) this._state.collapsed = true;
    const isEmpty = !started && !completed;
    const collapsed = this._state.collapsed;
    const readOnly = this._computeReadOnly();

    this.classList.toggle('collapsed', !!collapsed);
    this.classList.toggle('empty', !!isEmpty);
    this.classList.toggle('completed', !!completed);
    this.setAttribute('aria-busy', this._isProcessing ? 'true' : 'false');

    this._els.start.hidden = !!started;
    this._els.toggle.hidden = !started;
    let isPast = false;
    try { const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; if (key && today) isPast = (key !== today); } catch(_) { isPast = false; }
    const reopenActive = !!(started && !completed && isPast && !this._state.collapsed);
    this._els.lock.hidden = !reopenActive;
    this._els.complete.hidden = !started || !!completed || readOnly || !!this._state.collapsed;
    this._els.reopen.hidden = !completed;

    let showCancel = false;
    try {
      if (started && !this._state.collapsed) {
        const actionsVisible = !this._els.complete.hidden;
        const saveMode = this._isSaveMode();
        const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null;
        const hasSaved = key ? this._hasSavedDay(key) : false;
        const hasUnsaved = this._hasUnsavedChangesComparedToSaved();
        const todayReopenCase = (!saveMode && !!this._state.reopened && hasSaved && hasUnsaved);
        const pastSaveCase = (saveMode && hasSaved && hasUnsaved);
        showCancel = !!(actionsVisible && (pastSaveCase || todayReopenCase));
      }
    } catch(_) { showCancel = false; }
    this._els.cancel.hidden = !showCancel;

    if (this._els.complete) this._els.complete.disabled = !!this._isProcessing || readOnly;
    if (this._els.cancel) this._els.cancel.disabled = !!this._isProcessing;
    if (this._els.lock) this._els.lock.disabled = !!this._isProcessing;
    if (this._els.toggle) this._els.toggle.disabled = !!this._isProcessing;

    this._els.toggle.textContent = collapsed ? '＋' : '－';
    this._els.toggle.setAttribute('aria-expanded', String(!collapsed));
    this._els.toggle.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse');

    const saveMode = this._isSaveMode();
    try { if (this._els.title) this._els.title.textContent = this._activeDayTitle(); } catch(_) {}
    if (!this._els.complete.hidden) {
      const baseLabel = saveMode ? 'Save' : 'Mark complete';
      const processingLabel = saveMode ? 'Saving…' : 'Completing…';
      this._els.complete.classList.toggle('processing', !!this._isProcessing);
      if (this._isProcessing) { this._els.complete.innerHTML = `${processingLabel} <span class="dots" aria-hidden="true"></span>`; }
      else { this._els.complete.textContent = baseLabel; }
      this._els.complete.setAttribute('aria-label', this._isProcessing ? processingLabel : baseLabel);
      this._els.complete.title = this._isProcessing ? processingLabel : baseLabel;
    }

    const container = this._visibleContainer();
    this._syncContainersVisibility();
    if (completed) this._renderSummary();
    const collapsedChanged = this._lastCollapsed !== collapsed;
    const completedChanged = this._lastCompleted !== completed;
    if (!isEmpty && (collapsedChanged || completedChanged || !noAnim)) { if (collapsed) this._collapseEl(container, !noAnim); else this._expandEl(container, !noAnim); }
    else if (isEmpty) { try { this._els.body.hidden = true; this._els.body.setAttribute('aria-hidden', 'true'); this._els.body.style.height = '0px'; this._els.summary.hidden = true; this._els.summary.setAttribute('aria-hidden', 'true'); this._els.summary.style.height = '0px'; } catch(_) {} }
    this._lastCollapsed = collapsed; this._lastCompleted = completed;

    this._els.doneHint.hidden = !completed;
    if (this._els.lockHint) this._els.lockHint.hidden = !(started && !completed && readOnly);
    try { updateStatusPill(this); } catch(_) {}

    try { const emptyEl = this.querySelector('.panel-empty'); if (emptyEl) { if (isEmpty) { emptyEl.hidden = false; emptyEl.setAttribute('aria-hidden', 'false'); } else { emptyEl.hidden = true; emptyEl.setAttribute('aria-hidden', 'true'); } } } catch(_) {}
  }

  async _onCancel() {
    if (this._isProcessing) return; if (!this._state.started) return;
    try {
      const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null;
      if (key && this._hasSavedDay(key) && this._hasUnsavedChangesComparedToSaved()) {
        const modal = (typeof getRevertConfirmModal === 'function') ? getRevertConfirmModal() : null;
        let proceed = true; if (modal && typeof modal.open === 'function') { proceed = await modal.open(key); }
        if (!proceed) return;
        try { restoreDay(key); } catch(_) {}
        this._state.started = true; this._state.completed = true; this._state.collapsed = false; this._savePersisted({ started: true, completed: true, collapsed: false });
        try { setDayEditUnlocked(false); } catch(_) {}
        try { const header = document.querySelector('app-header'); updateStatusPill(header); applyReadOnlyByActiveDate(header); } catch(_) {}
        try { toast('Reverted changes. Showing summary.', { type: 'info', duration: 1800 }); } catch(_) {}
        this._refresh();
        return;
      }
    } catch(_) {}
    return;
  }

  _hasUnsavedChangesComparedToSaved() {
    try { const comp = this.querySelector('drawer-count'); const cur = comp?.getState?.(); if (!cur) return false; const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (!key) return false; const { entry } = _getActiveDaysEntry(false); const saved = entry?.days?.[key]?.state; if (!saved) return false; return JSON.stringify(cur) !== JSON.stringify(saved); } catch(_) { return false; }
  }

  async _onToggleLock() {
    try {
      const today = getTodayKey(); const key = getActiveViewDateKey(); if (key === today) { toast('Today is always editable', { type: 'info', duration: 1400 }); return; }
      const btn = this._els?.lock; const prevHtml = btn ? btn.innerHTML : ''; const prevDisabled = btn ? btn.disabled : false;
      if (btn) { btn.classList.add('processing'); btn.innerHTML = `${btn.textContent} <span class="dots" aria-hidden="true"></span>`; btn.disabled = true; }
      const unlocked = isDayEditUnlocked();
      if (!unlocked) { const modal = getUnlockConfirmModal(); const ok = await modal.open(key); if (!ok) return; setDayEditUnlocked(true); toast('Editing unlocked for this day', { type: 'info', duration: 1600 }); }
      else { setDayEditUnlocked(false); toast('Editing locked for this day', { type: 'info', duration: 1600 }); }
      try { const header = document.querySelector('app-header'); applyReadOnlyByActiveDate(header); } catch(_) {}
      try { this._refresh(); } catch(_) {}
      setTimeout(() => { try { if (btn) { btn.classList.remove('processing'); btn.innerHTML = prevHtml; btn.disabled = prevDisabled; } } catch(_) {} }, 200);
    } catch(_) {}
  }

  _visibleContainer() { return this._state.completed ? this._els.summary : this._els.body; }

  _syncContainersVisibility() {
    const { completed, collapsed } = this._state;
    if (completed) {
      this._els.body.hidden = true; this._els.body.setAttribute('aria-hidden', 'true');
      this._els.summary.hidden = !!collapsed; this._els.summary.setAttribute('aria-hidden', String(!!collapsed));
    } else {
      this._els.summary.hidden = true; this._els.summary.setAttribute('aria-hidden', 'true');
      this._els.body.hidden = !!collapsed; this._els.body.setAttribute('aria-hidden', String(!!collapsed));
    }
  }

  _expandEl(el, animate = true) {
    el.setAttribute('aria-hidden', 'false'); el.hidden = false; if (!animate) { el.style.height = 'auto'; return; }
    el.style.overflow = 'hidden'; const target = el.scrollHeight; el.style.height = '0px'; requestAnimationFrame(() => { el.style.height = `${target}px`; const onEnd = () => { el.style.height = 'auto'; el.removeEventListener('transitionend', onEnd); }; el.addEventListener('transitionend', onEnd); });
  }
  _collapseEl(el, animate = true) {
    el.setAttribute('aria-hidden', 'true'); if (!animate) { el.style.height = '0px'; el.hidden = false; return; }
    el.style.overflow = 'hidden'; const current = el.scrollHeight; el.style.height = `${current}px`; el.offsetHeight; requestAnimationFrame(() => { el.style.height = '0px'; const onEnd = () => { el.removeEventListener('transitionend', onEnd); }; el.addEventListener('transitionend', onEnd); });
  }

  _renderSummary() {
    try {
      const dc = this.querySelector('drawer-count'); if (!dc || !dc.getCount) return; const c = dc.getCount(); let st = null; try { st = dc.getState?.(); } catch(_) { st = null; }
      const fmt = (n) => { const v = Number(n || 0); return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }); };
      const ts = c.timestamp ? new Date(c.timestamp) : new Date();
      const cashTotal = [c.hundreds, c.fifties, c.twenties, c.tens, c.fives, c.ones, c.quarters, c.dimes, c.nickels, c.pennies, c.qRolls, c.dRolls, c.nRolls, c.pRolls].map((x) => Number(x || 0)).reduce((a, b) => a + b, 0);
      const slipsList = Array.isArray(st?.extra?.slips) && st.extra.slips.length ? `<ul class="list">${st.extra.slips.map((v,i) => `<li><span class="label">Slip ${i+1}</span><span class="val">${fmt(v)}</span></li>`).join('')}</ul>` : '';
      const checksList = Array.isArray(st?.extra?.checks) && st.extra.checks.length ? `<ul class="list">${st.extra.checks.map((v,i) => `<li><span class="label">Check ${i+1}</span><span class="val">${fmt(v)}</span></li>`).join('')}</ul>` : '';
      const opt = st?.optional || {};
      const optEntries = [ ['Charges', opt.charges], ['Total Received', opt.totalReceived], ['Net Sales', opt.grossProfitAmount], ['Gross Profit ($)', opt.grossProfitAmount], ['Gross Profit (%)', opt.grossProfitPercent], ['# Invoices', opt.numInvoices], ['# Voids', opt.numVoids], ].filter(([,v]) => Number(v || 0) !== 0);
      const optList = optEntries.length ? `<ul class="list">${optEntries.map(([k,v]) => `<li><span class="label">${k}</span><span class="val">${k.includes('%') ? (Number(v||0).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%') : (k.startsWith('#') ? Number(v||0).toLocaleString() : fmt(v))}</span></li>`).join('')}</ul>` : '';
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
    } catch (_) {}
  }

  _computeReadOnly() {
    try { const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; if (!key) return false; const past = key !== today; const unlocked = (typeof isDayEditUnlocked === 'function') ? isDayEditUnlocked() : false; return past && !unlocked; } catch (_) { return false; }
  }

  _activeDayTitle() {
    try { const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (!key) return "Today's Count"; const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; if (key === today) return "Today's Count"; const d = new Date(); d.setDate(d.getDate() - 1); const yk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; if (key === yk) return "Yesterday's Count"; const [Y,M,D] = key.split('-').map((x)=>Number(x)); const dt = new Date(Y, (M||1)-1, D||1); const formatted = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); return `${formatted} Count`; } catch(_) { return "Count"; }
  }

  _hasSavedDay(key) { try { const { entry } = _getActiveDaysEntry(false); return !!entry?.days?.[key]; } catch (_) { return false; } }
  _isSaveMode() { try { const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (!key) return false; const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; return key !== today; } catch (_) { return false; } }
  _focusFirstInput() { try { const dc = this.querySelector('drawer-count'); const first = dc?.shadowRoot?.querySelector('input, button, [tabindex="0"]') || dc?.querySelector('input, button, [tabindex="0"]'); if (first && typeof first.focus === 'function') first.focus(); } catch (_) {}
  }

  _onStart() {
    try { const today = (typeof getTodayKey === 'function') ? getTodayKey() : null; const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (today && key && key !== today) { try { setActiveViewDateKey(today); } catch(_) {} try { restoreDay(today); } catch(_) {} try { setDayEditUnlocked(true); } catch(_) {} try { const header = document.querySelector('app-header'); applyReadOnlyByActiveDate(header); } catch(_) {} } } catch(_) {}
    this._state.started = true; this._state.collapsed = false; this._state.completed = false; this._state.reopened = false; this._savePersisted(this._state);
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(true); } catch (_) {}
    this._refresh();
    queueMicrotask(() => this._focusFirstInput());
  }

  _onToggle() { if (!this._state.started) return; this._state.collapsed = !this._state.collapsed; this._savePersisted({ collapsed: this._state.collapsed, started: this._state.started }); this._refresh(); }

  _beginProcessing(kind) { this._isProcessing = true; this._processingKind = kind || null; this._refresh(); }
  _endProcessing() { this._isProcessing = false; this._processingKind = null; this._refresh(); }

  _onComplete() {
    if (this._isProcessing) return;
    const saveMode = this._isSaveMode();
    this._beginProcessing(saveMode ? 'save' : 'complete');
    if (saveMode) {
      try { if (typeof getActiveViewDateKey === 'function' && typeof saveSpecificDay === 'function') { const key = getActiveViewDateKey(); if (key) saveSpecificDay(key); } try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch(_) {} try { const header = document.querySelector('app-header'); updateStatusPill(header); applyReadOnlyByActiveDate(header); } catch(_) {} toast('Saved. Editing locked.', { type: 'success', duration: 3000 }); } catch (_) { }
      setTimeout(() => this._endProcessing(), 200); this._refresh(); return;
    }
    this._state.completed = true; this._state.reopened = false; this._savePersisted({ completed: true, started: true, reopened: false });
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch (_) {}
    try { if (typeof getActiveViewDateKey === 'function' && typeof saveSpecificDay === 'function') { const key = getActiveViewDateKey(); if (key) saveSpecificDay(key); } } catch (_) {}
    try { toast('Marked complete for this day.'); } catch(_) {}
    this._state.collapsed = false;
    setTimeout(() => this._endProcessing(), 250);
    this._refresh();
  }

  _onReopen() {
    this._state.completed = false; this._state.collapsed = false; this._state.started = true; this._state.reopened = true; this._savePersisted(this._state);
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch(_) {}
    try { const header = document.querySelector('app-header'); applyReadOnlyByActiveDate(header); } catch(_) {}
    try { toast('Reopened. Editing locked for past days.', { type: 'info', duration: 1800 }); } catch(_) {}
    this._refresh();
    queueMicrotask(() => this._focusFirstInput());
  }

  _onVisibilityRefresh() { this._refresh(); }
  _onDrawerChange(_e) { this._refresh(true); }
}

if (!customElements.get('count-panel')) customElements.define('count-panel', CountPanel);

export default CountPanel;
