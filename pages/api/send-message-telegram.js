// pages/api/send-message-telegram.js
import { findAgentByMatricule } from "../../lib/agents";

const TELEGRAM_BOT_TOKEN = "8835437919:AAFdVJA1C7gJMK6kDqfQ9Rk04yDgxjb0UAc";
const TELEGRAM_CHAT_ID = "1443366339";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, matricule } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message vide" });
    }

    if (!matricule || !matricule.trim()) {
      return res.status(400).json({ error: "Matricule requis" });
    }

    // Récupérer l'agent
    const agent = await findAgentByMatricule(matricule.trim());
    if (!agent) {
      return res.status(404).json({ error: "Matricule inconnu" });
    }

    const senderName = `${agent.prenom} ${agent.nom}`;
    const fullMessage = `📬 *Message SMPM*\n\n${message}\n\n_Envoyé par: ${senderName} (${matricule})_`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: fullMessage,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return res.status(200).json({ ok: true, agent });
    } else {
      return res.status(500).json({ error: "Erreur Telegram" });
    }
  } catch (err) {
    console.error("Erreur:", err);
    return res.status(500).json({ error: err.message });
  }
}
