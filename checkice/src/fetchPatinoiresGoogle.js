import fetch from "node-fetch";
import { db } from "./firebase.js"; // Assurez-vous que firebase.js est dans le même dossier
import { doc, setDoc } from "firebase/firestore";
import readline from "readline";

// Fonction pour mettre à jour une patinoire
async function updatePatinoire(patinoireId, horaires) {
  await setDoc(
    doc(db, "patinoires", patinoireId),
    { horaires: horaires },
    { merge: true }
  );
  console.log(`Patinoire ${patinoireId} mise à jour.`);
}

// Fonction pour demander les horaires via le terminal
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Fonction principale
async function main() {
  // Liste des patinoires à mettre à jour
  const patinoires = [
    { id: "pat1", nom: "Patinoire Sarah Abitbol" },
    { id: "pat2", nom: "Patinoire Lyon" },
    { id: "pat3", nom: "Patinoire Paris" },
  ];

  for (const p of patinoires) {
    let horaires = await askQuestion(
      `Horaires pour ${p.nom} (Entrée pour inconnu) : `
    );
    if (!horaires.trim()) horaires = "Inconnu";
    await updatePatinoire(p.id, horaires);
  }

  console.log("Toutes les patinoires ont été mises à jour !");
}

main();
