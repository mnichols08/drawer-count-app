class OnboardingTour extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._idx = 0;
    this._steps = this._buildSteps();
    this._onKey = this._onKey.bind(this);
    this._onReflow = this._onReflow.bind(this);
    this._onReflowPassive = this._onReflowPassive.bind(this);
    this._raf = 0;
  }

  connectedCallback() { this._render(); }
  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('scroll', this._onReflow, true);
    window.removeEventListener('resize', this._onReflow, true);
  }

  open(startAt = 0) {
    this._idx = Math.min(Math.max(Number(startAt) || 0, 0), this._steps.length - 1);
    this.setAttribute('open', '');
    try { document.documentElement.setAttribute('data-tour-open', ''); } catch(_) {}
    this._render();
    setTimeout(() => { try { this._shadow.querySelector('.tour dialog, .tour [tabindex]')?.focus(); } catch(_) {} }, 0);
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('scroll', this._onReflowPassive, { capture: true, passive: true });
    window.addEventListener('resize', this._onReflowPassive, { capture: true, passive: true });
  }
  close() {
    this.removeAttribute('open');
    try { document.documentElement.removeAttribute('data-tour-open'); } catch(_) {}
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('scroll', this._onReflowPassive, { capture: true, passive: true });
    window.removeEventListener('resize', this._onReflowPassive, { capture: true, passive: true });
  }
  next() { if (this._idx < this._steps.length - 1) { this._idx++; this._updateStep(); } else { this._done(); } }
  prev() { if (this._idx > 0) { this._idx--; this._updateStep(); } }
  goto(i) { const n = Number(i); if (!Number.isNaN(n) && n>=0 && n<this._steps.length) { this._idx = n; this._updateStep(); } }

  _done() { try { localStorage.setItem('onboarding-complete-v2', '1'); } catch(_) {} this.close(); }
  _skip() { try { localStorage.setItem('onboarding-complete-v2', '1'); } catch(_) {} this.close(); }

  _onKey(e) {
    if (!this.hasAttribute('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); this._skip(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
  }

  _buildSteps() {
    return [
      {
        title: 'Welcome to Drawer Count',
        html: `<p>Quickly total cash drawers with slips, checks, and cash counts. The app works offline and supports multiple profiles (stores/registers).</p>
               <ul>
                 <li>Create or switch profiles from the header.</li>
                 <li>Start today’s count, add slips/checks, and enter cash totals.</li>
                 <li>Save per-day snapshots and revisit any day.</li>
               </ul>`
      },
      {
        title: 'Profiles',
        html: `<p>Use the <strong>Profile</strong> selector in the header to keep separate states for different stores or registers.</p>
               <p>Click <em>＋</em> to create a profile, or 🗑️ to delete the current one (you can’t delete the last remaining profile).</p>`,
        anchor: 'app-header .profile-select'
      },
      {
        title: 'Start Today’s Count',
        html: `<p>Press the header button ⬒ labeled “Today’s count” to jump to today. If nothing started yet, click <strong>Start</strong>.</p>
               <p>Use the <strong>Lock</strong> icon to control whether past days are editable.</p>`,
        anchor: 'app-header .panel-toggle-btn'
      },
      {
        title: 'Add Slips and Checks',
        html: `<p>Add credit card slips and checks as separate rows. You can remove a row with <span class="kbd">Alt</span>+<span class="kbd">Backspace</span> while focused in it.</p>
               <p>Keyboard shortcuts help speed up entry.</p>
               <ul>
                 <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">S</span> → Add Slip</li>
                 <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">C</span> → Add Check</li>
                 <li><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">Backspace</span> → Remove last row</li>
               </ul>`
      },
      {
        title: 'Daily History',
        html: `<p>Use the 📅 button to open the <strong>Daily history</strong> and load a saved day. Past days open in read-only mode unless you unlock editing.</p>`,
        anchor: 'app-header .days-btn'
      },
      {
        title: 'Save, Export, and Offline',
        html: `<p>Your work auto-saves in the active profile. You can export/import profiles from the <strong>Settings</strong> menu.</p>
               <p>Install the app for an offline, app-like experience. The install banner appears when supported.</p>`,
        anchor: 'app-header .settings-btn'
      }
    ];
  }

  _render() {
    const step = this._steps[this._idx] || { title: '', html: '' };
    const total = this._steps.length;
    const idx = this._idx;
    this._shadow.innerHTML = `
      <style>
        :host { display: none; }
        :host([open]) { display: block; }
  .backdrop { position: fixed; inset: 0; background: var(--backdrop-bg, rgba(0,0,0,.5)); z-index: 1000; }
  .spotlight { position: fixed; z-index: 1001; pointer-events: none; border-radius: 10px; box-shadow: 0 0 0 9999px var(--backdrop-bg, rgba(0,0,0,.55)), 0 0 0 2px var(--accent, #5aa0ff) inset; transition: all 120ms ease; }
        .tour { position: fixed; inset: 6% auto auto 50%; transform: translateX(-50%);
          max-width: min(720px, 95vw); background: var(--card, #1c2541); color: var(--fg, #e0e6ff);
          border: 1px solid var(--border, #2a345a); border-radius: 14px; padding: 16px; z-index: 1001;
          box-shadow: var(--shadow, 0 18px 48px rgba(0,0,0,.35)); display: grid; grid-template-rows: auto 1fr auto; gap: 10px; }
        .hd { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .hd h2 { margin: 0; font-size: 1.1rem; letter-spacing: .2px; }
  .close { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; cursor: pointer; }
        .close:hover { filter: brightness(1.08); }
        .close:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
  .content { font-size: .98rem; line-height: 1.6; color: var(--fg); }
        .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--kbd-bg, #0f1730); color: var(--kbd-fg, #e7ecff); border:1px solid var(--kbd-border, #2a345a); border-radius:6px; padding:2px 6px; font-weight: 600; }
        .ft { display:flex; align-items:center; justify-content: space-between; gap: 8px; }
        .dots { display:flex; gap: 6px; align-items:center; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, var(--accent, #5aa0ff) 40%, transparent); border: 1px solid var(--border); opacity: .8; transition: transform 120ms ease, opacity 120ms ease; }
        .dot.active { background: var(--accent, #5aa0ff); opacity: 1; transform: scale(1.15); }
        .actions { display:flex; gap: 8px; }
  .btn { background: var(--btn-muted-bg, var(--button-bg-color, #222)); color: var(--btn-muted-fg, var(--button-color, #e0e6ff)); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; cursor: pointer; min-height: 40px; }
        .btn:hover { filter: brightness(1.05); }
        .btn:focus { outline: 2px solid var(--accent, #5aa0ff); outline-offset: 2px; }
        .btn.primary { background: var(--btn-bg, #2a3d87); color: var(--btn-fg, #ffffff); border-color: transparent; }
        .btn[disabled] { opacity: .7; cursor: not-allowed; }
      </style>
      <div class="backdrop" part="backdrop"></div>
      <div class="spotlight" hidden></div>
      <div class="tour" role="dialog" aria-modal="true" aria-label="Onboarding walkthrough" tabindex="-1">
        <div class="hd">
          <h2>${step.title || ''}</h2>
          <button class="close" aria-label="Skip walkthrough">Skip</button>
        </div>
        <div class="content">${step.html || ''}</div>
        <div class="ft">
          <div class="dots" aria-hidden="true">
            ${this._steps.map((_, i) => `<span class="dot ${i===idx?'active':''}" data-i="${i}"></span>`).join('')}
          </div>
          <div class="actions">
            <button class="btn prev" ${idx===0?'disabled':''} aria-label="Previous">Back</button>
            <button class="btn primary next" aria-label="${idx===total-1?'Finish':'Next'}">${idx===total-1?'Done':'Next'}</button>
          </div>
        </div>
        `;
    // Wire up event listeners after (re)rendering
    this._wire();
    const hasAnchor = !!(this._steps[this._idx]?.anchor);
    const backdrop = this._shadow.querySelector('.backdrop');
    if (backdrop) backdrop.style.background = hasAnchor ? 'transparent' : 'rgba(0,0,0,.5)';
    this._updateSpotlight();
  }
  _updateStep() { this._render(); }

  _wire() {
    const $ = (sel) => this._shadow.querySelector(sel);
    $('.backdrop')?.addEventListener('click', () => this._skip());
    $('.close')?.addEventListener('click', () => this._skip());
    $('.prev')?.addEventListener('click', () => this.prev());
    $('.next')?.addEventListener('click', () => this.next());
    this._shadow.querySelectorAll('.dot')?.forEach((d)=> d.addEventListener('click', (e)=>{ const i = Number(e.currentTarget?.getAttribute('data-i')); this.goto(i); }));
    // Keep spotlight positioned
    this._onReflow();
  }
  _updateSpotlight() {
    try {
      const step = this._steps[this._idx] || {};
      const sel = step.anchor;
      const spot = this._shadow.querySelector('.spotlight');
      const backdrop = this._shadow.querySelector('.backdrop');
      if (!spot) return;
      if (!sel) {
        spot.setAttribute('hidden', '');
        if (backdrop) backdrop.style.background = 'rgba(0,0,0,.5)';
        return;
      }
      const el = document.querySelector(sel);
      if (!el || !el.getBoundingClientRect) {
        spot.setAttribute('hidden', '');
        if (backdrop) backdrop.style.background = 'rgba(0,0,0,.5)';
        return;
      }
      // Ensure it’s visible
      try { el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' }); } catch (_) {}
      const r = el.getBoundingClientRect();
      const pad = 6;
      const top = Math.max(0, r.top - pad);
      const left = Math.max(0, r.left - pad);
      const width = Math.min(window.innerWidth, r.width + pad * 2);
      const height = Math.min(window.innerHeight, r.height + pad * 2);
      spot.style.top = `${Math.round(top)}px`;
      spot.style.left = `${Math.round(left)}px`;
      spot.style.width = `${Math.round(width)}px`;
      spot.style.height = `${Math.round(height)}px`;
      spot.removeAttribute('hidden');
      if (backdrop) backdrop.style.background = 'transparent';
    } catch (_) {
      try {
        this._shadow.querySelector('.spotlight')?.setAttribute('hidden', '');
        const backdrop = this._shadow.querySelector('.backdrop');
        if (backdrop) backdrop.style.background = 'rgba(0,0,0,.5)';
      } catch(__) {}
    }
  }

  _onReflow() { this._updateSpotlight(); }

  _onReflowPassive() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._updateSpotlight();
    });
  }
}

if (!customElements.get('onboarding-tour')) customElements.define('onboarding-tour', OnboardingTour);

export function getOnboardingTour() {
  let el = document.querySelector('onboarding-tour');
  if (!el) { el = document.createElement('onboarding-tour'); document.body.appendChild(el); }
  return el;
}

export default OnboardingTour;
