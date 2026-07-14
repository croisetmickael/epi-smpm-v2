// Proxy Vercel -> Apps Script : élimine tout problème CORS.
const TARGET = "https://script.google.com/macros/s/AKfycbyqAtLmrKJPvJrhaXmp-uTrfsG_9_uKsMUvKNQ57vx66YWm610YLT3Jhi8P8BX2PVXW/exec";

export default async function handler(req, res) {
  try {
    let options = {};
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
      options = {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        redirect: "follow"
      };
    }
    const r = await fetch(TARGET, options);
    const text = await r.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: "Proxy : " + String(e) });
  }
}
