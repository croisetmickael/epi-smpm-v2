// pages/api/mes-manoeuvres.js
import { readRange } from "../../lib/googleSheets";
import { findAgentByMatricule } from "../../lib/agents";
import { SHEETS, DATA_START_ROW } from "../../lib/constants";

// Colonnes reelles de l'onglet "Suivi" :
// A Date | B Heures | C Agent | D Manœuvre | E Mât | F Treuil | G Rôle | H Observation
// L'identification passe toujours par une recherche du matricule dans
// l'onglet Agents ; le filtrage se fait ensuite sur le nom resolu (colonne
// "Agent"), puisque le matricule lui-meme n'est pas stocke dans "Suivi".

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode non autorisee" });
  }
  try {
    const { matricule } = req.body;
    const agent = await findAgentByMatricule(matricule);
    if (!agent) {
      return res
        .status(200)
        .json({ ok: false, error: "Matricule inconnu. Vérifie le numéro saisi." });
    }

    const rows = await readRange(`${SHEETS.SUIVI}!A${DATA_START_ROW}:H5000`);
    const mine = rows
      .filter((r) => r[2] && String(r[2]).trim() === agent.nomComplet.trim())
      .map((r) => ({
        date: r[0] || "",
        heure: r[1] || "",
        manoeuvre: r[3] || "",
        mat: r[4] || "",
        treuil: r[5] || "",
        role: r[6] || "",
        observation: r[7] || "",
      }))
      .reverse();

    res.status(200).json({ ok: true, agent, entries: mine });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
