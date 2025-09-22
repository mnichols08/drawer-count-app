// Theme utilities shared by components
export const THEME_KEY = 'theme';

export function getPreferredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) {}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme, persist = true) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  if (persist) { try { localStorage.setItem(THEME_KEY, t); } catch (_) {} }
  try {
    document.querySelectorAll('app-header .theme-toggle')
      .forEach((btn) => { btn.textContent = t === 'dark' ? '🌙' : '☀️'; });
  } catch (_) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0b132b' : '#f7f9ff');
  try { updateBodyBackground(t); } catch (_) {}
}

export function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
  applyTheme(cur === 'dark' ? 'light' : 'dark');
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

// Initialize theme without persisting so system mode works until user toggles
applyTheme(getPreferredTheme(), false);
