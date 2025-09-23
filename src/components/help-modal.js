import { getOnboardingTour } from "./onboarding-tour.js";
import './app-modal.js';

class HelpModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
    this._onKeyDown = this._onKeyDown.bind(this);
  }
  connectedCallback() {
    const _content = this.getAttribute("content") || "";
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
        .content { font-size: .98rem; line-height: 1.6; color: var(--fg); }
        .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--kbd-bg, #0f1730); color: var(--kbd-fg, #e7ecff); border:1px solid var(--kbd-border, #2a345a); border-radius:6px; padding:2px 6px; font-weight: 600; }
        ul { margin: .25rem 0 .5rem 1.25rem; }
        .walkthrough { background: var(--btn-bg, var(--button-bg-color, #222)); color: var(--btn-fg, var(--button-color, #e0e6ff)); border: 1px solid transparent; border-radius: 10px; padding: 8px 12px; cursor: pointer; min-height: 40px; }
        .walkthrough:hover { filter: brightness(1.05); }
        .walkthrough:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
      </style>
       <app-modal title="About & Shortcuts" closable>
        <div class="content" slot="body">
          <p>Drawer Count helps quickly total cash drawers with slips, checks, and bill/coin counts. It works offline and can be installed as an app. To use, get your cash sales and ROA amounts from the "Review Today's Sales" screen in TAMS, and input them into the appropriate fields. Then simply input the amounts from your credit card slips, checks received, and cash.</p>
          <p><strong>Keyboard Shortcuts</strong></p>
          <ul>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">S</span> → Add Slip</li>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">C</span> → Add Check</li>
            <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">Backspace</span> → Remove last added row</li>
            <li><span class="kbd">Alt</span>+<span class="kbd">Backspace</span> (in a row) → Remove that row</li>
          </ul>
          <p><strong>Install</strong>: Use the browser’s install option or the banner when available. Once installed, it opens in its own window and works offline.</p>
          <p><button class="walkthrough" style="margin-top:.25rem;" aria-label="Open walkthrough">Open walkthrough</button></p>
        </div>
      </app-modal>
    `;
    this._els = {
      modal: this._shadow.querySelector('app-modal'),
      walkthrough: this._shadow.querySelector('.walkthrough')
    };
    this._els.modal?.addEventListener('modal-close', () => this.close());
    this._els.walkthrough?.addEventListener('click', (_e) => {
      try { _e?.preventDefault?.(); } catch (_) {}
      try { this.close(); } catch (_) {}
      try {
        setTimeout(() => { try { getOnboardingTour().open(0); } catch (_) {} }, 120);
      } catch (_) {}
    });
    window.addEventListener("keydown", this._onKeyDown);
  }
  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKeyDown);
  }
  open() { this.setAttribute("open", ""); this._els?.modal?.show(); }
  close() { this._els?.modal?.hide('programmatic'); this.removeAttribute("open"); }
  _onKeyDown(e) {
    if (e.key === "Escape") this.close();
  }
}

if (!customElements.get("help-modal"))
  customElements.define("help-modal", HelpModal);

export function getHelpModal() {
  let m = document.querySelector("help-modal");
  if (!m) {
    m = document.createElement("help-modal");
    document.body.appendChild(m);
  }
  return m;
}
