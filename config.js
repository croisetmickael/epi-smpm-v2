/* ============================================================
   CONFIGURATION
   /api/proxy = fonction Vercel qui relaie vers Apps Script
   (l'URL Apps Script est dans api/proxy.js) — aucun souci CORS,
   et rien à configurer pour les utilisateurs.
   
   ⚠️ PRE-CONFIGURÉ : URL Apps Script définie dans api/proxy.js
   Aucune saisie utilisateur requise.
============================================================ */
window.SMPM_CONFIG = {
  API_URL: "/api/proxy",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyqAtLmrKJPvJrhaXmp-uTrfsG_9_uKsMUvKNQ57vx66YWm610YLT3Jhi8P8BX2PVXW/exec",
  CONFIGURED: true  // Flag pour éviter le formulaire de setup
};
