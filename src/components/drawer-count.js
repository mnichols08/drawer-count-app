// DrawerCount Web Component: encapsulates the original drawer-count.html UI + logic

class DrawerCount extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._readOnly = false;
    const bind = (name) => { try { if (typeof this[name] === 'function') this[name] = this[name].bind(this); } catch(_) {} };
    bind('_onInputEvent');
    bind('_newInput');
    bind('remInput');
    bind('_getTotal');
    bind('_countCash');
    bind('_getBalance');
    bind('_slipCheckCount');
  }

  connectedCallback() {
    this._render();
    this._wire();
    this._bindShortcuts();
    try { this.setReadOnly(false); } catch(_) {}
    // Cache preference at connect time; can be refreshed if settings change
    try {
      const { getMobileEnterAddsRow } = window.__DCA_PREFS__ || {};
      if (typeof getMobileEnterAddsRow !== 'function') {
        // lazy import when available
        import('../lib/persistence.js').then((mod) => { this._mobileEnterAddsRow = !!mod.getMobileEnterAddsRow?.(); }).catch(()=>{});
      } else {
        this._mobileEnterAddsRow = !!getMobileEnterAddsRow();
      }
    } catch(_) { /* ignore */ }
    // Listen for live preference changes
    this._onPrefsChanged = (e) => {
      try {
        if (e?.detail && typeof e.detail.mobileEnterAddsRow === 'boolean') {
          this._mobileEnterAddsRow = !!e.detail.mobileEnterAddsRow;
        } else {
          // fallback refresh
          import('../lib/persistence.js').then((mod) => { this._mobileEnterAddsRow = !!mod.getMobileEnterAddsRow?.(); }).catch(()=>{});
        }
      } catch(_) {}
    };
    window.addEventListener('dca:prefs-changed', this._onPrefsChanged);
  }

  disconnectedCallback() {
    try { if (this._onKeyDownGlobal) window.removeEventListener('keydown', this._onKeyDownGlobal); } catch(_) {}
    try { if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler); } catch(_) {}
    try { if (this._onPrefsChanged) window.removeEventListener('dca:prefs-changed', this._onPrefsChanged); } catch(_) {}
  }

  // Public API: get current drawer data
  getCount() {
    const $ = (sel) => this._root.querySelector(sel);
    const getNum = (sel) => Number($(sel)?.innerText || 0);
    const count = getNum('total');
    const remove = getNum('#cash cash');
    const balance = getNum('#balance balance');
    const roa = getNum('roa');
    const slips = getNum('#cardTotal balance');
    const checks = getNum('#checkTotal balance');
    const hundreds = getNum('#hundreds span.cash');
    const fifties = getNum('#fifties span.cash');
    const twenties = getNum('#twenties span.cash');
    const tens = getNum('#tens span.cash');
    const fives = getNum('#fives span.cash');
    const ones = getNum('#dollars span.cash');
    const quarters = getNum('#quarters span.cash');
    const dimes = getNum('#dimes span.cash');
    const nickels = getNum('#nickels span.cash');
    const pennies = getNum('#pennies span.cash');
    const qRolls = getNum('#quarterrolls span.cash');
    const dRolls = getNum('#dimerolls span.cash');
    const nRolls = getNum('#nickelrolls span.cash');
    const pRolls = getNum('#pennyrolls span.cash');
    const timestamp = Date.now();
    return { count, remove, balance, roa, slips, checks, hundreds, fifties, twenties, tens, fives, ones, quarters, dimes, nickels, pennies, qRolls, dRolls, nRolls, pRolls, timestamp };
  }

  // Public API: serialize full component state (raw input values including dynamic rows)
  getState() {
    const $ = (sel) => this._root.querySelector(sel);
    const getInputVal = (sel) => Number($(sel)?.querySelector('input')?.value || 0);
    const getOptVal = (sel) => Number(this._root.querySelector(sel)?.value || 0);
    // Base inputs
    const state = {
      version: 2,
      timestamp: Date.now(),
      base: {
        drawer: getInputVal('#drawer'),
        roa: getInputVal('#roa'),
        slips: getInputVal('#slips'),
        checks: getInputVal('#checks'),
        hundreds: getInputVal('#hundreds'),
        fifties: getInputVal('#fifties'),
        twenties: getInputVal('#twenties'),
        tens: getInputVal('#tens'),
        fives: getInputVal('#fives'),
        dollars: getInputVal('#dollars'),
        quarters: getInputVal('#quarters'),
        dimes: getInputVal('#dimes'),
        nickels: getInputVal('#nickels'),
        pennies: getInputVal('#pennies'),
        quarterrolls: getInputVal('#quarterrolls'),
        dimerolls: getInputVal('#dimerolls'),
        nickelrolls: getInputVal('#nickelrolls'),
        pennyrolls: getInputVal('#pennyrolls')
      },
      extra: {
        slips: [],
        checks: []
      },
      optional: {
        charges: getOptVal('#opt-charges'),
        totalReceived: getOptVal('#opt-total-received'),
        netSales: getOptVal('#opt-net-sales'),
        grossProfitAmount: getOptVal('#opt-gp-amount'),
        grossProfitPercent: getOptVal('#opt-gp-percent'),
        numInvoices: getOptVal('#opt-num-invoices'),
        numVoids: getOptVal('#opt-num-voids')
      }
    };
    // Dynamic rows
    const extras = Array.from(this._root.querySelectorAll('.wrap .slip, .wrap .check'));
    for (const row of extras) {
      const isSlip = row.classList.contains('slip');
      const val = Number(row.querySelector('input')?.value || 0);
      (isSlip ? state.extra.slips : state.extra.checks).push(val);
    }
    return state;
  }

  // Public API: hydrate from serialized state created by getState()
  setState(state) {
    try {
      if (!state || typeof state !== 'object') return;
      const b = state.base || {};
      const setVal = (sel, v) => {
        const el = this._root.querySelector(sel + ' input');
        if (el) {
          el.value = (v === null || v === undefined || v === '') ? '' : Number(v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      const setOpt = (sel, v) => {
        const el = this._root.querySelector(sel);
        if (el) {
          el.value = (v === null || v === undefined || v === '') ? '' : Number(v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      // Set base inputs
      setVal('#drawer', b.drawer);
      setVal('#roa', b.roa);
      setVal('#slips', b.slips);
      setVal('#checks', b.checks);
      setVal('#hundreds', b.hundreds);
      setVal('#fifties', b.fifties);
      setVal('#twenties', b.twenties);
      setVal('#tens', b.tens);
      setVal('#fives', b.fives);
      setVal('#dollars', b.dollars);
      setVal('#quarters', b.quarters);
      setVal('#dimes', b.dimes);
      setVal('#nickels', b.nickels);
      setVal('#pennies', b.pennies);
      setVal('#quarterrolls', b.quarterrolls);
      setVal('#dimerolls', b.dimerolls);
      setVal('#nickelrolls', b.nickelrolls);
      setVal('#pennyrolls', b.pennyrolls);

      // Clear any existing dynamic rows
      Array.from(this._root.querySelectorAll('.wrap .slip, .wrap .check')).forEach((n) => n.remove());

      // Recreate extra rows
      const ex = state.extra || { slips: [], checks: [] };
      const add = (type, value) => {
        const anchorSel = type === 'slip' ? '#checks' : '#hundreds';
        this._newInput(anchorSel); // creates last new row of that type before anchor
        // set value on the last created node of that type
        const rows = Array.from(this._root.querySelectorAll('.wrap .' + type));
        const last = rows[rows.length - 1];
        const inp = last?.querySelector('input');
        if (inp) {
          inp.value = (value === null || value === undefined || value === '') ? '' : Number(value);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      (Array.isArray(ex.slips) ? ex.slips : []).forEach((v) => add('slip', v));
      (Array.isArray(ex.checks) ? ex.checks : []).forEach((v) => add('check', v));

      // Optional fields
      const o = state.optional || {};
      setOpt('#opt-charges', o.charges);
      setOpt('#opt-total-received', o.totalReceived);
      setOpt('#opt-net-sales', o.netSales);
      setOpt('#opt-gp-amount', o.grossProfitAmount);
      setOpt('#opt-gp-percent', o.grossProfitPercent);
      setOpt('#opt-num-invoices', o.numInvoices);
      setOpt('#opt-num-voids', o.numVoids);

      // Final recompute and announce
      this._getTotal();
      this._getBalance();
      this._slipCheckCount();
      this._renumberDynamicLabels();
      this._announce('Drawer restored');
    } catch (_) {
      // ignore
    }
  }

  // Public API: reset all inputs and dynamic rows to zero/empty
  reset() {
    const empty = null;
    const state = {
      version: 2,
      timestamp: Date.now(),
      base: {
        drawer: empty, roa: empty, slips: empty, checks: empty,
        hundreds: empty, fifties: empty, twenties: empty, tens: empty,
        fives: empty, dollars: empty, quarters: empty, dimes: empty, nickels: empty, pennies: empty,
        quarterrolls: empty, dimerolls: empty, nickelrolls: empty, pennyrolls: empty
      },
      extra: { slips: [], checks: [] },
      optional: {
        charges: empty, totalReceived: empty, netSales: empty,
        grossProfitAmount: empty, grossProfitPercent: empty,
        numInvoices: empty, numVoids: empty
      }
    };
    this.setState(state);
  }

  // Public API: toggle read-only (disables inputs and add/remove row buttons)
  setReadOnly(flag) {
    try {
      this._readOnly = !!flag;
      const inputs = Array.from(this._root.querySelectorAll('input'));
      inputs.forEach((el) => { el.disabled = this._readOnly; });
      const buttons = Array.from(this._root.querySelectorAll('button'));
      buttons.forEach((b) => {
        const isMutator = b.classList.contains('add-slip') || b.classList.contains('add-check') || b.classList.contains('rem');
        if (isMutator) b.disabled = this._readOnly;
      });
      // Explicitly disable panel "clear" action when read-only/locked
      const clearBtn = this._root.querySelector('.clear-btn');
      if (clearBtn) clearBtn.disabled = this._readOnly;
    } catch (_) { /* ignore */ }
  }

  _render() {
    this._root.innerHTML = `
      <style>
        :host { display: block; color: var(--main-color, #eee); }
        .wrap { display: grid; gap: .35rem; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,1px,1px); white-space: nowrap; border: 0; }

        /* Original component-local styles */
        .output { text-align: right; }
        .input { display: block; }
        input {
          border-radius:.1rem;
          background: var(--input-bg-color, #0000000f);
          border: 1px solid var(--border-color, #fff);
          color: var(--main-color, #eee);
          margin: 0.1rem;
          padding: 0.2rem;
        }
  /* Subtle style for dynamic row labels (Slip/Check) shown to the left of input */
  .dyn-label { color: var(--muted, #9aa3b2); margin-right: .35rem; font-size: .9rem; }
  button { background: var(--button-bg-color, #222222f0); color: var(--button-color, #e0e6ff); }
        button.rem { color: var(--button-rem-color, red); margin-left: .35rem; }
  /* Prefix currency only for value spans inside main content */
  .wrap span:before { content: '$'; }

        @media only print {
          #drawer input, #roa input, #drawer label, #roa label,
          div:not(#total,#cash,#balance,#cardTotal,#checkTotal,#drawer,#roa) { display: none; }
        }

        /* Optional fields section (informational only) */
  .optional-section { display: none; margin-top: .6rem; padding-top: .4rem; border-top: 1px solid var(--border, #2a345a); }
        .optional-title { font-size: 0.95rem; color: var(--muted, #9aa3b2); margin: .2rem 0 .4rem; }
        .opt-grid { display: grid; gap: .35rem; grid-template-columns: 1fr; }
        .opt-row { display: grid; grid-template-columns: 1fr auto; gap: .5rem; align-items: center; }
        .opt-row label { color: var(--fg, #e0e6ff); font-size: .95rem; }
        .opt-row input { min-width: 120px; justify-self: end; }
        .optional-section span:before { content: none; }

        /* Mobile-focused tweaks */
        @media (max-width: 640px) {
          .wrap { gap: .5rem; }
          /* Only hide/show one input when stepper is enabled */
          :host([data-stepper="on"]) .input { display: none; }
          :host([data-stepper="on"]) .input.active { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .4rem; }
          /* Fallback: if stepper hasn't initialized yet, still show a single input at a time */
          :host(:not([data-stepper="on"])) .input { display: none; }
          :host(:not([data-stepper="on"])) .input.initial { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .4rem; }
          :host(:not([data-stepper="on"])) .input:first-of-type { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .4rem; }
          :host(:not([data-stepper="on"])) .input:focus-within { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .4rem; }
          .input label { font-size: 1rem; }
          .input input { width: 100%; font-size: 16px; min-height: 40px; padding: 0.2rem 0.4rem; }
          .input button { align-self: stretch; min-height: 40px; padding: 0 .6rem; border-radius: .25rem; }
          .mobile-controls { display: flex; position: sticky; bottom: 0; gap: .5rem; padding: .5rem; background: var(--panel-bg, rgba(11,16,34,0.9)); backdrop-filter: blur(6px) saturate(120%); z-index: 2; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color, #2a345a); }
          .mobile-controls .prev, .mobile-controls .next { min-height: 40px; padding: 0 .9rem; border-radius: .35rem; background: var(--button-bg-color, #222222f0); color: var(--button-color, #0b132b); border: 1px solid var(--border-color, #2a345a); }
          .mobile-controls .step-indicator { flex: 1; text-align: center; color: var(--muted, #9aa3b2); }
        }
      </style>

      <div class="wrap">
        <div class="panel-actions" style="display: flex; gap: 8px; margin-bottom: 10px;">
          <button class="icon-btn clear-btn" aria-label="Clear inputs" title="Clear inputs">🧹</button>
          <button class="icon-btn optional-btn" aria-label="Optional fields" title="Optional fields">🧾</button>
        </div>
        <div class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
        <div class="output" id="total">Count: $<total>0.00</total></div>
        <div class="output" id="cash">Remove: $<cash>0.00</cash></div>
        <div class="output" id="balance">Balance: $<balance>0.00</balance></div>
        <div class="output" id="cardTotal">Slip Total: $<balance>0.00</balance></div>
        <div class="output" id="checkTotal">Check Total: $<balance>0.00</balance></div>

        <div class="input initial" id="drawer">
          <label for="drawer-input">Cash Total</label>
          <input id="drawer-input" name="drawer" step=".01" type="number" placeholder="Cash Total" inputmode="decimal" enterkeyhint="next" autocomplete="off" />
           Cash Total: $<drawer>0.00</drawer>
        </div>
        <div class="input" id="roa">
          <label for="roa-input">ROA Amount</label>
          <input id="roa-input" name="roa" step=".01" type="number" placeholder="ROA Amount" inputmode="decimal" enterkeyhint="next" autocomplete="off" />
           ROA Amount: $<roa>0.00</roa>
        </div>
        <div class="input" id="slips">
          <label for="slips-input">Credit Cards</label>
          <input id="slips-input" name="slips" step=".01" type="number" placeholder="Credit Cards" inputmode="decimal" enterkeyhint="next" autocomplete="off" />
          <button class="add-slip" title="Add Slip">+</button>
          <span>0.00</span> Slip
        </div>
        <div class="input" id="checks">
          <label for="checks-input">Checks</label>
          <input id="checks-input" name="checks" step=".01" type="number" placeholder="Checks" min="0" inputmode="decimal" enterkeyhint="next" autocomplete="off" />
          <button class="add-check" title="Add Check">+</button>
          <span>0.00</span> Check
        </div>

        <div class="input" id="hundreds">
          <label for="hundreds-input">Hundreds</label>
          <input id="hundreds-input" name="hundreds" type="number" placeholder="Hundreds" min="0" max="20" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Hundreds
        </div>
        <div class="input" id="fifties">
          <label for="fifties-input">Fifties</label>
          <input id="fifties-input" name="fifties" type="number" placeholder="Fifties" min="0" max="30" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Fifties
        </div>
        <div class="input" id="twenties">
          <label for="twenties-input">Twenties</label>
          <input id="twenties-input" name="twenties" type="number" placeholder="Twenties" min="0" max="40" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Twenties
        </div>
        <div class="input" id="tens">
          <label for="tens-input">Tens</label>
          <input id="tens-input" name="tens" type="number" placeholder="Tens" min="0" max="50" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Tens
        </div>
        <div class="input" id="fives">
          <label for="fives-input">Fives</label>
          <input id="fives-input" name="fives" type="number" placeholder="Fives" min="0" max="75" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Fives
        </div>
        <div class="input" id="dollars">
          <label for="dollars-input">Dollars</label>
          <input id="dollars-input" name="dollars" type="number" placeholder="Dollars" min="0" max="100" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Ones
        </div>
        <div class="input" id="quarters">
          <label for="quarters-input">Quarters</label>
          <input id="quarters-input" name="quarters" type="number" placeholder="Quarters" min="0" max="50" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Quarters
        </div>
        <div class="input" id="dimes">
          <label for="dimes-input">Dimes</label>
          <input id="dimes-input" name="dimes" type="number" placeholder="Dimes" min="0" max="50" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Dimes
        </div>
        <div class="input" id="nickels">
          <label for="nickels-input">Nickels</label>
          <input id="nickels-input" name="nickels" type="number" placeholder="Nickels" min="0" max="50" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Nickels
        </div>
        <div class="input" id="pennies">
          <label for="pennies-input">Pennies</label>
          <input id="pennies-input" name="pennies" type="number" placeholder="Pennies" min="0" max="50" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Pennies
        </div>
        <div class="input" id="quarterrolls">
          <label for="quarterrolls-input">Quarter Rolls</label>
          <input id="quarterrolls-input" name="quarterrolls" type="number" placeholder="Quarter Rolls" min="0" max="4" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Quarter Rolls
        </div>
        <div class="input" id="dimerolls">
          <label for="dimerolls-input">Dime Rolls</label>
          <input id="dimerolls-input" name="dimerolls" type="number" placeholder="Dime Rolls" min="0" max="4" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Dime Rolls
        </div>
        <div class="input" id="nickelrolls">
          <label for="nickelrolls-input">Nickel Rolls</label>
          <input id="nickelrolls-input" name="nickelrolls" type="number" placeholder="Nickel Rolls" min="0" max="4" step="1" inputmode="numeric" enterkeyhint="next" autocomplete="off" />
          <span class="cash">0.00</span> in Nickel Rolls
        </div>
        <div class="input" id="pennyrolls">
          <label for="pennyrolls-input">Penny Rolls</label>
          <input id="pennyrolls-input" name="pennyrolls" type="number" placeholder="Penny Rolls" min="0" max="4" step="1" inputmode="numeric" enterkeyhint="done" autocomplete="off" />
          <span class="cash">0.00</span> in Penny Rolls
        </div>

        <!-- Optional, informational-only daily fields (do NOT impact totals) -->
        <div class="optional-section" id="optional">
          <div class="optional-title">Optional Daily Fields (not included in totals)</div>
          <div class="opt-grid">
            <div class="opt-row">
              <label for="opt-charges">Charges</label>
              <input id="opt-charges" name="opt-charges" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
            </div>
            <div class="opt-row">
              <label for="opt-total-received">Total Received</label>
              <input id="opt-total-received" name="opt-total-received" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
            </div>
            <div class="opt-row">
              <label for="opt-net-sales">Net Sales</label>
              <input id="opt-net-sales" name="opt-net-sales" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
            </div>
            <div class="opt-row">
              <label for="opt-gp-amount">Gross Profit Amount ($)</label>
              <input id="opt-gp-amount" name="opt-gp-amount" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
            </div>
            <div class="opt-row">
              <label for="opt-gp-percent">Gross Profit Percentage (%)</label>
              <input id="opt-gp-percent" name="opt-gp-percent" type="number" step="0.01" placeholder="0.00" inputmode="decimal" />
            </div>
            <div class="opt-row">
              <label for="opt-num-invoices">Number of Invoices</label>
              <input id="opt-num-invoices" name="opt-num-invoices" type="number" step="1" min="0" placeholder="0" inputmode="numeric" />
            </div>
            <div class="opt-row">
              <label for="opt-num-voids">Number of Voids</label>
              <input id="opt-num-voids" name="opt-num-voids" type="number" step="1" min="0" placeholder="0" inputmode="numeric" />
            </div>
          </div>
        </div>
      </div>
      <!-- Mobile-only stepper controls (hidden by default; shown via JS on touch + small screens) -->
      <div class="mobile-controls" aria-label="Field navigation" role="group" style="display:none;">
        <button class="prev" type="button" title="Previous field">Back</button>
        <span class="step-indicator">1 / 1</span>
        <button class="next" type="button" title="Next field">Next</button>
      </div>
    `;
  }

  _wire() {
    const $ = (sel) => this._root.querySelector(sel);
    const $$ = (sel) => Array.from(this._root.querySelectorAll(sel));

    // Add-input buttons
    $('#slips .add-slip')?.addEventListener('click', () => this._newInput('#checks'));
    $('#checks .add-check')?.addEventListener('click', () => this._newInput('#hundreds'));

    // Panel action buttons
    this._root.querySelector('.clear-btn')?.addEventListener('click', () => {
      if (this._readOnly) {
        try { toast('Editing is locked for this day', { type: 'warning', duration: 2000 }); } catch(_) {}
        return;
      }
      this.reset();
      try { toast('Cleared', { type: 'info', duration: 1500 }); } catch(_) {}
      // focus first input for convenience
      setTimeout(() => { try { this._root.querySelector('input')?.focus(); } catch(_) {} }, 0);
    });
    this._root.querySelector('.optional-btn')?.addEventListener('click', async () => {
      try {
        // Prefer module export if present
        if (typeof getOptionalFieldsModal === 'function') { getOptionalFieldsModal().open(); return; }
        if (window.getOptionalFieldsModal) { window.getOptionalFieldsModal().open(); return; }
        try { const mod = await import('../components/optional-fields-modal.js'); (mod?.getOptionalFieldsModal || window.getOptionalFieldsModal)?.().open(); } catch(_) {}
      } catch(_) {}
    });

    // Delegated input handler on each .input block
    $$('.input').forEach((block) => block.addEventListener('input', this._onInputEvent));

    // Keyboard/focus behavior
  const mobileMode = this._shouldUseMobileStepper() || this._isTouchDevice();
    if (mobileMode) {
  this._bindMobileInputKeys?.();
    } else {
      // On desktop: preserve original behavior — Tab to move, Enter on base Slip/Check adds a row
      const slip = $('#slips input');
      const check = $('#checks input');
      const addKeyDownListener = (element, selector) => {
        element?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.keyCode === 13) this._newInput(selector);
          this._getTotal();
          this._getBalance();
        });
      };
      addKeyDownListener(slip, '#checks');
      addKeyDownListener(check, '#hundreds');
    }

    // Min values
    $('#checks input')?.setAttribute('min', '0');
    $$('.cash').forEach((e) => e.previousElementSibling?.setAttribute('min', '0'));

    // Initial compute
    this._getTotal();
    this._getBalance();
    this._slipCheckCount();

  // Optional fields are always present in the UI; modal edits these values directly.

    // Optional fields should trigger save/change events but not recompute totals
    const optIds = [
      '#opt-charges', '#opt-total-received', '#opt-net-sales',
      '#opt-gp-amount', '#opt-gp-percent', '#opt-num-invoices', '#opt-num-voids'
    ];
    optIds.forEach((sel) => {
      const el = this._root.querySelector(sel);
      el?.addEventListener('input', () => {
        this.dispatchEvent(new CustomEvent('change', { detail: this.getCount(), bubbles: true, composed: true }));
      });
    });

    // Initialize mobile stepper
    this._initMobileStepper?.();
  }

  // (Previously: optional field visibility helpers removed; modal edits values directly.)

  _bindShortcuts() {
    // Global shortcuts for adding/removing rows
    this._onKeyDownGlobal = (e) => {
      if (this._readOnly) return;
      const isCtrlShift = (e.ctrlKey || e.metaKey) && e.shiftKey;
      const showUndo = (typeLabel, html, anchorSelectorForType) => {
        try {
          const t = document.querySelector('app-toaster');
          if (!t || !html) return;
          t.show(`${typeLabel} removed`, {
            type: 'info',
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                // Re-insert before anchor per original logic
                const anchor = this._root.querySelector(anchorSelectorForType);
                const wrap = this._root.querySelector('.wrap');
                if (!wrap) return;
                const temp = document.createElement('div');
                temp.innerHTML = html;
                const node = temp.firstElementChild;
                if (!node) return;
                // Rewire events
                node.addEventListener('input', this._onInputEvent);
                node.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter' || e.keyCode === 13) this._newInput(node.classList.contains('slip') ? '#checks' : '#hundreds');
                });
                if (anchor && anchor.parentElement) anchor.before(node); else wrap.appendChild(node);
                this._getTotal();
                this._getBalance();
                this._slipCheckCount();
                this._renumberDynamicLabels();
                // Focus restored node input and announce
                this._focusInputIn(node);
                this._announce('Row restored');
              }
            }
          });
        } catch (_) {}
      };
      if (isCtrlShift && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        this._newInput('#checks'); // add slip
      } else if (isCtrlShift && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        this._newInput('#hundreds'); // add check
      } else if (isCtrlShift && (e.key === 'Backspace' || e.keyCode === 8)) {
        e.preventDefault();
        // Remove the last dynamically-added row (slip or check)
        const rows = Array.from(this._root.querySelectorAll('.wrap .slip, .wrap .check'));
        const last = rows[rows.length - 1];
        if (last) {
          const isSlip = last.classList.contains('slip');
          const anchorSel = isSlip ? '#checks' : '#hundreds';
          const html = last.outerHTML;
          const id = last.id;
          const prevIndex = rows.length - 1;
          this.remInput(id);
          this._focusAfterRemoval(prevIndex);
          // show toast with undo
          showUndo(isSlip ? 'Slip' : 'Check', html, anchorSel);
        }
      }
    };
    window.addEventListener('keydown', this._onKeyDownGlobal);

    // Per-row removal via Alt+Backspace
    this._root.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'Backspace' || e.keyCode === 8)) {
        const row = e.target && e.target.closest('.slip, .check');
        if (row && row.id) {
          e.preventDefault();
          const isSlip = row.classList.contains('slip');
          const anchorSel = isSlip ? '#checks' : '#hundreds';
          const html = row.outerHTML;
          const id = row.id;
          const rows = Array.from(this._root.querySelectorAll('.wrap .slip, .wrap .check'));
          const idx = rows.indexOf(row);
          this.remInput(id);
          this._focusAfterRemoval(idx);
          // toast with undo
          const t = document.querySelector('app-toaster');
          try {
            t?.show(`${isSlip ? 'Slip' : 'Check'} removed`, {
              type: 'info', duration: 5000, action: {
                label: 'Undo', onClick: () => {
                  const anchor = this._root.querySelector(anchorSel);
                  const wrap = this._root.querySelector('.wrap');
                  if (!wrap) return;
                  const temp = document.createElement('div'); temp.innerHTML = html; const node = temp.firstElementChild; if (!node) return;
                  node.addEventListener('input', this._onInputEvent);
                  node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.keyCode === 13) this._newInput(node.classList.contains('slip') ? '#checks' : '#hundreds'); });
                  if (anchor && anchor.parentElement) anchor.before(node); else wrap.appendChild(node);
                  this._getTotal(); this._getBalance(); this._slipCheckCount(); this._renumberDynamicLabels();
                  this._focusInputIn(node);
                  this._announce('Row restored');
                }
              }
            });
          } catch (_) {}
        }
      }
    });
  }

  _announce(message) {
    try {
      const live = this._root.querySelector('.sr-only[role="status"]');
      if (live) { live.textContent = message; }
    } catch (_) { /* ignore */ }
  }

  _focusInputIn(node) {
    try { node?.querySelector('input')?.focus(); } catch (_) {}
  }

  _focusAfterRemoval(prevIndex) {
    // Focus previous row's input if available, else next, else fallback to base inputs
    const rows = Array.from(this._root.querySelectorAll('.wrap .slip, .wrap .check'));
    const target = rows[Math.max(0, prevIndex - 1)] || rows[0];
    if (target) { this._focusInputIn(target); return; }
    // fallback to base inputs
    const baseCheck = this._root.querySelector('#checks input');
    const baseSlip = this._root.querySelector('#slips input');
    (baseCheck || baseSlip || this._root.querySelector('input'))?.focus();
  }

  _onInputEvent(e) {
    if (this._readOnly) return;
    // e.currentTarget is the .input container
    const container = e.currentTarget;
    const id = container.id;
    const multiplier = this._getMultiplier(id);
    const inputEl = e.target.closest('input');
    if (!inputEl) return;
    const val = Number(inputEl.value || 0);
    const out = val * multiplier;
    // Find the correct output element per container type
    let outEl = null;
    if (id === 'drawer') outEl = container.querySelector('drawer');
    else if (id === 'roa') outEl = container.querySelector('roa');
    else outEl = container.querySelector('span.cash') || container.querySelector('span');
    if (outEl) outEl.innerText = out.toFixed(2);
    this._getTotal();
    this._getBalance();
    this._slipCheckCount();

    // Dispatch a composed change event so hosts can listen
    this.dispatchEvent(new CustomEvent('change', { detail: this.getCount(), bubbles: true, composed: true }));
  }

  _getMultiplier(id) {
    switch (id) {
      case 'pennies': return 0.01;
      case 'pennyrolls': return 0.5;
      case 'nickelrolls': return 2.0;
      case 'dimerolls': return 5.0;
      case 'quarterrolls': return 10;
      case 'nickels': return 0.05;
      case 'dimes': return 0.1;
      case 'quarters': return 0.25;
      case 'fives': return 5;
      case 'tens': return 10;
      case 'twenties': return 20;
      case 'fifties': return 50;
      case 'hundreds': return 100;
      default: return 1;
    }
  }

  _isTouchDevice() {
    try {
      return (("ontouchstart" in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
    } catch(_) { return false; }
  }

  _shouldUseMobileStepper() {
    try {
      const mq = window.matchMedia('(max-width: 640px)');
      // Enable on small screens regardless of touch to ensure it works on phones and emulators
      return mq.matches;
    } catch(_) { return false; }
  }

  _initMobileStepper() {
    try {
      const controls = this._root.querySelector('.mobile-controls');
      if (!controls) return;
      const enable = this._shouldUseMobileStepper();
      controls.style.display = enable ? 'flex' : 'none';
      // toggle :host attribute to control CSS that shows one input at a time
      try { if (enable) this.setAttribute('data-stepper', 'on'); else this.removeAttribute('data-stepper'); } catch(_) {}
      if (!enable) {
        Array.from(this._root.querySelectorAll('.input.active')).forEach((n) => n.classList.remove('active'));
        // Restore initial visibility for fallback CSS
        const first = this._root.querySelector('.wrap > .input');
        first?.classList.add('initial');
        return;
      }
      this._refreshSteps();
      if (!this._stepInputs?.length) return;
      if (typeof this._currentStepIdx !== 'number') this._currentStepIdx = 0;
      this._setActiveStep(this._currentStepIdx);
      // Remove fallback class so only the active step shows
      Array.from(this._root.querySelectorAll('.wrap > .input.initial')).forEach((n) => n.classList.remove('initial'));
      const prev = controls.querySelector('.prev');
      const next = controls.querySelector('.next');
      prev.onclick = () => this._gotoPrev();
      next.onclick = () => this._gotoNext();
      this._stepInputs.forEach((inp, i) => inp.addEventListener('focus', () => this._setActiveStep(i)));
      if (!this._resizeHandler) {
        this._resizeHandler = () => this._initMobileStepper();
        window.addEventListener('resize', this._resizeHandler);
      }
    } catch(_) {}
  }

  _refreshSteps() {
    const containers = Array.from(this._root.querySelectorAll('.wrap > .input'));
    this._stepContainers = containers;
    this._stepInputs = containers.map((c) => c.querySelector('input')).filter(Boolean);
    const indicator = this._root.querySelector('.mobile-controls .step-indicator');
    if (indicator) {
      const total = this._stepInputs.length || 1;
      const idx = (this._currentStepIdx || 0) + 1;
      indicator.textContent = `${Math.min(idx, total)} of ${total}`;
    }
  }

  _setActiveStep(idx) {
    if (!this._stepContainers?.length) return;
    this._currentStepIdx = Math.max(0, Math.min(this._stepContainers.length - 1, idx));
    this._stepContainers.forEach((c, i) => c.classList.toggle('active', i === this._currentStepIdx));
    const indicator = this._root.querySelector('.mobile-controls .step-indicator');
  if (indicator) indicator.textContent = `${this._currentStepIdx + 1} of ${this._stepContainers.length}`;
    try {
      const inp = this._stepInputs[this._currentStepIdx];
      if (document.activeElement !== inp) {
        inp?.focus({ preventScroll: false });
        inp?.select?.();
        inp?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      }
    } catch(_) {}
    const next = this._root.querySelector('.mobile-controls .next');
    if (next) next.textContent = (this._currentStepIdx === this._stepContainers.length - 1) ? 'Done' : 'Next';
  }

  _bindMobileInputKeys() {
    try {
      const inputs = Array.from(this._root.querySelectorAll('.input input, .optional-section input'));
      inputs.forEach((inp) => {
        if (inp.dataset.mobkeys === '1') return; // avoid double-binding
        const onFocus = () => { try { inp.select?.(); inp.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); } catch(_) {} };
        const onKeyDown = (e) => {
          const key = e.key || e.code;
          if (key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            // Special case: Enter on base slip/check with a value quickly adds a new row
            const parentId = inp.closest('.input')?.id;
            const isSlipBase = parentId === 'slips';
            const isCheckBase = parentId === 'checks';
            const allowQuickAdd = !!this._mobileEnterAddsRow;
            if (!e.shiftKey && allowQuickAdd && (isSlipBase || isCheckBase) && inp.value !== '') {
              this._newInput(isSlipBase ? '#checks' : '#hundreds');
              return;
            }
            // Stepper navigation: Enter = Next, Shift+Enter = Back
            if (e.shiftKey) this._gotoPrev(); else this._gotoNext();
          } else if (key === 'ArrowDown') {
            e.preventDefault();
            this._gotoNext();
          } else if (key === 'ArrowUp') {
            e.preventDefault();
            this._gotoPrev();
          }
        };
        inp.addEventListener('focus', onFocus);
        // Use only keydown to avoid duplicate handling on some mobile browsers
        inp.addEventListener('keydown', onKeyDown, { passive: false });
        inp.dataset.mobkeys = '1';
      });
    } catch(_) {}
  }

  _gotoNext() {
    if (!this._stepContainers?.length) return;
    const curIdx = typeof this._currentStepIdx === 'number' ? this._currentStepIdx : 0;
    const nextIdx = this._computeStepJump(curIdx, +1);
    if (nextIdx >= this._stepContainers.length || nextIdx === curIdx) {
      // Last step: blur to dismiss keyboard on mobile
      try { this._stepInputs[curIdx]?.blur(); } catch(_) {}
      
      // Dispatch completion event when user finishes the stepper procedure
      this.dispatchEvent(new CustomEvent('stepper-complete', {
        bubbles: true,
        composed: true,
        detail: {
          stepperCompleted: true,
          finalStepIndex: curIdx
        }
      }));
      return;
    }
    this._setActiveStep(nextIdx);
  }

  _gotoPrev() {
    if (!this._stepContainers?.length) return;
    const curIdx = typeof this._currentStepIdx === 'number' ? this._currentStepIdx : 0;
    const prevIdx = this._computeStepJump(curIdx, -1);
    this._setActiveStep(Math.max(0, prevIdx));
  }

  // Mobile stepper: compute next/prev index with grouping rules
  _computeStepJump(idx, dir) {
    try {
      const containers = this._stepContainers || [];
      if (!containers.length) return idx;
      const cur = containers[idx];
      if (!cur) return idx;
      const isSlipGroup = (el) => el && (el.id === 'slips' || el.classList?.contains('slip'));
      const isCheckGroup = (el) => el && (el.id === 'checks' || el.classList?.contains('check'));
      if (dir > 0) {
        // Forward: if in slips, jump to first non-slip container (typically #checks)
        if (isSlipGroup(cur)) {
          let j = idx + 1;
          while (j < containers.length && isSlipGroup(containers[j])) j++;
          return Math.min(containers.length - 1, j);
        }
        // If in checks, jump to first non-check container (typically #hundreds)
        if (isCheckGroup(cur)) {
          let j = idx + 1;
          while (j < containers.length && isCheckGroup(containers[j])) j++;
          return Math.min(containers.length - 1, j);
        }
        return Math.min(containers.length - 1, idx + 1);
      } else {
        // Backward: from checks/check -> base slips; from hundreds -> base checks
        if (isCheckGroup(cur)) {
          // scan backward to base slips id
          for (let k = idx - 1; k >= 0; k--) {
            if (containers[k]?.id === 'slips') return k;
          }
          return Math.max(0, idx - 1);
        }
        if (cur.id === 'hundreds') {
          for (let k = idx - 1; k >= 0; k--) {
            if (containers[k]?.id === 'checks') return k;
          }
          return Math.max(0, idx - 1);
        }
        return Math.max(0, idx - 1);
      }
    } catch(_) { /* ignore */ }
    return idx;
  }

  _newInput(anchorSelector) {
    if (this._readOnly) return;
    // Determine type based on anchor (match original logic: before #checks => slip, else check)
    const typeOf = anchorSelector === '#checks' ? 'slip' : 'check';
    const id = `${typeOf}_${Math.random().toString(36).slice(2, 7)}`;
    const div = document.createElement('div');
    div.className = `input ${typeOf}`;
    div.id = id;

    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = `Additional ${typeOf[0].toUpperCase()}${typeOf.slice(1)}`;
    input.name = typeOf;
    input.id = `${id}-input`;
    input.autocomplete = 'off';
    input.inputMode = 'decimal';
    input.setAttribute('enterkeyhint', 'next');

    const btn = document.createElement('button');
    btn.className = 'rem';
    btn.title = 'Remove';
    btn.textContent = 'x';
    btn.addEventListener('click', () => this.remInput(id));

    const span = document.createElement('span');
    span.textContent = '0.00';
    // Visible, clickable label tied to the input, shown to the left
    const visLabel = document.createElement('label');
    visLabel.setAttribute('for', input.id);
    visLabel.textContent = `${typeOf[0].toUpperCase()}${typeOf.slice(1)}`;
    visLabel.className = 'dyn-label';

    // Append in UI order: label (left), input, button, value
    div.append(visLabel, input, btn, span);
    // delegate input/keydown
    div.addEventListener('input', this._onInputEvent);
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) this._newInput(typeOf === 'slip' ? '#checks' : '#hundreds');
    });
    if (this._isTouchDevice()) {
      input.addEventListener('focus', () => { try { input.select?.(); input.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); } catch(_) {} });
    }

    const anchor = this._root.querySelector(anchorSelector);
    if (anchor && anchor.parentElement) {
      anchor.before(div);
    } else {
      // fallback: append to wrapper
      this._root.querySelector('.wrap')?.appendChild(div);
    }

    this._getTotal();
    this._getBalance();
    this._slipCheckCount();
    this._renumberDynamicLabels();
    input.focus();
    if (this._shouldUseMobileStepper && this._shouldUseMobileStepper()) {
      this._refreshSteps?.();
      const containers = this._stepContainers || [];
      const idx = containers.indexOf(div);
      if (idx >= 0) this._setActiveStep?.(idx);
      // Ensure new input has mobile key bindings
      this._bindMobileInputKeys?.();
    }
  }

  remInput(id) {
    if (this._readOnly) return;
    const el = this._root.querySelector(`#${CSS.escape(id)}`);
    if (el) el.remove();
    this._getTotal();
    this._getBalance();
    this._slipCheckCount();
    this._renumberDynamicLabels();
    this.dispatchEvent(new CustomEvent('change', { detail: this.getCount(), bubbles: true, composed: true }));
    if (this._shouldUseMobileStepper && this._shouldUseMobileStepper()) {
      const prev = this._currentStepIdx || 0;
      this._refreshSteps?.();
      this._setActiveStep?.(Math.max(0, Math.min(prev, (this._stepContainers?.length || 1) - 1)));
      this._bindMobileInputKeys?.();
    }
  }

  _getTotal() {
    // Only sum numeric spans inside the component content to avoid NaN from unrelated spans (e.g., mobile step indicator)
    const spans = Array.from(this._root.querySelectorAll('.wrap span'));
    const total = spans.reduce((a, b) => a + Number(b.innerText || 0), 0);
    const totalEl = this._root.querySelector('total');
    if (totalEl) totalEl.innerText = total.toFixed(2);
    this._countCash();
    return total;
  }

  _countCash() {
    const cashs = Array.from(this._root.querySelectorAll('span.cash'));
    const cash = cashs.reduce((a, b) => a + Number(b.innerText || 0), 0) - 150;
    const cashEl = this._root.querySelector('cash');
    if (cashEl) cashEl.innerText = cash.toFixed(2);
    const cashSel = this._root.querySelector('#cash');
    if (cashSel) cashSel.style.color = cash >= 0 ? 'green' : 'red';
    return cash.toFixed(2);
  }

  _getBalance() {
    const total = this._getTotal();
    const roa = Number(this._root.querySelector('roa')?.innerText || 0);
    const drawer = Number(this._root.querySelector('drawer')?.innerText || 0);
    const balance = total - roa - drawer - 150;
    const balEl = this._root.querySelector('balance');
    if (balEl) balEl.innerText = balance.toFixed(2);
    const balWrap = this._root.querySelector('#balance');
    if (balWrap) balWrap.style.color = balance <= 0.33 && balance >= -0.33 ? 'green' : 'red';
  }

  _slipCheckCount() {
    const slipTotal = [];
    const checkTotal = [];
    const mainSlip = this._root.querySelector('#slips span');
    const mainCheck = this._root.querySelector('#checks span');
    if (mainSlip) slipTotal.push(Number(mainSlip.innerText || 0));
    if (mainCheck) checkTotal.push(Number(mainCheck.innerText || 0));
    const allSlips = this._root.querySelectorAll('.slip span');
    const allChecks = this._root.querySelectorAll('.check span');
    allSlips.forEach((e) => slipTotal.push(Number(e.innerText || 0)));
    allChecks.forEach((e) => checkTotal.push(Number(e.innerText || 0)));
    const to2 = (n) => (isFinite(n) ? n.toFixed(2) : '0.00');
    const s = slipTotal.reduce((a, b) => a + b, 0);
    const c = checkTotal.reduce((a, b) => a + b, 0);
    const cardEl = this._root.querySelector('#cardTotal balance');
    const checkEl = this._root.querySelector('#checkTotal balance');
    if (cardEl) cardEl.innerText = to2(s);
    if (checkEl) checkEl.innerText = to2(c);
  }

  _renumberDynamicLabels() {
    try {
      const renumber = (cls, label) => {
        let n = 2; // Base row is 1
        const rows = Array.from(this._root.querySelectorAll(`.wrap .${cls}`));
        for (const row of rows) {
          const l = row.querySelector('label.dyn-label');
          if (l) l.textContent = `${label} ${n++}`;
        }
      };
      renumber('slip', 'Slip');
      renumber('check', 'Check');
    } catch (_) { /* ignore */ }
  }
}

customElements.define('drawer-count', DrawerCount);

