// pages/api/save-inventaire.js
import { appendRow } from "../../lib/googleSheets";
import { findAgentByMatricule } from "../../lib/agents";
import { SHEETS, todayFR, nowHeureFR } from "../../lib/constants";

const TELEGRAM_BOT_TOKEN = "8835437919:AAFdVJA1C7gJMK6kDqfQ9Rk04yDgxjb0UAc";
const TELEGRAM_CHAT_ID = "1443366339";

async function sendTelegramMessage(agent, problemes, observation) {
  const message = `🔔 *Nouveau contrôle inventaire*\n\n👤 *Agent:* ${agent.prenom} ${agent.nom}\n\n⚠️ *Détails:*\n${problemes || "✅ Conforme"}\n\n📝 *Observation:*\n${observation || "-"}`;
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      })
    });
    
    const data = await response.json();
    console.log("✅ Telegram sent:", data);
  } catch (err) {
    console.error("❌ Telegram error:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Methode non autorisee" });
  }
  try {
    const { matricule, itemsNonOk, observation } = req.body;

    console.log("Save inventaire reçu:", { matricule, itemsNonOk, observation });

    const agent = await findAgentByMatricule(matricule);
    if (!agent) {
      return res
        .status(200)
        .json({ ok: false, error: "Matricule inconnu. Vérifie le numéro saisi." });
    }

    // Joindre les items Non OK
    const nonOkText = itemsNonOk && itemsNonOk.length > 0 ? itemsNonOk.join(" | ") : "";

    console.log("Enregistrement:", {
      date: todayFR(),
      heure: nowHeureFR(),
      agent: agent.nomComplet,
      nonOk: nonOkText,
      observation: observation || "",
    });

    await appendRow(SHEETS.SUIVI_INVENTAIRE, [
      todayFR(),
      nowHeureFR(),
      agent.nomComplet,
      nonOkText,
      observation || "",
    ]);

    console.log("Enregistrement réussi");

    // Envoyer le message Telegram IMMÉDIATEMENT
    await sendTelegramMessage(agent, nonOkText, observation);

    res.status(200).json({ ok: true, agent });
  } catch (err) {
    console.error("Erreur save-inventaire:", err);
    res.status(500).json({ error: err.message });
  }
}
