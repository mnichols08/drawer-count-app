// Shared persistence helpers that components import
export const DRAWER_PROFILES_KEY = 'drawer-profiles-v1';
export const DRAWER_DAYS_KEY = 'drawer-days-v1';

export function getDrawerComponent() { try { return document.querySelector('drawer-count'); } catch(_) { return null; } }

export function loadProfilesData() {
  try {
    const raw = localStorage.getItem(DRAWER_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch(_) { return {}; }
}

export function saveProfilesData(data) {
  try {
    if (data && typeof data === 'object' && data.deletedProfiles && typeof data.deletedProfiles === 'object') {
      const deletions = data.deletedProfiles;
      if (data.profiles && typeof data.profiles === 'object') {
        for (const id of Object.keys(data.profiles)) {
          if (Object.prototype.hasOwnProperty.call(deletions, id)) delete deletions[id];
        }
      }
      for (const [id, stamp] of Object.entries({ ...deletions })) {
        const ts = Number(stamp) || 0;
        if (!(ts > 0) || id === 'default') delete deletions[id];
      }
      if (Object.keys(deletions).length === 0) delete data.deletedProfiles;
    }
    localStorage.setItem(DRAWER_PROFILES_KEY, JSON.stringify(data || {}));
    try { _setLocalMeta(DRAWER_PROFILES_KEY, { updatedAt: Date.now() }); _scheduleSyncPush(DRAWER_PROFILES_KEY); } catch (_) {}
    return true;
  } catch(_) { return false; }
}

export function ensureProfilesInitialized() {
  try {
    const data = loadProfilesData() || {};
    let changed = false;
    const now = Date.now();
    if (!data.profiles || typeof data.profiles !== 'object') { data.profiles = {}; changed = true; }
    if (Object.keys(data.profiles).length === 0) { data.profiles.default = { name: 'Default', state: null, updatedAt: now, prefs: {} }; changed = true; }
    if (!data.activeId || !data.profiles[data.activeId]) {
      data.activeId = 'default';
      if (!data.profiles.default) { data.profiles.default = { name: 'Default', state: null, updatedAt: now, prefs: {} }; }
      if (!data.profiles.default.prefs || typeof data.profiles.default.prefs !== 'object') { data.profiles.default.prefs = {}; }
      changed = true;
    }
    if (changed) { data.updatedAt = now; saveProfilesData(data); return true; }
    return false;
  } catch (_) {
    try { const now = Date.now(); const init = { profiles: { default: { name: 'Default', state: null, updatedAt: now, prefs: {} } }, activeId: 'default', updatedAt: now }; saveProfilesData(init); } catch(_) {}
    return true;
  }
}

export function getActiveProfileId() { try { const d = loadProfilesData(); return d.activeId || 'default'; } catch(_) { return 'default'; } }
export function setActiveProfile(id) { const d = loadProfilesData(); d.activeId = id; d.updatedAt = Date.now(); saveProfilesData(d); }

export function saveToActiveProfile() {
  try {
    const comp = getDrawerComponent(); const state = comp?.getState?.(); if (!state) return false;
    const d = loadProfilesData(); const id = d.activeId || 'default';
    d.profiles = d.profiles || {}; d.profiles[id] = d.profiles[id] || { name: id, state: null };
    d.profiles[id].state = state; d.profiles[id].updatedAt = Date.now(); d.updatedAt = Date.now();
    if (d.deletedProfiles && typeof d.deletedProfiles === 'object') delete d.deletedProfiles[id];
    saveProfilesData(d); return true;
  } catch(_) { return false; }
}

export function restoreActiveProfile() {
  try { const comp = getDrawerComponent(); if (!comp) return false; const d = loadProfilesData(); const id = d.activeId || 'default'; const st = d.profiles?.[id]?.state; if (!st) return false; comp.setState?.(st); return true; } catch(_) { return false; }
}

// Per-profile preferences
export function getProfilePrefs() {
  try { const d = loadProfilesData(); const id = d.activeId || 'default'; const p = d.profiles?.[id] || {}; return p.prefs || {}; } catch(_) { return {}; }
}
export function setProfilePrefs(next) {
  try { const d = loadProfilesData(); const id = d.activeId || 'default'; d.profiles = d.profiles || {}; d.profiles[id] = d.profiles[id] || { name: id, state: null, updatedAt: Date.now() }; d.profiles[id].prefs = { ...(d.profiles[id].prefs||{}), ...(next||{}) }; d.profiles[id].updatedAt = Date.now(); d.updatedAt = Date.now(); saveProfilesData(d); return true; } catch(_) { return false; }
}

// Expose preference helpers for lazy access in components
try { Object.assign(window.__DCA_PREFS__ = (window.__DCA_PREFS__||{}), { }); } catch(_) {}

export function createProfile(name) {
  const d = loadProfilesData(); d.profiles = d.profiles || {};
  const base = (name || 'Profile').toString().trim() || 'Profile';
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'profile';
  let id = slug; let i = 2; while (d.profiles[id]) { id = `${slug}-${i++}`; }
  d.profiles[id] = { name: base, state: null, updatedAt: Date.now(), prefs: {} }; d.activeId = id; d.updatedAt = Date.now();
  if (d.deletedProfiles && typeof d.deletedProfiles === 'object') delete d.deletedProfiles[id];
  saveProfilesData(d); return id;
}

export function populateProfilesSelect(headerEl) {
  try {
    const sel = headerEl?.querySelector?.('.profile-select'); if (!sel) return;
    let d = loadProfilesData(); let active = d.activeId || 'default'; let profiles = d.profiles || {};
    let entries = Object.entries(profiles);
    if (entries.length === 0) {
      try { ensureProfilesInitialized(); } catch(_) {}
      d = loadProfilesData(); active = d.activeId || 'default'; profiles = d.profiles || {}; entries = Object.entries(profiles);
      if (entries.length === 0) { profiles = { default: { name: 'Default', state: null, updatedAt: Date.now() } }; active = 'default'; entries = Object.entries(profiles); }
    }
    sel.innerHTML = '';
    for (const [id, info] of entries) { const opt = document.createElement('option'); opt.value = id; opt.textContent = info?.name || id; if (id === active) opt.selected = true; sel.appendChild(opt); }
  } catch(_) {}
}

export function updateStatusPill(headerEl) {
  try {
    const pill = headerEl?.querySelector?.('.status-pill'); if (!pill) return;
    const d = loadProfilesData(); const id = d.activeId || 'default'; const saved = d.profiles?.[id]?.state;
    const comp = getDrawerComponent(); const cur = comp?.getState?.();
    const same = saved && cur ? JSON.stringify(saved) === JSON.stringify(cur) : !!saved === !!cur;
    pill.textContent = same ? 'Saved' : 'Dirty'; pill.classList.toggle('saved', same); pill.classList.toggle('dirty', !same);
  } catch(_) {}
}

export function exportProfilesToFile() {
  try {
    const data = loadProfilesData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'drawer-profiles.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch(_) { try { const { toast } = require('./toast'); toast?.('Export failed', { type: 'error' }); } catch(__) {} }
}

export function openImportDialog(headerEl) {
  try {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
    inp.addEventListener('change', async () => {
      const file = inp.files?.[0]; if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') throw new Error('Bad file');
        saveProfilesData(parsed);
        populateProfilesSelect(headerEl);
        updateStatusPill(headerEl);
        try { const { toast } = await import('./toast.js'); toast?.('Imported profiles', { type: 'success' }); } catch (_) {}
  } catch(_e) { try { const { toast } = await import('./toast.js'); toast?.('Import failed', { type: 'error' }); } catch(__) {} }
    });
    inp.click();
  } catch(_) { /* ignore */ }
}

// Days state
export function loadDaysData() { try { const raw = localStorage.getItem(DRAWER_DAYS_KEY); if (!raw) return {}; const parsed = JSON.parse(raw); return (parsed && typeof parsed === 'object') ? parsed : {}; } catch(_) { return {}; } }
export function saveDaysData(data) {
  try {
    if (data && typeof data === 'object' && data.__deletedProfiles && typeof data.__deletedProfiles === 'object') {
      const deletions = data.__deletedProfiles;
      for (const [id, stamp] of Object.entries({ ...deletions })) {
        const ts = Number(stamp) || 0;
        if (!(ts > 0) || id === 'default') delete deletions[id];
      }
      for (const key of Object.keys(data)) {
        if (key === '__deletedProfiles') continue;
        if (deletions[key]) delete deletions[key];
      }
      if (Object.keys(deletions).length === 0) delete data.__deletedProfiles;
    }
    localStorage.setItem(DRAWER_DAYS_KEY, JSON.stringify(data || {}));
    try { _setLocalMeta(DRAWER_DAYS_KEY, { updatedAt: Date.now() }); _scheduleSyncPush(DRAWER_DAYS_KEY); } catch(_) {}
    return true;
  } catch(_) { return false; }
}
export function _saveDaysDataAndSync(data) { try { saveDaysData(data); } catch(_) {} }

export function getTodayKey() { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }

export function _getActiveDaysEntry(createIfMissing = true) {
  const data = loadDaysData(); const pid = getActiveProfileId();
  let entry = data[pid];
  if (!entry && createIfMissing) { entry = { lastVisitedDate: null, _activeViewDateKey: getTodayKey(), _editUnlocked: false, days: {} }; data[pid] = entry; saveDaysData(data); }
  return { data, pid, entry };
}

export function listSavedDaysForActiveProfile() {
  try {
    const { entry } = _getActiveDaysEntry(false);
    const days = entry?.days || {};
    return Object.keys(days).map((date) => ({ date, savedAt: Number(days[date]?.savedAt || 0) })).sort((a,b)=> (b.savedAt - a.savedAt));
  } catch(_) { return []; }
}

export function saveSpecificDay(key) { return saveDay(key); }

export function saveDay(key) {
  try {
    const { data, pid, entry } = _getActiveDaysEntry(true);
    const comp = getDrawerComponent(); const state = comp?.getState?.(); if (!state) return false;
    entry.days = entry.days || {}; entry.days[key] = { state, savedAt: Date.now(), label: entry.days[key]?.label };
    entry.lastVisitedDate = key; data[pid] = entry; saveDaysData(data); return true;
  } catch(_) { return false; }
}

export function deleteProfileDays(profileId, timestamp = Date.now()) {
  try {
    if (!profileId || profileId === 'default') return;
    const data = loadDaysData();
    let changed = false;
    if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, profileId)) {
      delete data[profileId];
      changed = true;
    }
    data.__deletedProfiles = data.__deletedProfiles && typeof data.__deletedProfiles === 'object' ? data.__deletedProfiles : {};
    const ts = Number(timestamp) || Date.now();
    data.__deletedProfiles[profileId] = ts;
    if (changed || ts) saveDaysData(data);
  } catch(_) {}
}

export function restoreDay(key) { try { const { data, pid, entry } = _getActiveDaysEntry(false); const st = entry?.days?.[key]?.state; if (!st) return false; const comp = getDrawerComponent(); comp?.setState?.(st); entry.lastVisitedDate = key; data[pid] = entry; saveDaysData(data); return true; } catch(_) { return false; } }
export function deleteDay(key) { try { const { data, pid, entry } = _getActiveDaysEntry(false); if (!entry?.days?.[key]) return false; delete entry.days[key]; data[pid] = entry; saveDaysData(data); return true; } catch(_) { return false; } }
export function setDayLabel(key, label) { try { const { data, pid, entry } = _getActiveDaysEntry(true); entry.days = entry.days || {}; if (!entry.days[key]) return false; entry.days[key].label = label || ''; data[pid] = entry; saveDaysData(data); return true; } catch(_) { return false; } }

export function getActiveViewDateKey() { try { const { entry } = _getActiveDaysEntry(false); return entry?._activeViewDateKey || getTodayKey(); } catch(_) { return getTodayKey(); } }
export function setActiveViewDateKey(key) { try { const { data, pid, entry } = _getActiveDaysEntry(true); entry._activeViewDateKey = key || getTodayKey(); data[pid] = entry; saveDaysData(data); } catch(_) {} }
export function isDayEditUnlocked() { 
  try { 
    const { entry } = _getActiveDaysEntry(false); 
    return !!entry?._editUnlocked;
  } catch(_) { 
    return false; 
  } 
}
export function setDayEditUnlocked(flag) { 
  try { 
    const { data, pid, entry } = _getActiveDaysEntry(true); 
    entry._editUnlocked = !!flag; 
    data[pid] = entry; 
    saveDaysData(data); 
  } catch(_) {} 
}
export function applyReadOnlyByActiveDate(headerEl) { try { const comp = getDrawerComponent(); if (!comp) return; const key = getActiveViewDateKey(); const today = getTodayKey(); const readOnly = key !== today && !isDayEditUnlocked(); comp.setReadOnly?.(readOnly); updateLockButtonUI(headerEl); } catch(_) {} }
export function updateLockButtonUI(scopeEl) { 
  try { 
    const key = getActiveViewDateKey(); 
    const today = getTodayKey(); 
    const isToday = key === today; 
    const unlocked = isDayEditUnlocked(); 
    const title = isToday ? 'Today is always editable' : (unlocked ? 'Editing unlocked (tap to lock)' : 'Editing locked (tap to unlock)'); 
    const expectedIcon = isToday ? '🔓' : (unlocked ? '🔓' : '🔒');
    
    const nodes = new Set(); 
    const addAll = (nodeList) => { nodeList && nodeList.forEach?.((n)=>nodes.add(n)); }; 
    if (scopeEl) addAll(scopeEl.querySelectorAll?.('.lock-btn') || []); 
    addAll(document.querySelectorAll('count-panel .lock-btn')); 
    addAll(document.querySelectorAll('app-header .lock-btn')); 
    
    nodes.forEach((b) => { 
      try { 
        b.title = title; 
        b.setAttribute('aria-label', title); 
        b.textContent = expectedIcon; 
      } catch(_) {} 
    }); 
  } catch(_) {} 
}
export function ensureDayResetIfNeeded(_headerEl) { /* no-op */ }

// Expose for other modules that expect these names on window (optional)
try { Object.assign(window, { getTodayKey, getActiveViewDateKey }); } catch(_) {}
