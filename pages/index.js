// pages/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Shell from "../components/Shell";
import { getRandomMatricule } from "../lib/helpers";

export default function Home() {
  const router = useRouter();
  const [today, setToday] = useState(null);
  const [allManoeuvres, setAllManoeuvres] = useState([]);
  const [openPicker, setOpenPicker] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [matricule, setMatricule] = useState("");
  const [randomMatricule, setRandomMatricule] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    setRandomMatricule(getRandomMatricule());
    fetch("/api/today")
      .then((r) => r.json())
      .then((data) => {
        setToday(data);
        if (!data.hasTodayManoeuvre && data.allManoeuvres) {
          setAllManoeuvres(data.allManoeuvres);
        }
      })
      .catch(() => {});
  }, []);

  function handleManoeuvreSelection(manoeuvre) {
    router.push(`/manoeuvre?type=manoeuvre&lieu=${encodeURIComponent(manoeuvre)}`);
  }

  function openGoogleMaps(e, gps) {
    e.stopPropagation();
    if (gps && gps.trim()) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(gps)}`, "_blank");
    }
  }

  async function sendMessageToTelegram() {
    if (!messageText.trim()) {
      alert("Message vide");
      return;
    }
    if (!matricule.trim()) {
      alert("Matricule requis");
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch("/api/send-message-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          matricule: matricule.trim(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        alert("✅ Message envoyé !");
        setMessageText("");
        setMatricule("");
        setShowMessageModal(false);
      } else {
        alert(`❌ ${data.error || "Erreur lors de l'envoi"}`);
      }
    } catch (err) {
      alert("❌ Erreur");
    } finally {
      setSendingMessage(false);
    }
  }

  const todayDate = today?.today || new Date().toLocaleDateString("fr-FR");
  const todayGps = today?.allManoeuvres?.find(m => m.date === todayDate)?.gps || "";

  return (
    <Shell title="SMPM">
      <div className="home-grid">
        {/* Intervention */}
        <button
          className="home-tile primary"
          onClick={() => router.push("/manoeuvre?type=intervention")}
        >
          <div className="eyebrow">Aujourd'hui</div>
          <div className="label">{todayDate}</div>
          <div className="meta">INTERVENTION</div>
        </button>

        {/* Manœuvre - avec bouton GPS */}
        <div style={{ position: "relative" }}>
          <button
            className="home-tile"
            onClick={() => {
              if (today?.hasTodayManoeuvre) {
                handleManoeuvreSelection(today.todayManoeuvre);
              } else {
                setOpenPicker(true);
              }
            }}
          >
            <div className="eyebrow">{todayDate}</div>
            <div className="label" style={{ fontSize: 16 }}>
              {today?.todayManoeuvre || "Manœuvre"}
            </div>
            <div className="meta">
              {today?.hasTodayManoeuvre ? "Entraînement du jour" : "Choisir dans le calendrier"}
            </div>
          </button>
          
          {/* Petit bouton GPS sur le coin */}
          {todayGps && (
            <button
              onClick={(e) => openGoogleMaps(e, todayGps)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 36,
                height: 36,
                background: "#E74C3C",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                fontWeight: 700,
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
              title="Ouvrir Google Maps"
            >
              📍
            </button>
          )}
        </div>

        {/* Suivi */}
        <button
          className="home-tile"
          onClick={() => router.push("/suivi")}
        >
          <div className="eyebrow">Historique</div>
          <div className="label">Suivi</div>
          <div className="meta">Mes manœuvres</div>
        </button>

        {/* Inventaire */}
        <button
          className="home-tile"
          onClick={() => router.push("/inventaire")}
        >
          <div className="eyebrow">Contrôle</div>
          <div className="label">Inventaire</div>
          <div className="meta">Matériel GRIMP</div>
        </button>

        {/* Schémas Manoeuvres */}
        <button
          className="home-tile"
          onClick={() => router.push("/schemas")}
          style={{ gridColumn: "1 / -1" }}
        >
          <div className="eyebrow">Documentation</div>
          <div className="label">Schémas</div>
          <div className="meta">Consulter les techniques</div>
        </button>

        {/* Message */}
        <button
          className="home-tile"
          onClick={() => setShowMessageModal(true)}
          style={{ 
            gridColumn: "1 / -1",
            background: "#9B59B6"
          }}
        >
          <div className="eyebrow">Communication</div>
          <div className="label">Message</div>
          <div className="meta">Envoyer une alerte</div>
        </button>
      </div>

      {/* Picker pour choisir une manœuvre du calendrier */}
      {openPicker && allManoeuvres.length > 0 && (
        <div className="sheet-backdrop" onClick={() => setOpenPicker(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Choisir une manœuvre</h3>
            {allManoeuvres.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  marginBottom: 12,
                  background: "#f9f9f9",
                  borderRadius: 8,
                  borderLeft: "4px solid var(--gold)",
                }}
              >
                {/* Première ligne : Manoeuvre + GPS à droite */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleManoeuvreSelection(m.manoeuvre);
                      setOpenPicker(false);
                    }}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: 15,
                      background: "none",
                      border: "none",
                      color: "var(--navy)",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    {m.manoeuvre}
                  </button>
                  
                  {/* Bouton GPS à droite */}
                  {m.gps && (
                    <button
                      onClick={(e) => openGoogleMaps(e, m.gps)}
                      style={{
                        width: 32,
                        height: 32,
                        background: "#E74C3C",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}
                      title="Ouvrir Google Maps"
                    >
                      📍
                    </button>
                  )}
                </div>

                {/* Deuxième ligne : Date et Lieu */}
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
                  {m.date} — {m.lieu}
                </div>

                {/* Troisième ligne : Observation (si présente) */}
                {m.observation && (
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                    📝 {m.observation}
                  </div>
                )}
              </div>
            ))}
            <button className="sheet-cancel" onClick={() => setOpenPicker(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modale Message */}
      {showMessageModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowMessageModal(false)}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            top: "auto",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "600px",
              borderRadius: "20px 20px 0 0",
              marginBottom: 0,
            }}
          >
            <h3>📬 Envoyer un message</h3>

            <div style={{ marginBottom: 14 }}>
              <span className="field-label">Matricule</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder={`Ex : ${randomMatricule}`}
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 16,
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  boxSizing: "border-box",
                  marginBottom: 12,
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <span className="field-label">Message</span>
              <textarea
                placeholder="Écris ton message ici..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  minHeight: 100,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  marginBottom: 12,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={sendMessageToTelegram}
                disabled={sendingMessage}
              >
                {sendingMessage ? "Envoi..." : "✅ Envoyer"}
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setShowMessageModal(false)}
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
