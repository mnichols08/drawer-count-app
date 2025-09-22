class DayPickerModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._days = [];
    this._selected = '';
  }
  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 12% auto auto 50%; transform: translateX(-50%);
         max-width: min(520px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden;
          background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 14px; padding: 1.1rem 1.1rem 1.25rem; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; cursor: pointer; }
        .content { display: grid; gap: 10px; }
        select { width: 100%; min-height: 44px; border-radius: 10px; border: 1px solid var(--border, #2a345a); background: var(--input, #1b2138); color: var(--fg, #e0e6ff); padding: 8px 10px; }
        .actions { display:flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 44px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Pick a day">
        <div class="hd">
          <h2>Pick a Day</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <div class="content">
          <select class="select"></select>
          <div class="actions">
            <button type="button" class="btn btn-cancel">Cancel</button>
            <button type="button" class="btn btn-ok">Load</button>
          </div>
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      close: this._shadow.querySelector('.close'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      ok: this._shadow.querySelector('.btn-ok'),
      select: this._shadow.querySelector('.select'),
    };
    this._els.backdrop?.addEventListener('click', () => this._cancel());
    this._els.close?.addEventListener('click', () => this._cancel());
    this._els.cancel?.addEventListener('click', () => this._cancel());
    this._els.ok?.addEventListener('click', () => this._confirm());
  }
  _renderOptions() {
    if (!this._els?.select) return;
    const html = this._days.map(k => `<option value="${k}" ${k===this._selected?'selected':''}>${k}</option>`).join('');
    this._els.select.innerHTML = html || '<option value="" disabled>No saved days</option>';
    const sel = this._els.select.value || this._selected || '';
    this._selected = sel;
  }
  open({ days = [], selected = '' } = {}) {
    if (!this._els) this._render();
    this._days = Array.from(days);
    this._selected = selected || '';
    this._renderOptions();
    this.setAttribute('open', '');
    return new Promise((resolve) => { this._resolver = resolve; });
  }
  close() { this.removeAttribute('open'); }
  _cancel() { this.close(); this._resolve(null); }
  _confirm() {
    if (this._els?.select) this._selected = this._els.select.value;
    this.close();
    this._resolve(this._selected || null);
  }
  _resolve(v) { const r = this._resolver; this._resolver = null; if (r) r(v); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this._cancel(); }
}

if (!customElements.get('day-picker-modal')) customElements.define('day-picker-modal', DayPickerModal);

export function getDayPickerModal() { let m = document.querySelector('day-picker-modal'); if (!m) { m = document.createElement('day-picker-modal'); document.body.appendChild(m); } return m; }
