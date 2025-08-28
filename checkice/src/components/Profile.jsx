import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, updateDoc, onSnapshot, collection, getDocs } from "firebase/firestore";

export default function Profile({ currentUser }) {
  const [patinoires, setPatinoires] = useState([]);
  const [selectedPat, setSelectedPat] = useState("");
  const [deplacements, setDeplacements] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editHeure, setEditHeure] = useState("");
  const [editPat, setEditPat] = useState("");

  // Charger toutes les patinoires
  useEffect(() => {
    async function fetchPatinoires() {
      const snapshot = await getDocs(collection(db, "patinoires"));
      const pts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatinoires(pts);
    }
    fetchPatinoires();
  }, []);

  // Charger les données utilisateur en temps réel
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSelectedPat(data.patinoirePrincipale || "");
        const today = new Date().toISOString().split("T")[0];
        const filtered = (data.deplacements || []).filter(d => d.date >= today);
        setDeplacements(filtered);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Changer patinoire principale
  const handlePatinoireChange = async (e) => {
    const userRef = doc(db, "users", currentUser.uid);
    setSelectedPat(e.target.value);
    await updateDoc(userRef, { patinoirePrincipale: e.target.value });
  };

  // Supprimer un déplacement
  const handleDelete = async (idx) => {
    const userRef = doc(db, "users", currentUser.uid);
    const newDeps = deplacements.filter((_, i) => i !== idx);
    await updateDoc(userRef, { deplacements: newDeps });
  };

  // Commencer à modifier un déplacement
  const handleEdit = (idx) => {
    const dep = deplacements[idx];
    setEditingIndex(idx);
    setEditDate(dep.date);
    setEditHeure(dep.heure);
    setEditPat(dep.patinoire);
  };

  // Enregistrer modification
  const saveEdit = async () => {
    if (!editDate || !editHeure || !editPat) return;
    const today = new Date().toISOString().split("T")[0];
    if (editDate < today) {
      alert("Impossible de mettre une date dans le passé !");
      return;
    }
    const userRef = doc(db, "users", currentUser.uid);
    const newDeps = [...deplacements];
    newDeps[editingIndex] = { patinoire: editPat, date: editDate, heure: editHeure };
    await updateDoc(userRef, { deplacements: newDeps });
    setEditingIndex(null);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      {/* Section Ma Patinoire */}
      <div className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-2">Ma patinoire</h2>
        <p className="mb-2"><strong>Nom :</strong> {currentUser.displayName || "Utilisateur"}</p>
        <label className="block mb-1">Patinoire principale :</label>
        <select
          value={selectedPat}
          onChange={handlePatinoireChange}
          className="w-full border p-2 rounded"
        >
          {patinoires.map(p => (
            <option key={p.id} value={p.id}>{p.nom}</option>
          ))}
        </select>
      </div>

      {/* Section Mes Déplacements */}
      <div className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-2">Mes déplacements</h2>
        {deplacements.length === 0 && <p>Aucun déplacement à venir</p>}
        <ul className="space-y-2 mt-2">
          {deplacements.map((dep, idx) => (
            <li key={idx} className="border p-2 rounded">
              {editingIndex === idx ? (
                <div className="space-y-2">
                  <select
                    value={editPat}
                    onChange={(e) => setEditPat(e.target.value)}
                    className="w-full border p-1 rounded"
                  >
                    {patinoires.map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="border p-1 rounded w-full"/>
                  <input type="time" value={editHeure} onChange={e => setEditHeure(e.target.value)} className="border p-1 rounded w-full"/>
                  <button onClick={saveEdit} className="bg-green-500 text-white px-2 py-1 rounded mt-1">Enregistrer</button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span>{patinoires.find(p => p.id === dep.patinoire)?.nom || dep.patinoire} — {dep.date} {dep.heure}</span>
                  <div className="space-x-1">
                    <button onClick={() => handleEdit(idx)} className="bg-yellow-500 px-2 py-1 rounded">Modifier</button>
                    <button onClick={() => handleDelete(idx)} className="bg-red-500 px-2 py-1 rounded text-white">Supprimer</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
