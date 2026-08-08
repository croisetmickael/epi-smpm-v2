// pages/api/save-manoeuvre.js
import { appendRow } from "../../lib/googleSheets";
import { findAgentByMatricule } from "../../lib/agents";
import { SHEETS, todayFR, nowHeureFR } from "../../lib/constants";

// Colonnes reelles de l'onglet "Suivi" :
// A Date | B Heures | C Agent | D Manœuvre | E Mât | F Treuil | G Rôle | H Observation
//
// Le matricule sert a identifier l'agent (verification dans l'onglet Agents),
// mais seul son nom resolu est ecrit dans la feuille.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode non autorisee" });
  }
  try {
    const { matricule, manoeuvre, mat, treuil, roles, observation } = req.body;

    const agent = await findAgentByMatricule(matricule);
    if (!agent) {
      return res
        .status(200)
        .json({ ok: false, error: "Matricule inconnu. Vérifie le numéro saisi." });
    }

    await appendRow(SHEETS.SUIVI, [
      todayFR(),
      nowHeureFR(),
      agent.nomComplet,
      manoeuvre || "",
      mat || "",
      treuil || "",
      roles || "", // Peut contenir plusieurs rôles (ex: "Rôle1 / Rôle2")
      observation || "",
    ]);

    res.status(200).json({ ok: true, agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
