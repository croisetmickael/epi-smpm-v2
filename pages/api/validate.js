// pages/api/validate.js
import { findAgentByMatricule } from "../../lib/agents";

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
    res.status(200).json({ ok: true, agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
