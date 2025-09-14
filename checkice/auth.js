// auth.js
import { auth } from "./firebase.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Récupérer les éléments du DOM
const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");
const signupBtn = document.getElementById("signup-btn");

const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");

const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userEmailDisplay = document.getElementById("user-email");
const authMessage = document.getElementById("auth-message");

// --- INSCRIPTION ---
signupBtn.addEventListener("click", () => {
  const email = signupEmail.value;
  const password = signupPassword.value;

  if (!email || !password) {
    authMessage.textContent = "Veuillez remplir tous les champs";
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      authMessage.textContent = `Compte créé pour : ${user.email}`;
      
      // Redirection vers la page principale
      window.location.href = "index.html";
    })
    .catch((error) => {
      authMessage.textContent = `Erreur : ${error.message}`;
    });
});

// --- CONNEXION ---
loginBtn.addEventListener("click", () => {
  const email = loginEmail.value;
  const password = loginPassword.value;

  if (!email || !password) {
    authMessage.textContent = "Veuillez remplir tous les champs";
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      authMessage.textContent = `Connecté : ${user.email}`;
      
      // Redirection vers la page principale
      window.location.href = "index.html";
    })
    .catch((error) => {
      authMessage.textContent = `Erreur : ${error.message}`;
    });
});

// --- DECONNEXION ---
logoutBtn.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      authMessage.textContent = "Déconnecté";
      userInfo.classList.add("hidden");
    })
    .catch((error) => {
      authMessage.textContent = `Erreur : ${error.message}`;
    });
});

// --- Vérifier si l'utilisateur est déjà connecté ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    userEmailDisplay.textContent = user.email;
    userInfo.classList.remove("hidden");
  } else {
    userInfo.classList.add("hidden");
  }
});
