/**
 * EPI SMPM 80 — Backend Apps Script (V3 — fichier CORDES_INVENTAIRE_OPTIMISE)
 *
 * Ce script lit et écrit DIRECTEMENT dans vos 3 Google Sheets d'origine,
 * sans modifier leur structure, leurs feuilles ni leur mise en forme :
 *   1. EPI_SMPM_FUSION            (SYNTHESE, EPI PERSONNELS SMPM, REFORMES, fiches agents…)
 *   2. CORDES_INVENTAIRE_OPTIMISE  (TABLEAU DE BORD, RECAP, STATIQUES, DYNAMIQUES, CORDELETTES, REFORMES)
 *   3. INVENTAIRE_VIMP            (CAISSE N°1 … SAC ABORDAGE) — lecture seule
 *
 * INSTALLATION :
 * 1. Déposer les 3 fichiers .xlsx sur Google Drive, ouvrir chacun puis
 *    Fichier → Enregistrer au format Google Sheets (mise en forme conservée)
 * 2. Copier l'ID de chaque fichier (dans l'URL, entre /d/ et /edit) ci-dessous
 * 3. https://script.google.com → Nouveau projet → coller ce code → Enregistrer
 * 4. Déployer → Nouveau déploiement → Application Web
 *    (Exécuter en tant que : Moi · Accès : Tout le monde) → copier l'URL /exec
 */

var CONFIG = {
  EPI_ID:    '1lvtqz6-uIYRG2DVk9aJR0CyumAm8CDEnTxb5XRdhfr8',   // EPI_SMPM_FUSION
  CORDES_ID: '1E-O3Y7523lLCZEdovDALhHZ3A2bFLHzeFiLFgTu6ji8',   // CORDES_INVENTAIRE_OPTIMISE
  INV_ID:    '1IeZ4YeK2ltfzBy_Rbz2__hYGqT3sh0bW17s9dJ00-lo',   // INVENTAIRE_VIMP
  INV_CODE:  '1880'   // code requis pour modifier l'inventaire
};

var EPI_SHEET = 'EPI PERSONNELS SMPM';
var RECAP = 'RECAP';
// Correspondance libellés de la fiche agent (colonne B) ↔ colonnes du tableau EPI
var FICHE_MAP = [
  { label: 'BAUDRIER',     t: 'BAUDRIER Type', n: 'BAUDRIER Num', d: 'BAUDRIER Date' },
  { label: 'CASQUE',       t: 'CASQUE Type',   n: 'CASQUE Num',   d: 'CASQUE Date' },
  { label: 'LONGE',        t: 'LONGE Type',    n: 'LONGE Num',    d: 'LONGE Date' },
  { label: 'MOUSQ L 1',    t: 'MOUSQ Type',    n: 'MOUSQ Num1' },
  { label: 'MOUSQ L 2',    t: 'MOUSQ Type',    n: 'MOUSQ Num2' },
  { label: 'DESCEND AUTO', t: 'DESC Type',     n: 'DESC Num' },
  { label: 'POIGNEE ASC',  t: 'POIG Type',     n: 'POIG Num' },
  { label: 'COUTEAU',      n: 'Couteau' }
];

/* ================= LECTURE ================= */

function doGet(e) {
  var out = { ok: true, ts: new Date().toISOString(), warnings: [] };
  var parts = { epi: readEpi_, cordes: readCordes_, agents: readAgents_, inventaire: readInventaire_, reformes: readReformes_ };
  Object.keys(parts).forEach(function(k) {
    try { out[k] = parts[k](); }
    catch (err) {
      out[k] = { headers: [], rows: [] };
      out.warnings.push(k.toUpperCase() + ' : ' + String(err));
    }
  });
  if (out.warnings.length === 5) return json_({ ok: false, error: out.warnings.join(' — ') });
  return json_(out);
}

function ssEpi_()    { return SpreadsheetApp.openById(CONFIG.EPI_ID); }
function ssCordes_() { return SpreadsheetApp.openById(CONFIG.CORDES_ID); }
function ssInv_()    { return SpreadsheetApp.openById(CONFIG.INV_ID); }

// Retrouve une feuille même si son nom diffère légèrement
// (espaces, accents, majuscules). Sinon, erreur explicite listant les feuilles.
function norm_(s) {
  return String(s || '').toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}
function getSheetSmart_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  var target = norm_(name);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++)
    if (norm_(sheets[i].getName()) === target) return sheets[i];
  for (var j = 0; j < sheets.length; j++)
    if (norm_(sheets[j].getName()).indexOf(target) >= 0 || target.indexOf(norm_(sheets[j].getName())) >= 0)
      return sheets[j];
  throw new Error('Feuille "' + name + '" introuvable. Feuilles disponibles : ' +
    sheets.map(function(x){ return x.getName(); }).join(' | '));
}

function clean_(v) {
  var s = String(v == null ? '' : v).trim();
  if (/^\d{4}\.0$/.test(s)) s = s.slice(0, 4);
  return s;
}

function readEpi_() {
  var sh = getSheetSmart_(ssEpi_(), EPI_SHEET);
  var vals = sh.getDataRange().getDisplayValues();
  var headers = vals[0].map(clean_).slice(0, 19);
  var rows = [];
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i].map(clean_).slice(0, 19);
    if (!r[0]) continue;
    rows.push({ row: i + 1, values: r });
  }
  return { headers: headers, rows: rows };
}

// Feuille RECAP (en-têtes vers la ligne 3, données ensuite).
// Les en-têtes accentués d'origine restent intacts dans le Sheet ;
// on renvoie des clés normalisées pour l'application.
var CORDES_HEADERS = ['CATEGORIE','AFFECTATION','INDICATIF','LONGUEUR','MODELE','NUMERO REF','FABRICATION','M.E.S','FIN','STATUT','STOCKAGE'];

function recapHeaderRow_(sh) {
  var vals = sh.getRange(1, 1, Math.min(6, sh.getLastRow()), 1).getDisplayValues();
  for (var i = 0; i < vals.length; i++)
    if (clean_(vals[i][0]).indexOf('CAT') === 0) return i + 1;
  return 3;
}

function readCordes_() {
  var sh = getSheetSmart_(ssCordes_(), RECAP);
  var hr = recapHeaderRow_(sh);
  var vals = sh.getDataRange().getDisplayValues();
  var rows = [];
  for (var i = hr; i < vals.length; i++) {
    var r = vals[i].map(clean_).slice(0, 11);
    if (r.join('') === '') continue;
    rows.push({ row: i + 1, values: r });
  }
  return { headers: CORDES_HEADERS, rows: rows };
}

function readAgents_() {
  var ss = ssEpi_();
  var skip = { 'SYNTHESE': 1, 'REFORMES': 1 };
  skip[EPI_SHEET] = 1;
  var rows = [];
  ss.getSheets().forEach(function(sh) {
    var name = sh.getName();
    if (skip[name]) return;
    var last = sh.getLastRow() || 1;
    var vals = sh.getRange(1, 1, Math.min(12, last), 3).getDisplayValues();
    var info = { FONCTION:'', GRADE:'', CENTRE:'', EQUIPE:'', TEL:'', MAIL:'' }, np = '';
    vals.forEach(function(r) {
      var b = clean_(r[1]), c = clean_(r[2]);
      if (b.indexOf('FICHE EPI') === 0) np = b.replace(/FICHE EPI\s*[—-]\s*/, '');
      if (info.hasOwnProperty(b)) info[b] = c;
    });
    if (!np) return; // pas une fiche agent
    var parts = np.split(/\s+/);
    var nom = parts.shift() || name;
    rows.push({ row: 0, values: [nom, parts.join(' '), info.FONCTION, info.GRADE, info.CENTRE, info.EQUIPE, info.TEL, info.MAIL] });
  });
  return { headers: ['NOM','PRENOM','FONCTION','GRADE','CENTRE','EQUIPE','TEL','MAIL'], rows: rows };
}

function readInventaire_() {
  var ss = ssInv_();
  var rows = [];
  ss.getSheets().forEach(function(sh) {
    var name = sh.getName();
    if (name === 'INVENTAIRE COMPLET') return;
    var last = sh.getLastRow(); if (last < 1) return;
    var vals = sh.getRange(1, 1, last, 2).getDisplayValues();
    var started = false;
    vals.forEach(function(r, idx) {
      var a = clean_(r[0]), q = clean_(r[1]);
      if (a === 'ARTICLE') { started = true; return; }
      if (!started || !a) return;
      rows.push({ row: idx + 1, values: [name, a, q] });
    });
  });
  return { headers: ['EMPLACEMENT','ARTICLE','QUANTITE'], rows: rows };
}

function readReformes_() {
  var rows = [];
  // EPI : TYPE, NUM SERIE, SPECIALISTE, REFORME, CAUSE, OBS (en-têtes ligne 1)
  var shE = ssEpi_().getSheetByName('REFORMES');
  if (shE && shE.getLastRow() > 1) {
    var vE = shE.getDataRange().getDisplayValues();
    for (var i = 1; i < vE.length; i++) {
      var r = vE[i].map(clean_);
      if (r.join('') === '') continue;
      rows.push({ row: 0, values: ['EPI', r[0]||'', r[1]||'', r[2]||'', r[3]||'', r[4]||'', r[5]||''] });
    }
  }
  // CORDES : CATÉGORIE…COMMENTAIRE (titres lignes 1-2, en-têtes ligne 3)
  var shC = ssCordes_().getSheetByName('REFORMES');
  if (shC && shC.getLastRow() > 1) {
    var vC = shC.getDataRange().getDisplayValues();
    var hr = -1;
    for (var j = 0; j < Math.min(6, vC.length); j++)
      if (clean_(vC[j][0]).indexOf('CAT') === 0) { hr = j; break; }
    for (var k = (hr < 0 ? 1 : hr + 1); k < vC.length; k++) {
      var c = vC[k].map(clean_);
      if (c.join('') === '') continue;
      // FAMILLE, TYPE(modèle), NUM SERIE(indicatif), SPECIALISTE(affectation), REFORME(retrait/échéance), CAUSE, OBS
      rows.push({ row: 0, values: ['CORDE', c[4]||'', c[2]||c[5]||'', c[1]||'', c[8]||c[7]||'', '', c[9]||''] });
    }
  }
  return { headers: ['FAMILLE','TYPE','NUM SERIE','SPECIALISTE','REFORME','CAUSE','OBS'], rows: rows };
}

/* ================= ÉCRITURE ================= */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var q = JSON.parse(e.postData.contents);
    if      (q.action === 'updateEpi')     updateEpi_(q.row, q.values);
    else if (q.action === 'reformerEpi')   reformerEpi_(q.row, q.values, q.reforme);
    else if (q.action === 'updateCorde')   updateCorde_(q.row, q.values);
    else if (q.action === 'addCorde')      addCorde_(q.values);
    else if (q.action === 'reformerCorde') reformerCorde_(q.row, q.reforme);
    else if (q.action === 'updateAgent')   updateAgent_(q.nom, q.prenom, q.info);
    else if (q.action === 'updateInv')     updateInv_(q.code, q.emplacement, q.row, q.article, q.quantite);
    else if (q.action === 'addInv')        addInv_(q.code, q.emplacement, q.article, q.quantite);
    else throw new Error('Action inconnue : ' + q.action);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}

// Écrit la ligne du tableau général PUIS synchronise la fiche individuelle
// de l'agent (seules les valeurs changent, la mise en forme reste intacte).
function updateEpi_(row, values) {
  var sh = getSheetSmart_(ssEpi_(), EPI_SHEET);
  sh.getRange(row, 1, 1, values.length).setValues([values]);
  syncFiche_(values);
}

function reformerEpi_(row, values, reforme) {
  updateEpi_(row, values); // l'élément réformé est vidé de la fiche
  // reforme = [FAMILLE, TYPE, NUM SERIE, SPECIALISTE, ANNEE, CAUSE, OBS] → format d'origine sans FAMILLE
  ssEpi_().getSheetByName('REFORMES').appendRow(reforme.slice(1));
}

function syncFiche_(values) {
  var ss = ssEpi_();
  var headers = getSheetSmart_(ss, EPI_SHEET).getRange(1, 1, 1, 19).getDisplayValues()[0].map(clean_);
  var get = function(col) { var i = headers.indexOf(col); return i < 0 ? '' : clean_(values[i]); };
  var nom = get('NOM').toUpperCase(), prenom = get('PRENOM');
  if (!nom) return;
  var initials = prenom.split(/[\s-]+/).map(function(p){ return (p[0]||'').toUpperCase(); }).join('');
  var sh = ss.getSheetByName(nom + '_' + initials) || ss.getSheetByName(nom + '_' + initials.charAt(0));
  if (!sh) { // dernier recours : première feuille commençant par NOM_
    sh = ss.getSheets().filter(function(s){ return s.getName().indexOf(nom + '_') === 0; })[0];
  }
  if (!sh) return; // pas de fiche individuelle → rien à synchroniser
  var last = Math.min(sh.getLastRow(), 60);
  var labels = sh.getRange(1, 2, last, 1).getDisplayValues(); // colonne B
  FICHE_MAP.forEach(function(m) {
    for (var i = 0; i < labels.length; i++) {
      if (clean_(labels[i][0]) !== m.label) continue;
      var r = i + 1;
      if (m.t) sh.getRange(r, 3).setValue(get(m.t)); // TYPE     (col C)
      if (m.n) sh.getRange(r, 4).setValue(get(m.n)); // NUMERO   (col D)
      if (m.d) sh.getRange(r, 5).setValue(get(m.d)); // VALIDITE (col E)
      break;
    }
  });
}

function findFicheSheet_(nom, prenom) {
  var ss = ssEpi_();
  nom = String(nom || '').toUpperCase();
  if (!nom) return null;
  var initials = String(prenom || '').split(/[\s-]+/).map(function(p){ return (p[0]||'').toUpperCase(); }).join('');
  var sh = ss.getSheetByName(nom + '_' + initials) || ss.getSheetByName(nom + '_' + initials.charAt(0));
  if (!sh) sh = ss.getSheets().filter(function(s){ return s.getName().indexOf(nom + '_') === 0; })[0];
  return sh || null;
}

// Met à jour FONCTION / GRADE / CENTRE / EQUIPE / TEL / MAIL dans la fiche
// individuelle de l'agent (libellés en colonne B, valeurs en colonne C).
// Seules les valeurs changent — mise en forme et mise en page intactes.
function updateAgent_(nom, prenom, info) {
  var sh = findFicheSheet_(nom, prenom);
  if (!sh) throw new Error('Fiche individuelle introuvable pour ' + nom + ' ' + prenom);
  var last = Math.min(sh.getLastRow(), 20);
  var labels = sh.getRange(1, 2, last, 1).getDisplayValues();
  Object.keys(info).forEach(function(k) {
    for (var i = 0; i < labels.length; i++) {
      if (clean_(labels[i][0]) === k) { sh.getRange(i + 1, 3).setValue(info[k]); break; }
    }
  });
}

// Les feuilles STATIQUES / DYNAMIQUES / CORDELETTES sont des vues alimentées
// par formules depuis RECAP : on n'écrit JAMAIS dedans (les formules feraient
// la mise à jour toutes seules). Seul RECAP est modifié.
function updateCorde_(row, values) {
  var sh = getSheetSmart_(ssCordes_(), RECAP);
  sh.getRange(row, 1, 1, values.length).setValues([values]);
}

function addCorde_(values) {
  var sh = getSheetSmart_(ssCordes_(), RECAP);
  var hr = recapHeaderRow_(sh);
  var vals = sh.getDataRange().getDisplayValues();
  var target = hr; // dernière ligne non vide
  for (var i = hr; i < vals.length; i++)
    if (vals[i].join('').trim() !== '') target = i + 1;
  sh.getRange(target + 1, 1, 1, values.length).setValues([values]);
}

// Réforme SANS supprimer de ligne (mise en page préservée) :
// colonne REFORME renseignée dans RECAP + FIN dans la feuille catégorie,
// archivage dans REFORMES. L'application masque les cordes réformées.
function reformerCorde_(row, reforme) {
  var ss = ssCordes_();
  var sh = getSheetSmart_(ss, RECAP);
  var iStatut = CORDES_HEADERS.indexOf('STATUT') + 1;   // colonne J
  sh.getRange(row, iStatut).setValue('RÉFORMÉE');
  var v = sh.getRange(row, 1, 1, 11).getDisplayValues()[0].map(clean_);
  // Archive au format d'origine :
  // CATÉGORIE, AFFECTATION, INDICATIF/NUMÉRO, LONGUEUR, MODÈLE, NUMÉRO REF,
  // FABRICATION, ÉCHÉANCE (7 ANS), DATE DE RETRAIT RÉELLE, COMMENTAIRE
  var refSh = ss.getSheetByName('REFORMES');
  if (refSh) {
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    var comment = (reforme && reforme.length >= 7) ? [reforme[5], reforme[6]].filter(String).join(' — ') : '';
    refSh.appendRow([v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[8], today, comment]);
  }
}

/* ---- Inventaire (modification protégée par code) ---- */
function checkInvCode_(code) {
  if (String(code) !== String(CONFIG.INV_CODE)) throw new Error('Code incorrect');
}

function updateInv_(code, emplacement, row, article, quantite) {
  checkInvCode_(code);
  var sh = ssInv_().getSheetByName(emplacement);
  if (!sh) throw new Error('Emplacement introuvable : ' + emplacement);
  sh.getRange(row, 1, 1, 2).setValues([[article, quantite]]);
}

function addInv_(code, emplacement, article, quantite) {
  checkInvCode_(code);
  var sh = ssInv_().getSheetByName(emplacement);
  if (!sh) throw new Error('Emplacement introuvable : ' + emplacement);
  var vals = sh.getDataRange().getDisplayValues();
  var hr = -1, target = -1;
  for (var i = 0; i < vals.length; i++) {
    if (clean_(vals[i][0]) === 'ARTICLE') { hr = i; continue; }
    if (hr >= 0 && vals[i].join('').trim() !== '') target = i;
  }
  if (hr < 0) throw new Error('En-tête ARTICLE introuvable dans ' + emplacement);
  if (target < 0) target = hr;
  sh.getRange(target + 2, 1, 1, 2).setValues([[article, quantite]]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
