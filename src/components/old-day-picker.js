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
    // Only allow moving forward up to current month (offset 0). Never beyond (no future navigation allowed at all).
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
          max-width: min(480px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden;
          background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
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
          <div style="display:flex; gap:8px;">
            <button class="btn cancel" aria-label="Cancel">Cancel</button>
            <button class="btn close" aria-label="Close">Close</button>
          </div>
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
      cancel: this._shadow.querySelector('.cancel'),
    };
    this._els.backdrop?.addEventListener('click', () => this.close());
    this._els.close?.addEventListener('click', () => this.close());
    this._els.cancel?.addEventListener('click', () => this.close());
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