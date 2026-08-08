// pages/inventaire.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Shell from "../components/Shell";
import { INVENTORY_GROUPS } from "../lib/constants";
import { getRandomMatricule } from "../lib/helpers";

export default function Inventaire() {
  const router = useRouter();
  const [activeGroup, setActiveGroup] = useState("baroud");
  const [items, setItems] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [quantities, setQuantities] = useState({});
  const [descriptions, setDescriptions] = useState({});
  const [matricule, setMatricule] = useState("");
  const [randomMatricule, setRandomMatricule] = useState("");
  const [observation, setObservation] = useState("");
  const [baroudChoice, setBaroudChoice] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [modalItem, setModalItem] = useState(null);
  const [modalQuantity, setModalQuantity] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    setRandomMatricule(getRandomMatricule());
  }, []);

  async function loadInventory(group) {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventaire?group=${group}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory(activeGroup);
  }, [activeGroup]);

  const grouped = useMemo(() => {
    const groups = {};
    items.forEach((it) => {
      const key = it.emplacement || "Autre";
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    });
    return groups;
  }, [items]);

  function itemKey(it) {
    return `${it.emplacement}::${it.article}`;
  }

  function toggleStatus(key, status) {
    if (status === "nonok") {
      setModalItem(key);
      setModalQuantity(quantities[key] || "");
      setModalDescription(descriptions[key] || "");
      setModalError("");
    } else {
      setStatuses((s) => {
        const next = { ...s };
        next[key] === status ? delete next[key] : (next[key] = status);
        return next;
      });
      delete quantities[key];
      delete descriptions[key];
    }
  }

  function saveModalItem() {
    const qty = modalQuantity.trim();
    const desc = modalDescription.trim();
    if (!qty && !desc) {
      setModalError("Au moins un champ requis");
      return;
    }
    setStatuses((s) => ({ ...s, [modalItem]: "nonok" }));
    setQuantities((q) => ({ ...q, [modalItem]: qty }));
    setDescriptions((d) => ({ ...d, [modalItem]: desc }));
    setModalItem(null);
  }

  async function submit() {
    setError("");
    if (!matricule.trim()) {
      setError("Matricule requis");
      return;
    }
    if (activeGroup === "baroud" && !baroudChoice) {
      setError("Choisir Baroud 1 ou 2");
      return;
    }
    if (Object.keys(statuses).length === 0) {
      setError("Cocher au moins un article");
      return;
    }

    setSubmitting(true);
    
    // Vérifier s'il y a des Non OK
    const hasNonOk = Object.values(statuses).some(s => s === "nonok");
    
    let itemsNonOk;
    
    if (!hasNonOk) {
      // Tout est OK → "Baroud 1 - Conforme" ou "Baroud 2 - Conforme"
      if (activeGroup === "baroud") {
        itemsNonOk = [`Baroud ${baroudChoice} - Conforme`];
      } else {
        // Pour autres groupes
        const groupLabel = INVENTORY_GROUPS.find(g => g.id === activeGroup)?.label || activeGroup;
        itemsNonOk = [`${groupLabel} - Conforme`];
      }
    } else {
      // Il y a des Non OK → format habituel avec Baroud 1/2
      const byLocation = {};
      
      Object.entries(statuses).forEach(([key, status]) => {
        if (status === "nonok") {
          const [loc, art] = key.split("::");
          if (!byLocation[loc]) byLocation[loc] = [];
          let detail = art;
          if (quantities[key]) detail += ` (${quantities[key]} manquantes)`;
          if (descriptions[key]) detail += ` - ${descriptions[key]}`;
          byLocation[loc].push(detail);
        }
      });

      itemsNonOk = Object.entries(byLocation).map(([loc, items]) => {
        let label = loc;
        if (loc === "SAC BAROUD" && baroudChoice) {
          label = `Baroud ${baroudChoice}`;
        }
        return `${label} / ${items.join(", ")}`;
      });
    }

    try {
      const res = await fetch("/api/save-inventaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricule: matricule.trim(), itemsNonOk, observation }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ agent: data.agent, isConforme: !hasNonOk });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Erreur enregistrement");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Shell title="SMPM" subtitle="Inventaire" showBack onBack={() => router.push("/")}>
        <div className="alert alert-success">
          ✓ Conforme
        </div>
        <div className="card">
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)", textAlign: "center" }}>
            Enregistré pour {result.agent.prenom} {result.agent.nom}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => router.push("/")}>
          Accueil
        </button>
      </Shell>
    );
  }

  const checkedCount = Object.keys(statuses).length;

  return (
    <Shell title="SMPM" subtitle="Inventaire" showBack>
      {/* Boutons groupe */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {INVENTORY_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(g.id)}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1.5px solid",
              borderColor: activeGroup === g.id ? "var(--gold-dark)" : "var(--line)",
              background: activeGroup === g.id ? "#fff8e8" : "#fff",
              color: activeGroup === g.id ? "var(--navy)" : "var(--ink)",
              fontWeight: activeGroup === g.id ? 700 : 600,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--ink-soft)" }}>Chargement…</div>
      ) : (
        <>
          {Object.entries(grouped).map(([emplacement, list]) => (
            <div key={emplacement}>
              <div className="inv-group-title">{emplacement}</div>
              {list.map((it) => {
                const key = itemKey(it);
                const status = statuses[key];
                return (
                  <div className="inv-row" key={key}>
                    <div className="inv-article-info">
                      <div className={`inv-name ${status === "nonok" ? "nonok" : ""}`}>
                        {it.article}
                      </div>
                      {it.quantite && <div className="inv-qty">Qté : {it.quantite}</div>}
                    </div>
                    <div className="inv-buttons">
                      <button
                        className={`pill-btn ok ${status === "ok" ? "active" : ""}`}
                        onClick={() => toggleStatus(key, "ok")}
                      >
                        ✓
                      </button>
                      <button
                        className={`pill-btn nonok ${status === "nonok" ? "active" : ""}`}
                        onClick={() => toggleStatus(key, "nonok")}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      {/* Modal quantité */}
      {modalItem && (
        <div className="modal-backdrop" onClick={() => setModalItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Détail du problème</h3>
            <div style={{ marginBottom: 14 }}>
              <span className="field-label">Nombre manquant</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Ex : 2"
                value={modalQuantity}
                onChange={(e) => setModalQuantity(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 16,
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <span className="field-label">Description</span>
              <textarea
                placeholder="Cassé, dégradé…"
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  minHeight: 60,
                  fontFamily: "inherit",
                }}
              />
            </div>
            {modalError && <div className="alert alert-error">{modalError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveModalItem}>
                OK
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModalItem(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form validation */}
      <div className="sticky-footer">
        <div className="card">
          <span className="field-label">
            {checkedCount} article{checkedCount > 1 ? "s" : ""} contrôlé
            {checkedCount > 1 ? "s" : ""}
          </span>

          <div style={{ height: 12 }} />

          {/* Choix Baroud 1 ou 2 */}
          {activeGroup === "baroud" && (
            <>
              <span className="field-label">Quel Baroud ?</span>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button
                  onClick={() => setBaroudChoice("1")}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: "2px solid",
                    borderColor: baroudChoice === "1" ? "var(--gold)" : "var(--line)",
                    background: baroudChoice === "1" ? "var(--gold)" : "#fff",
                    color: baroudChoice === "1" ? "var(--navy)" : "var(--ink)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Baroud 1
                </button>
                <button
                  onClick={() => setBaroudChoice("2")}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: "2px solid",
                    borderColor: baroudChoice === "2" ? "var(--gold)" : "var(--line)",
                    background: baroudChoice === "2" ? "var(--gold)" : "#fff",
                    color: baroudChoice === "2" ? "var(--navy)" : "var(--ink)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Baroud 2
                </button>
              </div>
            </>
          )}

          <span className="field-label">Observation</span>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Remarques…"
            style={{ marginBottom: 12 }}
          />

          <span className="field-label">Matricule</span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder={`Ex : ${randomMatricule}`}
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-primary"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "Enregistrement…" : "Valider"}
          </button>
        </div>
      </div>
    </Shell>
  );
}
