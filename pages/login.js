// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import Shell from "../components/Shell";

export default function Login() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [attempts, setAttempts] = useState(0);

  const CORRECT_PIN = "SMPM";
  const UNLOCK_CODE = "1880";
  const MAX_ATTEMPTS = 3;

  function handlePinSubmit() {
    setError("");

    if (pin === CORRECT_PIN) {
      // Authentification réussie - utiliser sessionStorage (s'efface à la fermeture)
      sessionStorage.setItem("smpm_auth", "authenticated");
      setPin("");
      setAttempts(0);
      router.push("/");
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");

      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setError("Trop de tentatives. Rentrez le code de déblocage.");
      } else {
        setError(`PIN incorrect. Tentatives restantes: ${MAX_ATTEMPTS - newAttempts}`);
      }
    }
  }

  function handleUnlock() {
    setError("");

    if (unlockCode === UNLOCK_CODE) {
      setLocked(false);
      setAttempts(0);
      setUnlockCode("");
      setPin("");
      setError("");
    } else {
      setError("Code de déblocage incorrect");
    }
  }

  function handleKeyPress(e) {
    if (e.key === "Enter") {
      if (locked) {
        handleUnlock();
      } else {
        handlePinSubmit();
      }
    }
  }

  return (
    <Shell title="SMPM" subtitle="Authentification">
      <div style={{ maxWidth: 300, margin: "0 auto" }}>
        {!locked ? (
          <div>
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
                🔐 ACCÈS SÉCURISÉ
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Rentrez le code PIN
              </div>
            </div>

            <input
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              autoFocus
              style={{
                width: "100%",
                padding: 16,
                fontSize: 24,
                textAlign: "center",
                border: "2px solid var(--line)",
                borderRadius: 10,
                marginBottom: 16,
                letterSpacing: 4,
              }}
            />

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handlePinSubmit}
              style={{ width: "100%" }}
            >
              Valider
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
                🔒 APPLICATION VERROUILLÉE
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Code de déblocage requis
              </div>
            </div>

            <input
              type="password"
              inputMode="numeric"
              placeholder="••••"
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              style={{
                width: "100%",
                padding: 16,
                fontSize: 24,
                textAlign: "center",
                border: "2px solid var(--line)",
                borderRadius: 10,
                marginBottom: 16,
                letterSpacing: 4,
              }}
            />

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleUnlock}
              style={{ width: "100%" }}
            >
              Débloquer
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
