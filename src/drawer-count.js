// DrawerCount Web Component: encapsulates the original drawer-count.html UI + logic

class DrawerCount extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._onInputEvent = this._onInputEvent.bind(this);
    this._newInput = this._newInput.bind(this);
    this.remInput = this.remInput.bind(this);
    this._getTotal = this._getTotal.bind(this);
    this._countCash = this._countCash.bind(this);
    this._getBalance = this._getBalance.bind(this);
    this._slipCheckCount = this._slipCheckCount.bind(this);
  }

  connectedCallback() {
    this._render();
    this._wire();
    this._bindShortcuts();
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
    // Base inputs
    const state = {
      version: 1,
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
        if (el) { el.value = (Number(v) || 0); el.dispatchEvent(new Event('input', { bubbles: true })); }
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
        if (inp) { inp.value = Number(value) || 0; inp.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      (Array.isArray(ex.slips) ? ex.slips : []).forEach((v) => add('slip', v));
      (Array.isArray(ex.checks) ? ex.checks : []).forEach((v) => add('check', v));

      // Final recompute and announce
      this._getTotal();
      this._getBalance();
      this._slipCheckCount();
      this._announce('Drawer restored');
    } catch (_) {
      // ignore
    }
  }

  // Public API: reset all inputs and dynamic rows to zero/empty
  reset() {
    const zero = 0;
    const state = {
      version: 1,
      timestamp: Date.now(),
      base: {
        drawer: zero, roa: zero, slips: zero, checks: zero,
        hundreds: zero, fifties: zero, twenties: zero, tens: zero,
        fives: zero, dollars: zero, quarters: zero, dimes: zero, nickels: zero, pennies: zero,
        quarterrolls: zero, dimerolls: zero, nickelrolls: zero, pennyrolls: zero
      },
      extra: { slips: [], checks: [] }
    };
    this.setState(state);
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
        button { background: var(--button-bg-color, #222222f0); color: var(--button-color, green); }
        button.rem { color: var(--button-rem-color, red); margin-left: .35rem; }
        span:before { content: '$'; }

        @media only print {
          #drawer input, #roa input, #drawer label, #roa label,
          div:not(#total,#cash,#balance,#cardTotal,#checkTotal,#drawer,#roa) { display: none; }
        }
      </style>

      <div class="wrap">
        <div class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
        <div class="output" id="total">Count: $<total>0.00</total></div>
        <div class="output" id="cash">Remove: $<cash>0.00</cash></div>
        <div class="output" id="balance">Balance: $<balance>0.00</balance></div>
        <div class="output" id="cardTotal">Slip Total: $<balance>0.00</balance></div>
        <div class="output" id="checkTotal">Check Total: $<balance>0.00</balance></div>

        <div class="input" id="drawer">
          <label for="drawer-input">Cash Total</label>
          <input id="drawer-input" name="drawer" step=".01" type="number" placeholder="Cash Total" />
           Cash Total: $<drawer>0.00</drawer>
        </div>
        <div class="input" id="roa">
          <label for="roa-input">ROA Amount</label>
          <input id="roa-input" name="roa" step=".01" type="number" placeholder="ROA Amount" />
           ROA Amount: $<roa>0.00</roa>
        </div>
        <div class="input" id="slips">
          <label for="slips-input">Credit Cards</label>
          <input id="slips-input" name="slips" step=".01" type="number" placeholder="Credit Cards" />
          <button class="add-slip" title="Add Slip">+</button>
          <span>0.00</span> Slip
        </div>
        <div class="input" id="checks">
          <label for="checks-input">Checks</label>
          <input id="checks-input" name="checks" step=".01" type="number" placeholder="Checks" min="0" />
          <button class="add-check" title="Add Check">+</button>
          <span>0.00</span> Check
        </div>

        <div class="input" id="hundreds">
          <label for="hundreds-input">Hundreds</label>
          <input id="hundreds-input" name="hundreds" type="number" placeholder="Hundreds" min="0" max="20" />
          <span class="cash">0.00</span> in Hundreds
        </div>
        <div class="input" id="fifties">
          <label for="fifties-input">Fifties</label>
          <input id="fifties-input" name="fifties" type="number" placeholder="Fifties" min="0" max="30" />
          <span class="cash">0.00</span> in Fifties
        </div>
        <div class="input" id="twenties">
          <label for="twenties-input">Twenties</label>
          <input id="twenties-input" name="twenties" type="number" placeholder="Twenties" min="0" max="40" />
          <span class="cash">0.00</span> in Twenties
        </div>
        <div class="input" id="tens">
          <label for="tens-input">Tens</label>
          <input id="tens-input" name="tens" type="number" placeholder="Tens" min="0" max="50" />
          <span class="cash">0.00</span> in Tens
        </div>
        <div class="input" id="fives">
          <label for="fives-input">Fives</label>
          <input id="fives-input" name="fives" type="number" placeholder="Fives" min="0" max="75" />
          <span class="cash">0.00</span> in Fives
        </div>
        <div class="input" id="dollars">
          <label for="dollars-input">Dollars</label>
          <input id="dollars-input" name="dollars" type="number" placeholder="Dollars" min="0" max="100" />
          <span class="cash">0.00</span> in Ones
        </div>
        <div class="input" id="quarters">
          <label for="quarters-input">Quarters</label>
          <input id="quarters-input" name="quarters" type="number" placeholder="Quarters" min="0" max="50" />
          <span class="cash">0.00</span> in Quarters
        </div>
        <div class="input" id="dimes">
          <label for="dimes-input">Dimes</label>
          <input id="dimes-input" name="dimes" type="number" placeholder="Dimes" min="0" max="50" />
          <span class="cash">0.00</span> in Dimes
        </div>
        <div class="input" id="nickels">
          <label for="nickels-input">Nickels</label>
          <input id="nickels-input" name="nickels" type="number" placeholder="Nickels" min="0" max="50" />
          <span class="cash">0.00</span> in Nickels
        </div>
        <div class="input" id="pennies">
          <label for="pennies-input">Pennies</label>
          <input id="pennies-input" name="pennies" type="number" placeholder="Pennies" min="0" max="50" />
          <span class="cash">0.00</span> in Pennies
        </div>
        <div class="input" id="quarterrolls">
          <label for="quarterrolls-input">Quarter Rolls</label>
          <input id="quarterrolls-input" name="quarterrolls" type="number" placeholder="Quarter Rolls" min="0" max="4" />
          <span class="cash">0.00</span> in Quarter Rolls
        </div>
        <div class="input" id="dimerolls">
          <label for="dimerolls-input">Dime Rolls</label>
          <input id="dimerolls-input" name="dimerolls" type="number" placeholder="Dime Rolls" min="0" max="4" />
          <span class="cash">0.00</span> in Dime Rolls
        </div>
        <div class="input" id="nickelrolls">
          <label for="nickelrolls-input">Nickel Rolls</label>
          <input id="nickelrolls-input" name="nickelrolls" type="number" placeholder="Nickel Rolls" min="0" max="4" />
          <span class="cash">0.00</span> in Nickel Rolls
        </div>
        <div class="input" id="pennyrolls">
          <label for="pennyrolls-input">Penny Rolls</label>
          <input id="pennyrolls-input" name="pennyrolls" type="number" placeholder="Penny Rolls" min="0" max="4" />
          <span class="cash">0.00</span> in Penny Rolls
        </div>
      </div>
    `;
  }

  _wire() {
    const $ = (sel) => this._root.querySelector(sel);
    const $$ = (sel) => Array.from(this._root.querySelectorAll(sel));

    // Add-input buttons
    $('#slips .add-slip')?.addEventListener('click', () => this._newInput('#checks'));
    $('#checks .add-check')?.addEventListener('click', () => this._newInput('#hundreds'));

    // Delegated input handler on each .input block
    $$('.input').forEach((block) => block.addEventListener('input', this._onInputEvent));

    // Enter to add another for base slip/check inputs
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

    // Min values
    $('#checks input')?.setAttribute('min', '0');
    $$('.cash').forEach((e) => e.previousElementSibling?.setAttribute('min', '0'));

    // Initial compute
    this._getTotal();
    this._getBalance();
    this._slipCheckCount();
  }

  _bindShortcuts() {
    // Global shortcuts for adding/removing rows
    this._onKeyDownGlobal = (e) => {
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
                  this._getTotal(); this._getBalance(); this._slipCheckCount();
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

  _newInput(anchorSelector) {
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

    const btn = document.createElement('button');
    btn.className = 'rem';
    btn.title = 'Remove';
    btn.textContent = 'x';
    btn.addEventListener('click', () => this.remInput(id));

  const span = document.createElement('span');
  span.textContent = '0.00';
  // Visible, clickable label tied to the input
  const visLabel = document.createElement('label');
  visLabel.setAttribute('for', input.id);
  visLabel.textContent = ` ${typeOf[0].toUpperCase()}${typeOf.slice(1)}`;

  // Append in UI order: input, button, value, label (span value is not lastElementChild dependent anymore)
  div.append(input, btn, span, visLabel);
    // delegate input/keydown
    div.addEventListener('input', this._onInputEvent);
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) this._newInput(typeOf === 'slip' ? '#checks' : '#hundreds');
    });

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
    input.focus();
  }

  remInput(id) {
    const el = this._root.querySelector(`#${CSS.escape(id)}`);
    if (el) el.remove();
    this._getTotal();
    this._getBalance();
    this._slipCheckCount();
    this.dispatchEvent(new CustomEvent('change', { detail: this.getCount(), bubbles: true, composed: true }));
  }

  _getTotal() {
    const spans = Array.from(this._root.querySelectorAll('span'));
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
}

customElements.define('drawer-count', DrawerCount);
