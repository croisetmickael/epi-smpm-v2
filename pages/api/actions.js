// pages/api/actions.js
import { readRange } from "../../lib/googleSheets";
import { SHEETS, DATA_START_ROW } from "../../lib/constants";

function uniqueNonEmpty(values) {
  return [...new Set(values.filter((v) => v && String(v).trim() !== ""))];
}

export default async function handler(req, res) {
  try {
    const rows = await readRange(`${SHEETS.ACTION}!A${DATA_START_ROW}:D200`);
    const manoeuvres = uniqueNonEmpty(rows.map((r) => r[0]));
    const mats = uniqueNonEmpty(rows.map((r) => r[1]));
    const treuils = uniqueNonEmpty(rows.map((r) => r[2]));
    const roles = uniqueNonEmpty(rows.map((r) => r[3]));
    res.status(200).json({ manoeuvres, mats, treuils, roles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
