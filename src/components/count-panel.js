import { toast } from '../lib/toast.js';
import './drawer-count.js';
import { getActiveViewDateKey, getTodayKey, isDayEditUnlocked, setDayEditUnlocked, saveSpecificDay, restoreDay, updateStatusPill, applyReadOnlyByActiveDate, updateLockButtonUI, getActiveProfileId } from '../lib/persistence.js';
import { _getActiveDaysEntry } from '../lib/persistence.js';
import { getUnlockConfirmModal } from './unlock-confirm-modal.js';
import { getRevertConfirmModal } from './revert-confirm-modal.js';

class CountPanel extends HTMLElement {
  constructor() {
    super();
    this._els = {};
    this._state = { started: false, collapsed: true, completed: false, reopened: false };
    this._isProcessing = false;
    this._onStart = this._onStart.bind(this);
    this._onToggle = this._onToggle.bind(this);
    this._onComplete = this._onComplete.bind(this);
    this._onVisibilityRefresh = this._onVisibilityRefresh.bind(this);
    this._onDrawerChange = this._onDrawerChange.bind(this);
  }

  connectedCallback() {
    this._render();
    this._cacheEls();
    this._bind();
    if (!this.querySelector('drawer-count')) {
      const dc = document.createElement('drawer-count');
      this._els.body.appendChild(dc);
    }
    
    // Force past dates to start collapsed (summary first)
    try {
      const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; 
      const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; 
      const isPastDate = key && today && (key !== today);
      
      if (isPastDate) {
        // Initialize state if needed
        if (!this._state) this._state = {};
        // Force collapsed for past dates
        this._state.collapsed = true;
      }
    } catch(_) {}
    
    this._refresh(true);
    window.addEventListener('storage', this._onVisibilityRefresh);
    window.addEventListener('focus', this._onVisibilityRefresh);
    
    // Set up drawer count event listeners
    this._onStepperComplete = this._onStepperComplete.bind(this);
    this._setupDrawerCountListeners();
  }

  _setupDrawerCountListeners() {
    try { 
      this._dc = this.querySelector('drawer-count'); 
      if (this._dc) {
        this._dc.addEventListener('change', this._onDrawerChange);
        this._dc.addEventListener('stepper-complete', this._onStepperComplete);
      }
    } catch(_) {}
  }

  disconnectedCallback() {
    window.removeEventListener('storage', this._onVisibilityRefresh);
    window.removeEventListener('focus', this._onVisibilityRefresh);
    try { 
      if (this._dc) {
        this._dc.removeEventListener('change', this._onDrawerChange);
        this._dc.removeEventListener('stepper-complete', this._onStepperComplete);
      }
    } catch(_) {}
  }

  _render() {
    this.classList.add('count-panel');
    this.innerHTML = `
      <div class="panel-header" role="group" aria-label="Drawer count controls">
        <div class="panel-title">Today's Count</div>
        <div class="panel-actions">
          <button class="start-btn" type="button">Start count</button>
          <button class="toggle-btn" type="button" aria-expanded="false" aria-label="Expand">▼</button>
          <button class="lock-btn" type="button" aria-label="Toggle edit lock" title="Toggle edit lock">🔒</button>
          <button class="clear-btn icon-btn" type="button" aria-label="Clear inputs" title="Clear inputs">🧹</button>
          <button class="optional-btn icon-btn" type="button" aria-label="Optional fields" title="Optional fields">🧾</button>
          <button class="complete-btn" type="button" aria-label="Mark complete" title="Mark complete">💾</button>
          <button class="cancel-btn" type="button" aria-label="Cancel" title="Cancel">⊘</button>
        </div>
      </div>
      <div class="panel-body" aria-hidden="true"></div>
      <div class="panel-summary" aria-hidden="true" hidden></div>
      <p class="hint done-hint" hidden>Completed for this day. Use the toggle button to edit.</p>
      <p class="hint lock-hint" hidden>Editing is locked for this saved day. To make changes, click the lock button (🔒) in this card to unlock.</p>
    `;
  }

  _cacheEls() {
    this._els.header = this.querySelector('.panel-header');
    this._els.title = this.querySelector('.panel-title');
    this._els.actions = this.querySelector('.panel-actions');
    this._els.start = this.querySelector('.start-btn');
    this._els.toggle = this.querySelector('.toggle-btn');
    this._els.lock = this.querySelector('.lock-btn');
    this._els.clear = this.querySelector('.clear-btn');
    this._els.optional = this.querySelector('.optional-btn');
    this._els.complete = this.querySelector('.complete-btn');
    this._els.cancel = this.querySelector('.cancel-btn');
    this._els.body = this.querySelector('.panel-body');
    this._els.doneHint = this.querySelector('.done-hint');
    this._els.summary = this.querySelector('.panel-summary');
    this._els.lockHint = this.querySelector('.lock-hint');
  }

  _bind() {
    this._els.start.addEventListener('click', this._onStart);
    this._els.toggle.addEventListener('click', this._onToggle);
    this._els.lock.addEventListener('click', this._onToggleLock.bind(this));
    this._els.clear.addEventListener('click', this._onClear.bind(this));
    this._els.optional.addEventListener('click', this._onOptional.bind(this));
    this._els.complete.addEventListener('click', this._onComplete);
    this._els.cancel.addEventListener('click', this._onCancel.bind(this));
  }

  _panelKey() {
    try { const pid = (typeof getActiveProfileId === 'function') ? getActiveProfileId() : null; const dkey = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (pid && dkey) return `${pid}::${dkey}`; } catch (_) {}
    const today = new Date(); const d = today.toISOString().slice(0,10); return `default::${d}`;
  }

  _loadPersisted() {
    try { const raw = localStorage.getItem('drawer-panel-v1'); const all = raw ? JSON.parse(raw) : {}; const key = this._panelKey(); return all[key] || { started: false, collapsed: true, completed: false, reopened: false }; } catch (_) { return { started: false, collapsed: true, completed: false, reopened: false }; }
  }
  _savePersisted(next) { try { const raw = localStorage.getItem('drawer-panel-v1'); const all = raw ? JSON.parse(raw) : {}; const key = this._panelKey(); all[key] = { ...all[key], ...next }; localStorage.setItem('drawer-panel-v1', JSON.stringify(all)); } catch (_) {} }

  isCollapsed() { return !!this._state.collapsed; }
  refresh() { this._refresh(); }
  expand() {
    if (!this._state.started) return false;
    this._state.collapsed = false;
    this._savePersisted({ collapsed: false, started: true });
    this._refresh();
    return true;
  }
  collapse() {
    if (!this._state.started) return false;
    this._state.collapsed = true;
    this._savePersisted({ collapsed: true, started: true });
    this._refresh();
    return true;
  }
  toggleCollapsed() { if (!this._state.started) return false; this._state.collapsed = !this._state.collapsed; this._savePersisted({ collapsed: this._state.collapsed, started: this._state.started }); this._refresh(); return true; }

  showCompletedSummary() { 
    // Don't override when state is temporarily protected (e.g., right after saving)
    if (this._stateProtected) {
      return;
    }
    
    // Don't override reopened state - if something is reopened, let it stay reopened
    if (this._state?.reopened) {
      return;
    }
    
    this._state.started = true; this._state.completed = true; this._state.collapsed = true; this._savePersisted({ started: true, completed: true, collapsed: true }); try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch (_) {} this._refresh(); 
  }

  _refresh(noAnim = false) {
    this._state = { ...{ started: false, collapsed: true, completed: false, reopened: false }, ...this._loadPersisted() };
    const { started, completed } = this._state;
    if (!started) this._state.collapsed = true;
    const isEmpty = !started && !completed;
    const collapsed = this._state.collapsed;
    const readOnly = this._computeReadOnly();

    // Update drawer-count component's read-only state
    try {
      const drawerCount = this.querySelector('drawer-count');
      if (drawerCount && typeof drawerCount.setReadOnly === 'function') {
        drawerCount.setReadOnly(readOnly);
      }
    } catch(_) {}

    this.classList.toggle('collapsed', !!collapsed);
    this.classList.toggle('empty', !!isEmpty);
    this.classList.toggle('completed', !!completed);
    this.setAttribute('aria-busy', this._isProcessing ? 'true' : 'false');

    // Manage card visibility for empty state
    this._manageCardVisibility(isEmpty);

    this._els.start.hidden = !!started;
    this._els.toggle.hidden = !started;
    let isPast = false;
    try { const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; if (key && today) isPast = (key !== today); } catch(_) { isPast = false; }
    
    // Show lock button only for past days that are expanded (in edit mode)
    const showLockButton = !!(started && isPast && !this._state.collapsed);
    this._els.lock.hidden = !showLockButton;

    let showCancel = false;
    let showComplete = false;
    
    try {
      if (started && !this._state.collapsed && !readOnly) {
        const saveMode = this._isSaveMode();
        const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null;
        const hasSaved = key ? this._hasSavedDay(key) : false;
        const hasUnsaved = this._hasUnsavedChangesComparedToSaved();
        
        // Show cancel button when editing (has saved data and potentially unsaved changes)
        const todayReopenCase = (!saveMode && !!this._state.reopened && hasSaved);
        const pastEditCase = (saveMode && hasSaved);
        showCancel = !!(pastEditCase || todayReopenCase);
        
        // Show save/complete button when editing, but disable if no unsaved changes
        showComplete = !!(pastEditCase || todayReopenCase || !completed);
      }
    } catch(_) { 
      showCancel = false; 
      showComplete = !started || !!completed || readOnly || !!this._state.collapsed;
    }
    
    this._els.cancel.hidden = !showCancel;
    this._els.complete.hidden = !showComplete;

    // Show clear and optional buttons only when unlocked and expanded
    const showActionButtons = started && !readOnly && !this._state.collapsed;
    this._els.clear.hidden = !showActionButtons;
    this._els.optional.hidden = !showActionButtons;

    if (this._els.complete) {
      let disabled = !!this._isProcessing || readOnly;
      
      // Also disable if no unsaved changes for save mode or reopened items
      if (!disabled && started && !this._state.collapsed && !readOnly) {
        const saveMode = this._isSaveMode();
        if (saveMode || this._state.reopened) {
          const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null;
          const hasSaved = key ? this._hasSavedDay(key) : false;
          const hasUnsaved = this._hasUnsavedChangesComparedToSaved();
          if (hasSaved && !hasUnsaved) {
            disabled = true; // Disable if no unsaved changes
          }
        }
      }
      
      this._els.complete.disabled = disabled;
    }
    
    if (this._els.cancel) {
      let disabled = !!this._isProcessing;
      
      // Also disable cancel if no unsaved changes (nothing to cancel)
      if (!disabled && started && !this._state.collapsed && !readOnly) {
        const saveMode = this._isSaveMode();
        if (saveMode || this._state.reopened) {
          const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null;
          const hasSaved = key ? this._hasSavedDay(key) : false;
          const hasUnsaved = this._hasUnsavedChangesComparedToSaved();
          if (hasSaved && !hasUnsaved) {
            disabled = true; // Disable if no unsaved changes to cancel
          }
        }
      }
      
      this._els.cancel.disabled = disabled;
    }
    if (this._els.lock) {
      this._els.lock.disabled = !!this._isProcessing;
      
      // Update lock button icon based on current lock state
      try {
        const isUnlocked = (typeof isDayEditUnlocked === 'function') ? isDayEditUnlocked() : false;
        this._els.lock.textContent = isUnlocked ? '🔓' : '🔒';
        this._els.lock.title = isUnlocked ? 'Lock editing' : 'Unlock editing';
        this._els.lock.setAttribute('aria-label', isUnlocked ? 'Lock editing' : 'Unlock editing');
      } catch(_) {}
    }
    if (this._els.toggle) this._els.toggle.disabled = !!this._isProcessing;

    this._els.toggle.textContent = collapsed ? '▼' : '▲';
    this._els.toggle.setAttribute('aria-expanded', String(!collapsed));
    
    // Contextual labels based on completion or reopened state
    if (completed || this._state.reopened) {
      const label = collapsed ? 'Edit count' : 'Show summary';
      const title = collapsed ? 'Expand to edit this count' : 'Collapse to show summary';
      this._els.toggle.setAttribute('aria-label', label);
      this._els.toggle.setAttribute('title', title);
    } else {
      const label = collapsed ? 'Expand' : 'Collapse';
      this._els.toggle.setAttribute('aria-label', label);
      this._els.toggle.setAttribute('title', label);
    }

    const saveMode = this._isSaveMode();
    try { if (this._els.title) this._els.title.textContent = this._activeDayTitle(); } catch(_) {}
    if (!this._els.complete.hidden) {
      const baseLabel = saveMode ? 'Save' : 'Mark complete';
      const processingLabel = saveMode ? 'Saving…' : 'Completing…';
      const baseIcon = saveMode ? '💾' : '✅';
      this._els.complete.classList.toggle('processing', !!this._isProcessing);
      if (this._isProcessing) { this._els.complete.innerHTML = `${processingLabel} <span class="dots" aria-hidden="true"></span>`; }
      else { this._els.complete.textContent = baseIcon; }
      this._els.complete.setAttribute('aria-label', this._isProcessing ? processingLabel : baseLabel);
      this._els.complete.title = this._isProcessing ? processingLabel : baseLabel;
    }

    const container = this._visibleContainer();
    
    // Render summary data when completed, reopened, or past dates with data
    let shouldRenderSummary = completed || this._state.reopened;
    if (!shouldRenderSummary) {
      // Also render summary for past dates with data
      try {
        const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; 
        const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; 
        const isPastWithData = key && today && (key !== today) && this._state.started;
        shouldRenderSummary = isPastWithData;
      } catch(_) {}
    }
    if (shouldRenderSummary) this._renderSummary();
    
    const collapsedChanged = this._lastCollapsed !== collapsed;
    const completedChanged = this._lastCompleted !== completed;
    
    // Handle animations for state changes
    if (!isEmpty && (collapsedChanged || completedChanged)) {
      // First sync containers to ensure proper visibility state
      this._syncContainersVisibility();
      
      // For completed OR reopened states with toggle behavior, we need to handle both containers
      if ((completed || this._state.reopened) && collapsedChanged) {
        if (collapsed) {
          // Switching to summary view - ensure body is hidden first, then animate summary
          this._els.body.hidden = true;
          this._els.body.setAttribute('aria-hidden', 'true');
          this._expandEl(this._els.summary, !noAnim);
        } else {
          // Switching to edit view - ensure summary is hidden first, then animate body
          this._els.summary.hidden = true;
          this._els.summary.setAttribute('aria-hidden', 'true');
          this._expandEl(this._els.body, !noAnim);
        }
      } else {
        // Single container animation for other cases
        if (collapsed) {
          this._collapseEl(container, !noAnim);
        } else {
          this._expandEl(container, !noAnim);
        }
      }
    } else if (isEmpty) {
      // For empty state, immediately hide without animation conflicts
      try {
        this._els.body.classList.remove('expanding', 'collapsing');
        this._els.summary.classList.remove('expanding', 'collapsing');
        this._els.body.hidden = true; 
        this._els.body.setAttribute('aria-hidden', 'true'); 
        this._els.body.style.height = '0px';
        this._els.summary.hidden = true; 
        this._els.summary.setAttribute('aria-hidden', 'true'); 
        this._els.summary.style.height = '0px';
      } catch(_) {}
    } else {
      // Always sync visibility when no state changes occurred
      this._syncContainersVisibility();
    }
    
    this._lastCollapsed = collapsed; 
    this._lastCompleted = completed;

    this._els.doneHint.hidden = !completed;
    if (this._els.lockHint) this._els.lockHint.hidden = !(started && !completed && readOnly);
    try { updateStatusPill(this); } catch(_) {}

    try { const emptyEl = this.querySelector('.panel-empty'); if (emptyEl) { if (isEmpty) { emptyEl.hidden = false; emptyEl.setAttribute('aria-hidden', 'false'); } else { emptyEl.hidden = true; emptyEl.setAttribute('aria-hidden', 'true'); } } } catch(_) {}
  }

  async _onCancel() {
    if (this._isProcessing) return; 
    if (!this._state.started) return;
    
    try {
      const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null;
      
      if (key && this._hasSavedDay(key) && this._hasUnsavedChangesComparedToSaved()) {
        const modal = (typeof getRevertConfirmModal === 'function') ? getRevertConfirmModal() : null;
        let proceed = true; 
        if (modal && typeof modal.open === 'function') { 
          proceed = await modal.open(key); 
        }
        
        if (!proceed) return;
        
        // Begin processing with visual feedback (same as save)
        this._beginProcessing('revert');
        
        try { 
          restoreDay(key); 
          
          // Lock editing (same as save)
          try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch(_) {}
          try { const header = document.querySelector('app-header'); updateStatusPill(header); applyReadOnlyByActiveDate(header); } catch(_) {}
          
          // Set completed state to show summary (same as save)
          // But don't override reopened state
          if (!this._state.reopened) {
            this._state.completed = true; 
            this._state.collapsed = true;
            this._savePersisted({ completed: true, started: true, collapsed: true });
          }
          
          toast('Reverted changes. Showing summary.', { type: 'info', duration: 1800 }); 
        } catch(_) {}
        
        // End processing with same timing as save
        setTimeout(() => this._endProcessing(), 200);
        this._refresh();
        return;
      }
    } catch(_) {}
    return;
  }

  _hasUnsavedChangesComparedToSaved() {
    try { const comp = this.querySelector('drawer-count'); const cur = comp?.getState?.(); if (!cur) return false; const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (!key) return false; const { entry } = _getActiveDaysEntry(false); const saved = entry?.days?.[key]?.state; if (!saved) return false; return JSON.stringify(cur) !== JSON.stringify(saved); } catch(_) { return false; }
  }

  async _onToggleLock() {
    let btn = null;
    let prevHtml = '';
    let prevDisabled = false;
    
    try {
      const today = getTodayKey(); 
      const key = getActiveViewDateKey(); 
      if (key === today) { 
        toast('Today is always editable', { type: 'info', duration: 1400 }); 
        return; 
      }
      
      btn = this._els?.lock; 
      prevHtml = btn ? btn.innerHTML : ''; 
      prevDisabled = btn ? btn.disabled : false;
      
      if (btn) { 
        btn.classList.add('processing'); 
        btn.innerHTML = `${btn.textContent} <span class="dots" aria-hidden="true"></span>`; 
        btn.disabled = true; 
      }
      
      const unlocked = isDayEditUnlocked();
      
      if (!unlocked) { 
        const modal = getUnlockConfirmModal(); 
        const ok = await modal.open(key); 
        
        if (!ok) {
          return; 
        }
        
        setDayEditUnlocked(true); 
        
        // When unlocking past days, don't enable auto-save but allow editing
        // The timestamp should remain locked to preserve the original count time
        
        toast('Editing unlocked for this day', { type: 'info', duration: 1600 }); 
      }
      else { 
        setDayEditUnlocked(false); 
        
        toast('Editing locked for this day', { type: 'info', duration: 1600 }); 
      }
      
      try { const header = document.querySelector('app-header'); applyReadOnlyByActiveDate(header); } catch(e) { console.error('Error applying readonly to header:', e); }
      try { updateLockButtonUI(this); } catch(e) { console.error('Error updating lock button UI:', e); }
      try { this._refresh(); } catch(e) { console.error('Error refreshing:', e); }
    } catch(error) {
      console.error('Error in _onToggleLock:', error);
      toast('Error toggling lock state', { type: 'error', duration: 2000 });
    } finally {
      // Always restore button state, but preserve the updated icon
      setTimeout(() => { 
        try { 
          if (btn) { 
            btn.classList.remove('processing'); 
            // Don't restore innerHTML - let the updateLockButtonUI handle the icon
            // btn.innerHTML = prevHtml; 
            btn.disabled = prevDisabled; 
          } 
        } catch(e) { 
          console.error('Error restoring button state:', e); 
        } 
      }, 200);
    }
  }

  _onClear() {
    try {
      const drawerCount = this.querySelector('drawer-count');
      if (drawerCount && typeof drawerCount.clearInputs === 'function') {
        drawerCount.clearInputs();
      }
    } catch(error) {
      console.error('Error clearing inputs:', error);
      try { toast('Error clearing inputs', { type: 'error', duration: 2000 }); } catch(_) {}
    }
  }

  async _onOptional() {
    try {
      const drawerCount = this.querySelector('drawer-count');
      if (drawerCount && typeof drawerCount.openOptionalFields === 'function') {
        await drawerCount.openOptionalFields();
      }
    } catch(error) {
      console.error('Error opening optional fields:', error);
      try { toast('Error opening optional fields', { type: 'error', duration: 2000 }); } catch(_) {}
    }
  }

  _visibleContainer() { 
    const { completed, collapsed, reopened, started } = this._state;
    
    // Check if this is a past date with data
    let isPastWithData = false;
    try {
      const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; 
      const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; 
      isPastWithData = key && today && (key !== today) && started;
    } catch(_) {}
    
    // Force summary view for past dates (override any stored collapsed state)
    if (isPastWithData) {
      // For past dates, show summary unless explicitly expanded (collapsed = false)
      return collapsed ? this._els.summary : this._els.body;
    }
    
    // Regular logic for today and other dates
    if (completed || reopened) {
      return collapsed ? this._els.summary : this._els.body;
    } else {
      return this._els.body;
    }
  }

  _syncContainersVisibility() {
    const { completed, collapsed, reopened, started } = this._state;
    
    // Check if this is a past date with data
    let isPastWithData = false;
    try {
      const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; 
      const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; 
      isPastWithData = key && today && (key !== today) && started;
    } catch(_) {}
    
    // Skip if visibility state hasn't changed (include isPastWithData in state check)
    const currentVisState = `${completed}_${collapsed}_${reopened}_${isPastWithData}`;
    if (this._lastVisState === currentVisState) {
      return;
    }
    this._lastVisState = currentVisState;
    
    // Simplified logic: if collapsed and we have data, show summary; otherwise show body
    if (collapsed && (isPastWithData || completed || reopened)) {
      // Show summary, hide body
      this._els.body.hidden = true;
      this._els.body.setAttribute('aria-hidden', 'true');
      this._els.summary.hidden = false;
      this._els.summary.setAttribute('aria-hidden', 'false');
    } else {
      // Show body, hide summary
      this._els.summary.hidden = true;
      this._els.summary.setAttribute('aria-hidden', 'true');
      if (collapsed) {
        this._els.body.hidden = true;
        this._els.body.setAttribute('aria-hidden', 'true');
      } else {
        this._els.body.hidden = false;
        this._els.body.setAttribute('aria-hidden', 'false');
      }
    }
  }

  _expandEl(el, animate = true) {
    if (!el) return;
    
    // Clear any existing animation classes
    el.classList.remove('collapsing', 'expanding');
    
    // Set initial visibility and aria state
    el.setAttribute('aria-hidden', 'false');
    el.hidden = false;
    
    if (!animate) {
      el.style.height = 'auto';
      return;
    }

    // Get target height
    el.style.height = 'auto';
    const target = el.scrollHeight;
    
    // Start animation from collapsed state
    el.style.height = '0px';
    
    // Force reflow
    el.offsetHeight;
    
    // Animate to target height
    requestAnimationFrame(() => {
      el.style.height = `${target}px`;
      
      // Clean up after animation
      const onEnd = () => {
        el.style.height = 'auto';
        el.removeEventListener('transitionend', onEnd);
      };
      
      el.addEventListener('transitionend', onEnd, { once: true });
    });
  }

  _collapseEl(el, animate = true) {
    if (!el) return;
    
    // Clear any existing animation classes
    el.classList.remove('collapsing', 'expanding');
    
    if (!animate) {
      el.style.height = '0px';
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
      return;
    }

    // Get current height
    const current = el.scrollHeight;
    el.style.height = `${current}px`;
    
    // Force reflow
    el.offsetHeight;
    
    // Animate to collapsed state
    requestAnimationFrame(() => {
      el.style.height = '0px';
      
      // Clean up after animation
      const onEnd = () => {
        el.hidden = true;
        el.setAttribute('aria-hidden', 'true');
        el.removeEventListener('transitionend', onEnd);
      };
      
      el.addEventListener('transitionend', onEnd, { once: true });
    });
  }

  _renderSummary() {
    try {
      const dc = this.querySelector('drawer-count'); if (!dc || !dc.getCount) return; const c = dc.getCount(); let st = null; try { st = dc.getState?.(); } catch(_) { st = null; }
      const fmt = (n) => { const v = Number(n || 0); return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }); };
      const ts = c.timestamp ? new Date(c.timestamp) : new Date();
      const cashTotal = [c.hundreds, c.fifties, c.twenties, c.tens, c.fives, c.ones, c.quarters, c.dimes, c.nickels, c.pennies, c.qRolls, c.dRolls, c.nRolls, c.pRolls].map((x) => Number(x || 0)).reduce((a, b) => a + b, 0);
      const slipsList = Array.isArray(st?.extra?.slips) && st.extra.slips.length ? `<ul class="list">${st.extra.slips.map((v,i) => `<li><span class="label">Slip ${i+1}</span><span class="val">${fmt(v)}</span></li>`).join('')}</ul>` : '';
      const checksList = Array.isArray(st?.extra?.checks) && st.extra.checks.length ? `<ul class="list">${st.extra.checks.map((v,i) => `<li><span class="label">Check ${i+1}</span><span class="val">${fmt(v)}</span></li>`).join('')}</ul>` : '';
      const opt = st?.optional || {};
      const optEntries = [ ['Charges', opt.charges], ['Total Received', opt.totalReceived], ['Net Sales', opt.grossProfitAmount], ['Gross Profit ($)', opt.grossProfitAmount], ['Gross Profit (%)', opt.grossProfitPercent], ['# Invoices', opt.numInvoices], ['# Voids', opt.numVoids], ].filter(([,v]) => Number(v || 0) !== 0);
      const optList = optEntries.length ? `<ul class="list">${optEntries.map(([k,v]) => `<li><span class="label">${k}</span><span class="val">${k.includes('%') ? (Number(v||0).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%') : (k.startsWith('#') ? Number(v||0).toLocaleString() : fmt(v))}</span></li>`).join('')}</ul>` : '';
      this._els.summary.innerHTML = `
        <div class="sum-grid">
          <div class="row"><span class="k">Total Count</span><span class="v">${fmt(c.count)}</span></div>
          <div class="row"><span class="k">Cash</span><span class="v">${fmt(cashTotal)}</span></div>
          <div class="row"><span class="k">Slips</span><span class="v">${fmt(c.slips)}</span></div>
          <div class="row"><span class="k">Checks</span><span class="v">${fmt(c.checks)}</span></div>
          <div class="row"><span class="k">ROA</span><span class="v">${fmt(c.roa)}</span></div>
          <div class="row"><span class="k">Balance</span><span class="v">${fmt(c.balance)}</span></div>
          <div class="row ts"><span class="k">Counted</span><span class="v">${ts.toLocaleString()}</span></div>
        </div>
        ${slipsList ? `<div class="section"><h4>Recorded Slips</h4>${slipsList}</div>` : ''}
        ${checksList ? `<div class="section"><h4>Recorded Checks</h4>${checksList}</div>` : ''}
        ${optList ? `<div class="section"><h4>Optional Fields</h4>${optList}</div>` : ''}
      `;
    } catch (_) {}
  }

  _computeReadOnly() {
    try { 
      const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; 
      const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; 
      if (!key) return false; 
      const past = key !== today; 
      const unlocked = (typeof isDayEditUnlocked === 'function') ? isDayEditUnlocked() : false; 
      
      // If item is reopened (completed item being edited), it should be read-only until unlocked
      if (this._state?.reopened) {
        return !unlocked;
      }
      
      // Otherwise, only past dates require unlocking
      return past && !unlocked; 
    } catch (_) { return false; }
  }

  _activeDayTitle() {
    try { const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (!key) return "Today's Count"; const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; if (key === today) return "Today's Count"; const d = new Date(); d.setDate(d.getDate() - 1); const yk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; if (key === yk) return "Yesterday's Count"; const [Y,M,D] = key.split('-').map((x)=>Number(x)); const dt = new Date(Y, (M||1)-1, D||1); const formatted = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); return `${formatted} Count`; } catch(_) { return "Count"; }
  }

  _hasSavedDay(key) { try { const { entry } = _getActiveDaysEntry(false); return !!entry?.days?.[key]; } catch (_) { return false; } }
  _isSaveMode() { try { const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (!key) return false; const today = (typeof getTodayKey === 'function') ? getTodayKey() : ''; return key !== today; } catch (_) { return false; } }
  _focusFirstInput() { try { const dc = this.querySelector('drawer-count'); const first = dc?.shadowRoot?.querySelector('input, button, [tabindex="0"]') || dc?.querySelector('input, button, [tabindex="0"]'); if (first && typeof first.focus === 'function') first.focus(); } catch (_) {}
  }

  _onStart() {
    try { const today = (typeof getTodayKey === 'function') ? getTodayKey() : null; const key = (typeof getActiveViewDateKey === 'function') ? getActiveViewDateKey() : null; if (today && key && key !== today) { try { setActiveViewDateKey(today); } catch(_) {} try { restoreDay(today); } catch(_) {} try { setDayEditUnlocked(true); } catch(_) {} try { const header = document.querySelector('app-header'); applyReadOnlyByActiveDate(header); } catch(_) {} } } catch(_) {}
    this._state.started = true; this._state.collapsed = false; this._state.completed = false; this._state.reopened = false; this._savePersisted(this._state);
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(true); } catch (_) {}
    
    // Enable auto-save for first input if this is a new count
    try {
      const dc = this.querySelector('drawer-count');
      if (dc && typeof dc.enableFirstDayAutoSave === 'function') {
        const today = getTodayKey();
        const key = getActiveViewDateKey();
        const hasSavedData = key ? this._hasSavedDay(key) : false;
        
        if (key === today && !hasSavedData) {
          // This is today and no saved data exists - enable first-day auto-save
          dc.enableFirstDayAutoSave();
        } else {
          // Either not today or saved data exists - disable auto-save
          dc.disableAutoSave();
        }
      }
    } catch(_) {}
    
    this._refresh();
    queueMicrotask(() => this._focusFirstInput());
  }

  _onToggle() { 
    if (!this._state.started) return; 
    this._state.collapsed = !this._state.collapsed; 
    this._savePersisted({ collapsed: this._state.collapsed, started: this._state.started }); 
    this._refresh(); 
  }

  _beginProcessing(kind) { this._isProcessing = true; this._processingKind = kind || null; this._refresh(); }
  _endProcessing() { this._isProcessing = false; this._processingKind = null; this._refresh(); }

  _onComplete() {
    if (this._isProcessing) return;
    const saveMode = this._isSaveMode();
    this._beginProcessing(saveMode ? 'save' : 'complete');
    if (saveMode) {
      try { 
        if (typeof getActiveViewDateKey === 'function' && typeof saveSpecificDay === 'function') { 
          const key = getActiveViewDateKey(); 
          if (key) saveSpecificDay(key); 
        } 
        try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch(_) {} 
        try { const header = document.querySelector('app-header'); updateStatusPill(header); applyReadOnlyByActiveDate(header); } catch(_) {} 
        
        // Always set completed and collapsed state to show summary after saving
        this._state.completed = true; 
        this._state.collapsed = true;
        this._savePersisted({ completed: true, started: true, collapsed: true, reopened: this._state.reopened });
        
        // Protect against interference from other code
        this._protectStateTemporarily();
        
        toast('Saved. Editing locked.', { type: 'success', duration: 3000 }); 
      } catch (_) { }
      setTimeout(() => this._endProcessing(), 200); 
      this._refresh(); 
      return;
    }
    this._state.completed = true; this._state.reopened = false; this._savePersisted({ completed: true, started: true, reopened: false });
    try { if (typeof setDayEditUnlocked === 'function') setDayEditUnlocked(false); } catch (_) {}
    try { if (typeof getActiveViewDateKey === 'function' && typeof saveSpecificDay === 'function') { const key = getActiveViewDateKey(); if (key) saveSpecificDay(key); } } catch (_) {}
    try { toast('Marked complete for this day.'); } catch(_) {}
    this._state.collapsed = true;
    setTimeout(() => this._endProcessing(), 250);
    this._refresh();
  }

  _onVisibilityRefresh() { 
    // Don't refresh when state is temporarily protected (e.g., right after saving)
    if (this._stateProtected) {
      return;
    }
    this._refresh(); 
  }
  _onDrawerChange(e) { 
    // Check if this change should trigger an auto-save
    const shouldAutoSave = e?.autoSave || false;
    
    if (shouldAutoSave) {
      try {
        const today = getTodayKey();
        const key = getActiveViewDateKey();
        if (key === today) {
          // Auto-save to today's slot
          saveSpecificDay(key);
        }
      } catch(_) {}
    }
    this._refresh(true); 
  }
  
  _onStepperComplete(e) {
    // Only auto-complete if the drawer count is started and not already completed
    if (!this._state.started || this._state.completed) return;
    
    // Only auto-complete if not in read-only mode
    if (this._computeReadOnly()) return;
    
    // Add a small delay to ensure the stepper transition is complete
    setTimeout(() => {
      // Trigger the same completion logic as the "Mark complete" button
      this._onComplete();
    }, 100);
  }

  _manageCardVisibility(isEmpty) {
    try {
      // Find the parent card element
      const card = this.closest('.card');
      const container = document.querySelector('.container');
      
      if (!card) return;
      
      // Toggle card visibility classes for browsers without :has() support
      card.classList.toggle('card-empty', isEmpty);
      
      // Toggle container hint visibility
      if (container) {
        container.classList.toggle('show-empty-hint', isEmpty);
      }
      
      // Add smooth transition when card becomes visible
      if (!isEmpty && card.classList.contains('card-empty')) {
        // Small delay to ensure smooth transition
        setTimeout(() => {
          card.classList.remove('card-empty');
        }, 50);
      }
    } catch(_) {}
  }

  _protectStateTemporarily() {
    // Protect against interference from showCompletedSummary() and other functions
    if (this._stateProtected) return;
    this._stateProtected = true;
    
    setTimeout(() => {
      this._stateProtected = false;
    }, 1000); // Protect for 1 second after save
  }
}

if (!customElements.get('count-panel')) customElements.define('count-panel', CountPanel);

export default CountPanel;
