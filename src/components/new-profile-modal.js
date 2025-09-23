import './app-modal.js';

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
      </style>
      <app-modal title="Create Profile" closable>
        <form slot="body" id="np-form">
          <label for="np-name">Profile name</label>
          <input id="np-name" name="name" type="text" autocomplete="off" placeholder="e.g., Name" />
        </form>
        <div class="actions" slot="footer">
          <button type="button" class="btn btn-cancel">Cancel</button>
          <button type="submit" class="btn btn-submit" form="np-form" disabled>Create</button>
        </div>
      </app-modal>
    `;
    this._els = {
      modal: this._shadow.querySelector('app-modal'),
      form: this._shadow.querySelector('form'),
      input: this._shadow.querySelector('#np-name'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      submit: this._shadow.querySelector('.btn-submit'),
    };
    this._els.modal?.addEventListener('modal-close', (e) => {
      // Only cancel if the modal was closed by escape/cancel, not by form submission
      if (e.detail?.reason !== 'submit') {
        this._cancel();
      }
    });
    this._els.cancel?.addEventListener('click', () => this._cancel());
    this._els.input?.addEventListener('input', () => { const name = (this._els.input.value || '').trim(); this._els.submit.disabled = name.length === 0; });
    this._els.form?.addEventListener('submit', (e) => { 
      e.preventDefault(); 
      const name = (this._els.input.value || '').trim(); 
      if (!name) { this._els.input.focus(); return; } 
      this.removeAttribute('open'); 
      this._els.modal?.hide('submit'); 
      this._resolve(name); 
    });
  }
  open(defaultValue = '') { 
    this.setAttribute('open', ''); 
    if (!this._els) this._render(); 
    this._els.input.value = defaultValue || ''; 
    this._els.submit.disabled = (this._els.input.value.trim().length === 0); 
    this._els.modal?.show(); 
    setTimeout(() => { try { this._els.input.focus(); this._els.input.select(); } catch(_) {} }, 0); 
    return new Promise((resolve) => { this._resolver = resolve; }); 
  }
  close() { this._els?.modal?.hide('programmatic'); this.removeAttribute('open'); this._resolve(null); }
  _cancel() { this.close(); }
  _resolve(value) { 
    const r = this._resolver; 
    this._resolver = null; 
    if (r) {
      r(value); 
    }
  }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); }
}

if (!customElements.get('new-profile-modal')) customElements.define('new-profile-modal', NewProfileModal);

export function getNewProfileModal() { let m = document.querySelector('new-profile-modal'); if (!m) { m = document.createElement('new-profile-modal'); document.body.appendChild(m); } return m; }
