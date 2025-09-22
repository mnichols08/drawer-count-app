import { toast } from '../lib/toast.js';

class HelpModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
  }
  connectedCallback() {
    const content = this.getAttribute('content') || '';
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); z-index: 1000; }
        .dialog { position: fixed; inset: 10% auto auto 50%; transform: translateX(-50%);
         max-width: min(640px, 92vw); background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 12px; padding: 14px; z-index: 1001; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); }
        .hd { display:flex; justify-content: space-between; align-items:center; gap: 8px; margin-bottom: 8px; }
        .hd h2 { margin: 0; font-size: 1.2rem; }
        .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; cursor: pointer; }
        .content { font-size: .95rem; line-height: 1.5; color: var(--fg); }
        .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--kbd-bg, #0f1730); color: var(--kbd-fg, #e7ecff); border:1px solid var(--kbd-border, #2a345a); border-radius:6px; padding:2px 6px; font-weight: 600; }
        ul { margin: .25rem 0 .5rem 1.25rem; }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Help and shortcuts">
        <div class="hd">
          <h2>About & Shortcuts</h2>
          <button class="close" aria-label="Close">Close</button>
        </div>
        <div class="content">
          <p>Drawer Count helps quickly total cash drawers with slips, checks, and bill/coin counts. It works offline and can be installed as an app. To use, get your cash sales and ROA amounts from the "Review Today's Sales" screen in TAMS, and input them into the appropriate fields. Then simply input the amounts from your credit card slips, checks received, and cash.</p>
          <p><strong>Keyboard Shortcuts</strong></p>
          <ul>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">S</span> → Add Slip</li>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">C</span> → Add Check</li>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">Backspace</span> → Remove last added row</li>
            <li><span class="kbd">Alt</span>+<span class="kbd">Backspace</span> (in a row) → Remove that row</li>
          </ul>
          <p><strong>Install</strong>: Use the browser’s install option or the banner when available. Once installed, it opens in its own window and works offline.</p>
        </div>
      </div>
    `;
    this._shadow.querySelector('.backdrop')?.addEventListener('click', () => this.close());
    this._shadow.querySelector('.close')?.addEventListener('click', () => this.close());
    window.addEventListener('keydown', this._onKeyDown);
  }
  disconnectedCallback() { window.removeEventListener('keydown', this._onKeyDown); }
  open() { this.setAttribute('open', ''); }
  close() { this.removeAttribute('open'); }
  _onKeyDown(e) { if (e.key === 'Escape') this.close(); }
}

if (!customElements.get('help-modal')) customElements.define('help-modal', HelpModal);

export function getHelpModal() {
  let m = document.querySelector('help-modal');
  if (!m) { m = document.createElement('help-modal'); document.body.appendChild(m); }
  return m;
}
