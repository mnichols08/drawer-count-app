// Networking and online sync helpers
import { DRAWER_PROFILES_KEY, DRAWER_DAYS_KEY } from './persistence.js';

export function getApiBase() {
  try {
    const winBase = (typeof window !== 'undefined' && window.DCA_API_BASE) ? String(window.DCA_API_BASE) : '';
    const lsBase = (typeof localStorage !== 'undefined') ? (localStorage.getItem('dca.apiBase') || '') : '';
    const isLocal = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
    const defaultBase = isLocal ? '/api' : 'https://drawer-count-app.onrender.com/api';
    const base = (winBase || lsBase || defaultBase).trim();
    return base || defaultBase;
  } catch (_) { return '/api'; }
}

export function apiUrl(path) {
  const resolved = (typeof window !== 'undefined' && window.DCA_API_BASE_RESOLVED) ? String(window.DCA_API_BASE_RESOLVED) : '';
  const b = (resolved || getApiBase()).replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

export function _apiCandidatesFor(path) {
  try {
    const candidates = [];
    const primaryFull = apiUrl(path);
    candidates.push(primaryFull);
    try {
      const base = (typeof window !== 'undefined' && window.DCA_API_BASE_RESOLVED) ? String(window.DCA_API_BASE_RESOLVED) : getApiBase();
      if (/^https?:\/\//i.test(base) && /\.onrender\.(app|com)/i.test(base)) {
        const alt = base.includes('.onrender.app')
          ? base.replace('.onrender.app', '.onrender.com')
          : base.replace('.onrender.com', '.onrender.app');
        const altFull = `${alt.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        if (altFull !== primaryFull) candidates.push(altFull);
      }
    } catch(_) {}
    try {
      const base = getApiBase();
      const isLocalBase = !/^https?:\/\//i.test(base);
      if (isLocalBase) {
        const prod = 'https://drawer-count-app.onrender.com/api';
        const prodFull = `${prod.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        if (!candidates.includes(prodFull)) candidates.push(prodFull);
        const prodAlt = prod.includes('.onrender.app') ? prod.replace('.onrender.app', '.onrender.com') : prod.replace('.onrender.com', '.onrender.app');
        const prodAltFull = `${prodAlt.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
        if (!candidates.includes(prodAltFull)) candidates.push(prodAltFull);
      }
    } catch(_) {}
    return candidates;
  } catch (_) { return [apiUrl(path)]; }
}

export async function fetchServerHealth() {
  try {
    const primary = getApiBase();
    const primaryUrl = apiUrl('/health');
    const candidates = [primary];
    try {
      if (/^https?:\/\//i.test(primary) && /\.onrender\.(app|com)/i.test(primary)) {
        const alt = primary.includes('.onrender.app')
          ? primary.replace('.onrender.app', '.onrender.com')
          : primary.replace('.onrender.com', '.onrender.app');
        if (alt !== primary) candidates.push(alt);
      }
    } catch(_) {}
    let lastErr = null;
    try {
      const res = await fetch(primaryUrl, { cache: 'no-store' });
      if (res.ok) { const data = await res.json(); return data; }
    } catch (e) { lastErr = e; }
    for (const base of candidates) {
      try {
        const url = `${base.replace(/\/+$/, '')}/health`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const data = await res.json();
        if (typeof window !== 'undefined' && base !== primary) {
          try { window.DCA_API_BASE_RESOLVED = base; } catch(_) {}
        }
        return data;
      } catch (e) { lastErr = e; }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(err) { return { ok: false }; }
}

const META_SUFFIX = '__meta';
export function _getLocalMeta(key) { try { const raw = localStorage.getItem(key + META_SUFFIX); return raw ? JSON.parse(raw) : null; } catch(_) { return null; } }
export function _setLocalMeta(key, meta) { try { localStorage.setItem(key + META_SUFFIX, JSON.stringify(meta || {})); } catch(_) {} }

export async function _fetchRemoteKV(key) {
  try {
    const path = `/kv/${encodeURIComponent(key)}`;
    const urls = _apiCandidatesFor(path);
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.status === 404) return { ok: true, missing: true };
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const data = await res.json();
        return { ok: true, value: data.value, updatedAt: Number(data.updatedAt || 0) };
      } catch (e) { lastErr = e; }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(_) { return { ok: false }; }
}

export async function _listRemoteKV() {
  try {
    const path = `/kv`;
    const urls = _apiCandidatesFor(path);
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        return { ok: true, items };
      } catch (e) { lastErr = e; }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(_) { return { ok: false }; }
}

export async function _pushRemoteKV(key, rawValue, updatedAt) {
  try {
    const path = `/kv/${encodeURIComponent(key)}`;
    const urls = _apiCandidatesFor(path);
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: rawValue, updatedAt: Number(updatedAt) || Date.now() }) });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const data = await res.json();
        return { ok: true, updatedAt: Number(data.updatedAt || Date.now()) };
      } catch (e) { lastErr = e; }
    }
    return { ok: false, error: lastErr ? String(lastErr) : 'unknown' };
  } catch(_) { return { ok: false }; }
}

export async function _syncKeyOnce(key) {
  try {
    const localRaw = localStorage.getItem(key);
    const localMeta = _getLocalMeta(key) || { updatedAt: 0 };
    const remote = await _fetchRemoteKV(key);
    if (!remote.ok) return false;
    if (remote.missing) {
      if (localRaw != null) {
        const push = await _pushRemoteKV(key, localRaw, localMeta.updatedAt || Date.now());
        if (push.ok) _setLocalMeta(key, { updatedAt: push.updatedAt });
      }
      return true;
    }
    const rAt = Number(remote.updatedAt || 0);
    const lAt = Number(localMeta.updatedAt || 0);
    if (localRaw == null) {
      localStorage.setItem(key, remote.value);
      _setLocalMeta(key, { updatedAt: rAt });
      return true;
    }
    if (rAt > lAt) {
      localStorage.setItem(key, remote.value);
      _setLocalMeta(key, { updatedAt: rAt });
    } else if (lAt > rAt) {
      const push = await _pushRemoteKV(key, localRaw, lAt);
      if (push.ok) _setLocalMeta(key, { updatedAt: push.updatedAt });
    }
    return true;
  } catch(_) { return false; }
}

export async function _syncAllKeys() {
  for (const k of [DRAWER_PROFILES_KEY, DRAWER_DAYS_KEY]) { try { await _syncKeyOnce(k); } catch(_) {} }
}

export function _scheduleSyncPush(key) {
  try {
    const delay = 500;
    if (!window.__dcaDebouncedPushers) window.__dcaDebouncedPushers = {};
    const map = window.__dcaDebouncedPushers;
    if (map[key]) clearTimeout(map[key]);
    map[key] = setTimeout(() => { try { _syncKeyOnce(key); } catch(_) {} }, delay);
  } catch(_) {}
}

export function initOnlineSync() {
  try {
    for (const k of [DRAWER_PROFILES_KEY, DRAWER_DAYS_KEY]) { if (!_getLocalMeta(k)) _setLocalMeta(k, { updatedAt: 0 }); }
    _syncAllKeys();
    window.addEventListener('online', () => { _syncAllKeys(); });
  } catch(_) { /* ignore */ }
}

export async function initProfilesFromRemoteIfAvailable() {
  try {
    const candidateKeys = [ DRAWER_PROFILES_KEY, 'drawer-profiles', 'drawer_profiles', 'profiles', 'drawer-profiles-v0' ];
    let remote = await _fetchRemoteKV(DRAWER_PROFILES_KEY);
    if (!remote.ok || remote.missing) {
      for (const altKey of candidateKeys) {
        if (altKey === DRAWER_PROFILES_KEY) continue;
        try {
          const res = await _fetchRemoteKV(altKey);
          if (res.ok && !res.missing && res.value) { localStorage.setItem(DRAWER_PROFILES_KEY, res.value); _setLocalMeta(DRAWER_PROFILES_KEY, { updatedAt: Number(res.updatedAt || Date.now()) }); break; }
        } catch(_) {}
      }
    } else if (remote.ok && !remote.missing && remote.value) {
      localStorage.setItem(DRAWER_PROFILES_KEY, remote.value);
      _setLocalMeta(DRAWER_PROFILES_KEY, { updatedAt: Number(remote.updatedAt || Date.now()) });
    }
  } catch(_) { /* ignore */ }
}

// Expose minimal API on window for legacy code paths
try { Object.assign(window, { getApiBase, apiUrl }); } catch(_) {}
