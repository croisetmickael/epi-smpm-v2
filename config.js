/* ============================================================
   CONFIGURATION
   /api/proxy = fonction Vercel qui relaie vers Apps Script
   (l'URL Apps Script est dans api/proxy.js) — aucun souci CORS,
   et rien à configurer pour les utilisateurs.
============================================================ */
window.SMPM_CONFIG = {
  API_URL: "/api/proxy"
};
