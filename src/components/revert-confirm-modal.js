import { toast } from '../lib/toast.js';

class RevertConfirmModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._resolver = null;
    this._dayKey = '';
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
        .content { display: grid; gap: 10px; }
        .warn { color: #ffd6a6; }
        .actions { display:flex; gap: 8px; justify-content: flex-end; }
        .btn { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 0.6rem 0.8rem; cursor: pointer; min-height: 44px; font-weight: 600; }
        .btn:hover { filter: brightness(1.08); }
        .btn:active { transform: translateY(1px); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
        .btn-danger { background: #5a2a2a; color: #ffd6d6; border-color: #7a3a3a; }
        @media (max-width: 480px) { .dialog { inset: 6% auto auto 50%; padding: 12px; } }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Revert to saved">
        <div class="hd">
          <h2>Revert to Saved?</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <div class="content">
          <p>This will discard your in-progress changes for <strong class="key"></strong> and restore the last saved copy.</p>
          <div class="actions">
            <button type="button" class="btn btn-cancel">Cancel</button>
            <button type="button" class="btn btn-danger btn-revert">Revert</button>
          </div>
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      close: this._shadow.querySelector('.close'),
      cancel: this._shadow.querySelector('.btn-cancel'),
      revert: this._shadow.querySelector('.btn-revert'),
      key: this._shadow.querySelector('.key'),
    };
    this._els.backdrop?.addEventListener('click', () => this.close());
    this._els.close?.addEventListener('click', () => this.close());
    this._els.cancel?.addEventListener('click', () => this.close());
    this._els.revert?.addEventListener('click', () => this._confirm());
  }
  open(dayKey = '') { if (!this._els) this._render(); this._dayKey = dayKey || ''; if (this._els.key) this._els.key.textContent = this._dayKey || 'this day'; this.setAttribute('open', ''); return new Promise((resolve) => { this._resolver = resolve; }); }
  close() { this.removeAttribute('open'); }
  _cancel() { this.close(); this._resolve(false); }
  _confirm() { this.close(); this._resolve(true); }
  _resolve(v) { const r = this._resolver; this._resolver = null; if (r) r(v); }
  _onKeyDown(e) { if (e.key === 'Escape' && this.hasAttribute('open')) this._cancel(); }
}

if (!customElements.get('revert-confirm-modal')) customElements.define('revert-confirm-modal', RevertConfirmModal);

export function getRevertConfirmModal() { let m = document.querySelector('revert-confirm-modal'); if (!m) { m = document.createElement('revert-confirm-modal'); document.body.appendChild(m); } return m; }
