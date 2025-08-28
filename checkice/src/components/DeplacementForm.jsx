import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, collection, getDocs } from "firebase/firestore";

export default function DeplacementForm({ currentUser }) {
  const [patinoires, setPatinoires] = useState([]);
  const [selectedPat, setSelectedPat] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");

  useEffect(() => {
    // Charger toutes les patinoires pour le menu déroulant
    async function fetchPatinoires() {
      const snapshot = await getDocs(collection(db, "patinoires"));
      const pts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatinoires(pts);
      if (pts.length > 0) setSelectedPat(pts[0].id);
    }
    fetchPatinoires();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPat || !date || !heure) {
      alert("Veuillez remplir tous les champs !");
      return;
    }

    // Vérifier que la date n'est pas passée
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      alert("Impossible de programmer un déplacement dans le passé !");
      return;
    }

    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        deplacements: arrayUnion({
          patinoire: selectedPat,
          date,
          heure
        })
      });
      alert("Déplacement ajouté !");
      setDate("");
      setHeure("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout du déplacement.");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Ajouter un déplacement</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Patinoire :</label>
          <select
            value={selectedPat}
            onChange={(e) => setSelectedPat(e.target.value)}
            className="w-full border p-2 rounded"
          >
            {patinoires.map(p => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Date :</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1">Heure :</label>
          <input
            type="time"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}
