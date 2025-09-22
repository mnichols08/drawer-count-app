// Simple global toaster API and element registration helper
class AppToaster extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._shadow.innerHTML = `
      <style>
        :host { position: fixed; inset: auto 1rem 1rem auto; z-index: 9999; pointer-events: none; }
        .stack { display: grid; gap: 8px; }
        .toast {
          pointer-events: auto;
          min-width: 220px; max-width: min(92vw, 420px);
          padding: 10px 12px; border-radius: 10px; border: 1px solid #2a345a;
          background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px;
          transform: translateY(8px); opacity: 0; transition: transform .15s ease, opacity .15s ease;
        }
        .toast.show { transform: translateY(0); opacity: 1; }
        .msg { font-size: 0.95rem; }
        .btnx, .act { background: transparent; color: inherit; border: 1px solid var(--border, #2a345a); cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .btnx { border: none; padding: 4px 6px; }
        .act:hover { filter: brightness(1.08); }
        .btnx:focus, .act:focus { outline: 2px solid var(--accent, #3a86ff); outline-offset: 2px; }
        .info { }
        .success { border-color: #2a5a3a; box-shadow: 0 10px 30px rgba(20,80,40,0.45); }
        .warning { border-color: #5a4a2a; box-shadow: 0 10px 30px rgba(80,60,20,0.45); }
        .error { border-color: #5a2a2a; box-shadow: 0 10px 30px rgba(80,20,20,0.45); }
      </style>
      <div class="stack" role="region" aria-label="Notifications"></div>
    `;
    this._stack = this._shadow.querySelector('.stack');
  }
  show(message, opts = {}) {
    const { type = 'info', duration = 3000, action } = opts;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="msg">${message}</div>
      ${action && action.label ? '<button class="act" aria-label="Action"></button>' : ''}
      <button class="btnx" aria-label="Close">\u2715</button>
    `;
    const btnClose = toast.querySelector('.btnx');
    const btnAct = toast.querySelector('.act');
    const dispose = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 150); };
    btnClose.addEventListener('click', dispose);
    if (btnAct) {
      btnAct.textContent = action.label;
      btnAct.addEventListener('click', () => { try { action.onClick?.(); } catch (_) {} dispose(); });
    }
    this._stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    if (duration > 0) setTimeout(dispose, duration);
    return { close: dispose };
  }
}

if (!customElements.get('app-toaster')) {
  customElements.define('app-toaster', AppToaster);
}

export function getToaster() {
  let t = document.querySelector('app-toaster');
  if (!t) { t = document.createElement('app-toaster'); document.body.appendChild(t); }
  return t;
}

export function toast(message, opts) {
  try { getToaster().show(message, opts); } catch (_) {}
}
