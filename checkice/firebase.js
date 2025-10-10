// firebase.js - AVEC SUPPORT GOOGLE
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Configuration Firebase - VOTRE NOUVEAU PROJET
const firebaseConfig = {
  apiKey: "AIzaSyCzYCGsi3zJSZPd-O6cNuzNH7Bfy6zbnk4",
  authDomain: "checkice-app.firebaseapp.com",
  projectId: "checkice-app",
  storageBucket: "checkice-app.firebasestorage.app",
  messagingSenderId: "551425068468",
  appId: "1:551425068468:web:6337614147d99566e376e1",
  measurementId: "G-2LS032V29Q"
};

// Initialiser Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ✅ NOUVEAU: Configuration pour Google Auth (optionnel pour debug)
export const config = {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
};
