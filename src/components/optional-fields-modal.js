class OptionalFieldsModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._fields = [];
    this._selected = new Set();
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
            max-width: min(520px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden;
            background: var(--card); color: var(--fg);
            border: 1px solid var(--border); border-radius: 14px; padding: 1.1rem 1.1rem 1.25rem; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35));
            backdrop-filter: saturate(120%) blur(6px); -webkit-backdrop-filter: saturate(120%) blur(6px);
          }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; cursor: pointer; }
        .content { display: grid; gap: 10px; }
        .fields { display:grid; gap: 6px; }
        label { display:flex; align-items:center; gap: 10px; cursor: pointer; }
        input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent, #5aa0ff); }
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
        <div class="content">
          <div class="fields"></div>
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
    const toLabel = (id) => {
      try {
        let s = (id || '').toString();
        if (s.startsWith('#')) s = s.slice(1);
        if (s.startsWith('opt-')) s = s.slice(4);
        s = s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        return s.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ');
      } catch(_) { return id; }
    };
    const html = this._fields.map(item => {
      const id = (typeof item === 'string') ? item : item?.id;
      const label = (typeof item === 'string') ? toLabel(item) : (item?.label || item?.id || '');
      const checked = this._selected.has(id) ? 'checked' : '';
      return `<label><input type="checkbox" data-id="${id}" ${checked}/> <span>${label}</span></label>`;
    }).join('');
    this._els.fields.innerHTML = html || '<em>No optional fields available</em>';
    this._els.fields.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (e.currentTarget.checked) this._selected.add(id); else this._selected.delete(id);
      });
    });
  }
  open({ available = [], selected = [] } = {}) {
    if (!this._els) this._render();
    this._fields = Array.from(available);
    this._selected = new Set(selected);
    this._renderFields();
    this.setAttribute('open', '');
    return new Promise((resolve) => { this._resolver = resolve; });
  }
  close() { this.removeAttribute('open'); }
  _cancel() { this.close(); this._resolve(null); }
  _confirm() { this.close(); this._resolve(Array.from(this._selected)); }
  _resolve(v) { const r = this._resolver; this._resolver = null; if (r) r(v); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this._cancel(); }
}

if (!customElements.get('optional-fields-modal')) customElements.define('optional-fields-modal', OptionalFieldsModal);

export function getOptionalFieldsModal() { let m = document.querySelector('optional-fields-modal'); if (!m) { m = document.createElement('optional-fields-modal'); document.body.appendChild(m); } return m; }

// Also expose on window for non-module callers that expect a global function
try { if (typeof window !== 'undefined') { window.getOptionalFieldsModal = getOptionalFieldsModal; } } catch(_) {}
