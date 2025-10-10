// main.js - VERSION CORRIGÉE ET OPTIMISÉE COMPLÈTE
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { onAuthStateChanged, signOut, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

// Variables globales optimisées
let rinkCheckboxListeners = [];
let userProfile = null;
let appInitialized = false;
let savingRinks = false;
let pointsListener = null;
let userProfileListener = null;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de l\'application CHECKICE...');
    
    if (appInitialized) {
        console.log('Application déjà initialisée');
        return;
    }
    
    try {
        initializeProfile();
        createTopHeaderMenus();
        displayEvents();
        
        // NOUVELLE INTERFACE SOCIALE MODERNE - AJOUT ICI
        console.log('🔄 Chargement de la nouvelle interface sociale...');
        import('./friends-ui.js').then(module => {
            try {
                module.initializeFriendsUI();
                console.log('✅ Interface sociale moderne initialisée !');
            } catch (error) {
                console.error('❌ Erreur interface sociale:', error);
            }
        }).catch(error => {
            console.error('❌ Erreur chargement friends-ui.js:', error);
        });

        // ✨ NOUVEAU : Système de canaux d'événements
        console.log('📢 Chargement du système de canaux d\'événements...');
        import('./event-channels.js').then(module => {
            console.log('✅ Système de canaux chargé !');
            // Améliorer le formulaire admin après un délai
            setTimeout(() => {
                if (window.eventChannelsSystem) {
                    window.eventChannelsSystem.enhanceEventAdminForm();
                    console.log('✅ Formulaire admin amélioré avec canaux de diffusion');
                }
            }, 1500);
        }).catch(error => {
            console.error('❌ Erreur chargement event-channels.js:', error);
            console.warn('⚠️ Le système de canaux ne sera pas disponible');
        });
        
        // Initialiser la géolocalisation après un délai
        setTimeout(() => {
            if (window.locationManager) {
                window.locationManager.init();
            }
        }, 2000);
        
        appInitialized = true;
        console.log('✅ Application initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showNotification('Erreur d\'initialisation de l\'application', 'error');
    }
});


function initializeProfile() {
    console.log('Initialisation du profil...');
    
    const profileButton = document.getElementById('profile-button');
    const profileMenu = document.getElementById('profile-menu');
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Vérifier que tous les éléments existent
    if (!profileButton || !profileMenu) {
        console.warn('Éléments de profil non trouvés dans le DOM');
        return;
    }
    
    console.log('Éléments de profil trouvés');
    
    // NOUVEAU : Créer le bouton Mon Compte dans le menu profil
    createAccountButton(profileMenu);
    
    // Gestion du clic sur le bouton profil
    profileButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Clic sur bouton profil');
        profileMenu.classList.toggle('active');
        closeAllModals();
    });
    
    // Fermer le menu si on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!profileMenu.contains(e.target) && !profileButton.contains(e.target)) {
            profileMenu.classList.remove('active');
        }
    });
    
    // Empêcher la fermeture si on clique à l'intérieur du menu profil
    profileMenu.addEventListener('click', (e) => e.stopPropagation());
    
    // Gestion de la déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Nettoyer les listeners avant déconnexion
                cleanup();
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Erreur lors de la déconnexion:', error);
                showNotification('Erreur lors de la déconnexion', 'error');
            }
        });
    }
    
    // SAUVEGARDE AUTOMATIQUE DU PSEUDO dans Firebase
    if (profileUsername) {
        let saveTimeout;
        
        profileUsername.addEventListener('blur', async () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                await saveUsernameToFirebase();
            }, 300); // Debounce de 300ms
        });
        
        profileUsername.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                clearTimeout(saveTimeout);
                await saveUsernameToFirebase();
                profileUsername.blur();
            }
        });
    }
}

// Écouter l'authentification Firebase
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.currentUser = user;
        await loadUserProfile(user);
        await createEventAdminPanel();
        await updateHeaderLevelDisplay();
        cleanupDuplicateLevelButtons();
        setupPointsListener();
    } else {
        cleanup();
        window.location.href = 'login.html';
    }
});

function setupPointsListener() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Nettoyer l'ancien listener s'il existe
    if (pointsListener) {
        pointsListener();
        pointsListener = null;
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    pointsListener = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            console.log('Points modifiés, mise à jour du header...');
            const userData = doc.data();
            userProfile = userData;
            updateHeaderLevelDisplay(); // Ceci va appeler updatePointsDisplay aussi
            
            // Animation sur le bouton points
            const pointsButton = document.getElementById('header-points-button');
            if (pointsButton) {
                pointsButton.classList.add('points-updated');
                setTimeout(() => {
                    pointsButton.classList.remove('points-updated');
                }, 1000);
            }
        }
    }, (error) => {
        console.error('Erreur listener points:', error);
    });
}

// Créé les boutons "Mes Patinoires" et "Mes Déplacements" et les range
function createTopHeaderMenus() {
    console.log('Création des boutons header...');
    
    // 1. Trouver ou créer le conteneur du header
    let headerButtons = document.getElementById('dynamic-header-buttons');
    if (!headerButtons) {
        headerButtons = document.createElement('div');
        headerButtons.id = 'dynamic-header-buttons';
        headerButtons.className = 'header-buttons';
        
        // On l'insère juste avant le bouton de notifications s'il existe, sinon on le met à la fin du premier header rencontré
        const notif = document.getElementById('notification-button');
        if (notif && notif.parentElement) {
            notif.parentElement.parentElement.insertBefore(headerButtons, notif.parentElement);
        } else {
            const firstHeader = document.querySelector('header, .header-container') || document.body;
            firstHeader.prepend(headerButtons);
        }
    }

    // 2. Nettoyer d'anciens doublons
    ['header-rinks-button', 'header-moves-button'].forEach(id => {
        const old = document.getElementById(id);
        if (old) old.remove();
    });

    // 3. Créer les deux boutons
    const rinksBtn = document.createElement('button');
    rinksBtn.id = 'header-rinks-button';
    rinksBtn.className = 'ice-button';
    rinksBtn.style.width = '3rem';
    rinksBtn.style.height = '3rem';
    rinksBtn.style.padding = '0';
    rinksBtn.style.display = 'flex';
    rinksBtn.style.alignItems = 'center';
    rinksBtn.style.justifyContent = 'center';
    rinksBtn.innerHTML = `
        <svg viewBox="0 0 64 64" fill="white" xmlns="http://www.w3.org/2000/svg" style="width: 55%; height: 55%; display: block;">
            <path d="M32 12l22 22h-6v18h-12v-12h-8v12h-12v-18h-6z"/>
        </svg>
    `;
    rinksBtn.title = 'Cliquez pour choisir vos patinoires préférées';
    rinksBtn.setAttribute('aria-label', 'Choisir mes patinoires préférées');

    const movesBtn = document.createElement('button');
    movesBtn.id = 'header-moves-button';
    movesBtn.textContent = 'Mes Déplacements';
    movesBtn.className = 'ice-button';

    // 4. Les insérer
    headerButtons.appendChild(rinksBtn);
    headerButtons.appendChild(movesBtn);

    // 5. Créer les modales et lier les events
    createRinksModal();
    createMovesModal();
    setupHeaderEvents();

    console.log('Boutons header prêts ✅');
}

// CORRECTION : Créer la modale "Mes Patinoires" avec contenu HTML complet
function createRinksModal() {
    const existingModal = document.getElementById('rinks-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'rinks-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content frost-effect">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Mes Patinoires</h2>
                <button id="close-rinks-modal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
            </div>
            <div id="rinks-checkbox-container" class="space-y-2 max-h-64 overflow-y-auto mb-6">
                <!-- Les patinoires seront chargées ici -->
            </div>
            <div class="flex justify-end space-x-3">
                <button id="cancel-rinks-modal" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">Annuler</button>
                <button id="save-rinks-modal" class="ice-button px-4 py-2 rounded-lg text-white">Fermer</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setupRinksModalEvents(modal);
}

// CORRECTION : Créer la modale "Mes Déplacements" avec contenu HTML complet
function createMovesModal() {
    const existingModal = document.getElementById('moves-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'moves-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content frost-effect">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Mes Déplacements</h2>
                <button id="close-moves-modal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
            </div>
            <form id="moves-modal-form" class="mb-6">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Patinoire</label>
                        <select id="moves-modal-rink-select" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Sélectionner une patinoire</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input type="date" id="moves-modal-date-input" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                        <input type="time" id="moves-modal-time-input" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" id="cancel-moves-form" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">Annuler</button>
                    <button type="submit" class="ice-button px-4 py-2 rounded-lg text-white">Sauvegarder</button>
                </div>
            </form>
            <div id="moves-modal-list-container" class="max-h-48 overflow-y-auto">
                <!-- Liste des déplacements -->
            </div>
            <div class="flex justify-end mt-6">
                <button id="close-moves-modal-bottom" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">Fermer</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setupMovesModalEvents(modal);
}

// Configurer les événements des boutons header
function setupHeaderEvents() {
    console.log('Configuration des événements header...');

    // Bouton "Mes Patinoires"
    const rinksBtn = document.getElementById('header-rinks-button');
    if (rinksBtn) {
        rinksBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            console.log('Clic sur "Mes Patinoires"');
            closeAllModals();
            
            const modal = document.getElementById('rinks-modal');
            modal.classList.add('active');
            
            // Charger les patinoires d'abord
            await loadRinksForSelection();
            
            // Attendre un petit délai pour être sûr que le DOM est mis à jour
            setTimeout(async () => {
                await loadUserRinksFromFirebase();
            }, 150);
        });
    }

    // Bouton "Mes Déplacements"
    const movesBtn = document.getElementById('header-moves-button');
    if (movesBtn) {
        movesBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            console.log('Clic sur "Mes Déplacements"');
            closeAllModals();
            
            const modal = document.getElementById('moves-modal');
            modal.classList.add('active');
            
            await loadRinksForMovesModal();
            await loadUserMovesModal();
            
            // Date minimum = aujourd'hui
            const dateInput = document.getElementById('moves-modal-date-input');
            if (dateInput) {
                dateInput.min = new Date().toISOString().split('T')[0];
            }
        });
    }
}

// Configurer les événements de la modale patinoires - VERSION SANS CONFLIT
function setupRinksModalEvents(modal) {
    const closeBtn = modal.querySelector('#close-rinks-modal');
    const cancelBtn = modal.querySelector('#cancel-rinks-modal');
    const saveBtn = modal.querySelector('#save-rinks-modal');

    const closeModal = () => {
        // Nettoyer les event listeners avant de fermer
        cleanupRinkListeners();
        modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // MODIFIER : Le bouton devient juste un bouton de fermeture
    saveBtn.textContent = 'Fermer';
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        showNotification('Vos préférences sont sauvegardées automatiquement!', 'info');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    modal.querySelector('.modal-content').addEventListener('click', (e) => e.stopPropagation());
}

// Configurer les événements de la modale déplacements
function setupMovesModalEvents(modal) {
    const closeBtn = modal.querySelector('#close-moves-modal');
    const closeBtnBottom = modal.querySelector('#close-moves-modal-bottom');
    const cancelFormBtn = modal.querySelector('#cancel-moves-form');
    const form = modal.querySelector('#moves-modal-form');

    const closeModal = () => {
        modal.classList.remove('active');
        resetMovesModalForm();
    };

    closeBtn.addEventListener('click', closeModal);
    closeBtnBottom.addEventListener('click', closeModal);
    cancelFormBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetMovesModalForm();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUserMoveModal();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    modal.querySelector('.modal-content').addEventListener('click', (e) => e.stopPropagation());
}

// NOUVEAU : Créer le bouton Mon Compte dans le menu profil
function createAccountButton(profileMenu) {
    console.log('Création du bouton Mon Compte...');
    
    // Supprimer les anciens boutons du menu profil s'ils existent
    const oldRinksBtn = document.getElementById('my-rinks-btn');
    const oldMovesBtn = document.getElementById('my-moves-btn');
    if (oldRinksBtn) oldRinksBtn.remove();
    if (oldMovesBtn) oldMovesBtn.remove();

    // Créer le bouton Mon Compte
    const accountBtn = document.createElement('button');
    accountBtn.id = 'account-btn';
    accountBtn.className = 'w-full text-left p-2 border-none bg-none cursor-pointer rounded text-sm transition-colors text-gray-700 hover:bg-gray-100';
    accountBtn.innerHTML = `
        <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
        </svg>
        Mon Compte
    `;

    // Insérer dans le menu profil avant le bouton de déconnexion
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        const separator = document.createElement('hr');
        separator.className = 'my-2 border-gray-200';
        logoutBtn.parentNode.insertBefore(separator, logoutBtn);
        logoutBtn.parentNode.insertBefore(accountBtn, logoutBtn);
    } else {
        profileMenu.appendChild(accountBtn);
    }

    // Event listener
    accountBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        console.log('Clic sur Mon Compte');
        await openAccountSettings();
    });

    console.log('Bouton Mon Compte créé ✅');
}

// NOUVEAU : Ouvrir les paramètres de compte
async function openAccountSettings() {
    // Fermer le menu profil d'abord
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) profileMenu.classList.remove('active');
    
    closeAllModals();
    
    let accountModal = document.getElementById('account-settings-modal');
    if (!accountModal) {
        accountModal = createAccountSettingsModal();
    }
    
    accountModal.classList.add('active');
    await loadCurrentAccountSettings();
}

function createAccountSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'account-settings-modal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content frost-effect">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Paramètres du compte</h2>
                <button id="close-account-modal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
            </div>
            
            <form id="account-settings-form">
                <div class="space-y-4">
                    <!-- ✅ Section Photo de profil -->
                    <div class="border-b border-gray-200 pb-4 mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-3">Photo de profil</label>
                        <div class="flex items-center space-x-4">
                            <div id="profile-photo-preview" class="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
                                U
                            </div>
                            
                            <div class="flex-1">
                                <input type="file" id="profile-photo-input" accept="image/*" class="hidden">
                                <button type="button" id="upload-photo-btn" class="ice-button px-4 py-2 rounded-lg text-white text-sm mb-2">
                                    Choisir une photo
                                </button>
                                <button type="button" id="remove-photo-btn" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm ml-2" style="display: none;">
                                    Supprimer
                                </button>
                                <p class="text-xs text-gray-500 mt-2">JPG, PNG ou GIF - Max 2 MB</p>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Visibilité du profil</label>
                        <select id="profile-visibility" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="public">Public</option>
                            <option value="private">Privé</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                        <textarea id="user-bio" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" rows="4" maxlength="200" placeholder="Parlez-nous un peu de vous... (max 200 caractères)"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nouvel email</label>
                        <input type="email" id="new-email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                        <input type="password" id="new-password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel (requis pour changer email/mot de passe)</label>
                        <input type="password" id="current-password" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button type="button" id="cancel-account-settings" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">Annuler</button>
                    <button type="submit" class="ice-button px-4 py-2 rounded-lg text-white">Sauvegarder</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    setupAccountModalEvents(modal);
    return modal;
}



// Fermer toutes les modales
function closeAllModals() {
    const modals = ['rinks-modal', 'moves-modal', 'account-settings-modal', 'event-admin-modal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    });
}

// Fonction ferme compatible avec l'ancien code
function closeAllTopMenus() {
    closeAllModals();
}

// FIREBASE : Charger les patinoires pour sélection - VERSION CORRIGÉE DÉFINITIVE
async function loadRinksForSelection() {
    const container = document.getElementById('rinks-checkbox-container');
    if (!container) return;

    try {
        // ÉTAPE 1 : Nettoyer les anciens event listeners
        cleanupRinkListeners();
        
        container.innerHTML = '<p>Chargement...</p>';

        const rinksCollection = collection(db, 'rinks');
        const rinksSnapshot = await getDocs(rinksCollection);

        container.innerHTML = '';

        if (!rinksSnapshot.empty) {
            const fragment = document.createDocumentFragment();
            
            rinksSnapshot.forEach((doc) => {
                const rinkData = doc.data();
                if (rinkData.name) {
                    const label = document.createElement('label');
                    label.className = 'flex items-center cursor-pointer p-2 rounded-lg hover:bg-white hover:bg-opacity-60 transition-colors';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = rinkData.city ? `${rinkData.name} - ${rinkData.city}` : rinkData.name;
                    checkbox.name = 'modal-user-rinks';
                    checkbox.className = 'mr-3 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500';

                    // ÉTAPE 2 : Créer le handler avec une référence unique
                    const changeHandler = async (e) => {
                        console.log('Changement:', e.target.value, '- Coché:', e.target.checked);
                        // Petit délai pour éviter les conflits
                        setTimeout(async () => {
                            await saveUserRinksToFirebase();
                        }, 100);
                    };

                    // ÉTAPE 3 : Ajouter l'event listener et le stocker
                    checkbox.addEventListener('change', changeHandler);
                    rinkCheckboxListeners.push({ element: checkbox, handler: changeHandler });

                    const text = document.createElement('span');
                    text.textContent = rinkData.city ? `${rinkData.name} - ${rinkData.city}` : rinkData.name;
                    text.className = 'text-sm text-gray-700 font-medium';

                    label.appendChild(checkbox);
                    label.appendChild(text);
                    fragment.appendChild(label);
                }
            });

            container.appendChild(fragment);
            
            // Attendre que le DOM soit complètement mis à jour
            await new Promise(resolve => setTimeout(resolve, 150));
        } else {
            container.innerHTML = '<p>Aucune patinoire trouvée</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des patinoires:', error);
        container.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

// Nettoyer les listeners des checkboxes
function cleanupRinkListeners() {
    rinkCheckboxListeners.forEach(({ element, handler }) => {
        if (element && handler) {
            element.removeEventListener('change', handler);
        }
    });
    rinkCheckboxListeners = [];
}

// FIREBASE : Charger les patinoires sauvegardées de l'utilisateur
async function loadUserRinksFromFirebase() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            const userRinks = data.myRinks || [];
            
            const checkboxes = document.querySelectorAll('input[name="modal-user-rinks"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = userRinks.includes(checkbox.value);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des patinoires utilisateur:', error);
    }
}

// FIREBASE : Sauvegarder les patinoires sélectionnées - VERSION ULTRA-ROBUSTE
async function saveUserRinksToFirebase() {
    const user = auth.currentUser;
    if (!user) {
        console.error('Utilisateur non connecté');
        return;
    }

    // Éviter les appels multiples simultanés
    if (savingRinks) {
        console.log('Sauvegarde déjà en cours, ignoré');
        return;
    }

    savingRinks = true;

    try {
        // Attendre un délai pour s'assurer que le DOM est stable
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const allCheckboxes = document.querySelectorAll('input[name="modal-user-rinks"]');
        const checkedBoxes = document.querySelectorAll('input[name="modal-user-rinks"]:checked');
        
        console.log('Total checkboxes:', allCheckboxes.length);
        console.log('Checkboxes cochées:', checkedBoxes.length);
        
        const selectedRinks = Array.from(checkedBoxes).map(cb => cb.value);
        
        console.log('Sauvegarde de', selectedRinks.length, 'patinoires :', selectedRinks);

        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            await updateDoc(userDocRef, {
                myRinks: selectedRinks,
                updatedAt: new Date().toISOString()
            });
        } else {
            await setDoc(userDocRef, {
                email: user.email,
                myRinks: selectedRinks,
                username: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        console.log('Sauvegarde réussie:', selectedRinks.length, 'patinoires');
        
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
    } finally {
        // Libérer le verrou
        savingRinks = false;
    }
}

// FIREBASE : Charger les patinoires pour le sélecteur des déplacements
async function loadRinksForMovesModal() {
    const rinkSelect = document.getElementById('moves-modal-rink-select');
    if (!rinkSelect) return;

    try {
        // Supprimer les anciennes options
        const options = rinkSelect.querySelectorAll('option:not(:first-child)');
        options.forEach(option => option.remove());

        const rinksCollection = collection(db, 'rinks');
        const rinksSnapshot = await getDocs(rinksCollection);

        if (!rinksSnapshot.empty) {
            rinksSnapshot.forEach((doc) => {
                const rinkData = doc.data();
                if (rinkData.name) {
                    const option = document.createElement('option');
                    option.value = rinkData.city ? `${rinkData.name} - ${rinkData.city}` : rinkData.name;
                    option.textContent = rinkData.city ? `${rinkData.name} - ${rinkData.city}` : rinkData.name;
                    rinkSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des patinoires:', error);
        showNotification('Erreur lors du chargement des patinoires', 'error');
    }
}

// FIREBASE : Charger les déplacements de l'utilisateur
async function loadUserMovesModal() {
    const user = auth.currentUser;
    if (!user) return;

    const movesContainer = document.getElementById('moves-modal-list-container');
    if (!movesContainer) return;

    try {
        const movesCollection = collection(db, 'moves');
        const movesQuery = query(movesCollection, where('userId', '==', user.uid));
        const movesSnapshot = await getDocs(movesQuery);

        movesContainer.innerHTML = '';

        if (movesSnapshot.empty) {
            movesContainer.innerHTML = '<p>Aucun déplacement prévu</p>';
            return;
        }

        const moves = [];
        movesSnapshot.forEach((doc) => {
            moves.push({ id: doc.id, ...doc.data() });
        });

        // Trier par date
        moves.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateA - dateB;
        });

        moves.forEach((move) => {
            const moveCard = document.createElement('div');
            moveCard.className = 'p-3 bg-white rounded-lg border border-gray-200 mb-2';

            const moveDate = new Date(`${move.date} ${move.time}`);
            const isUpcoming = moveDate > new Date();
            const statusClass = isUpcoming ? 'text-green-600' : 'text-gray-500';

            moveCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-medium">${move.rink}</p>
                        <p class="text-sm ${statusClass}">${formatMoveDate(move.date, move.time)}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="edit-move-modal-btn text-blue-600 hover:text-blue-800" data-move-id="${move.id}">✏️</button>
                        <button class="delete-move-modal-btn text-red-600 hover:text-red-800" data-move-id="${move.id}">🗑️</button>
                    </div>
                </div>
            `;

            movesContainer.appendChild(moveCard);
        });

        setupMoveModalActions();
    } catch (error) {
        console.error('Erreur lors du chargement des déplacements:', error);
        movesContainer.innerHTML = '<p>Erreur lors du chargement</p>';
    }
}

// FIREBASE : Sauvegarder un déplacement
async function saveUserMoveModal() {
    const user = auth.currentUser;
    
    console.log('Utilisateur actuel:', user ? user.uid : 'AUCUN');
    if (!user) {
        console.error('Aucun utilisateur connecté');
        showNotification('Vous devez être connecté', 'error');
        return;
    }

    const form = document.getElementById('moves-modal-form');
    const rink = document.getElementById('moves-modal-rink-select').value;
    const date = document.getElementById('moves-modal-date-input').value;
    const time = document.getElementById('moves-modal-time-input').value;
    const editingId = form.dataset.editingMoveId;

    console.log('Données du formulaire:', { rink, date, time, editingId });

    if (!rink || !date || !time) {
        console.error('Champs manquants:', { rink: !!rink, date: !!date, time: !!time });
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    try {
        const moveData = {
            userId: user.uid,
            rink: rink,
            date: date,
            time: time,
            updatedAt: new Date().toISOString()
        };

        console.log('Données à sauvegarder:', moveData);

        if (editingId) {
            console.log('Modification du déplacement:', editingId);
            const moveRef = doc(db, 'moves', editingId);
            await updateDoc(moveRef, moveData);
            console.log('Déplacement modifié avec succès');
            showNotification('Déplacement modifié avec succès', 'success');
        } else {
            console.log('Ajout d\'un nouveau déplacement');
            moveData.createdAt = new Date().toISOString();
            const docRef = await addDoc(collection(db, 'moves'), moveData);
            console.log('Nouveau déplacement créé avec ID:', docRef.id);
            showNotification('Déplacement ajouté avec succès', 'success');
        }

        resetMovesModalForm();
        await loadUserMovesModal();
        
    } catch (error) {
        console.error('ERREUR DÉTAILLÉE lors de la sauvegarde:', error);
        console.error('Code d\'erreur:', error.code);
        console.error('Message d\'erreur:', error.message);

        let errorMessage = 'Erreur lors de la sauvegarde';
        if (error.code === 'permission-denied') {
            errorMessage = 'Permissions insuffisantes. Vérifiez les règles Firestore.';
        } else if (error.code === 'unauthenticated') {
            errorMessage = 'Vous devez être connecté pour sauvegarder.';
        }
        showNotification(errorMessage, 'error');
    }
}

// Réinitialiser le formulaire
function resetMovesModalForm() {
    const form = document.getElementById('moves-modal-form');
    if (form) {
        form.reset();
        delete form.dataset.editingMoveId;
        
        const saveBtn = form.querySelector('button[type="submit"]');
        if (saveBtn) saveBtn.textContent = 'Sauvegarder';
    }
}

// Configurer les actions sur les déplacements
function setupMoveModalActions() {
    document.querySelectorAll('.edit-move-modal-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await editMoveModal(btn.dataset.moveId);
        });
    });

    document.querySelectorAll('.delete-move-modal-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteMoveModal(btn.dataset.moveId);
        });
    });
}

// Modifier un déplacement
async function editMoveModal(moveId) {
    try {
        const moveRef = doc(db, 'moves', moveId);
        const moveSnap = await getDoc(moveRef);
        
        if (moveSnap.exists()) {
            const moveData = moveSnap.data();
            
            document.getElementById('moves-modal-rink-select').value = moveData.rink;
            document.getElementById('moves-modal-date-input').value = moveData.date;
            document.getElementById('moves-modal-time-input').value = moveData.time;
            
            const form = document.getElementById('moves-modal-form');
            form.dataset.editingMoveId = moveId;
            
            const saveBtn = form.querySelector('button[type="submit"]');
            saveBtn.textContent = 'Modifier';
        }
    } catch (error) {
        console.error('Erreur lors de l\'édition:', error);
        showNotification('Erreur lors de l\'édition', 'error');
    }
}

// Supprimer un déplacement
async function deleteMoveModal(moveId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce déplacement ?')) return;

    try {
        const moveRef = doc(db, 'moves', moveId);
        await deleteDoc(moveRef);
        showNotification('Déplacement supprimé', 'success');
        await loadUserMovesModal();
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// Formater la date et l'heure pour l'affichage
function formatMoveDate(date, time) {
    const moveDate = new Date(`${date} ${time}`);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    };
    return moveDate.toLocaleDateString('fr-FR', options);
}

function setupAccountModalEvents(modal) {
    const closeBtn = modal.querySelector('#close-account-modal');
    const cancelBtn = modal.querySelector('#cancel-account-settings');
    const form = modal.querySelector('#account-settings-form');
    const uploadBtn = modal.querySelector('#upload-photo-btn');
    const removeBtn = modal.querySelector('#remove-photo-btn');
    const fileInput = modal.querySelector('#profile-photo-input');
    const preview = modal.querySelector('#profile-photo-preview');

    
    // ✨ NOUVEAU : Éléments pour validation dynamique
    const currentPasswordInput = document.getElementById('current-password');
    const newEmailInput = document.getElementById('new-email');
    const newPasswordInput = document.getElementById('new-password');
    
    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modal.querySelector('.modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // ✨ NOUVEAU : Validation dynamique du mot de passe
    function updatePasswordRequirement() {
        const emailFilled = newEmailInput.value.trim().length > 0;
        const passwordFilled = newPasswordInput.value.trim().length > 0;
        
        if (emailFilled || passwordFilled) {
            // Rendre le mot de passe requis
            currentPasswordInput.setAttribute('required', 'required');
            currentPasswordInput.parentElement.querySelector('label').innerHTML = 
                'Mot de passe actuel <span class="text-red-500">*</span>';
        } else {
            // Retirer l'obligation
            currentPasswordInput.removeAttribute('required');
            currentPasswordInput.parentElement.querySelector('label').textContent = 
                'Mot de passe actuel (requis pour changer email/mot de passe)';
        }
    }
    
    // Écouter les changements sur email et mot de passe
    newEmailInput.addEventListener('input', updatePasswordRequirement);
    newPasswordInput.addEventListener('input', updatePasswordRequirement);
    // Upload photo
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                showNotification('Image trop grande (max 2 MB)', 'error');
                return;
            }
            if (!file.type.startsWith('image/')) {
                showNotification('Format invalide', 'error');
                return;
            }
            await uploadProfilePhoto(file, preview, removeBtn);
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
            await removeProfilePhoto(preview, removeBtn);
        });
    }

    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAccountSettings();
        closeModal();
    });
}


// ✅ CORRIGÉ - Charger les paramètres actuels avec isPublic
async function loadCurrentAccountSettings() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // ✅ NOUVEAU - Utiliser isPublic au lieu de visibility
            const isPublic = userData.isPublic !== false; // Par défaut public si pas défini
            const visibility = isPublic ? 'public' : 'private';
            
            const visibilitySelect = document.getElementById('profile-visibility');
            if (visibilitySelect) {
                visibilitySelect.value = visibility;
            }
            
            const bioTextarea = document.getElementById('user-bio');
            if (bioTextarea) {
                bioTextarea.value = userData.bio || '';
            }
            
            const emailInput = document.getElementById('new-email');
            if (emailInput) {
                emailInput.placeholder = `Email actuel: ${user.email}`;
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des paramètres:', error);
    }
}


async function saveAccountSettings() {
    const user = auth.currentUser;
    if (!user) return;
    
    const visibility = document.getElementById('profile-visibility').value;
    const newEmail = document.getElementById('new-email').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const currentPassword = document.getElementById('current-password').value.trim();
    const bio = document.getElementById('user-bio').value.trim();
    
    // ✨ NOUVEAU : Vérifier si le mot de passe est nécessaire
    const needsPassword = newEmail || newPassword;
    
    if (needsPassword && !currentPassword) {
        showNotification('Le mot de passe actuel est requis pour modifier email ou mot de passe', 'error');
        return;
    }
    
    try {
        // ✨ NOUVEAU : Sauvegarder visibilité et bio SANS authentification
        const userDocRef = doc(db, 'users', user.uid);
        const isPublic = (visibility === 'public');
        
        await updateDoc(userDocRef, {
            visibility: visibility,
            isPublic: isPublic,
            bio: bio,
            updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Visibilité et bio sauvegardées');
        
        // ✨ NOUVEAU : Ré-authentification UNIQUEMENT si nécessaire
        if (needsPassword) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            
            // Mettre à jour l'email si changé
            if (newEmail && newEmail !== user.email) {
                await updateEmail(user, newEmail);
                showNotification('Email mis à jour avec succès', 'success');
            }
            
            // Mettre à jour le mot de passe si fourni
            if (newPassword) {
                if (newPassword.length < 6) {
                    showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
                    return;
                }
                await updatePassword(user, newPassword);
                showNotification('Mot de passe mis à jour avec succès', 'success');
            }
        } else {
            // Notification simple pour bio/visibilité
            showNotification('Profil mis à jour avec succès', 'success');
        }
        
        // Fermer le menu profil
        const profileMenu = document.getElementById('profile-menu');
        if (profileMenu) {
            profileMenu.classList.remove('active');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde:', error);
        
        let errorMessage = 'Erreur lors de la mise à jour';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Mot de passe actuel incorrect';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Cette adresse email est déjà utilisée';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Adresse email invalide';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Le mot de passe est trop faible';
        }
        
        showNotification(errorMessage, 'error');
    }
}



// FIREBASE : Sauvegarder automatiquement le pseudo
async function saveUsernameToFirebase() {
    const user = auth.currentUser;
    const profileUsername = document.getElementById('profile-username');

    if (!user || !profileUsername) return;

    const newUsername = profileUsername.value.trim();
    if (!newUsername) return;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            await updateDoc(userDocRef, {
                username: newUsername,
                updatedAt: new Date().toISOString()
            });
        } else {
            await setDoc(userDocRef, {
                email: user.email,
                username: newUsername,
                myRinks: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        updateAvatar(newUsername || user.email);
        showNotification('Pseudo sauvegardé avec succès', 'success');

    } catch (error) {
        console.error('Erreur lors de la sauvegarde du pseudo:', error);
        showNotification('Erreur lors de la sauvegarde du pseudo', 'error');
    }
}

// Charger le profil utilisateur
async function loadUserProfile(user) {
    const profileEmail = document.getElementById('profile-email');
    const profileUsername = document.getElementById('profile-username');
    const profileAvatar = document.getElementById('profile-avatar');

    if (profileEmail) profileEmail.textContent = user.email;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            userProfile = data;
            
            if (profileUsername) profileUsername.value = data.username || '';
            updateAvatar(data.username || user.email);
        } else {
            const newUserData = {
                email: user.email,
                username: '',
                myRinks: [],
                moves: [],
                points: 0,
                level: 1,
                createdAt: new Date().toISOString()
            };
            
            await setDoc(userDocRef, newUserData);
            userProfile = newUserData;
            console.log('Nouveau profil utilisateur créé');
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        showNotification('Erreur lors du chargement du profil', 'error');
    }
}

// Mettre à jour l'avatar avec les initiales
function updateAvatar(name) {
    const profileAvatar = document.getElementById('profile-avatar');
    const profileButton = document.getElementById('profile-button');

    if (!name) return;

    const initials = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);

    if (profileButton) profileButton.textContent = initials;

    if (profileAvatar) {
        profileAvatar.textContent = initials;
        profileAvatar.className = 'w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-lg';
    }
}

// FONCTION SHOWNOTIFICATION CORRIGÉE - SANS BOUCLE INFINIE
function showNotification(message, type = 'info') {
    // Protection absolue contre les boucles infinies
    if (window.notificationInProgress) {
        console.log('Notification bloquée (en cours):', message);
        return;
    }

    try {
        window.notificationInProgress = true;
        
        // Supprimer les notifications existantes
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => {
            if (notif.parentNode) {
                notif.parentNode.removeChild(notif);
            }
        });

        // Créer la nouvelle notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${getNotificationIcon(type)}
                </div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        // Ajouter au DOM
        document.body.appendChild(notification);

        // Animation d'apparition
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Suppression automatique
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 4000);

    } catch (error) {
        console.error('Erreur notification:', error);
    } finally {
        // Libérer le verrou après un court délai
        setTimeout(() => {
            window.notificationInProgress = false;
        }, 100);
    }
}

// FONCTION UTILITAIRE POUR LES ICÔNES
function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        case 'error':
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        case 'warning':
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>';
        default:
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    }
}

// === GESTION DES ÉVÉNEMENTS ===

async function loadEventsFromFirebase() {
    try {
        const eventsCollection = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsCollection);
        const events = [];
        eventsSnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        events.sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
        return events;
    } catch (error) {
        console.error('Erreur chargement événements:', error);
        return [];
    }
}

async function displayEvents() {
    const events = await loadEventsFromFirebase();
    let eventsContainer = document.querySelector('.content-section.active .space-y-4') ||
                         document.querySelector('#events-section') ||
                         document.querySelector('[data-tab="events"]') ||
                         document.querySelector('.space-y-4');

    if (!eventsContainer) {
        const mainContainer = document.querySelector('.content-section') || document.body;
        const eventsSection = document.createElement('div');
        eventsSection.id = 'events-section';
        eventsSection.className = 'content-section';
        const eventsHeader = document.createElement('h2');
        eventsHeader.textContent = 'Événements';
        eventsHeader.className = 'text-2xl font-bold text-gray-800 mb-6';
        eventsContainer = document.createElement('div');
        eventsContainer.className = 'space-y-4';
        eventsSection.appendChild(eventsHeader);
        eventsSection.appendChild(eventsContainer);
        mainContainer.appendChild(eventsSection);
    }

    eventsContainer.innerHTML = '';

    if (events.length === 0) {
        const noEvents = document.createElement('p');
        noEvents.textContent = 'Aucun événement trouvé';
        noEvents.className = 'text-gray-500 text-center py-8';
        eventsContainer.appendChild(noEvents);
        return;
    }

    for (const event of events) {
        const eventCard = await createEventCard(event);
        eventsContainer.appendChild(eventCard);
    }
}

async function createEventCard(event) {
    const user = auth.currentUser;
    const isRegistered = user && event.attendees && event.attendees.includes(user.uid);
    const spotsLeft = event.capacity - (event.attendees?.length || 0);
    const isFull = spotsLeft <= 0;
    
    const eventCard = document.createElement('div');
    eventCard.className = 'frost-effect rounded-xl p-6 card-hover mb-4';

    const typeColors = {
        'tournament': 'event-type-tournament',
        'competition': 'event-type-competition',
        'show': 'event-type-show',
        'lesson': 'event-type-lesson'
    };
    const typeClass = typeColors[event.type] || 'bg-blue-500';

    let organizersText = 'Non défini';
    if (event.organizers && event.organizers.length > 0) {
        const organizerNames = [];
        for (const userId of event.organizers) {
            try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const name = (userData.username && userData.username.trim()) 
                        || userData.email?.split('@')[0] 
                        || 'Utilisateur';
                    organizerNames.push(name);
                }
            } catch (err) {
                console.error('Erreur chargement organisateur:', err);
            }
        }
        organizersText = organizerNames.length > 0 ? organizerNames.join(', ') : 'Non défini';
    }

    eventCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                    <span class="${typeClass} text-white px-3 py-1 rounded-full text-sm font-medium">
                        ${getEventTypeLabel(event.type)}
                    </span>
                    <span class="text-sm text-gray-600">${formatEventDate(event.date, event.time)}</span>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">${event.title}</h3>
                <p class="text-gray-600 mb-3">${event.description}</p>
                <div class="space-y-2 text-sm text-gray-700">
                    <p><span class="font-medium">Lieu :</span> ${event.location}, ${event.city}</p>
                    <p><span class="font-medium">Horaires :</span> ${event.time} - ${event.endTime}</p>
                    <p><span class="font-medium">Organisateur(s) :</span> ${organizersText}</p>
                    <p><span class="font-medium">Prix :</span> ${event.price || 'Gratuit'}</p>
                    <p><span class="font-medium">Places :</span> ${event.attendees?.length || 0}/${event.capacity} 
                        <span class="text-${isFull ? 'red' : 'green'}-600 font-medium">
                            ${isFull ? 'Complet' : spotsLeft + ' restantes'}
                        </span>
                    </p>
                </div>
            </div>
        </div>
        <div class="flex justify-between items-center mt-4">
            <div class="flex -space-x-2">
                ${(event.attendees || []).slice(0, 5).map(uid => `
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                        ${uid.substring(0, 2).toUpperCase()}
                    </div>
                `).join('')}
                ${(event.attendees?.length || 0) > 5 ? `
                    <div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                        +${(event.attendees?.length || 0) - 5}
                    </div>
                ` : ''}
            </div>
            <button onclick="toggleEventRegistration('${event.id}', ${isRegistered})" 
                    class="${isRegistered ? 'bg-red-500 hover:bg-red-600' : 'ice-button'} ${isFull && !isRegistered ? 'opacity-50 cursor-not-allowed' : ''} px-4 py-2 rounded-xl text-white font-semibold transition-all"
                    ${isFull && !isRegistered ? 'disabled' : ''}>
                ${isRegistered ? 'Se désinscrire' : (isFull ? 'Complet' : 'S\'inscrire')}
            </button>
        </div>
    `;

    return eventCard;
}

function getEventTypeLabel(type) {
    const labels = {
        'tournament': 'Tournoi',
        'competition': 'Compétition',
        'show': 'Spectacle',
        'lesson': 'Cours'
    };
    return labels[type] || 'Événement';
}

function formatEventDate(date, time) {
    const eventDate = new Date(`${date} ${time}`);
    return eventDate.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
}

window.toggleEventRegistration = async function(eventId, isCurrentlyRegistered) {
    const user = auth.currentUser;
    if (!user) {
        showNotification('Vous devez être connecté', 'error');
        return;
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (!eventSnap.exists()) {
            showNotification('Événement non trouvé', 'error');
            return;
        }

        const eventData = eventSnap.data();
        let attendees = eventData.attendees || [];

        if (isCurrentlyRegistered) {
            // Désinscription
            attendees = attendees.filter(uid => uid !== user.uid);
        } else {
            // Inscription
            if (attendees.length >= eventData.capacity) {
                showNotification('Événement complet', 'error');
                return;
            }
            attendees.push(user.uid);
        }

        await updateDoc(eventRef, { attendees });

        // ✨ NOUVEAU : Synchroniser le canal
        if (window.eventChannelsSystem) {
            try {
                await window.eventChannelsSystem.syncChannelMembers(
                    eventId,
                    attendees,
                    eventData.organizers || []
                );
                console.log('✅ Canal synchronisé après inscription/désinscription');
            } catch (channelError) {
                console.warn('⚠️ Erreur sync canal (non-bloquante):', channelError);
            }
        }

        showNotification(
            isCurrentlyRegistered ? 'Désinscription réussie' : 'Inscription réussie',
            'success'
        );
        await displayEvents();
    } catch (error) {
        console.error('Erreur inscription:', error);
        showNotification('Erreur lors de l\'inscription', 'error');
    }
};



window.displayEvents = displayEvents;

// === PANNEAU ADMIN ===

async function isAdmin(user) {
    if (!user) return false;
    try {
        const idTokenResult = await user.getIdTokenResult();
        return idTokenResult.claims.admin === true;
    } catch (error) {
        console.error('Erreur vérification admin:', error);
        return false;
    }
}

async function createEventAdminPanel() {
    const user = auth.currentUser;
    if (!user || !await isAdmin(user)) return;
    
    const existingButton = document.getElementById('admin-events-button');
    if (existingButton) existingButton.remove();
    
    const adminButton = document.createElement('button');
    adminButton.id = 'admin-events-button';
    adminButton.textContent = 'Gérer événements';
    adminButton.className = 'ice-button px-4 py-2 rounded-xl text-white font-semibold fixed bottom-4 left-4 z-50 ice-shadow';
    adminButton.onclick = openEventAdminModal;
    document.body.appendChild(adminButton);
}

function openEventAdminModal() {
    closeAllModals();
    const modal = document.createElement('div');
    modal.id = 'event-admin-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">Gestion des événements</h2>
                <button id="close-event-admin-modal" class="text-2xl text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            <div class="flex space-x-1 mb-6">
                <button id="tab-add-event" class="tab-button px-4 py-2 rounded-lg bg-blue-500 text-white">Ajouter</button>
                <button id="tab-manage-events" class="tab-button px-4 py-2 rounded-lg bg-gray-200 text-gray-700">Gérer</button>
            </div>
            <div id="add-event-panel">
                <form id="event-form" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" id="event-title" placeholder="Titre" class="p-3 border border-gray-300 rounded-lg" required>
                        <select id="event-type" class="p-3 border border-gray-300 rounded-lg" required>
                            <option value="">Sélectionnez un type</option>
                            <option value="tournament">Tournoi</option>
                            <option value="competition">Compétition</option>
                            <option value="show">Spectacle</option>
                            <option value="lesson">Cours</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="date" id="event-date" class="p-3 border border-gray-300 rounded-lg" required>
                        <input type="time" id="event-time" class="p-3 border border-gray-300 rounded-lg" required>
                        <input type="time" id="event-end-time" placeholder="Heure de fin" class="p-3 border border-gray-300 rounded-lg">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" id="event-location" placeholder="Lieu" class="p-3 border border-gray-300 rounded-lg" required>
                        <input type="text" id="event-city" placeholder="Ville" class="p-3 border border-gray-300 rounded-lg" required>
                    </div>
                    <textarea id="event-description" placeholder="Description" class="w-full p-3 border border-gray-300 rounded-lg h-20"></textarea>
                    <div class="border-t border-gray-200 pt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Organisateurs</label>
                        <input type="text" id="organizer-search" placeholder="Rechercher un utilisateur..." class="w-full p-3 border border-gray-300 rounded-lg mb-2">
                        <div id="organizer-search-results" class="hidden max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white"></div>
                        <div id="selected-organizers" class="flex flex-wrap gap-2 mt-3"></div>
                        <p class="text-xs text-gray-500 mt-2">Si aucun n'est sélectionné, vous serez le seul organisateur.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" id="event-price" placeholder="Prix (ex: 15€)" class="p-3 border border-gray-300 rounded-lg">
                        <input type="number" id="event-capacity" placeholder="Capacité" class="p-3 border border-gray-300 rounded-lg" min="1">
                    </div>
                    
                    <!-- ✨ Le formulaire de canal sera inséré ici par enhanceEventAdminForm() -->
                    
                    <div class="flex space-x-3 pt-4">
                        <button type="submit" class="ice-button px-6 py-3 rounded-lg">Ajouter événement</button>
                        <button type="button" id="reset-form" class="ice-button-secondary px-6 py-3 rounded-lg">Réinitialiser</button>
                    </div>
                </form>
            </div>
            <div id="manage-events-panel" style="display: none;">
                <div id="events-list-admin" class="space-y-3 max-h-96 overflow-y-auto">
                    <p class="text-center text-gray-500">Chargement...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setupEventAdminModal(modal);
    setupEventOrganizerSearch();
    
    // ✨ NOUVEAU : Appeler enhanceEventAdminForm APRÈS la création de la modale
    setTimeout(() => {
        if (window.eventChannelsSystem) {
            window.eventChannelsSystem.enhanceEventAdminForm();
            console.log('✅ Section canal de diffusion ajoutée au formulaire');
        } else {
            console.warn('⚠️ eventChannelsSystem non disponible');
        }
    }, 200);
}


function setupEventAdminModal(modal) {
    const closeBtn = modal.querySelector('#close-event-admin-modal');
    const form = modal.querySelector('#event-form');
    const resetBtn = modal.querySelector('#reset-form');
    const tabAdd = modal.querySelector('#tab-add-event');
    const tabManage = modal.querySelector('#tab-manage-events');
    const addPanel = modal.querySelector('#add-event-panel');
    const managePanel = modal.querySelector('#manage-events-panel');
    
    const closeModal = () => modal.remove();
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    
    tabAdd.addEventListener('click', () => {
        tabAdd.className = 'tab-button px-4 py-2 rounded-lg bg-blue-500 text-white';
        tabManage.className = 'tab-button px-4 py-2 rounded-lg bg-gray-200 text-gray-700';
        addPanel.style.display = 'block';
        managePanel.style.display = 'none';
    });
    
    tabManage.addEventListener('click', async () => {
        tabManage.className = 'tab-button px-4 py-2 rounded-lg bg-blue-500 text-white';
        tabAdd.className = 'tab-button px-4 py-2 rounded-lg bg-gray-200 text-gray-700';
        addPanel.style.display = 'none';
        managePanel.style.display = 'block';
        await loadEventsForAdmin();
    });
    
    resetBtn.addEventListener('click', () => {
        form.reset();
        delete form.dataset.editingEventId;
        document.getElementById('selected-organizers').innerHTML = '';
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Ajouter événement';
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEventFromAdmin();
    });
    
    const dateInput = modal.querySelector('#event-date');
    if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
}

function setupEventOrganizerSearch() {
    const searchInput = document.getElementById('organizer-search');
    const resultsContainer = document.getElementById('organizer-search-results');
    let searchTimeout;
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', async (e) => {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.trim().toLowerCase();
        
        if (searchTerm.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const users = [];
                usersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    const email = userData.email?.toLowerCase() || '';
                    const username = userData.username?.toLowerCase() || '';
                    if (email.includes(searchTerm) || username.includes(searchTerm)) {
                        users.push({
                            id: doc.id,
                            email: userData.email,
                            displayName: userData.username || userData.email?.split('@')[0] || 'Utilisateur'
                        });
                    }
                });
                displayOrganizerResults(users);
            } catch (error) {
                console.error('Erreur recherche:', error);
            }
        }, 300);
    });
}

function displayOrganizerResults(users) {
    const resultsContainer = document.getElementById('organizer-search-results');
    
    if (users.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center text-gray-500 p-2 text-sm">Aucun utilisateur trouvé</p>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '??';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    };
    
    resultsContainer.innerHTML = '';
    users.forEach(user => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0';
        resultDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs mr-2">
                    ${getInitials(user.displayName)}
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-800">${user.displayName}</p>
                    <p class="text-xs text-gray-500">${user.email}</p>
                </div>
            </div>
            <span class="text-xs text-blue-600 font-medium">Ajouter</span>
        `;
        resultDiv.addEventListener('click', () => addOrganizer(user.id, user.displayName, user.email));
        resultsContainer.appendChild(resultDiv);
    });
    resultsContainer.classList.remove('hidden');
}

window.addOrganizer = function(userId, userName, userEmail, silent = false) {
    if (!userId || !userName || !userEmail) return;
    
    const selectedContainer = document.getElementById('selected-organizers');
    if (!selectedContainer || document.getElementById(`organizer-${userId}`)) {
        if (!silent) showNotification('Déjà ajouté', 'info');
        return;
    }
    
    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '??';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    };
    
    const organizerTag = document.createElement('div');
    organizerTag.id = `organizer-${userId}`;
    organizerTag.className = 'flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2';
    organizerTag.dataset.userId = userId;
    organizerTag.dataset.userName = userName;
    organizerTag.dataset.userEmail = userEmail;
    organizerTag.innerHTML = `
        <div class="w-6 h-6 rounded bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs mr-2">
            ${getInitials(userName)}
        </div>
        <span class="text-sm font-medium text-gray-800 mr-2">${userName}</span>
    `;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-red-500 hover:text-red-700 font-bold ml-auto';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeOrganizer(userId));
    organizerTag.appendChild(removeBtn);
    selectedContainer.appendChild(organizerTag);
    
    const searchResults = document.getElementById('organizer-search-results');
    const searchInput = document.getElementById('organizer-search');
    if (searchResults) searchResults.classList.add('hidden');
    if (searchInput) searchInput.value = '';
    if (!silent) showNotification('Organisateur ajouté', 'success');
};

window.removeOrganizer = function(userId) {
    const tag = document.getElementById(`organizer-${userId}`);
    if (tag) tag.remove();
};

async function saveEventFromAdmin() {
    const form = document.getElementById('event-form');
    const editingId = form.dataset.editingEventId;
    
    const organizerElements = document.querySelectorAll('#selected-organizers [id^="organizer-"]');
    const organizers = [];
    organizerElements.forEach(el => {
        const userId = el.dataset.userId;
        if (userId && !organizers.includes(userId)) organizers.push(userId);
    });
    
    if (organizers.length === 0) organizers.push(auth.currentUser.uid);
    
    const eventData = {
        title: document.getElementById('event-title').value.trim(),
        type: document.getElementById('event-type').value,
        date: document.getElementById('event-date').value,
        time: document.getElementById('event-time').value,
        endTime: document.getElementById('event-end-time').value || '',
        location: document.getElementById('event-location').value.trim(),
        city: document.getElementById('event-city').value.trim(),
        description: document.getElementById('event-description').value.trim(),
        price: document.getElementById('event-price').value.trim(),
        capacity: parseInt(document.getElementById('event-capacity').value) || 50,
        organizers: organizers,
        updatedAt: new Date().toISOString()
    };
    
    try {
        let eventId;
        
        if (editingId) {
            // Modification d'un événement existant
            await updateDoc(doc(db, 'events', editingId), eventData);
            eventId = editingId;
            showNotification('Événement modifié', 'success');
        } else {
            // Création d'un nouvel événement
            eventData.attendees = [];
            eventData.creator = auth.currentUser.uid;
            eventData.createdAt = new Date().toISOString();
            const docRef = await addDoc(collection(db, 'events'), eventData);
            eventId = docRef.id;
            showNotification('Événement ajouté', 'success');
        }

        // ✨ NOUVEAU : Gérer le canal de diffusion
        if (window.eventChannelsSystem) {
            try {
                // Récupérer les attendees actuels pour la synchro
                const eventDoc = await getDoc(doc(db, 'events', eventId));
                const currentAttendees = eventDoc.exists() ? (eventDoc.data().attendees || []) : [];
                
                await window.eventChannelsSystem.handleEventSave(
                    eventId, 
                    eventData, 
                    organizers,
                    currentAttendees
                );
                console.log('✅ Canal de diffusion synchronisé');
            } catch (channelError) {
                console.error('⚠️ Erreur canal de diffusion (non-bloquante):', channelError);
                // Ne pas bloquer la sauvegarde de l'événement si le canal échoue
            }
        }

        // ✅ Fermer la modale ET rafraîchir
        const modal = document.getElementById('event-admin-modal');
        if (modal) modal.remove();
        
        await displayEvents();
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}



async function loadEventsForAdmin() {
    const container = document.getElementById('events-list-admin');
    if (!container) return;
    
    container.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        const eventsSnapshot = await getDocs(collection(db, 'events'));
        container.innerHTML = '';
        
        if (eventsSnapshot.empty) {
            container.innerHTML = '<p class="text-center text-gray-500">Aucun événement trouvé</p>';
            return;
        }
        
        const events = [];
        eventsSnapshot.forEach((doc) => events.push({ id: doc.id, ...doc.data() }));
        events.sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
        
        events.forEach((event) => {
            const eventCard = document.createElement('div');
            eventCard.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-3';
            const organizersCount = event.organizers?.length || 1;
            eventCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h3 class="font-bold text-lg text-gray-800">${event.title}</h3>
                        <p class="text-sm text-gray-600">${event.type.charAt(0).toUpperCase() + event.type.slice(1)} • ${event.location}, ${event.city}</p>
                        <p class="text-sm text-gray-500">${formatDateForAdmin(event.date, event.time)}${event.endTime ? ' - ' + event.endTime : ''}</p>
                        <p class="text-sm text-gray-500">Places: ${event.attendees?.length || 0}/${event.capacity} • Organisateurs: ${organizersCount}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editEventFromAdmin('${event.id}')" class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded">Modifier</button>
                        <button onclick="deleteEventFromAdmin('${event.id}', '${event.title.replace(/'/g, '\\\'')}')" class="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded">Supprimer</button>
                    </div>
                </div>
            `;
            container.appendChild(eventCard);
        });
    } catch (error) {
        console.error('Erreur chargement admin:', error);
        container.innerHTML = '<p class="text-center text-red-500">Erreur de chargement</p>';
    }
}

window.editEventFromAdmin = async function(eventId) {
    try {
        const eventRef = doc(db, 'events', eventId);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
            const eventData = eventSnap.data();
            document.getElementById('tab-add-event').click();
            
            document.getElementById('event-title').value = eventData.title;
            document.getElementById('event-type').value = eventData.type;
            document.getElementById('event-date').value = eventData.date;
            document.getElementById('event-time').value = eventData.time;
            document.getElementById('event-end-time').value = eventData.endTime || '';
            document.getElementById('event-location').value = eventData.location;
            document.getElementById('event-city').value = eventData.city;
            document.getElementById('event-description').value = eventData.description || '';
            document.getElementById('event-price').value = eventData.price || '';
            document.getElementById('event-capacity').value = eventData.capacity;
            
            const selectedContainer = document.getElementById('selected-organizers');
            selectedContainer.innerHTML = '';
            
            if (eventData.organizers && eventData.organizers.length > 0) {
                for (const userId of eventData.organizers) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            const displayName = (userData.username && userData.username.trim()) || userData.email?.split('@')[0] || 'Utilisateur';
                            const email = userData.email || 'email@inconnu.com';
                            if (userId && displayName && email) {
                                addOrganizer(userId, displayName, email, true);
                            }
                        }
                    } catch (err) {
                        console.error('Erreur chargement organisateur:', err);
                    }
                }
            }

            // ✨ NOUVEAU : Charger les données du canal de diffusion si existant
            if (window.eventChannelsSystem) {
                setTimeout(async () => {
                    try {
                        const channelId = `event_${eventId}`;
                        const channelDoc = await getDoc(doc(db, 'eventChannels', channelId));
                        
                        if (channelDoc.exists() && channelDoc.data().isActive) {
                            const channelData = channelDoc.data();
                            
                            // Cocher la checkbox
                            const checkbox = document.getElementById('enable-broadcast-channel');
                            if (checkbox) {
                                checkbox.checked = true;
                                
                                // Afficher le champ nom
                                const nameContainer = document.getElementById('channel-name-container');
                                if (nameContainer) {
                                    nameContainer.classList.remove('hidden');
                                }
                                
                                // Remplir le nom du canal
                                const nameInput = document.getElementById('broadcast-channel-name');
                                if (nameInput) {
                                    nameInput.value = channelData.channelName;
                                }
                                
                                console.log('✅ Données du canal chargées pour édition');
                            }
                        } else {
                            console.log('ℹ️ Aucun canal actif pour cet événement');
                        }
                    } catch (channelError) {
                        console.error('⚠️ Erreur chargement canal (non-bloquante):', channelError);
                    }
                }, 800); // Délai pour s'assurer que le formulaire est prêt
            }
            
            const form = document.getElementById('event-form');
            form.dataset.editingEventId = eventId;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Modifier événement';
        }
    } catch (error) {
        console.error('Erreur édition:', error);
        showNotification('Erreur lors du chargement', 'error');
    }
};


window.deleteEventFromAdmin = async function(eventId, eventTitle) {
    if (!confirm(`Supprimer l'événement "${eventTitle}" ?`)) return;
    try {
        await deleteDoc(doc(db, 'events', eventId));
        showNotification('Événement supprimé', 'success');
        loadEventsForAdmin();
        await displayEvents();
    } catch (error) {
        console.error('Erreur suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
};

function formatDateForAdmin(date, time) {
    const eventDate = new Date(`${date} ${time}`);
    return eventDate.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// === FONCTION CORRIGÉE - TROUVE L'EXISTANT AU LIEU DE CRÉER ===

function findOrCreateLevelButton() {
    // CHERCHER L'ANCIEN BOUTON - plusieurs possibilités d'ID/classe
    let levelButton = document.querySelector('.level-progress-button') ||
                     document.querySelector('.level-progress-button-compact') ||
                     document.getElementById('header-level-button') ||
                     document.querySelector('[class*="level"]') ||
                     document.querySelector('#level');

    if (!levelButton) {
        console.log('Aucun bouton niveau trouvé, création...');
        // Créer seulement si vraiment aucun n'existe
        levelButton = document.createElement('div');
        levelButton.className = 'level-progress-button-compact';
        
        // L'insérer au bon endroit (avant les boutons dynamiques)
        const headerButtons = document.getElementById('dynamic-header-buttons');
        if (headerButtons && headerButtons.parentElement) {
            headerButtons.parentElement.insertBefore(levelButton, headerButtons);
        }
    } else {
        console.log('Bouton niveau existant trouvé, mise à jour...');
        // S'assurer qu'il a la bonne classe
        levelButton.className = 'level-progress-button-compact';
    }

    return levelButton;
}

// === FONCTION POUR METTRE À JOUR L'AFFICHAGE DU NIVEAU ===
async function updateHeaderLevelDisplay() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Récupérer les données utilisateur
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const points = userData.points || 0;

        // Utiliser les LEVELS d'app.js (importer)
        const LEVELS = [
            { level: 1, name: 'Débutant sur glace', minPoints: 0, maxPoints: 99, badge: '⛸️' },
            { level: 2, name: 'Patineur Amateur', minPoints: 100, maxPoints: 299, badge: '🥉' },
            { level: 3, name: 'Explorateur Glacé', minPoints: 300, maxPoints: 599, badge: '🥈' },
            { level: 4, name: 'Collectionneur', minPoints: 600, maxPoints: 999, badge: '🥇' },
            { level: 5, name: 'Maître des Patinoires', minPoints: 1000, maxPoints: 1999, badge: '👑' },
            { level: 6, name: 'Légende des Glaces', minPoints: 2000, maxPoints: 9999, badge: '🏆' }
        ];

        // Calculer le niveau actuel
        let currentLevel = LEVELS[0];
        for (let i = LEVELS.length - 1; i >= 0; i--) {
            if (points >= LEVELS[i].minPoints) {
                currentLevel = LEVELS[i];
                break;
            }
        }

        // Calculer la progression
        const nextLevel = LEVELS.find(level => level.level === currentLevel.level + 1);
        let progressPercent = 100;
        let progressText = `${points} pts`;

        if (nextLevel) {
            const pointsInCurrentLevel = points - currentLevel.minPoints;
            const totalPointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
            progressPercent = Math.floor((pointsInCurrentLevel / totalPointsNeededForNextLevel) * 100);
            progressText = `${pointsInCurrentLevel}/${totalPointsNeededForNextLevel}`;
        }

        // Créer/Mettre à jour le bouton
        const levelButton = findOrCreateLevelButton();
        levelButton.innerHTML = `
            <div class="level-info">
                <div class="level-emoji">${currentLevel.badge}</div>
                <div class="level-name">${currentLevel.name}</div>
            </div>
            <div class="progress-container-compact">
                <div class="progress-bar-container-compact">
                    <div class="progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="progress-text-centered">${progressText}</div>
            </div>
        `;

        console.log('Niveau mis à jour:', currentLevel.name, '- Points:', points, '- Progression:', progressPercent + '%');

        // Mettre à jour l'affichage des points aussi
        await updatePointsDisplay();

    } catch (error) {
        console.error('Erreur mise à jour niveau header:', error);
    }
}

// === FONCTION DE NETTOYAGE - EXÉCUTER UNE FOIS ===
function cleanupDuplicateLevelButtons() {
    const levelButtons = document.querySelectorAll('[class*="level-progress"], [class*="level"], [id*="level"]');
    console.log('Trouvé', levelButtons.length, 'boutons niveau');

    if (levelButtons.length > 1) {
        // Garder le premier, supprimer les autres
        for (let i = 1; i < levelButtons.length; i++) {
            console.log('Suppression du doublon', i);
            levelButtons[i].remove();
        }
    }
}

// === FONCTION POUR CRÉER/METTRE À JOUR LE BOUTON POINTS ===
function createPointsButton() {
    let pointsButton = document.getElementById('header-points-button');
    
    if (!pointsButton) {
        console.log('Création du bouton points...');
        // Créer le bouton s'il n'existe pas
        pointsButton = document.createElement('div');
        pointsButton.id = 'header-points-button';
        pointsButton.className = 'points-display-button';

        // L'insérer à côté du bouton de niveau
        const levelButton = findOrCreateLevelButton();
        if (levelButton && levelButton.parentElement) {
            // Insérer après le bouton de niveau
            levelButton.parentElement.insertBefore(pointsButton, levelButton.nextSibling);
        } else {
            // Plan B : l'insérer dans le header
            const headerButtons = document.getElementById('dynamic-header-buttons');
            if (headerButtons) {
                headerButtons.appendChild(pointsButton);
            }
        }
    }

    return pointsButton;
}

// === FONCTION POUR METTRE À JOUR L'AFFICHAGE DES POINTS ===
async function updatePointsDisplay() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        console.log('Mise à jour du bouton points...');
        
        // Récupérer les points de l'utilisateur
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const points = userData.points || 0;

        // Formater les points avec séparateur de milliers
        const formattedPoints = points.toLocaleString('fr-FR');

        // Créer/Mettre à jour le bouton
        const pointsButton = createPointsButton();
        pointsButton.innerHTML = `
            <div class="points-icon">⭐</div>
            <div class="points-info">
                <div class="points-label">Points</div>
                <div class="points-value">${formattedPoints}</div>
            </div>
        `;

        console.log('Points affichés:', formattedPoints);

    } catch (error) {
        console.error('Erreur mise à jour points:', error);
    }
}



// Fonction de nettoyage globale
function cleanup() {
    // Nettoyer les listeners Firebase
    if (pointsListener) {
        pointsListener();
        pointsListener = null;
    }
    
    if (userProfileListener) {
        userProfileListener();
        userProfileListener = null;
    }
    
    // Nettoyer les listeners des checkboxes
    cleanupRinkListeners();
    
    // Réinitialiser les variables
    userProfile = null;
    savingRinks = false;
    
    console.log('Nettoyage terminé');
}

// Exposer les fonctions globalement pour compatibilité
window.showNotification = showNotification;
window.closeAllModals = closeAllModals;
window.saveUserRinksToFirebase = saveUserRinksToFirebase;
window.loadUserRinksFromFirebase = loadUserRinksFromFirebase;
window.updateHeaderLevelDisplay = updateHeaderLevelDisplay;
window.updatePointsDisplay = updatePointsDisplay;

// Nettoyer avant la fermeture de la page
window.addEventListener('beforeunload', cleanup);
// ========== UPLOAD PHOTO DE PROFIL ==========

async function uploadProfilePhoto(file, previewElement, removeBtn) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        showNotification('Upload en cours...', 'info');
        
        const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js');
        const storage = getStorage();
        
        const fileExtension = file.name.split('.').pop();
        const fileName = `profile-photos/${user.uid}.${fileExtension}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const photoURL = await getDownloadURL(storageRef);
        
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            photoURL: photoURL,
            updatedAt: new Date().toISOString()
        });
        
        previewElement.innerHTML = `<img src="${photoURL}" alt="Photo" class="w-full h-full object-cover">`;
        if (removeBtn) removeBtn.style.display = 'inline-block';
        
        const profileButton = document.getElementById('profile-button');
        if (profileButton) {
            profileButton.innerHTML = `<img src="${photoURL}" alt="Profil" class="w-full h-full object-cover rounded-full">`;
        }
        
        showNotification('Photo mise à jour !', 'success');
    } catch (error) {
        console.error('Erreur upload:', error);
        showNotification('Erreur: ' + error.message, 'error');
    }
}

async function removeProfilePhoto(previewElement, removeBtn) {
    const user = auth.currentUser;
    if (!user || !confirm('Supprimer votre photo ?')) return;
    
    try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { photoURL: null });
        
        const initials = (user.displayName || user.email).split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0, 2);
        previewElement.innerHTML = initials;
        previewElement.className = 'w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl';
        if (removeBtn) removeBtn.style.display = 'none';
        
        updateAvatar(user.displayName || user.email, user.email);
        
        showNotification('Photo supprimée', 'success');
    } catch (error) {
        console.error('Erreur suppression:', error);
    }
}


console.log('✅ main.js chargé et configuré');
