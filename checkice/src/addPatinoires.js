import { db } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";

async function addPatinoires() {
  const patinoires = [
    { id: "pat1", nom: "Patinoire Sarah Abitbol", latitude: 47.081, longitude: 2.398 },
    { id: "pat2", nom: "Patinoire Lyon", latitude: 45.764, longitude: 4.835 },
    { id: "pat3", nom: "Patinoire Paris", latitude: 48.8566, longitude: 2.3522 }
  ];

  for (const p of patinoires) {
    await setDoc(doc(db, "patinoires", p.id), p);
    console.log(`Patinoire ajoutée : ${p.nom}`);
  }

  console.log("Toutes les patinoires ont été ajoutées !");
}

addPatinoires();
