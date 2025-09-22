import { toast } from '../lib/toast.js';
import './app-modal.js';

class DayPickerModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._allowed = new Set();
    this._selected = '';
    this._today = this._fmt(new Date());
    this._ym = { y: new Date().getFullYear(), m: new Date().getMonth() }; // m: 0-11
    this._minYM = null; this._maxYM = null;
  }

  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }

  _fmt(d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  _parse(key) { const [Y,M,D] = (key||'').split('-').map(n=>Number(n)); if (!Y||!M||!D) return null; return new Date(Y,(M-1),D); }
  _sameYM(a,b){ return a && b && a.y===b.y && a.m===b.m; }
  _clampYM(ym){ if (!this._minYM||!this._maxYM) return ym; const before = (ym.y < this._minYM.y) || (ym.y===this._minYM.y && ym.m < this._minYM.m); const after = (ym.y > this._maxYM.y) || (ym.y===this._maxYM.y && ym.m > this._maxYM.m); if (before) return { ...this._minYM }; if (after) return { ...this._maxYM }; return ym; }

  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .content { display: grid; gap: 10px; padding: 12px 14px 14px; }
        .cal-hd { display:flex; align-items:center; justify-content: space-between; gap: 8px; }
        .nav { display:flex; gap: 6px; align-items: center; }
        .nav .btn { min-height: 36px; padding: 6px 10px; }
        .month-label { font-weight: 700; letter-spacing: .2px; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .dow { opacity: .8; font-size: .85rem; text-align:center; padding: 4px 0; }
        .day { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 38px; border-radius: 10px; border: 1px solid var(--border, #2a345a); background: var(--input-bg-color, #1b2138); color: var(--input-fg-color, var(--fg, #e0e6ff)); cursor: pointer; }
        .day[disabled] { opacity: .35; cursor: not-allowed; filter: grayscale(0.2); }
        .day.saved::after { content: ''; position: absolute; bottom: 5px; width: 6px; height: 6px; border-radius: 999px; background: #2ecc71; }
        .day.today { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 1px; }
        .legend { display:flex; align-items:center; gap: 14px; font-size: .85rem; opacity: .85; }
        .legend .key { display:inline-flex; align-items:center; gap: 6px; }
        .dot { width: 8px; height: 8px; border-radius: 999px; display:inline-block; }
        .dot.today { background: var(--accent, #5aa0ff); }
        .dot.saved { background: #2ecc71; }
        .actions { display:flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 40px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
      </style>
      <app-modal title="Pick a Day" closable>
        <div class="content" slot="body">
          <div class="cal-hd">
            <div class="nav">
              <button type="button" class="btn btn-prev" aria-label="Previous month">‹</button>
              <button type="button" class="btn btn-next" aria-label="Next month">›</button>
              <button type="button" class="btn btn-today" aria-label="Jump to today">Today</button>
            </div>
            <div class="month-label" aria-live="polite"></div>
          </div>
          <div class="grid grid-dow" aria-hidden="true"></div>
          <div class="grid grid-days" role="grid" aria-label="Calendar days"></div>
          <div class="legend">
            <span class="key"><span class="dot saved"></span> saved</span>
            <span class="key"><span class="dot today"></span> today</span>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-cancel">Cancel</button>
          </div>
        </div>
      </app-modal>
    `;

    this._els = {
      modal: this._shadow.querySelector('app-modal'),
      cancel: this._shadow.querySelector('.btn-cancel'),
  ok: this._shadow.querySelector('.btn-ok'),
      prev: this._shadow.querySelector('.btn-prev'),
      next: this._shadow.querySelector('.btn-next'),
      today: this._shadow.querySelector('.btn-today'),
      monthLabel: this._shadow.querySelector('.month-label'),
      gridDOW: this._shadow.querySelector('.grid-dow'),
      gridDays: this._shadow.querySelector('.grid-days'),
    };
    this._els.modal?.addEventListener('modal-close', () => this._cancel());
    this._els.cancel?.addEventListener('click', () => this._cancel());
  // no explicit OK button; clicking a saved day loads immediately
    this._els.prev?.addEventListener('click', () => this._nav(-1));
    this._els.next?.addEventListener('click', () => this._nav(1));
  this._els.today?.addEventListener('click', () => this._jumpToToday());
  this._els.gridDays?.addEventListener('keydown', (e) => this._onGridKeyDown(e));
  this._els.gridDays?.addEventListener('focusin', (e) => this._onGridFocusIn(e));

    // Weekday headers (Sun-Sat)
    const week = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    this._els.gridDOW.innerHTML = week.map(w => `<div class="dow">${w}</div>`).join('');

    this._renderMonth();
  }

  _computeBounds() {
    // min/max months based on allowed days and today
    const keys = Array.from(this._allowed);
    if (keys.length === 0) { const t = new Date(); this._minYM = { y: t.getFullYear(), m: t.getMonth() }; this._maxYM = { y: t.getFullYear(), m: t.getMonth() }; return; }
    const dts = keys.map(k=>this._parse(k)).filter(Boolean).sort((a,b)=>a-b);
    const first = dts[0];
    const today = new Date();
    this._minYM = { y: first.getFullYear(), m: first.getMonth() };
    this._maxYM = { y: today.getFullYear(), m: today.getMonth() };
  }

  _nav(dir) {
    const ym = { ...this._ym };
    ym.m += dir;
    if (ym.m < 0) { ym.m = 11; ym.y -= 1; }
    if (ym.m > 11) { ym.m = 0; ym.y += 1; }
    this._ym = this._clampYM(ym);
    this._renderMonth();
  }

  _renderMonth() {
    const { y, m } = this._ym;
    // month label
    const label = new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (this._els?.monthLabel) this._els.monthLabel.textContent = label;

    // prev/next enable state
  const prevYM = this._clampYM({ y: (m-1 < 0 ? y-1 : y), m: (m-1 < 0 ? 11 : m-1) });
  const nextYM = this._clampYM({ y: (m+1 > 11 ? y+1 : y), m: (m+1 > 11 ? 0 : m+1) });
    const prevDisabled = this._sameYM(prevYM, this._ym);
    const nextDisabled = this._sameYM(nextYM, this._ym);
    if (this._els?.prev) { this._els.prev.disabled = prevDisabled; }
    if (this._els?.next) { this._els.next.disabled = nextDisabled; }

    // days grid
    const firstDay = new Date(y, m, 1);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [];
    for (let i=0;i<startDow;i++) cells.push('<div></div>');
    for (let d=1; d<=daysInMonth; d++) {
      const key = this._fmt(new Date(y, m, d));
      const isToday = key === this._today;
      const isSaved = this._allowed.has(key);
      const disabled = (this._parse(key) > new Date()); // only future days disabled; allow clicking others for feedback
      const selected = key === this._selected;
      const ariaSel = selected ? 'true' : 'false';
      const tabIndex = selected || isToday ? '0' : '-1';
      cells.push(`<button type="button" role="gridcell" aria-selected="${ariaSel}" tabindex="${tabIndex}" class="day${isSaved?' saved':''}${isToday?' today':''}${selected?' selected':''}" data-key="${key}" ${disabled?'disabled':''} aria-label="${key}">${d}</button>`);
    }
    this._els.gridDays.innerHTML = cells.join('');
    this._els.gridDays.querySelectorAll('.day').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.hasAttribute('disabled')) return;
        const key = btn.getAttribute('data-key');
        const isSaved = this._allowed.has(key);
        if (!isSaved) { toast('No save for this day', { type: 'warning', duration: 1600 }); return; }
        this._updateSelection(key);
        this._confirm();
      });
    });
  }

  open({ days = [], selected = '' } = {}) {
    if (!this._els) this._render();
  // normalize inputs — only saved days are allowed selections
  this._allowed = new Set(Array.from(days || []));
    // compute bounds and initial month
    this._computeBounds();
    const savedList = Array.from(this._allowed).sort();
    const lastSaved = savedList.length ? savedList[savedList.length - 1] : '';
    const sel = (selected && this._allowed.has(selected)) ? selected : (lastSaved || '');
    this._selected = sel;
    const sdt = sel ? (this._parse(sel) || new Date()) : new Date();
    this._ym = this._clampYM({ y: sdt.getFullYear(), m: sdt.getMonth() });
    this._renderMonth();
  this.setAttribute('open', '');
  this._els.modal?.show();
    // focus selected if possible
    setTimeout(()=>{ 
      try { 
        if (this._selected) { this._updateSelection(this._selected, { focus: true, silent: true }); }
        else { (this._shadow.querySelector('.day.today') || this._shadow.querySelector('.day'))?.focus(); }
      } catch(_) {}
    }, 0);
    return new Promise((resolve) => { this._resolver = resolve; });
  }

  close() { this._els?.modal?.hide('programmatic'); this.removeAttribute('open'); }
  _cancel() { this.close(); this._resolve(null); }
  _confirm() {
    const sel = this._selected || '';
    if (!this._allowed.has(sel)) { toast('No save for this day', { type: 'warning', duration: 1500 }); return; }
    this.close(); this._resolve(sel);
  }
  _resolve(v) { const r = this._resolver; this._resolver = null; if (r) r(v); }
  _onKeyDown(e) { if (!this.hasAttribute('open')) return; if (e.key === 'Escape') this._cancel(); }

  _jumpToToday() {
    const dt = new Date();
    const ym = { y: dt.getFullYear(), m: dt.getMonth() };
    this._ym = this._clampYM(ym);
    this._renderMonth();
    setTimeout(()=>{ try { this._focusKey(this._today); } catch(_){} }, 0);
  }

  _focusKey(key) {
    const btn = this._shadow.querySelector(`.day[data-key="${key}"]`);
    if (!btn) return false;
    // roving tabindex
    this._shadow.querySelectorAll('.day[tabindex="0"]').forEach(b=>b.setAttribute('tabindex','-1'));
    btn.setAttribute('tabindex','0');
    btn.focus();
    return true;
  }

  _onGridKeyDown(e) {
    const active = this._shadow.activeElement;
    if (!active || !active.classList.contains('day')) return;
    const key = active.getAttribute('data-key');
    const cur = this._parse(key);
    if (!cur) return;
    let delta = 0;
    if (e.key === 'ArrowLeft') delta = -1; else if (e.key === 'ArrowRight') delta = 1; else if (e.key === 'ArrowUp') delta = -7; else if (e.key === 'ArrowDown') delta = 7; else if (e.key === 'Enter') { active.click(); return; } else { return; }
    e.preventDefault();
    const next = new Date(cur);
    next.setDate(cur.getDate() + delta);
    // clamp within month bounds
    const min = new Date(this._minYM?.y || cur.getFullYear(), this._minYM?.m ?? cur.getMonth(), 1);
    const max = new Date(this._maxYM?.y || cur.getFullYear(), this._maxYM?.m ?? cur.getMonth(), new Date(this._maxYM?.y || cur.getFullYear(), (this._maxYM?.m ?? cur.getMonth()) + 1, 0).getDate());
    const today = new Date(); if (next > today) next.setTime(today.getTime());
    if (next < min) next.setTime(min.getTime());
    if (next > max) next.setTime(max.getTime());
    const ym = { y: next.getFullYear(), m: next.getMonth() };
    const key2 = this._fmt(next);
    // navigate month if needed
    if (!this._sameYM(ym, this._ym)) { this._ym = this._clampYM(ym); this._renderMonth(); }
    this._focusKey(key2);
    if (this._allowed.has(key2)) this._updateSelection(key2, { silent: true });
  }

  _onGridFocusIn(e) {
    const t = e.target;
    if (!t || !t.classList?.contains('day')) return;
    const key = t.getAttribute('data-key');
    if (this._allowed.has(key)) this._updateSelection(key, { silent: true });
  }

  // no _onOkClick needed; kept for reference

  _getFocusedKey() {
    const el = this._shadow.activeElement;
    if (el && el.classList?.contains('day')) return el.getAttribute('data-key');
    return null;
  }

  _updateSelection(key, { focus = false, silent = false } = {}) {
    if (!key) return;
    // clear previous selection
    this._shadow.querySelectorAll('.day.selected').forEach(b=>{ b.classList.remove('selected'); b.setAttribute('aria-selected','false'); });
    this._selected = key;
    const btn = this._shadow.querySelector(`.day[data-key="${key}"]`);
    if (btn) { btn.classList.add('selected'); btn.setAttribute('aria-selected','true'); this._shadow.querySelectorAll('.day[tabindex="0"]').forEach(b=>b.setAttribute('tabindex','-1')); btn.setAttribute('tabindex','0'); if (focus) btn.focus(); }
    if (!silent) { /* no-op hook for future */ }
  }
}

if (!customElements.get('day-picker-modal')) customElements.define('day-picker-modal', DayPickerModal);

export function getDayPickerModal() { let m = document.querySelector('day-picker-modal'); if (!m) { m = document.createElement('day-picker-modal'); document.body.appendChild(m); } return m; }
