// lib/googleSheets.js
// Connexion en lecture/ecriture au Google Sheet via un compte de service.
// N'est jamais importe cote client : uniquement dans pages/api/*.

import { google } from "googleapis";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Variables GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY manquantes."
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Les noms d'onglets contenant espaces, degres (N°) ou parentheses doivent
// etre entoures de guillemets simples dans la notation A1 de l'API Sheets.
export function rangeFor(sheetName, a1) {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'!${a1}`;
}

// Lit une plage de cellules et retourne un tableau de tableaux (lignes x colonnes)
export async function readRange(range) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return res.data.values || [];
}

// Ajoute une ligne a la fin d'un onglet (apres la derniere ligne remplie)
export async function appendRow(sheetName, rowValues) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: rangeFor(sheetName, "A1"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowValues] },
  });
}
