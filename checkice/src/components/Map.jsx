import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Fix icône par défaut Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

export default function Map() {
  const [patinoires, setPatinoires] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Lecture en temps réel des patinoires
    const unsubPat = onSnapshot(collection(db, "patinoires"), (snapshot) => {
      const pts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatinoires(pts);
    });

    // Lecture en temps réel des utilisateurs
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usrs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usrs);
    });

    return () => {
      unsubPat();
      unsubUsers();
    };
  }, []);

  // Fonction pour récupérer les utilisateurs présents et prévisionnels d'une patinoire
  const getUsersForPatinoire = (patId) => {
    const present = users.filter(u => u.patinoirePrincipale === patId);
    const previsionnel = users.filter(u =>
      u.deplacements && u.deplacements.some(d => d.patinoire === patId)
    );
    return { present, previsionnel };
  };

  return (
    <MapContainer center={[46, 2]} zoom={5} style={{ height: "80vh", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {patinoires.map(p => {
        const { present, previsionnel } = getUsersForPatinoire(p.id);
        return (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <h3>{p.nom}</h3>
              <p><strong>Adresse :</strong> {p.adresse}</p>
              <p><strong>Horaires :</strong> {p.horaires || "Inconnus"}</p>

              <strong>Présents :</strong>
              <ul>
                {present.length > 0 ? present.map(u => <li key={u.id}>{u.nom}</li>) : <li>Aucun</li>}
              </ul>
              <strong>Prévisionnel :</strong>
              <ul>
                {previsionnel.length > 0
                  ? previsionnel.map(u => (
                      <li key={u.id}>
                        {u.nom} (
                        {u.deplacements
                          .filter(d => d.patinoire === p.id)
                          .map(d => `${d.date} ${d.heure}`)
                          .join(", ")}
                        )
                      </li>
                    ))
                  : <li>Aucun</li>}
              </ul>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
