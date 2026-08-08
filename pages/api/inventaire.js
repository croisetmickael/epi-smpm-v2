// pages/api/inventaire.js
import { readRange, rangeFor } from "../../lib/googleSheets";
import { INVENTORY_GROUPS, INVENTORY_DATA_START_ROW } from "../../lib/constants";
import { parseInventaireComplet } from "../../lib/inventoryParser";
import { google } from "googleapis";

function getAuthAndClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Variables GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY manquantes."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { auth, sheets: google.sheets({ version: "v4", auth }) };
}

export default async function handler(req, res) {
  try {
    const { group } = req.query;
    const inventorySheetId = process.env.INVENTORY_SPREADSHEET_ID;

    // Si un Sheet d'inventaire externe est configuré, l'utiliser
    if (inventorySheetId) {
      return handleExternalSheet(inventorySheetId, group, res);
    } else {
      // Sinon, lire depuis les 20 onglets du Sheet principal
      return handleMainSheet(group, res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleExternalSheet(sheetId, group, res) {
  try {
    const { auth, sheets } = getAuthAndClient();

    // Lire tout l'onglet d'inventaire
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'INVENTAIRE COMPLET'!A1:B2000",
    });

    const rows = response.data.values || [];
    const grouped = parseInventaireComplet(rows);

    // Retourner le groupe demandé ou tous
    let items = [];
    if (group && grouped[group]) {
      items = grouped[group];
    } else if (group) {
      return res.status(400).json({ error: "Groupe d'inventaire invalide" });
    } else {
      // Tous les groupes, dans l'ordre
      items = [
        ...grouped.baroud,
        ...grouped.abordage,
        ...grouped.vehicule,
        ...grouped.caisses,
      ];
    }

    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleMainSheet(group, res) {
  try {
    const groupConfig = group
      ? INVENTORY_GROUPS.find((g) => g.id === group)
      : null;

    if (group && !groupConfig) {
      return res.status(400).json({ error: "Groupe d'inventaire invalide" });
    }

    const locationsToRead = groupConfig
      ? groupConfig.locations
      : INVENTORY_GROUPS.flatMap((g) => g.locations);

    const results = await Promise.all(
      locationsToRead.map(async ({ sheet, label }) => {
        try {
          const rows = await readRange(
            rangeFor(sheet, `A${INVENTORY_DATA_START_ROW}:B500`)
          );
          return rows
            .filter((r) => r[0] && String(r[0]).trim() !== "")
            .map((r) => ({
              article: String(r[0]).trim(),
              quantite: r[1] !== undefined && r[1] !== null ? String(r[1]) : "",
              emplacement: label,
            }));
        } catch (err) {
          console.error(`Inventaire: onglet "${sheet}" illisible —`, err.message);
          return [];
        }
      })
    );

    const items = results.flat();
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
