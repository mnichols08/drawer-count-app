// Networking and online sync helpers
import { DRAWER_PROFILES_KEY, DRAWER_DAYS_KEY } from './persistence.js';
import { canApplyRemoteSync, hasMeaningfulLocalSyncData, migrateLegacySyncMeta } from './sync-meta.mjs';

export const SYNC_STATUS_EVENT = 'dca-sync-status';

function announceSyncStatus(key, status, error = '', meta = {}) {
  try {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, {
      detail: { key, status, error, at: Date.now(), ...meta }
    }));
  } catch(_) {}
}

function acknowledgeLocalPush(key, snapshot, remoteUpdatedAt) {
  const current = _getLocalMeta(key) || { updatedAt: 0, dirty: false, revision: 0 };
  if (current.revision !== snapshot.revision || current.updatedAt !== snapshot.updatedAt) return false;
  _setLocalMeta(key, { ...current, updatedAt: remoteUpdatedAt, dirty: false });
  return true;
}

function applyRemoteIfLocalUnchanged(key, snapshot, value, remoteUpdatedAt) {
  const current = _getLocalMeta(key) || { updatedAt: 0, dirty: false, revision: 0 };
  if (current.revision !== snapshot.revision || current.updatedAt !== snapshot.updatedAt) return false;
  localStorage.setItem(key, value);
  _setLocalMeta(key, { ...current, updatedAt: remoteUpdatedAt, dirty: false });
  return true;
}

export function getApiBase() {
  try {
    const winBase = (typeof window !== 'undefined' && window.DCA_API_BASE) ? String(window.DCA_API_BASE) : '';
    const defaultBase = '/api';
    const base = (winBase || defaultBase).trim();
    return base || defaultBase;
  } catch (_) { return '/api'; }
}

export function apiUrl(path) {
  const b = getApiBase().replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

export async function fetchServerHealth() {
  try {
    const res = await fetch(apiUrl('/health'), { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch(_err) { return { ok: false }; }
}

const META_SUFFIX = '__meta';
export function _getLocalMeta(key) { try { const raw = localStorage.getItem(key + META_SUFFIX); return raw ? JSON.parse(raw) : null; } catch(_) { return null; } }
export function _setLocalMeta(key, meta) { try { localStorage.setItem(key + META_SUFFIX, JSON.stringify(meta || {})); } catch(_) {} }

export async function _fetchRemoteKV(key) {
  try {
    const res = await fetch(apiUrl(`/kv/${encodeURIComponent(key)}`), { cache: 'no-store' });
    if (res.status === 404) return { ok: true, missing: true };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, value: data.value, updatedAt: Number(data.updatedAt || 0) };
  } catch(error) { return { ok: false, error: String(error) }; }
}

export async function _listRemoteKV() {
  try {
    const res = await fetch(apiUrl('/kv'), { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return { ok: true, items };
  } catch(error) { return { ok: false, error: String(error) }; }
}

export async function _pushRemoteKV(key, rawValue, updatedAt) {
  try {
    const res = await fetch(apiUrl(`/kv/${encodeURIComponent(key)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: rawValue, updatedAt: Number(updatedAt) || Date.now() })
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, updatedAt: Number(data.updatedAt || Date.now()) };
  } catch(error) { return { ok: false, error: String(error) }; }
}

export async function _syncKeyOnce(key) {
  try {
    const localRaw = localStorage.getItem(key);
    const localMeta = _getLocalMeta(key) || { updatedAt: 0, dirty: false, revision: 0 };
    const localStatus = { localUpdatedAt: Number(localMeta.updatedAt || 0), revision: Number(localMeta.revision || 0) };
    announceSyncStatus(key, 'syncing', '', localStatus);
    const remote = await _fetchRemoteKV(key);
    if (!remote.ok) {
      announceSyncStatus(key, 'error', remote.error || 'Sync unavailable', localStatus);
      return false;
    }
    if (remote.missing) {
      let currentSnapshot = true;
      if (localRaw != null) {
        const push = await _pushRemoteKV(key, localRaw, localMeta.updatedAt || Date.now());
        if (!push.ok) {
          announceSyncStatus(key, 'error', push.error || 'Sync unavailable', localStatus);
          return false;
        }
        currentSnapshot = acknowledgeLocalPush(key, localMeta, push.updatedAt);
      }
      announceSyncStatus(key, currentSnapshot ? 'synced' : 'stale', '', localStatus);
      return true;
    }
    const rAt = Number(remote.updatedAt || 0);
    const lAt = Number(localMeta.updatedAt || 0);
    if (localRaw == null) {
      const currentSnapshot = applyRemoteIfLocalUnchanged(key, localMeta, remote.value, rAt);
      announceSyncStatus(key, currentSnapshot ? 'synced' : 'stale', '', localStatus);
      return true;
    }
    let currentSnapshot = true;
    if (canApplyRemoteSync(localMeta, rAt)) {
      currentSnapshot = applyRemoteIfLocalUnchanged(key, localMeta, remote.value, rAt);
    } else if (localMeta.dirty || lAt > rAt) {
      const push = await _pushRemoteKV(key, localRaw, lAt);
      if (!push.ok) {
        announceSyncStatus(key, 'error', push.error || 'Sync unavailable', localStatus);
        return false;
      }
      currentSnapshot = acknowledgeLocalPush(key, localMeta, push.updatedAt);
    }
    announceSyncStatus(key, currentSnapshot ? 'synced' : 'stale', '', localStatus);
    return true;
  } catch(error) {
    announceSyncStatus(key, 'error', String(error));
    return false;
  }
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

export function markLocalChange(key) {
  const previous = _getLocalMeta(key) || {};
  const updatedAt = Math.max(Date.now(), Number(previous.updatedAt || 0) + 1);
  const revision = Number(previous.revision || 0) + 1;
  _setLocalMeta(key, { ...previous, updatedAt, dirty: true, revision });
  announceSyncStatus(key, 'queued', '', { localUpdatedAt: updatedAt, revision });
  _scheduleSyncPush(key);
}

function initializeSyncMeta(key) {
  const previous = _getLocalMeta(key);
  const localRaw = localStorage.getItem(key);
  const kind = key === DRAWER_PROFILES_KEY ? 'profiles' : 'days';
  const hasLocalData = hasMeaningfulLocalSyncData(kind, localRaw);
  const next = migrateLegacySyncMeta(previous, { hasLocalData });
  if (next !== previous) _setLocalMeta(key, next);
}

export function initOnlineSync() {
  try {
    for (const k of [DRAWER_PROFILES_KEY, DRAWER_DAYS_KEY]) initializeSyncMeta(k);
    _syncAllKeys();
    window.addEventListener('online', () => { _syncAllKeys(); });
  } catch(_) { /* ignore */ }
}

export async function initProfilesFromRemoteIfAvailable() {
  // Bootstrap local profiles from remote only when local is empty, or when the
  // remote copy is newer than the local copy. Avoid clobbering a user's local
  // active profile on every refresh.
  try {
    // Determine if we already have local data with profiles
    const localRaw = localStorage.getItem(DRAWER_PROFILES_KEY);
    let hasLocalProfiles = false;
    try {
      const parsed = localRaw ? JSON.parse(localRaw) : null;
      hasLocalProfiles = !!(parsed && typeof parsed === 'object' && parsed.profiles && Object.keys(parsed.profiles).length > 0);
    } catch(_) { hasLocalProfiles = false; }
    const localMeta = _getLocalMeta(DRAWER_PROFILES_KEY) || { updatedAt: 0, dirty: false, revision: 0 };

    // Try primary key first
    const candidateKeys = [ DRAWER_PROFILES_KEY, 'drawer-profiles', 'drawer_profiles', 'profiles', 'drawer-profiles-v0' ];
    let best = await _fetchRemoteKV(DRAWER_PROFILES_KEY);

    // If primary missing/unavailable, try alternates to locate any legacy value
    if (!best.ok || best.missing || !best.value) {
      for (const altKey of candidateKeys) {
        if (altKey === DRAWER_PROFILES_KEY) continue;
        try {
          const res = await _fetchRemoteKV(altKey);
          if (res.ok && !res.missing && res.value) { best = res; break; }
        } catch(_) {}
      }
    }

    // Nothing remote found
    if (!best || !best.ok || best.missing || !best.value) return;

    const rAt = Number(best.updatedAt || 0);

    // If we have no local profiles, seed from remote
    if (!hasLocalProfiles) {
      if (canApplyRemoteSync(localMeta, rAt, { requireNewer: false })) {
        applyRemoteIfLocalUnchanged(DRAWER_PROFILES_KEY, localMeta, best.value, rAt || Date.now());
      }
      return;
    }

    // If remote is newer than local, update; otherwise keep local
    if (canApplyRemoteSync(localMeta, rAt)) {
      applyRemoteIfLocalUnchanged(DRAWER_PROFILES_KEY, localMeta, best.value, rAt);
    }
  } catch(_) { /* ignore */ }
}

// Expose minimal API on window for legacy code paths
try { Object.assign(window, { getApiBase, apiUrl }); } catch(_) {}
