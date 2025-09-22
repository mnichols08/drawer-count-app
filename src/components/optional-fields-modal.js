class OptionalFieldsModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._fields = [
      { id: 'opt-charges', label: 'Charges', type: 'number', step: '0.01', placeholder: '0.00', inputmode: 'decimal' },
      { id: 'opt-total-received', label: 'Total Received', type: 'number', step: '0.01', placeholder: '0.00', inputmode: 'decimal' },
      { id: 'opt-net-sales', label: 'Net Sales', type: 'number', step: '0.01', placeholder: '0.00', inputmode: 'decimal' },
      { id: 'opt-gp-amount', label: 'Gross Profit Amount ($)', type: 'number', step: '0.01', placeholder: '0.00', inputmode: 'decimal' },
      { id: 'opt-gp-percent', label: 'Gross Profit Percentage (%)', type: 'number', step: '0.01', placeholder: '0.00', inputmode: 'decimal' },
      { id: 'opt-num-invoices', label: 'Number of Invoices', type: 'number', step: '1', placeholder: '0', inputmode: 'numeric' },
      { id: 'opt-num-voids', label: 'Number of Voids', type: 'number', step: '1', placeholder: '0', inputmode: 'numeric' },
    ];
  }
  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: var(--backdrop-bg, rgba(0,0,0,.5)); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 10% auto auto 50%; transform: translateX(-50%);
          max-width: min(540px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden;
          background: var(--card, #1b223a); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 14px; padding: 1.1rem 1.1rem 1.25rem; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35));
          backdrop-filter: saturate(120%) blur(6px); -webkit-backdrop-filter: saturate(120%) blur(6px);
        }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .sub { margin: 0 0 8px; color: var(--muted, #9aa3b2); font-size: .9rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; cursor: pointer; }
        .content { display: grid; gap: 10px; }
        .grid { display:grid; gap: 8px; }
        .row { display:grid; grid-template-columns: 1fr auto; align-items:center; gap: 10px; }
        .row label { font-size: .95rem; }
        .row input { min-width: 150px; max-width: 220px; }
        input[type="number"] {
          border-radius:.25rem; background: var(--input-bg-color, #0000000f);
          border: 1px solid var(--border, #2a345a); color: var(--fg, #e0e6ff);
          padding: 0.45rem 0.55rem;
        }
        .actions { display:flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 44px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Optional fields">
        <div class="hd">
          <h2>Optional Fields</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <p class="sub">These values are informational and do not affect totals.</p>
        <div class="content">
          <div class="grid fields"></div>
          <div class="actions">
            <button type="button" class="btn btn-cancel">Cancel</button>
            <button type="button" class="btn btn-ok">Apply</button>
          </div>
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      close: this._shadow.querySelector('.close'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      ok: this._shadow.querySelector('.btn-ok'),
      fields: this._shadow.querySelector('.fields'),
    };
    this._els.backdrop?.addEventListener('click', () => this._cancel());
    this._els.close?.addEventListener('click', () => this._cancel());
    this._els.cancel?.addEventListener('click', () => this._cancel());
    this._els.ok?.addEventListener('click', () => this._confirm());
  }
  _renderFields() {
    if (!this._els?.fields) return;
    const html = this._fields.map(f => {
      return `<div class="row"><label for="${f.id}">${f.label}</label><input id="${f.id}" name="${f.id}" type="${f.type}" step="${f.step}" placeholder="${f.placeholder}" inputmode="${f.inputmode}" /></div>`;
    }).join('');
    this._els.fields.innerHTML = html;
  }
  _getDrawer() {
    try { return document.querySelector('drawer-count'); } catch(_) { return null; }
  }
  _getDrawerInput(id) {
    try {
      const comp = this._getDrawer();
      return comp?.shadowRoot?.querySelector(`#${id}`) || null;
    } catch(_) { return null; }
  }
  _prefillFromDrawer() {
    try {
      for (const f of this._fields) {
        const el = this._getDrawerInput(f.id);
        const v = el ? el.value : '';
        const inp = this._shadow.getElementById(f.id);
        if (inp) inp.value = v ?? '';
      }
    } catch(_) {}
  }
  async open() {
    if (!this._els) this._render();
    this._renderFields();
    this._prefillFromDrawer();
    this.setAttribute('open', '');
    return new Promise((resolve) => { this._resolver = resolve; });
  }
  close() { this.removeAttribute('open'); }
  _cancel() { this.close(); this._resolve(null); }
  _confirm() {
    try {
      // Write back to drawer-count inputs and dispatch input events
      for (const f of this._fields) {
        const src = this._shadow.getElementById(f.id);
        const dst = this._getDrawerInput(f.id);
        if (!dst || !src) continue;
        // Preserve empty as empty, otherwise coerce to Number
        const raw = src.value;
        dst.value = (raw === '' || raw === null || raw === undefined) ? '' : Number(raw);
        // Dispatch input event to trigger downstream updates/persistence
        try { dst.dispatchEvent(new Event('input', { bubbles: true })); } catch(_) {}
      }
    } catch(_) {}
    this.close();
    this._resolve(true);
  }
  _resolve(v) { const r = this._resolver; this._resolver = null; if (r) r(v); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this._cancel(); }
}

if (!customElements.get('optional-fields-modal')) customElements.define('optional-fields-modal', OptionalFieldsModal);
export function getOptionalFieldsModal() { let m = document.querySelector('optional-fields-modal'); if (!m) { m = document.createElement('optional-fields-modal'); document.body.appendChild(m); } return m; }
try { if (typeof window !== 'undefined') { window.getOptionalFieldsModal = getOptionalFieldsModal; } } catch(_) {}
