import { toast } from '../lib/toast.js';
import './app-modal.js';

class RevertConfirmModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._dayKey = '';
    this._resolved = false; // Prevent double resolution
  }
  connectedCallback() { this._render(); window.addEventListener('keydown', this._onKeyDown); }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .content { display: grid; gap: 10px; }
        .warn { color: #ffd6a6; }
        .actions { display:flex; gap: 8px; justify-content: flex-end; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 44px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
        .btn-danger { background: #5a2a2a; color: #ffd6d6; border-color: #7a3a3a; }
      </style>
      <app-modal title="Revert to Saved" closable>
        <div class="content" slot="body">
          <p>This will discard your in-progress changes for <strong class="key"></strong> and restore the last saved copy.</p>
        </div>
        <div class="actions modal-actions" slot="footer">
          <button type="button" class="btn btn-cancel">Cancel</button>
          <button type="button" class="btn btn-danger btn-revert">Revert</button>
        </div>
      </app-modal>
    `;
    this._els = {
      modal: this._shadow.querySelector('app-modal'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      revert: this._shadow.querySelector('.btn-revert'),
      key: this._shadow.querySelector('.key'),
    };
    this._els.modal?.addEventListener('modal-close', () => {
      // Only call _cancel if we haven't already resolved
      if (!this._resolved) {
        this._cancel();
      }
    });
    this._els.cancel?.addEventListener('click', () => this._cancel());
    this._els.revert?.addEventListener('click', () => this._confirm());
  }
  open(dayKey = '') { 
    if (!this._els) this._render(); 
    this._dayKey = dayKey || ''; 
    this._resolved = false; // Reset the resolution flag
    if (this._els.key) this._els.key.textContent = this._dayKey || 'this day'; 
    this.setAttribute('open', ''); 
    this._els.modal?.show(); 
    return new Promise((resolve) => { this._resolver = resolve; }); 
  }
  close() { this._els?.modal?.hide('programmatic'); this.removeAttribute('open'); }
  _cancel() { 
    this._resolveWith(false);
  }
  _confirm() { 
    this._resolveWith(true);
  }
  _resolveWith(value) {
    if (this._resolved) {
      return; // Prevent double resolution
    }
    this._resolved = true;
    this.close();
    const r = this._resolver; 
    this._resolver = null; 
    if (r) r(value); 
  }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this._cancel(); }
}

if (!customElements.get('revert-confirm-modal')) customElements.define('revert-confirm-modal', RevertConfirmModal);

export function getRevertConfirmModal() { let m = document.querySelector('revert-confirm-modal'); if (!m) { m = document.createElement('revert-confirm-modal'); document.body.appendChild(m); } return m; }
