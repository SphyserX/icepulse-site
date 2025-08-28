import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import Auth from "./components/Auth";
import Profile from "./components/Profile";
import DeplacementForm from "./components/DeplacementForm";
import Map from "./components/Map";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import Header from "./components/Header";

// Fonction pour ajouter patinoires et utilisateur connecté
async function addTestData(currentUser) {
  console.log("addTestData appelé avec :", currentUser);

  if (!currentUser) {
    alert("Utilisateur non connecté !");
    return;
  }

  // Patinoires
  const patinoires = [
    { id: "pat1", nom: "Patinoire Sarah Abitbol", latitude: 47.081, longitude: 2.398 },
    { id: "pat2", nom: "Patinoire Lyon", latitude: 45.764, longitude: 4.835 },
    { id: "pat3", nom: "Patinoire Paris", latitude: 48.8566, longitude: 2.3522 }
  ];

  for (const p of patinoires) {
    await setDoc(doc(db, "patinoires", p.id), p);
    console.log(`Patinoire ajoutée : ${p.nom}`);
  }

  // Utilisateur connecté
  const u = {
    id: currentUser.uid,
    nom: currentUser.displayName || "Utilisateur Test",
    patinoirePrincipale: "pat1",
    deplacements: [
      { patinoire: "pat2", date: "2025-08-29", heure: "18:00" },
      { patinoire: "pat3", date: "2025-08-30", heure: "20:00" }
    ]
  };

  await setDoc(doc(db, "users", u.id), u);
  console.log(`Utilisateur ajouté : ${u.nom}`);

  alert("Patinoires et votre profil test ajoutés !");
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      console.log("Utilisateur connecté :", u);
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  if (!user) return <Auth />;

  return (
    <Router>
      {/* Header avec navigation */}
      <Header />

      <div className="p-4">
        {/* Bouton temporaire pour ajouter données test */}
        {user && (
          <button
            onClick={() => addTestData(user)}
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
          >
            Ajouter données test
          </button>
        )}

        <Routes>
          <Route path="/" element={<Navigate to="/map" />} />
          <Route path="/profile" element={<Profile currentUser={user} />} />
          <Route path="/deplacement" element={<DeplacementForm currentUser={user} />} />
          <Route path="/map" element={<Map />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
