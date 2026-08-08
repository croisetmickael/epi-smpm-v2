// lib/inventoryParser.js
// Parse l'onglet "INVENTAIRE COMPLET" du Sheet externe
// et organise par les 4 groupes principaux

export function parseInventaireComplet(rows) {
  // Détecte les sections et groupe les articles
  let currentLocation = null;
  const itemsByLocation = {};

  for (const row of rows) {
    if (!row[0]) continue;
    const col0 = String(row[0]).trim();

    // Chercher si c'est un titre de section (contient "CAISSE", "COTE", "SAC", "TOURET", etc.)
    const isSectionTitle = /^(CAISSE|COTE|SAC|TOURET|ARRIERE)/i.test(col0);

    if (isSectionTitle) {
      // C'est un titre de section
      currentLocation = col0;
      if (!itemsByLocation[currentLocation]) {
        itemsByLocation[currentLocation] = [];
      }
    } else if (currentLocation && col0) {
      // C'est un article dans la section actuelle
      const quantite = row[1] ? String(row[1]).trim() : "";
      itemsByLocation[currentLocation].push({
        article: col0,
        quantite,
      });
    }
  }

  // Remapper les emplacements aux 4 groupes
  const grouped = {
    baroud: [],
    abordage: [],
    vehicule: [],
    caisses: [],
  };

  for (const [location, articles] of Object.entries(itemsByLocation)) {
    const loc = location.toUpperCase();
    let group = null;
    let displayLocation = location; // Label pour affichage

    if (loc.includes("SAC BAROUD")) {
      group = "baroud";
      displayLocation = "SAC BAROUD";
    } else if (loc.includes("SAC ABORDAGE")) {
      group = "abordage";
      displayLocation = "SAC ABORDAGE";
    } else if (loc.includes("CAISSE")) {
      group = "caisses";
      displayLocation = location;
    } else if (
      loc.includes("COTE") ||
      loc.includes("TOURET") ||
      loc.includes("ARRIERE")
    ) {
      group = "vehicule";
      displayLocation = location;
    }

    if (group) {
      for (const item of articles) {
        grouped[group].push({
          article: item.article,
          quantite: item.quantite,
          emplacement: displayLocation,
        });
      }
    }
  }

  console.log("parseInventaireComplet result:", grouped);
  return grouped;
}
