// lib/agents.js
import { readRange } from "./googleSheets";
import { SHEETS, DATA_START_ROW } from "./constants";

// Cherche un agent par matricule dans l'onglet Agents (colonnes: Nom, Prenom, Matricule, Nom complet)
export async function findAgentByMatricule(matricule) {
  if (!matricule || String(matricule).trim() === "") return null;
  const rows = await readRange(`${SHEETS.AGENTS}!A${DATA_START_ROW}:D500`);
  const wanted = String(matricule).trim();

  for (const row of rows) {
    const [nom, prenom, mat, nomComplet] = row;
    if (mat !== undefined && String(mat).trim() === wanted) {
      return {
        nom: nom || "",
        prenom: prenom || "",
        matricule: wanted,
        nomComplet: nomComplet || `${nom || ""} ${prenom || ""}`.trim(),
      };
    }
  }
  return null;
}
