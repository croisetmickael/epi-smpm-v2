// pages/suivi.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Shell from "../components/Shell";
import { getRandomMatricule } from "../lib/helpers";

export default function Suivi() {
  const router = useRouter();
  const [matricule, setMatricule] = useState("");
  const [randomMatricule, setRandomMatricule] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setRandomMatricule(getRandomMatricule());
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!matricule.trim()) {
      setError("Merci de saisir un matricule.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mes-manoeuvres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricule: matricule.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Une erreur est survenue.");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Impossible de récupérer les données. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="SMPM" subtitle="Mon suivi" showBack>
      {!result && (
        <form onSubmit={handleSubmit} className="card">
          <span className="field-label">Matricule</span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder={`Ex : ${randomMatricule}`}
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
          />
          {error && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            disabled={loading}
            type="submit"
          >
            {loading ? "Recherche…" : "Voir mon historique"}
          </button>
        </form>
      )}

      {result && (
        <>
          <div className="card">
            <div className="field-label">Agent</div>
            <div style={{ fontWeight: 700, color: "var(--navy)" }}>
              {result.agent.prenom} {result.agent.nom}
            </div>
          </div>

          {result.entries.length === 0 ? (
            <div className="empty-state">
              Aucune manœuvre enregistrée pour le moment.
            </div>
          ) : (
            result.entries.map((entry, i) => (
              <div className="history-item" key={i}>
                <div className="when">
                  {entry.date} · {entry.heure}
                </div>
                <div className="what">{entry.manoeuvre || "—"}</div>
                <div className="detail">
                  {[entry.mat, entry.treuil, entry.role]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {entry.observation && (
                  <div className="detail">Obs. : {entry.observation}</div>
                )}
              </div>
            ))
          )}

          <button
            className="btn btn-ghost"
            style={{ marginTop: 8 }}
            onClick={() => {
              setResult(null);
              setMatricule("");
              setRandomMatricule(getRandomMatricule());
            }}
          >
            Changer de matricule
          </button>
        </>
      )}
    </Shell>
  );
}
