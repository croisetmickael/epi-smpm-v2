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
  EPI_ID:    '1_PBFA4XY-4r_yRvlzI96lbEbJk7B7A2JfliC-Oq6rMA',   // EPI_SMPM_FUSION
  CORDES_ID: '1E-O3Y7523lLCZEdovDALhHZ3A2bFLHzeFiLFgTu6ji8',   // CORDES_INVENTAIRE_OPTIMISE
  INV_ID:    '1IeZ4YeK2ltfzBy_Rbz2__hYGqT3sh0bW17s9dJ00-lo',   // INVENTAIRE_VIMP
  INV_CODE:  '1880',  // code requis pour modifier l'inventaire
  TELEGRAM_BOT_TOKEN: 'VOTRE_TOKEN_ICI',     // obtenu de @BotFather
  TELEGRAM_CHAT_ID:   'VOTRE_CHAT_ID_ICI',   // obtenu de @userinfobot
  SUIVI_ID:           '1qKrw0kTTAhJNzYQyV8nckhM-knuQ01BcidDvzLXb2oQ'  // journal présence/manœuvres
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

var CACHE_KEY = 'smpm_data_v1';
var CACHE_TTL = 120; // secondes — le cache est vidé à chaque écriture

function doGet(e) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(CACHE_KEY);
  if (hit) {
    return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  }
  var out = { ok: true, version: 'V3.10', ts: new Date().toISOString(), warnings: [] };
  var parts = { epi: readEpi_, cordes: readCordes_, agents: readAgents_, inventaire: readInventaire_, reformes: readReformes_, dashboards: readDashboards_, presence: readPresence_ };
  Object.keys(parts).forEach(function(k) {
    try { out[k] = parts[k](); }
    catch (err) {
      out[k] = { headers: [], rows: [] };
      out.warnings.push(k.toUpperCase() + ' : ' + String(err));
    }
  });
  if (out.warnings.length >= 5) return json_({ ok: false, error: out.warnings.join(' — ') });
  var str = JSON.stringify(out);
  try { cache.put(CACHE_KEY, str, CACHE_TTL); } catch (e2) { /* > 100 Ko : on sert sans cache */ }
  return ContentService.createTextOutput(str).setMimeType(ContentService.MimeType.JSON);
}

function ssEpi_()    { return SpreadsheetApp.openById(CONFIG.EPI_ID); }
function ssCordes_() { return SpreadsheetApp.openById(CONFIG.CORDES_ID); }
function ssInv_()    { return SpreadsheetApp.openById(CONFIG.INV_ID); }
function ssSuivi_()  { return SpreadsheetApp.openById(CONFIG.SUIVI_ID); }

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
    if (norm_(r[0]).indexOf('CATEGORIE') === 0) continue;      // en-tête répété de section
    if (!r[2] && !r[4] && !r[5]) continue;                     // titre de section (ex. "VIMP CAISSE")
    rows.push({ row: i + 1, values: r });
  }
  return { headers: CORDES_HEADERS, rows: rows };
}

var AGENTS_CACHE_KEY = 'smpm_agents_v1';

function readAgents_() {
  var cached = CacheService.getScriptCache().get(AGENTS_CACHE_KEY);
  if (cached) return JSON.parse(cached);
  var res = buildAgents_();
  try { CacheService.getScriptCache().put(AGENTS_CACHE_KEY, JSON.stringify(res), 21600); } catch (e) {}
  return res;
}

function buildAgents_() {
  var ss = ssEpi_();
  var skip = { 'SYNTHESE': 1, 'REFORMES': 1 };
  skip[EPI_SHEET] = 1;
  var rows = [];
  ss.getSheets().forEach(function(sh) {
    var name = sh.getName();
    if (skip[name]) return;
    var last = sh.getLastRow() || 1;
    var vals = sh.getRange(1, 1, Math.min(15, last), 3).getDisplayValues();
    var info = { FONCTION:'', GRADE:'', CENTRE:'', EQUIPE:'', TEL:'', MAIL:'', MATRICULE:'' }, np = '';
    vals.forEach(function(r) {
      var b = clean_(r[1]), c = clean_(r[2]);
      if (b.indexOf('FICHE EPI') === 0) np = b.replace(/FICHE EPI\s*[—-]\s*/, '');
      if (info.hasOwnProperty(b)) info[b] = c;
    });
    if (!np) return; // pas une fiche agent
    var parts = np.split(/\s+/);
    var nom = parts.shift() || name;
    rows.push({ row: 0, values: [nom, parts.join(' '), info.FONCTION, info.GRADE, info.CENTRE, info.EQUIPE, info.TEL, info.MAIL, info.MATRICULE] });
  });
  return { headers: ['NOM','PRENOM','FONCTION','GRADE','CENTRE','EQUIPE','TEL','MAIL','MATRICULE'], rows: rows };
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

/* ============ PRÉSENCE & MANŒUVRES ============ */
function readPresence_() {
  try {
    var sh = ssSuivi_().getSheetByName('Suivi');
    if (!sh) return { headers: [], rows: [] };
    var vals = sh.getDataRange().getDisplayValues();
    if (vals.length < 2) return { headers: [], rows: [] };
    
    // En-têtes : Date, Heures, Agent, Manœuvre, Mât, Treuil, Rôle, Observation
    var headers = vals[0].map(clean_);
    var dateIdx = -1, agentIdx = -1, manIdx = -1, obsIdx = -1;
    for (var h = 0; h < headers.length; h++) {
      if (headers[h].indexOf('DATE') === 0) dateIdx = h;
      if (headers[h].indexOf('AGENT') === 0) agentIdx = h;
      if (headers[h].indexOf('MANOEUVRE') === 0) manIdx = h;
      if (headers[h].indexOf('OBSERVATION') === 0) obsIdx = h;
    }
    
    if (dateIdx < 0 || agentIdx < 0 || manIdx < 0) return { headers: [], rows: [] };
    
    // Compte une manœuvre par agent par jour (dédoublonne), filtre "intervention"
    var agentDays = {};  // key: "NOM_Prénom|Date"
    var agentCount = {}; // key: "NOM Prénom", value: count
    
    for (var i = 1; i < vals.length; i++) {
      var obs = clean_(vals[i][obsIdx] || '').toLowerCase();
      if (obs.indexOf('intervention') >= 0) continue;  // skip si "intervention"
      
      var dt = clean_(vals[i][dateIdx]);
      var ag = clean_(vals[i][agentIdx]);
      var mn = clean_(vals[i][manIdx]);
      
      if (!dt || !ag || !mn) continue;
      
      var key = ag + '|' + dt;
      if (!agentDays[key]) {
        agentDays[key] = 1;
        if (!agentCount[ag]) agentCount[ag] = 0;
        agentCount[ag]++;
      }
    }
    
    // Transformer en array avec NOM et MANOEUVRES
    var rows = [];
    for (var ag in agentCount) {
      rows.push({ values: [ag, agentCount[ag]] });
    }
    rows.sort(function(a,b) { return a.values[0].localeCompare(b.values[0]); });
    
    return { headers: ['NOM','MANOEUVRES'], rows: rows };
  } catch (e) {
    Logger.log('Présence error: ' + e);
    return { headers: [], rows: [] };
  }
}

/* ============ SYNTHESES OFFICIELLES (accueil) ============ */
// Lit la feuille SYNTHESE du fichier EPI et le TABLEAU DE BORD du fichier
// cordes : la page d'accueil de l'application affiche CES chiffres.
function readDashboards_() {
  return { epi: readSyntheseEpi_(), cordes: readTdbCordes_() };
}

function readSyntheseEpi_() {
  var sh = getSheetSmart_(ssEpi_(), 'SYNTHESE');
  var v = sh.getRange(1, 1, Math.min(40, sh.getLastRow()), 8).getDisplayValues();
  var out = { situation:'', specialistes:'', suivis:'', perimes:'', sous2ans:'', reformes:'', detail: [] };
  for (var i = 0; i < v.length; i++) {
    var b = clean_(v[i][1]);
    if (b === 'Situation au :') out.situation = clean_(v[i][2]);
    if (b === 'Spécialistes suivis' && i > 0) {          // la ligne AU-DESSUS contient les valeurs
      out.specialistes = clean_(v[i-1][1]);
      out.suivis       = clean_(v[i-1][2]);
      out.perimes      = clean_(v[i-1][3]);
      out.sous2ans     = clean_(v[i-1][4]);
      out.reformes     = clean_(v[i-1][5]);
    }
    if (b === 'Équipement') {                            // tableau DÉTAIL PAR ÉQUIPEMENT DATÉ
      for (var j = i + 1; j < v.length; j++) {
        var eq = clean_(v[j][1]);
        if (!eq || eq.indexOf('LÉGENDE') === 0 || eq.indexOf('LEGENDE') === 0) break;
        out.detail.push({ equipement: eq, suivis: clean_(v[j][2]), perimes: clean_(v[j][3]),
                          sous2ans: clean_(v[j][4]), echeance: clean_(v[j][5]) });
      }
    }
  }
  return out;
}

function readTdbCordes_() {
  var sh = getSheetSmart_(ssCordes_(), 'TABLEAU DE BORD');
  var v = sh.getRange(1, 1, Math.min(60, sh.getLastRow()), 5).getDisplayValues();
  var out = { duree:'', seuil:'', statuts:{}, categories:{}, longueurs:{}, legende:{} };
  var section = '';
  for (var i = 0; i < v.length; i++) {
    var a = clean_(v[i][0]), b = clean_(v[i][1]);
    if (clean_(v[i][3]) === 'Durée avant réforme (ans)') out.duree = clean_(v[i][4]);
    if (clean_(v[i][3]) === 'Seuil critique (ans)')      out.seuil = clean_(v[i][4]);
    if (a.indexOf('RÉPARTITION PAR CATÉGORIE') === 0) { section = 'cat'; continue; }
    if (a.indexOf('RÉPARTITION PAR STATUT') === 0)    { section = 'statut'; continue; }
    if (a.indexOf('LONGUEUR PAR STATUT') === 0)       { section = 'lstatut'; continue; }
    if (a.indexOf('LONGUEUR TOTALE') === 0)           { section = 'long'; continue; }
    if (a === 'LÉGENDE')                              { section = 'leg'; continue; }
    if (a.indexOf('CORDES DYNAMIQUES') === 0 || a.indexOf('CORDES STATIQUES') === 0) continue;
    if (!a) { continue; }
    if (section === 'cat'    && b !== '') out.categories[a] = b;
    if (section === 'statut' && b !== '') out.statuts[a] = b;
    if (section === 'lstatut'&& b !== '') out.longueurs['statut_' + a] = b;
    if (section === 'leg'    && b !== '') out.legende[a] = b;
    if (section === 'long' || a.indexOf('Longueur') === 0 || a.indexOf('Total') === 0) {
      if (a === 'Total général (toutes cordes)') out.longueurs.total = b;
      if (a === 'Longueur totale dynamique')     out.longueurs.dynamique = b;
      if (a === 'Longueur totale statique')      out.longueurs.statique = b;
    }
  }
  return out;
}

/* ============ NORMALISATION DES FICHES (utilitaire, à exécuter 1 fois) ============
 * Met TOUTES les fiches individuelles au même format :
 *   Ligne titre "FICHE EPI — NOM Prénom" (conservée)
 *   puis 7 lignes d'informations : FONCTION, GRADE, CENTRE, EQUIPE, TEL, MAIL, MATRICULE
 *   puis le tableau EQUIPEMENTS (inchangé)
 * - Les valeurs existantes sont conservées ; les champs manquants sont créés vides.
 * - Aucune donnée d'équipement n'est touchée.
 * Exécution : sélectionner "normaliserFiches" dans la barre d'outils Apps Script → ▶ Exécuter
 */
var FICHE_INFO_LABELS = ['FONCTION','GRADE','CENTRE','EQUIPE','TEL','MAIL','MATRICULE'];

function normaliserFiches() {
  var ss = ssEpi_();
  var skip = { 'SYNTHESE': 1, 'REFORMES': 1 }; skip[EPI_SHEET] = 1;
  var log = [];
  ss.getSheets().forEach(function(sh) {
    var name = sh.getName();
    if (skip[name]) return;
    try { log.push(name + ' : ' + normaliserFiche_(sh)); }
    catch (e) { log.push(name + ' : ERREUR ' + e); }
  });
  CacheService.getScriptCache().remove(AGENTS_CACHE_KEY);
  CacheService.getScriptCache().remove(CACHE_KEY);
  Logger.log(log.join('\n'));
  return log;
}

// Reconstruit proprement le bloc d'informations d'UNE fiche :
// supprime les doublons, garantit exactement 7 lignes (FONCTION → MATRICULE)
// entre le titre et le tableau ÉQUIPEMENTS, conserve valeurs et mise en forme.
// Idempotente : peut être relancée sans risque.
function normaliserFiche_(sh) {
  var last = Math.min(sh.getLastRow() || 1, 30);
  var vals = sh.getRange(1, 1, last, 3).getDisplayValues();
  var titleRow = -1, eqRow = -1;
  for (var i = 0; i < vals.length; i++) {
    var b = clean_(vals[i][1]);
    if (titleRow < 0 && b.indexOf('FICHE EPI') === 0) titleRow = i + 1;
    if (eqRow < 0 && b.indexOf('EQUIPEMENTS DE PROTECTION') === 0) eqRow = i + 1;
  }
  if (titleRow < 0 || eqRow < 0 || eqRow <= titleRow) return 'ignorée (structure non reconnue)';

  // 1. Récupère les valeurs existantes (première valeur NON VIDE de chaque libellé,
  //    même en cas de doublons), uniquement entre le titre et le tableau.
  var existing = {};
  for (var r = titleRow; r < eqRow - 1; r++) {
    var lab = clean_(vals[r][1]);
    if (FICHE_INFO_LABELS.indexOf(lab) >= 0) {
      var v = clean_(vals[r][2]);
      if (existing[lab] === undefined || (existing[lab] === '' && v !== '')) existing[lab] = v;
    }
  }

  // 2. Ajuste le nombre de lignes entre titre et tableau à EXACTEMENT 7
  //    (supprime les doublons / lignes en trop, insère si manquant).
  var between = eqRow - titleRow - 1;
  var N = FICHE_INFO_LABELS.length; // 7
  if (between > N) {
    sh.deleteRows(titleRow + 1 + N, between - N);   // retire l'excédent (doublons)
  } else if (between < N) {
    sh.insertRowsAfter(titleRow, N - between);
    // les lignes insérées héritent du format de la ligne du titre → on l'écrase ci-dessous
  }

  // 3. Écrit le bloc propre : libellés en B (gras), valeurs en C, colonnes D:E nettoyées
  var labels = FICHE_INFO_LABELS.map(function(l){ return [l, existing[l] || '']; });
  sh.getRange(titleRow + 1, 2, N, 2).setValues(labels);
  sh.getRange(titleRow + 1, 2, N, 1).setFontWeight('bold').setFontStyle('normal');
  sh.getRange(titleRow + 1, 3, N, 1).setFontWeight('normal');
  sh.getRange(titleRow + 1, 4, N, 2).clearContent();  // D:E ne servent pas dans ce bloc
  return 'OK (' + N + ' cases' + (existing.MATRICULE ? '' : ', MATRICULE ajouté') + ')';
}

/* ============ NOTIFICATIONS TELEGRAM ============ */
function sendToTelegram(message) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;  // pas configuré
  try {
    var url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';
    var payload = {
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      Logger.log('Telegram error: ' + response.getContentText());
    }
  } catch (e) {
    Logger.log('Telegram send failed: ' + e);
  }
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
    CacheService.getScriptCache().remove(CACHE_KEY);   // les lectures suivantes sont fraîches
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
      if (m.t && m.n && m.d)      sh.getRange(r, 3, 1, 3).setValues([[get(m.t), get(m.n), get(m.d)]]); // C:E
      else if (m.t && m.n)        sh.getRange(r, 3, 1, 2).setValues([[get(m.t), get(m.n)]]);           // C:D
      else if (m.n)               sh.getRange(r, 4).setValue(get(m.n));                                 // D
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
  CacheService.getScriptCache().remove(AGENTS_CACHE_KEY);
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
  var oldArticle = clean_(sh.getRange(row, 1).getDisplayValue());  // avant écrasement
  var obs = clean_(sh.getRange(row, 3).getDisplayValue() || '');   // observation
  var statut = clean_(sh.getRange(row, 4).getDisplayValue() || ''); // statut
  sh.getRange(row, 1, 1, 2).setValues([[article, quantite]]);
  syncInvComplet_(emplacement, oldArticle, article, quantite, 'update');
  // Notif Telegram si observation ou statut non OK
  if (obs.toUpperCase().indexOf('NON') >= 0 || statut.toUpperCase().indexOf('NON OK') >= 0 || 
      statut.toUpperCase().indexOf('PROBLÈME') >= 0 || statut.toUpperCase().indexOf('PROBLEME') >= 0) {
    sendToTelegram('⚠️ <b>Inventaire modifié — Attention requise</b>\n' +
      '📦 ' + emplacement + '\n' +
      '🏷️ ' + article + '\n' +
      '📝 Observation : ' + obs + '\n' +
      '🔴 Statut : ' + statut);
  }
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
  syncInvComplet_(emplacement, null, article, quantite, 'add');
  // Notif Telegram pour ajout (article neuf = à surveiller)
  sendToTelegram('✅ <b>Inventaire — Nouvel article ajouté</b>\n' +
    '📦 ' + emplacement + '\n' +
    '🏷️ ' + article + '\n' +
    '📊 Quantité : ' + quantite);
}

// Reporte chaque modification/ajout dans la feuille récapitulative
// INVENTAIRE COMPLET (sections par emplacement, aucune ligne supprimée).
function syncInvComplet_(emplacement, oldArticle, article, quantite, mode) {
  var sh = ssInv_().getSheetByName('INVENTAIRE COMPLET');
  if (!sh) return;                                     // feuille absente → rien à faire
  var ss = ssInv_();
  var places = {};                                     // noms d'emplacements = noms des feuilles
  ss.getSheets().forEach(function(x){ if (x.getName() !== 'INVENTAIRE COMPLET') places[norm_(x.getName())] = 1; });
  var vals = sh.getDataRange().getDisplayValues();
  var start = -1, end = vals.length;                   // bornes de la section (index 0-based)
  for (var i = 0; i < vals.length; i++) {
    var a = clean_(vals[i][0]);
    if (start < 0) {
      if (norm_(a) === norm_(emplacement)) start = i;
      continue;
    }
    if (a && places[norm_(a)]) { end = i; break; }     // début de la section suivante
  }
  if (start < 0) {                                     // section absente → on la crée en fin
    var lastRow = sh.getLastRow();
    sh.getRange(lastRow + 2, 1).setValue(emplacement).setFontWeight('bold');
    sh.getRange(lastRow + 3, 1, 1, 2).setValues([[article, quantite]]);
    return;
  }
  if (mode === 'update' && oldArticle) {
    for (var r = start + 1; r < end; r++) {
      if (clean_(vals[r][0]) === oldArticle) {
        sh.getRange(r + 1, 1, 1, 2).setValues([[article, quantite]]);
        return;
      }
    }
    // ancien article introuvable dans la section → on l'ajoute (mise à niveau douce)
  }
  // mode 'add' (ou update sans correspondance) : insère en fin de section
  var lastItem = start;                                // dernière ligne non vide de la section
  for (var r2 = start + 1; r2 < end; r2++) if (vals[r2].join('').trim() !== '') lastItem = r2;
  sh.insertRowsAfter(lastItem + 1, 1);
  sh.getRange(lastItem + 2, 1, 1, 2).setValues([[article, quantite]]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
