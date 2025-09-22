// Lightweight Service Worker registration, scoped to this app folder.
// Works when the app is served from a subpath (e.g., /drawer-count-app/).
(function registerSW() {
  try {
    if (!('serviceWorker' in navigator)) return;
    // Resolve ../sw.js relative to this module file (src/ -> ../sw.js)
    const swUrl = new URL('../sw.js', import.meta.url);
    navigator.serviceWorker.register(swUrl).then((reg) => {
      try { console.info('[sw] registered with scope', reg.scope); } catch (_) {}
      // Optionally, listen for updates and notify the user (no hard reload here)
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            try { console.info('[sw] update installed'); } catch (_) {}
          }
        });
      });
    }).catch((err) => {
      try { console.warn('[sw] registration failed', err); } catch (_) {}
    });
  } catch (_) { /* ignore */ }
})();
