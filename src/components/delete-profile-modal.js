import { loadProfilesData } from '../lib/persistence.js';
import './app-modal.js';

class DeleteProfileModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._profileName = '';
  }
  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .content { display: grid; gap: 10px; }
        .danger { color: #ffb4b4; }
        .actions { display:flex; gap: 8px; justify-content: flex-end; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 44px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
        .btn-danger { background: #5a2a2a; color: #ffd6d6; border-color: #7a3a3a; }
      </style>
      <app-modal title="Delete Profile" closable>
        <div class="content" slot="body">
          <p>Are you sure you want to delete the profile <strong class="pname"></strong>? This action cannot be undone.</p>
          <p class="danger" aria-live="polite"></p>
        </div>
        <div class="actions modal-actions" slot="footer">
          <button type="button" class="btn btn-cancel">Cancel</button>
          <button type="button" class="btn btn-danger btn-delete">Delete</button>
        </div>
      </app-modal>
    `;
    this._els = {
      modal: this._shadow.querySelector('app-modal'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      del: this._shadow.querySelector('.btn-delete'),
      name: this._shadow.querySelector('.pname'),
      warn: this._shadow.querySelector('.danger'),
    };
    this._els.modal?.addEventListener('modal-close', (e) => {
      // Only cancel if the modal was closed by escape/X button, not by programmatic close
      if (e.detail?.reason !== 'programmatic') {
        this._cancel();
      }
    });
    this._els.cancel?.addEventListener('click', () => this._cancel());
    this._els.del?.addEventListener('click', () => this._confirm());
  }
  open(profileName = '') {
    if (!this._els) this._render();
    this._profileName = profileName || '';
    if (this._els.name) this._els.name.textContent = this._profileName || '—';
    try {
      const data = loadProfilesData();
      const count = Object.keys(data.profiles || {}).length;
      if (count <= 1) { this._els.warn.textContent = 'You cannot delete the last remaining profile.'; this._els.del.disabled = true; }
      else { this._els.warn.textContent = ''; this._els.del.disabled = false; }
    } catch(_) {}
    this.setAttribute('open', '');
    this._els.modal?.show();
    return new Promise((resolve) => { this._resolver = resolve; });
  }
  close() { 
    this._els?.modal?.hide('programmatic'); 
    this.removeAttribute('open'); 
  }
  _cancel() { 
    this.close(); 
    this._resolve(false); 
  }
  _confirm() { 
    this.close(); 
    this._resolve(true); 
  }
  _resolve(v) { 
    const r = this._resolver; 
    this._resolver = null; 
    if (r) {
      r(v);
    }
  }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this._cancel(); }
}

if (!customElements.get('delete-profile-modal')) customElements.define('delete-profile-modal', DeleteProfileModal);

export function getDeleteProfileModal() { let m = document.querySelector('delete-profile-modal'); if (!m) { m = document.createElement('delete-profile-modal'); document.body.appendChild(m); } return m; }
