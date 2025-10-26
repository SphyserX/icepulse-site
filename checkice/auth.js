// auth.js - AVEC SUPPORT GOOGLE
import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ✅ NOUVEAU: Provider Google
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Récupérer les éléments du DOM
const signupEmail = document.getElementById("signup-email");
const signupPassword = document.getElementById("signup-password");
const signupBtn = document.getElementById("signup-btn");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const authMessage = document.getElementById("auth-message");

// ✅ NOUVEAUX ÉLÉMENTS GOOGLE
const googleSignupBtn = document.getElementById("google-signup-btn");
const googleLoginBtn = document.getElementById("google-login-btn");

// --- INSCRIPTION PAR EMAIL ---
if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
        const email = signupEmail?.value;
        const password = signupPassword?.value;
        
        if (!email || !password) {
            showMessage("Veuillez remplir tous les champs", "error");
            return;
        }

        if (password.length < 6) {
            showMessage("Le mot de passe doit contenir au moins 6 caractères", "error");
            return;
        }

        try {
            showMessage("Création du compte...", "info");
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Créer le profil utilisateur
            await createUserProfile(user, { 
                email, 
                provider: 'email',
                emailVerified: false 
            });
            
            showMessage("Compte créé avec succès !", "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
            
        } catch (error) {
            console.error("❌ Erreur inscription:", error);
            showMessage(`Erreur: ${translateError(error.code)}`, "error");
        }
    });
}

// --- CONNEXION PAR EMAIL ---
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        const email = loginEmail?.value;
        const password = loginPassword?.value;
        
        if (!email || !password) {
            showMessage("Veuillez remplir tous les champs", "error");
            return;
        }

        try {
            showMessage("Connexion...", "info");
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            showMessage("Connexion réussie !", "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
            
        } catch (error) {
            console.error("❌ Erreur connexion:", error);
            showMessage(`Erreur: ${translateError(error.code)}`, "error");
        }
    });
}

// ✅ NOUVEAU: INSCRIPTION AVEC GOOGLE
if (googleSignupBtn) {
    googleSignupBtn.addEventListener("click", () => handleGoogleAuth('signup'));
}

// ✅ NOUVEAU: CONNEXION AVEC GOOGLE
if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", () => handleGoogleAuth('login'));
}

// ✅ FONCTION GOOGLE AUTH
async function handleGoogleAuth(mode = 'login') {
    try {
        showMessage(`${mode === 'signup' ? 'Inscription' : 'Connexion'} avec Google...`, "info");
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        console.log("✅ Connexion Google réussie:", user.displayName);
        
        // Vérifier si c'est un nouvel utilisateur
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            // Nouvel utilisateur - créer le profil
            await createUserProfile(user, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                provider: 'google',
                emailVerified: user.emailVerified
            });
        }
        
        showMessage("Connexion Google réussie !", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);
        
    } catch (error) {
        console.error("❌ Erreur Google Auth:", error);
        showMessage(`Erreur Google: ${translateError(error.code)}`, "error");
    }
}

// CRÉER PROFIL UTILISATEUR - CORRIGÉ avec isPublic par défaut
async function createUserProfile(user, additionalData) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userData = {
            email: user.email,
            username: additionalData.displayName || user.displayName || user.email.split('@')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            myRinks: [],
            visibility: 'public',
            isPublic: true,  // ← ✅ AJOUT OBLIGATOIRE - Tous les utilisateurs sont publics par défaut
            ...additionalData
        };
        
        await setDoc(userRef, userData);
        console.log('✅ Profil utilisateur créé avec isPublic: true -', user.uid);
    } catch (error) {
        console.error('❌ Erreur création profil:', error);
    }
}


// ✅ AFFICHER MESSAGES
function showMessage(message, type = "info") {
    if (!authMessage) return;
    
    const colors = {
        success: "text-green-600",
        error: "text-red-600",
        warning: "text-orange-600", 
        info: "text-blue-600"
    };
    
    authMessage.className = colors[type] || colors.info;
    authMessage.textContent = message;
    
    // Auto-clear après 5 secondes
    setTimeout(() => {
        if (authMessage) {
            authMessage.textContent = '';
        }
    }, 5000);
}

// ✅ TRADUIRE ERREURS
function translateError(errorCode) {
    const errors = {
        'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
        'auth/invalid-email': 'Adresse email invalide',
        'auth/user-not-found': 'Aucun utilisateur trouvé avec cet email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
        'auth/popup-closed-by-user': 'Connexion Google annulée',
        'auth/cancelled-popup-request': 'Connexion Google annulée'
    };
    
    return errors[errorCode] || 'Une erreur est survenue';
}

// --- Vérifier si l'utilisateur est déjà connecté ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('✅ Utilisateur connecté:', user.displayName || user.email);
        // Si on est sur la page login et déjà connecté, rediriger
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }
    } else {
        console.log('❌ Utilisateur déconnecté');
    }
});
