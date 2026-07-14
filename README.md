# 🚒 EPI SMPM 80 — GRIMP / SDIS 80

Application de gestion des EPI personnels, des cordes, du personnel et de l'inventaire VIMP.

✅ **Vos fichiers d'origine sont conservés tels quels** : mêmes feuilles, même mise en forme,
même mise en page (SYNTHESE, fiches agents individuelles, RECAP, STATIQUES/DYNAMIQUES/CORDELETTES, caisses…).
L'application lit et écrit **directement dans ces fichiers Google Sheets** — chaque modification
faite dans l'app apparaît immédiatement dedans.

✅ **Aucune intervention pour les utilisateurs** : ils ouvrent le lien Vercel, c'est tout.

```
Utilisateurs ──▶ App (Vercel, ce dépôt GitHub) ──▶ Apps Script ──▶ Vos 3 Google Sheets D'ORIGINE
```

---

## ÉTAPE 1 — Mettre les 3 fichiers d'origine sur Google Drive (5 min)

1. Déposer sur https://drive.google.com :
   `EPI_SMPM_FUSION.xlsx` · `CORDES_INVENTAIRE_OPTIMISE.xlsx` · `INVENTAIRE_VIMP.xlsx`
2. Ouvrir chaque fichier → **Fichier → Enregistrer au format Google Sheets**
   (la mise en forme est intégralement conservée)
3. Pour chacun des 3 Google Sheets obtenus, **copier l'ID** dans l'URL :
   `https://docs.google.com/spreadsheets/d/`**`CECI_EST_L_ID`**`/edit`

## ÉTAPE 2 — Le backend Apps Script (5 min)

1. Aller sur https://script.google.com → **Nouveau projet**
2. Coller le contenu du fichier **`Code.gs`** de ce dépôt
3. En haut du code, remplacer les 3 IDs dans `CONFIG` :
   ```js
   var CONFIG = {
     EPI_ID:    'ID_du_fichier_EPI_SMPM_FUSION',
     CORDES_ID: 'ID_du_fichier_CORDES',
     INV_ID:    'ID_du_fichier_INVENTAIRE'
   };
   ```
4. 💾 Enregistrer → **Déployer → Nouveau déploiement → ⚙ Application Web**
   - *Exécuter en tant que* : **Moi** · *Qui a accès* : **Tout le monde**
5. **Déployer**, autoriser l'accès, puis 📋 **copier l'URL** (finit par `/exec`)

## ÉTAPE 3 — GitHub (5 min)

1. https://github.com → **+ → New repository** → nom `epi-smpm-80` → **Private** → Create
2. **uploading an existing file** → glisser-déposer tous les fichiers de ce dossier → **Commit**
3. Ouvrir **`config.js`** sur GitHub → ✏️ Edit → coller l'URL Apps Script :
   ```js
   window.SMPM_CONFIG = { API_URL: "https://script.google.com/macros/s/XXXXX/exec" };
   ```
   → **Commit changes**

## ÉTAPE 4 — Vercel (5 min)

1. https://vercel.com → **Continue with GitHub**
2. **Add New → Project → Import** `epi-smpm-80` → **Deploy** (aucun réglage)
3. 🎉 L'app est en ligne : `https://epi-smpm-80.vercel.app`

Chaque modification sur GitHub redéploie automatiquement (~30 s).

## ÉTAPE 5 — Les utilisateurs (0 configuration)

Envoyer le lien. Installation avec le logo SMPM 80 :
- **iPhone (Safari)** : Partager ⬆ → *Sur l'écran d'accueil*
- **Android (Chrome)** : ⋮ → *Ajouter à l'écran d'accueil*

---

## Comment l'app écrit dans vos fichiers (sans toucher la mise en page)

| Action dans l'app | Ce qui se passe dans les fichiers d'origine |
|---|---|
| Modifier les EPI d'un agent | Ligne mise à jour dans **EPI PERSONNELS SMPM** **+ fiche individuelle de l'agent synchronisée** (mêmes cellules, mise en forme intacte) |
| Réformer un élément EPI | Élément vidé de la fiche + ligne ajoutée dans **REFORMES** (format d'origine) |
| Modifier une corde | Ligne mise à jour dans **RECAP** + report dans **STATIQUES / DYNAMIQUES / CORDELETTES** (STATUT inclus) |
| Ajouter une corde | Ajoutée à la suite dans **RECAP** et dans sa feuille catégorie |
| Réformer une corde | **Aucune ligne supprimée** : STATUT passé à « RÉFORMÉE » dans RECAP et la feuille catégorie, archivage complet dans REFORMES (échéance, date de retrait réelle, commentaire) — l'app masque les cordes réformées |
| Modifier l'inventaire | Protégé par **code** : article/quantité mis à jour dans la feuille caisse d'origine, ajout d'article à la suite de la caisse — aucune ligne supprimée |

## Dépannage

| Problème | Solution |
|---|---|
| « Connexion impossible » | Vérifier l'URL dans `config.js` (finit par `/exec`) et l'accès **Tout le monde** du déploiement |
| « Feuille introuvable » | Vérifier les 3 IDs dans `CONFIG` du Code.gs |
| Nouvelle version du Code.gs | Apps Script → Déployer → **Gérer les déploiements** → ✏️ → Version : *Nouvelle* (l'URL ne change pas) |
| Modifs invisibles dans l'app | Appuyer sur ⟳ |
