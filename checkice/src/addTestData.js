import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

// Liste des patinoires
const patinoires = [
  { id: "pat1", nom: "Patinoire Sarah Abitbol", latitude: 47.081, longitude: 2.398 },
  { id: "pat2", nom: "Patinoire Lyon", latitude: 45.764, longitude: 4.835 },
  { id: "pat3", nom: "Patinoire Paris", latitude: 48.8566, longitude: 2.3522 }
];

// Utilisateur test
const userTest = {
  id: "testuser1",
  nom: "Sarah Bittle",
  patinoirePrincipale: "pat1",
  deplacements: [
    { patinoire: "pat2", date: "2025-08-29", heure: "18:00" },
    { patinoire: "pat3", date: "2025-08-30", heure: "20:00" }
  ]
};

async function addData() {
  try {
    // Ajouter patinoires
    for (const p of patinoires) {
      await setDoc(doc(db, "patinoires", p.id), p);
      console.log(`Patinoire ajoutée : ${p.nom}`);
    }

    // Ajouter utilisateur test
    await setDoc(doc(db, "users", userTest.id), userTest);
    console.log(`Utilisateur ajouté : ${userTest.nom}`);

    console.log("Toutes les données test ont été ajoutées !");
  } catch (error) {
    console.error("Erreur lors de l'ajout :", error);
  }
}

addData();
