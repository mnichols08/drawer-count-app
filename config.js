// Static runtime config for Drawer Count App
// This file is loaded before the app and sets the API base URL the frontend should use.
//
// Behavior:
// - When served from localhost, default to same-origin '/api' to avoid CORS during local development.
// - When served from a non-localhost host, default to the public Render URL.
//
// You can customize this by editing the string below to point at your own backend service.
// Example:
//   window.DCA_API_BASE = 'https://your-service.onrender.com/api';

(function () {
  try {
    var host = String(location.hostname || '').toLowerCase();
    var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    var base = isLocal ? '/api' : 'https://drawer-count-app.onrender.com/api';
    window.DCA_API_BASE = base;
  } catch (_) {
    // Safe fallback if something goes wrong
    window.DCA_API_BASE = '/api';
  }
})();
