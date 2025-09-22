class AppModal extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onBackdrop = this._onBackdrop.bind(this);
    this._onContainerClick = this._onContainerClick.bind(this);
    this._prevBodyOverflow = null;
    this._prevDocOverflow = null;
  }

  static get observedAttributes() { return ['open', 'title', 'closable']; }

  connectedCallback() {
    this._render();
    this._upgrade('open');
    this._upgrade('title');
    this._upgrade('closable');
    // Ensure aria-hidden is properly set on initial render
    this._syncAria();
    if (this.open) this._onOpenSideEffects();
  }

  disconnectedCallback() {
    this._teardownSideEffects();
  }

  attributeChangedCallback(name) {
    if (name === 'open') {
      this._syncAria(); // Sync aria-hidden first
      if (this.hasAttribute('open')) this._onOpenSideEffects();
      else this._teardownSideEffects();
    }
    if (name === 'title') this._syncTitle();
    if (name === 'closable') this._syncClosable();
  }

  get open() { return this.hasAttribute('open'); }
  set open(v) { v ? this.setAttribute('open', '') : this.removeAttribute('open'); }

  get title() { return this.getAttribute('title') || ''; }
  set title(v) { if (v == null) this.removeAttribute('title'); else this.setAttribute('title', String(v)); }

  get closable() { return this.hasAttribute('closable'); }
  set closable(v) { v ? this.setAttribute('closable', '') : this.removeAttribute('closable'); }

  show() { this.open = true; }
  hide(reason = 'dismiss') { if (!this.open) return; this.open = false; this.dispatchEvent(new CustomEvent('modal-close', { detail: { reason }, bubbles: true, composed: true })); }

  _upgrade(prop) { if (this.hasOwnProperty(prop)) { const v = this[prop]; delete this[prop]; this[prop] = v; } }

  _render() {
    this._shadow.innerHTML = `
      <style>
        :host { position: fixed; inset: 0; display: none; z-index: 1000; }
        :host([open]) { display: block; }
        .backdrop { position: fixed; inset: 0; background: var(--backdrop-bg, rgba(0,0,0,.5)); backdrop-filter: blur(2px); }
        .container { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .dialog { background: var(--card, #1b223a); color: var(--fg, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 14px; box-shadow: var(--shadow, 0 12px 36px rgba(0,0,0,.35)); width: min(var(--modal-max-w, 560px), 92vw); max-height: min(92dvh, 720px); display: flex; flex-direction: column; overflow: hidden; }
        .header { position: sticky; top: 0; z-index: 2; background: inherit; border-bottom: 1px solid var(--border, #2a345a); padding: 12px 14px; display:flex; align-items:center; justify-content: space-between; gap: 8px; }
        .title { margin: 0; font-size: 1.05rem; }
        .close { appearance: none; background: transparent; color: var(--fg, #e0e6ff); border: 1px solid var(--border, #2a345a); border-radius: 10px; padding: 6px 10px; cursor: pointer; }
        .body { overflow: auto; padding: 12px 14px; }
        .footer { position: sticky; bottom: 0; z-index: 2; background: inherit; border-top: 1px solid var(--border, #2a345a); padding: 10px 14px; display:flex; gap: 8px; justify-content: flex-end; }
        ::slotted(*) { box-sizing: border-box; }
        ::slotted(.modal-actions) { display:flex; gap: 8px; justify-content: flex-end; }
        @media (max-width: 640px) {
          .container { padding: 0; }
          .dialog { width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; border: 0; }
        }
      </style>
      <div class="backdrop" part="backdrop" aria-hidden="true"></div>
      <div class="container" part="container">
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="titleEl">
          <div class="header">
            <h2 id="titleEl" class="title"></h2>
            <button class="close" type="button" aria-label="Close">Close</button>
          </div>
          <div class="body"><slot name="body"></slot><slot></slot></div>
          <div class="footer"><slot name="footer"></slot></div>
        </div>
      </div>
    `;
    this._els = {
      backdrop: this._shadow.querySelector('.backdrop'),
      container: this._shadow.querySelector('.container'),
      dialog: this._shadow.querySelector('.dialog'),
      close: this._shadow.querySelector('.close'),
      titleEl: this._shadow.querySelector('#titleEl')
    };
    this._els.container?.addEventListener('click', this._onContainerClick);
    this._els.close?.addEventListener('click', () => this.hide('close'));
    this._syncTitle();
    this._syncClosable();
    this._syncAria();
  }

  _syncTitle() { if (this._els?.titleEl) this._els.titleEl.textContent = this.title || ''; }
  _syncClosable() { if (!this._els?.close) return; const can = this.closable !== false; this._els.close.style.display = can ? '' : 'none'; }
  _syncAria() { 
    if (!this._els?.dialog) return; 
    if (this.open) {
      this._els.dialog.removeAttribute('aria-hidden');
    } else {
      this._els.dialog.setAttribute('aria-hidden', 'true');
    }
  }

  _onBackdrop() { this.hide('backdrop'); }
  _onContainerClick(e) { 
    // Only close if the click was directly on the container (outside the dialog)
    if (e.target === this._els.container) {
      this.hide('backdrop'); 
    }
  }
  _onKeyDown(e) { if (e.key === 'Escape' && this.open) this.hide('escape'); if (e.key === 'Tab' && this.open) this._trapTab(e); }

  _onOpenSideEffects() {
    try {
      window.addEventListener('keydown', this._onKeyDown);
      this._lockScroll();
      this._focusFirst();
    } catch(_) {}
  }
  _teardownSideEffects() {
    try {
      window.removeEventListener('keydown', this._onKeyDown);
      this._unlockScroll();
    } catch(_) {}
  }

  _focusFirst() {
    try {
      const focusables = this._getFocusable();
      if (focusables[0]) focusables[0].focus({ preventScroll: true });
      else this._els?.close?.focus({ preventScroll: true });
    } catch(_) {}
  }

  _getFocusable() {
    const root = this._els?.dialog || this._shadow;
    // Focusables inside the shadow (header/footer controls)
    const inShadow = Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    // Include focusables from slotted content in body/footer
    const slots = Array.from(root.querySelectorAll('slot'));
    const inSlots = [];
    for (const slot of slots) {
      const nodes = slot.assignedElements({ flatten: true }) || [];
      for (const n of nodes) {
        if (n.matches && n.matches('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')) inSlots.push(n);
        inSlots.push(...Array.from(n.querySelectorAll?.('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []));
      }
    }
    return [...inShadow, ...inSlots]
      .filter(el => !!el && !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  }

  _trapTab(e) {
    const nodes = this._getFocusable();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = this._shadow.activeElement || document.activeElement;
    if (e.shiftKey) {
      if (active === first || !nodes.includes(active)) { last.focus(); e.preventDefault(); }
    } else {
      if (active === last) { first.focus(); e.preventDefault(); }
    }
  }

  _lockScroll() {
    try {
      const b = document.body, d = document.documentElement;
      this._prevBodyOverflow = b.style.overflow;
      this._prevDocOverflow = d.style.overflow;
      b.style.overflow = 'hidden';
      d.style.overflow = 'hidden';
    } catch(_) {}
  }
  _unlockScroll() {
    try {
      const b = document.body, d = document.documentElement;
      if (this._prevBodyOverflow != null) b.style.overflow = this._prevBodyOverflow; else b.style.overflow = '';
      if (this._prevDocOverflow != null) d.style.overflow = this._prevDocOverflow; else d.style.overflow = '';
      this._prevBodyOverflow = null; this._prevDocOverflow = null;
    } catch(_) {}
  }
}

if (!customElements.get('app-modal')) customElements.define('app-modal', AppModal);

export default AppModal;
