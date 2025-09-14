// checklist.js
import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Fonction pour ajouter une patinoire à la checklist (appelée depuis la carte par exemple)
export async function addToChecklist(rinkName, city) {
    if (window.checkIceApp) {
        await window.checkIceApp.addToChecklist(rinkName, city);
    } else {
        console.error("Application CheckIce non initialisée");
    }
}

// Fonction pour charger la checklist (legacy - maintenant gérée par app.js)
export async function loadChecklist() {
    if (window.checkIceApp) {
        await window.checkIceApp.loadChecklist();
    }
}

// Données exemple de patinoires pour la carte
export const sampleRinks = [
    {
        name: "Patinoire de Bercy",
        city: "Paris",
        coordinates: [48.8392, 2.3785],
        status: "Ouverte",
        ice_quality: "Excellente",
        next_maintenance: "45min",
        wait_time: "~12min"
    },
    {
        name: "Patinoire Charlemagne",
        city: "Lyon", 
        coordinates: [45.7640, 4.8357],
        status: "Ouverte",
        ice_quality: "Bonne",
        next_maintenance: "1h30",
        wait_time: "~5min"
    },
    {
        name: "Palais des Sports",
        city: "Marseille",
        coordinates: [43.2965, 5.3698],
        status: "Maintenance",
        ice_quality: "En cours",
        next_maintenance: "Fermée",
        wait_time: "Fermée"
    },
    {
        name: "Iceberg",
        city: "Toulouse",
        coordinates: [43.6047, 1.4442],
        status: "Ouverte",
        ice_quality: "Très bonne",
        next_maintenance: "2h15",
        wait_time: "~8min"
    },
    {
        name: "Patinoire de Mériadeck",
        city: "Bordeaux",
        coordinates: [44.8378, -0.5792],
        status: "Ouverte", 
        ice_quality: "Bonne",
        next_maintenance: "1h05",
        wait_time: "~15min"
    }
];
