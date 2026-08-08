// pages/schemas.js
import Shell from "../components/Shell";

const MANOEUVRES = [
  {
    id: "secours-parois",
    label: "Secours en Parois",
    file: "/schemas/1786211518325_TECHNIQUE_SECOURS_EN_PAROIS___TRIPODE__.pdf",
  },
  {
    id: "evacuation-facade",
    label: "Évacuation en Façade (TEF)",
    file: "/schemas/1786211518326_TECHNIQUE_D_EVACUATION_EN_FACADE___TEF__.pdf",
  },
  {
    id: "poulie-point-fixe",
    label: "Poulie de Renvoi - Point Fixe",
    file: "/schemas/1786211518326_PRM_sur_point_fixe.pdf",
  },
  {
    id: "tyrolienne-horizontale",
    label: "Tyrolienne Horizontale",
    file: "/schemas/1786211518326_TECHNIQUE_TYROLIENNE_HORIZONTALE___TRIPODE__.pdf",
  },
  {
    id: "tyrolienne-oblique",
    label: "Tyrolienne Oblique",
    file: "/schemas/1786211518326_TECHNIQUE_TYROLIENNE_OBLIQUE___TRIPODE__.pdf",
  },
  {
    id: "poulie-tyrolienne",
    label: "Poulie de Renvoi - Tyrolienne",
    file: "/schemas/1786211518327_PRM_sur_Tyro___TRIPODE__.pdf",
  },
  {
    id: "pantoire-blackz",
    label: "Pantoire BLACK-Z",
    file: "/schemas/Pantoire_BLACK-Z_2_versions_1_page.pdf",
  },
];

export default function Schemas() {
  return (
    <Shell title="SMPM" subtitle="Schémas Manoeuvres" showBack>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        {MANOEUVRES.map((m) => {
          return (
            <a key={m.id} href={m.file} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: 16, background: "var(--navy)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 16, cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
              📄 {m.label}
            </a>
          );
        })}
      </div>
    </Shell>
  );
}
