// src/initPatinoires.js
import { db } from "./firebase.js"; // ⚠️ extension .js obligatoire pour Node ESM
import { doc, setDoc } from "firebase/firestore";

const patinoires = [
  { id: "pat1", nom: "Patinoire Sarah Abitbol", latitude: 47.081, longitude: 2.398, adresse: "Bourges" },
  { id: "pat2", nom: "Patinoire Lyon", latitude: 45.764, longitude: 4.835, adresse: "Lyon" },
  { id: "pat3", nom: "Patinoire Paris", latitude: 48.8566, longitude: 2.3522, adresse: "Paris" },
  { id: "pat4", nom: "Patinoire Dijon", latitude: 47.323083, longitude: 5.064111, adresse: "Dijon" },
  { id: "pat5", nom: "Patinoire Grenoble", latitude: 45.1886, longitude: 5.7252, adresse: "Grenoble" },
  { id: "pat6", nom: "Patinoire Bordeaux", latitude: 44.8378, longitude: -0.5792, adresse: "Bordeaux" },
  { id: "pat7", nom: "Patinoire Lille", latitude: 50.6292, longitude: 3.0573, adresse: "Lille" },
  { id: "pat8", nom: "Patinoire Nice", latitude: 43.7102, longitude: 7.2620, adresse: "Nice" },
  { id: "pat9", nom: "Patinoire Nantes", latitude: 47.2184, longitude: -1.5536, adresse: "Nantes" },
  { id: "pat10", nom: "Patinoire Strasbourg", latitude: 48.5734, longitude: 7.7521, adresse: "Strasbourg" }
  // tu peux rajouter d’autres patinoires ici si besoin
];

async function main() {
  for (const p of patinoires) {
    await setDoc(doc(db, "patinoires", p.id), { ...p, horaires: "Inconnus" });
    console.log(`Patinoire ajoutée : ${p.nom}`);
  }
  console.log("Toutes les patinoires ont été ajoutées !");
}

main();
