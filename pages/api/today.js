// pages/api/today.js
import { readRange } from "../../lib/googleSheets";
import { SHEETS, DATA_START_ROW } from "../../lib/constants";

export default async function handler(req, res) {
  try {
    // Lire la feuille MANOEUVRES : Date | Lieu | GPS | Observation
    const data = await readRange(SHEETS.MANOEUVRES, `A${DATA_START_ROW}:D500`);
    
    const allManoeuvres = [];
    const todayDate = new Date().toLocaleDateString("fr-FR");
    let todayManoeuvre = null;

    if (data && Array.isArray(data)) {
      for (const row of data) {
        const date = row[0];
        const lieu = row[1];
        const gps = row[2] || "";
        const observation = row[3] || "";

        if (date && lieu) {
          allManoeuvres.push({
            date: date,
            lieu: lieu,
            manoeuvre: lieu,
            observation: observation,
            gps: gps,
          });

          // Vérifier si c'est la manoeuvre du jour
          if (date === todayDate) {
            todayManoeuvre = lieu;
          }
        }
      }
    }

    res.status(200).json({
      today: todayDate,
      todayManoeuvre: todayManoeuvre,
      hasTodayManoeuvre: !!todayManoeuvre,
      allManoeuvres: allManoeuvres,
    });
  } catch (err) {
    console.error("Erreur today:", err);
    res.status(500).json({ error: err.message });
  }
}
