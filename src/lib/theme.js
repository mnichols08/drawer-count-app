// Theme utilities shared by components (now per-profile)
export const THEME_KEY = 'theme'; // legacy global key; kept for one-time migration
import { loadProfilesData, saveProfilesData, getActiveProfileId } from './persistence.js';

// Read the active profile's theme mode: 'system' | 'light' | 'dark'
export function getProfileThemeMode() {
  try {
    const data = loadProfilesData();
    const id = data.activeId || 'default';
    const mode = data?.profiles?.[id]?.theme;
    return (mode === 'light' || mode === 'dark' || mode === 'system') ? mode : 'system';
  } catch (_) { return 'system'; }
}

// Persist the active profile's theme mode
export function setProfileThemeMode(mode) {
  try {
    const data = loadProfilesData();
    const id = data.activeId || 'default';
    data.profiles = data.profiles || {};
    data.profiles[id] = data.profiles[id] || { name: id, state: null };
    const m = (mode === 'light' || mode === 'dark') ? mode : 'system';
    data.profiles[id].theme = m;
    data.profiles[id].updatedAt = Date.now();
    data.updatedAt = Date.now();
    saveProfilesData(data);
    return true;
  } catch (_) { return false; }
}

// Effective theme considering profile mode and system prefs
export function getPreferredTheme() {
  try {
    const mode = getProfileThemeMode();
    if (mode === 'light' || mode === 'dark') return mode;
  } catch (_) {}
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}

// Apply a theme (accepts 'light' | 'dark' | 'system'); if persist, store mode on profile
export function applyTheme(theme, persist = true) {
  const mode = (theme === 'light' || theme === 'dark') ? theme : 'system';
  const effective = mode === 'system' ? getPreferredTheme() : mode;
  const t = effective === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  if (persist) { try { setProfileThemeMode(mode); } catch (_) {} }
  try {
    document.querySelectorAll('app-header .theme-toggle')
      .forEach((btn) => { btn.textContent = t === 'dark' ? '🌙' : '☀️'; });
  } catch (_) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0b132b' : '#f7f9ff');
  try { updateBodyBackground(t); } catch (_) {}
}

export function toggleTheme() {
  try {
    const mode = getProfileThemeMode();
    const currentEffective = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    const next = (mode === 'system')
      ? (currentEffective === 'dark' ? 'light' : 'dark')
      : (mode === 'dark' ? 'light' : 'dark');
    setProfileThemeMode(next);
    applyTheme(next, false); // don't double-persist
  } catch (_) {
    const cur = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }
}

// Background image helpers (kept here so header/components can reference)
const BG_IMAGES = [
  '1g-eclipse-bg',
  'crownvic-bg',
  'eclipse-challenge-bg',
  'vw-bg',
];
const BG_IMAGE_BASE = './src/images/';
let CURRENT_BG_URL = null;
let SUPPORTS_WEBP = null;
let BG_LAYER_EL = null;

function detectWebpSupport() {
  if (SUPPORTS_WEBP !== null) return SUPPORTS_WEBP;
  try {
    const c = document.createElement('canvas');
    if (!!(c.getContext && c.getContext('2d'))) {
      SUPPORTS_WEBP = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } else {
      SUPPORTS_WEBP = false;
    }
  } catch (_) { SUPPORTS_WEBP = false; }
  return SUPPORTS_WEBP;
}

function pickRandomBackgroundUrl() {
  try {
    const list = Array.isArray(BG_IMAGES) && BG_IMAGES.length ? BG_IMAGES : ['1g-eclipse-bg.png'];
    const idx = Math.floor(Math.random() * list.length);
    const base = list[idx] || list[0];
    const useWebp = detectWebpSupport();
    return `${BG_IMAGE_BASE}${base}${useWebp ? '.webp' : '.png'}`;
  } catch (_) {
    const useWebp = detectWebpSupport();
    return `${BG_IMAGE_BASE}1g-eclipse-bg${useWebp ? '.webp' : '.png'}`;
  }
}

export function updateBodyBackground(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  if (!CURRENT_BG_URL) CURRENT_BG_URL = pickRandomBackgroundUrl();
  const overlay = t === 'light'
    ? 'linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7))'
    : 'linear-gradient(rgba(7, 10, 26, 0.50), rgba(7, 10, 26, 0.50))';
  if (!BG_LAYER_EL) {
    BG_LAYER_EL = document.getElementById('bg-layer');
    if (!BG_LAYER_EL) {
      BG_LAYER_EL = document.createElement('div');
      BG_LAYER_EL.id = 'bg-layer';
      document.body.prepend(BG_LAYER_EL);
    }
  }
  const img = new Image();
  img.onload = () => {
    BG_LAYER_EL.style.backgroundImage = `url("${CURRENT_BG_URL}")`;
    requestAnimationFrame(() => BG_LAYER_EL.classList.add('show'));
  };
  img.onerror = () => {
    BG_LAYER_EL.style.backgroundImage = `url("${CURRENT_BG_URL}")`;
    BG_LAYER_EL.classList.add('show');
  };
  BG_LAYER_EL.classList.remove('show');
  img.src = CURRENT_BG_URL;
  document.body.style.backgroundImage = `${overlay}`;
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundPosition = 'left 5vh';
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundAttachment = 'fixed';
}

// One-time migration: move legacy global theme to active profile, then remove key
(function migrateLegacyThemeOnce(){
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      // Only set if profile hasn't chosen yet
      if (getProfileThemeMode() === 'system') setProfileThemeMode(stored);
      localStorage.removeItem(THEME_KEY);
    }
  } catch(_) {}
})();

// Initialize theme from active profile without persisting (so System respects OS)
applyTheme('system', false);
