// Static runtime config for Drawer Count App
// This file is loaded before the app and sets the API base URL the frontend should use.
//
// Netlify routes this same-origin path to the serverless sync function.
// Keeping the browser on the same origin avoids CORS and keeps Supabase secrets
// out of shipped client code.

(function () {
  window.DCA_API_BASE = '/api';
})();
