class NewProfileModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
  }
  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
  .backdrop { position: fixed; inset: 0; background: var(--backdrop-bg, rgba(0,0,0,.5)); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 12% auto auto 50%; transform: translateX(-50%);
          max-width: min(520px, 92vw); max-height: min(85vh, 92vh); overflow-y: auto; overflow-x: hidden;
          background: var(--card); color: var(--fg);
          border: 1px solid var(--border); border-radius: 14px; padding: 1.1rem 1.1rem 1.25rem; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35));
          backdrop-filter: saturate(120%) blur(6px); -webkit-backdrop-filter: saturate(120%) blur(6px);
        }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 10px; }
        .hd h2 { margin: 0; font-size: 1.1rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; cursor: pointer; }
        form { display: grid; gap: 10px; }
        label { font-size: .95rem; }
        input[type="text"] {
          width: 100%; max-width: 100%; box-sizing: border-box;
          background: var(--input-bg-color);
          color: var(--input-fg-color);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.6rem 0.75rem;
          min-height: 44px;
          font-size: 16px;
        }
        .actions { display:flex; gap: 8px; justify-content: flex-end; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 44px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
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
    this._els.input?.addEventListener('input', () => { const name = (this._els.input.value || '').trim(); this._els.submit.disabled = name.length === 0; });
    this._els.form?.addEventListener('submit', (e) => { e.preventDefault(); const name = (this._els.input.value || '').trim(); if (!name) { this._els.input.focus(); return; } this.removeAttribute('open'); this._resolve(name); });
  }
  open(defaultValue = '') { this.setAttribute('open', ''); if (!this._els) this._render(); this._els.input.value = defaultValue || ''; this._els.submit.disabled = (this._els.input.value.trim().length === 0); setTimeout(() => { try { this._els.input.focus(); this._els.input.select(); } catch(_) {} }, 0); return new Promise((resolve) => { this._resolver = resolve; }); }
  close() { this.removeAttribute('open'); this._resolve(null); }
  _cancel() { this.close(); }
  _resolve(value) { const r = this._resolver; this._resolver = null; if (r) r(value); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); }
}

if (!customElements.get('new-profile-modal')) customElements.define('new-profile-modal', NewProfileModal);

export function getNewProfileModal() { let m = document.querySelector('new-profile-modal'); if (!m) { m = document.createElement('new-profile-modal'); document.body.appendChild(m); } return m; }
