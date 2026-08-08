// lib/helpers.js

export function getRandomMatricule() {
  // Génère un matricule aléatoire de 5 chiffres (00001 à 99999)
  return String(Math.floor(Math.random() * 100000)).padStart(5, "0");
}
