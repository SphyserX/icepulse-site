// Import Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration Firebase fournie par la console
const firebaseConfig = {
  apiKey: "AIzaSyCMgAr8WHqRfUKWAuX_FBr6STTmxf2kNAM",
  authDomain: "checkice-88c83.firebaseapp.com",
  projectId: "checkice-88c83",
  storageBucket: "checkice-88c83.firebasestorage.app",
  messagingSenderId: "464899929644",
  appId: "1:464899929644:web:0da5a4c659a1361b4f0389",
  measurementId: "G-L49SRWT42P"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
