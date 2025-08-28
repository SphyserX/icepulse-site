// src/fetchHoraires.js
import fetch from "node-fetch";
import { db } from "./firebase.js";
import { doc, getDocs, collection, updateDoc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function fetchHorairesGoogle(adresse) {
  try {
    // Recherche du lieu sur Google Places
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(adresse)}&inputtype=textquery&fields=place_id&key=${API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || searchData.candidates.length === 0) {
      return "Inconnus";
    }

    const placeId = searchData.candidates[0].place_id;

    // Récupération des détails du lieu pour obtenir les horaires
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (!detailsData.result || !detailsData.result.opening_hours) {
      return "Inconnus";
    }

    return detailsData.result.opening_hours.weekday_text.join(" | ");
  } catch (err) {
    console.error("Erreur fetchHorairesGoogle :", err);
    return "Inconnus";
  }
}

async function main() {
  const patinoiresSnap = await getDocs(collection(db, "patinoires"));

  for (const docSnap of patinoiresSnap.docs) {
    const patinoire = docSnap.data();
    console.log(`Recherche des horaires pour ${patinoire.nom} (${patinoire.adresse}) ...`);

    const horaires = await fetchHorairesGoogle(patinoire.adresse);

    await updateDoc(doc(db, "patinoires", patinoire.id), { horaires });
    console.log(`Horaires mis à jour pour ${patinoire.nom} : ${horaires}`);
  }

  console.log("Toutes les patinoires ont été mises à jour avec leurs horaires !");
}

main();
