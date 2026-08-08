# SMPM — Suivi GRIMP 80 / SDIS 80

Application de suivi des entraînements, manœuvres et inventaire du GRIMP 80.
Elle lit et écrit en direct dans ton Google Sheet.

Ce guide t'accompagne pas à pas. Les étapes marquées **(toi)** sont celles
que tu dois faire toi-même (création de comptes, identifiants) — je ne peux
pas les faire à ta place pour des raisons de sécurité.

---

## 1. Préparer le Google Sheet **(toi)**

Ton Sheet principal a déjà les onglets **Manoeuvres**, **Agents**, **Action**,
**Suivi**, et tu as déjà créé **Suivi_inventaire**. Les matricules sont
remplis pour tous les agents — c'est réglé.

### 1.1 Onglet "Suivi" (déjà en place, rien à faire)
Colonnes réelles utilisées par l'app, ligne 4 = en-têtes :

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Date | Heures | Agent | Manœuvre | Mât | Treuil | Rôle | Observation |

Le matricule sert uniquement à **identifier** l'agent (recherche dans
l'onglet Agents) : il n'est jamais recopié tel quel, seul son nom complet
résolu est écrit dans la colonne "Agent".

### 1.2 Onglet "Suivi_inventaire" (déjà en place, rien à faire)
Colonnes réelles, ligne 4 = en-têtes :

| A | B | C | D | E |
|---|---|---|---|---|
| Date | Heures | Agent | Inventaire | Observation |

La colonne "Inventaire" reçoit un récapitulatif texte du contrôle, par
exemple : `OK : Corde 50m, Mousqueton — NON OK : Descendeur type 8`.

### 1.3 Onglets d'inventaire — déjà en place ✅
Pas besoin de créer d'onglet "Inventaire" unique : ton inventaire est
réparti sur **20 onglets**, un par caisse/emplacement (`CAISSE N°1` à
`CAISSE N°14`, `COTE GAUCHE`, `COTE DROIT`, `ARRIERE`, `TOURET`,
`SAC BAROUD`, `Copie de SAC ABORDAGE`). L'app les lit tous et les
fusionne automatiquement en une seule liste dans l'écran Inventaire.

⚠️ Si tu **renommes** un de ces onglets (par exemple pour corriger
"Copie de SAC ABORDAGE"), il faut mettre à jour le nom correspondant
dans `lib/constants.js` (tableau `INVENTORY_LOCATIONS`), sinon cet
emplacement disparaîtra de l'app.

---

## 2. Créer le compte de service Google Cloud **(toi)**

C'est ce qui permet à l'application d'écrire dans ton Sheet.

1. Va sur https://console.cloud.google.com/ et crée un projet (ou utilise
   un projet existant).
2. Dans le menu, va dans **APIs & Services > Library**, cherche
   **Google Sheets API** et clique **Enable**.
3. Va dans **APIs & Services > Credentials > Create Credentials >
   Service account**. Donne-lui un nom (ex. `smpm-app`), valide.
4. Ouvre ce compte de service créé, onglet **Keys > Add Key > Create new
   key > JSON**. Un fichier `.json` se télécharge — garde-le précieusement,
   il contient :
   - un champ `client_email` → c'est ta variable `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - un champ `private_key` → c'est ta variable `GOOGLE_PRIVATE_KEY`
5. **Partage ton Google Sheet** (bouton "Partager" en haut à droite) avec
   l'adresse email `client_email` ci-dessus, en droit **Éditeur**.

---

## 3. Mettre le code sur GitHub **(toi, je te guide)**

1. Crée un nouveau dépôt sur https://github.com/new (par exemple
   `smpm-suivi`), vide, sans README.
2. Dans le dossier du projet que je t'ai donné, lance :
   ```bash
   git init
   git add .
   git commit -m "Application SMPM - version initiale"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/smpm-suivi.git
   git push -u origin main
   ```

---

## 4. Déployer sur Vercel **(toi)**

1. Va sur https://vercel.com/new et connecte ton compte GitHub.
2. Sélectionne le dépôt `smpm-suivi` → **Import**.
3. Vercel détecte automatiquement Next.js, ne change rien aux réglages de
   build.
4. Avant de cliquer "Deploy", ouvre **Environment Variables** et ajoute :

   | Nom | Valeur |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | le `client_email` du fichier JSON |
   | `GOOGLE_PRIVATE_KEY` | le `private_key` du fichier JSON, **entre guillemets**, en gardant les `\n` tels quels |
   | `SPREADSHEET_ID` | l'ID de ton Sheet (dans l'URL : `.../d/CET_ID/edit`) |

5. Clique **Deploy**. Après une minute, ton application est en ligne sur
   une adresse `https://smpm-suivi.vercel.app` (ou similaire).

Chaque agent peut ouvrir ce lien sur son téléphone, puis utiliser
"Ajouter à l'écran d'accueil" pour avoir l'icône SMPM comme une vraie
application.

---

## 5. Tester en local avant de déployer (optionnel)

```bash
npm install
cp .env.example .env.local   # puis remplis les 3 variables
npm run dev
```
Ouvre http://localhost:3000

---

## Structure du projet

```
pages/
  index.js        Accueil (Intervention / Manœuvre du jour / Suivi / Inventaire)
  manoeuvre.js     Saisie Manœuvre/Mât/Treuil/Rôle + validation matricule
  suivi.js         Historique personnel (filtré par matricule)
  inventaire.js    Contrôle du matériel, OK/Non OK, validation matricule
  api/             Fonctions serverless qui lisent/écrivent le Google Sheet
lib/
  googleSheets.js  Connexion à l'API Google Sheets
  agents.js        Recherche d'un agent par matricule
  constants.js     Noms des onglets, emplacements d'inventaire, dates du jour
```
