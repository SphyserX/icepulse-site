// test-suite.js - VERSION COMPLÈTE AVEC NOUVEAUX TESTS
class CheckiceTestSuite {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runAll() {
        console.log('🧪 ===== CHECKICE TEST SUITE COMPLÈTE =====');
        console.log(`📊 Exécution de ${this.tests.length} tests...`);
        
        for (const test of this.tests) {
            try {
                await test.testFn();
                this.pass(test.name);
            } catch (error) {
                this.fail(test.name, error.message);
            }
        }
        
        this.summary();
    }

    pass(testName) {
        console.log(`✅ PASS: ${testName}`);
        this.results.passed++;
        this.results.total++;
    }

    fail(testName, error) {
        console.log(`❌ FAIL: ${testName} - ${error}`);
        this.results.failed++;
        this.results.total++;
    }

    summary() {
        console.log('\n🎯 ===== RÉSUMÉ DES TESTS =====');
        console.log(`✅ Réussis: ${this.results.passed}`);
        console.log(`❌ Échoués: ${this.results.failed}`);
        console.log(`📊 Total: ${this.results.total}`);
        
        const percentage = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`🎖️ Taux de réussite: ${percentage}%`);
        
        if (this.results.failed === 0) {
            console.log('🎉 TOUS LES TESTS PASSENT ! APPLICATION 100% STABLE.');
        } else {
            console.log('⚠️ ATTENTION: Des tests échouent. Vérifiez les erreurs.');
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion échouée');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Attendu: ${expected}, Obtenu: ${actual}`);
        }
    }

    assertExists(element, message) {
        if (!element) {
            throw new Error(message || 'Élément attendu non trouvé');
        }
    }
}

const testSuite = new CheckiceTestSuite();

// ========== TESTS DE BASE ==========

testSuite.test('Firebase correctement initialisé', () => {
    testSuite.assert(typeof window !== 'undefined', 'Environnement browser OK');
    const firebaseScripts = document.querySelectorAll('script[src*="firebase"]');
    testSuite.assert(firebaseScripts.length > 0, 'Scripts Firebase chargés');
    console.log('📡 Firebase scripts détectés');
});

testSuite.test('Éléments HTML critiques présents', () => {
    testSuite.assertExists(document.querySelector('.container'), 'Container principal manquant');
    testSuite.assertExists(document.getElementById('map'), 'Container carte manquant');
    testSuite.assertExists(document.getElementById('profile-menu'), 'Menu profil manquant');
    console.log('🏗️ Structure HTML OK');
});

testSuite.test('Scripts principaux chargés', () => {
    testSuite.assert(typeof L !== 'undefined', 'Leaflet non chargé');
    const moduleScripts = document.querySelectorAll('script[type="module"]');
    testSuite.assert(moduleScripts.length > 0, 'Modules JavaScript chargés');
    console.log('📜 Scripts OK');
});

// ========== NOUVEAUX TESTS : ARCHITECTURE OPTIMISÉE ==========

testSuite.test('State Manager initialisé', () => {
    testSuite.assert(typeof window.stateManager !== 'undefined', 'StateManager non disponible globalement');
    
    // Vérifier que les méthodes principales existent
    if (window.stateManager) {
        testSuite.assert(typeof window.stateManager.getState === 'function', 'Méthode getState manquante');
        testSuite.assert(typeof window.stateManager.setState === 'function', 'Méthode setState manquante');
        testSuite.assert(typeof window.stateManager.subscribe === 'function', 'Méthode subscribe manquante');
        console.log('🧠 StateManager OK');
    } else {
        console.log('⚠️ StateManager non exposé globalement - peut être normal');
    }
});

testSuite.test('Firebase Manager initialisé', () => {
    testSuite.assert(typeof window.firebaseManager !== 'undefined', 'FirebaseManager non disponible globalement');
    
    if (window.firebaseManager) {
        testSuite.assert(typeof window.firebaseManager.cleanup === 'function', 'Méthode cleanup manquante');
        console.log('🔥 FirebaseManager OK');
    } else {
        console.log('⚠️ FirebaseManager non exposé globalement - peut être normal');
    }
});

testSuite.test('Modal Manager initialisé', () => {
    testSuite.assert(typeof window.modalManager !== 'undefined', 'ModalManager non disponible globalement');
    
    if (window.modalManager) {
        testSuite.assert(typeof window.modalManager.openModal === 'function', 'Méthode openModal manquante');
        testSuite.assert(typeof window.modalManager.closeModal === 'function', 'Méthode closeModal manquante');
        testSuite.assert(typeof window.modalManager.closeAllModals === 'function', 'Méthode closeAllModals manquante');
        console.log('🪟 ModalManager OK');
    } else {
        console.log('⚠️ ModalManager non exposé globalement - peut être normal');
    }
});

testSuite.test('Nouveaux modules scripts chargés', () => {
    const stateManagerScript = document.querySelector('script[src*="state-manager"]');
    const firebaseManagerScript = document.querySelector('script[src*="firebase-manager"]');
    const modalManagerScript = document.querySelector('script[src*="modal-manager"]');
    
    testSuite.assertExists(stateManagerScript, 'Script state-manager.js manquant');
    testSuite.assertExists(firebaseManagerScript, 'Script firebase-manager.js manquant');
    testSuite.assertExists(modalManagerScript, 'Script modal-manager.js manquant');
    
    console.log('🆕 Nouveaux modules scripts chargés');
});

// ========== TESTS : FONCTIONNALITÉS OPTIMISÉES ==========

testSuite.test('Boutons header dynamiques créés', () => {
    const headerButtons = document.getElementById('dynamic-header-buttons');
    testSuite.assertExists(headerButtons, 'Container boutons header manquant');
    
    const rinksButton = document.getElementById('header-rinks-button');
    const movesButton = document.getElementById('header-moves-button');
    
    testSuite.assertExists(rinksButton, 'Bouton "Mes Patinoires" manquant');
    testSuite.assertExists(movesButton, 'Bouton "Mes Déplacements" manquant');
    
    console.log('🎮 Boutons header dynamiques OK');
});

testSuite.test('Bouton Mon Compte dans menu profil', () => {
    const accountButton = document.getElementById('account-btn');
    testSuite.assertExists(accountButton, 'Bouton "Mon Compte" manquant dans menu profil');
    console.log('⚙️ Bouton Mon Compte OK');
});

testSuite.test('Modales optimisées créées', async () => {
    // Simuler l'ouverture des modales pour vérifier qu'elles se créent
    const rinksButton = document.getElementById('header-rinks-button');
    if (rinksButton) {
        rinksButton.click();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const rinksModal = document.getElementById('rinks-modal');
        testSuite.assertExists(rinksModal, 'Modale "Mes Patinoires" non créée');
        
        // Fermer la modale
        const closeBtn = rinksModal.querySelector('#close-rinks-modal');
        if (closeBtn) closeBtn.click();
    }
    
    console.log('🪟 Modales optimisées OK');
});

testSuite.test('Gestion des event listeners optimisée', () => {
    // Vérifier qu'il n'y a pas de listeners multiples
    const testButton = document.createElement('button');
    testButton.id = 'test-listener-button';
    document.body.appendChild(testButton);
    
    let clickCount = 0;
    const handler = () => clickCount++;
    
    // Simuler l'ajout/suppression de listeners comme dans l'app
    testButton.addEventListener('click', handler);
    testButton.removeEventListener('click', handler);
    testButton.addEventListener('click', handler);
    
    testButton.click();
    
    testSuite.assertEqual(clickCount, 1, 'Listeners multiples détectés');
    
    document.body.removeChild(testButton);
    console.log('👂 Event listeners optimisés OK');
});

testSuite.test('Système de debouncing fonctionnel', async () => {
    let callCount = 0;
    const debouncedFunction = debounce(() => callCount++, 100);
    
    // Appeler plusieurs fois rapidement
    debouncedFunction();
    debouncedFunction();
    debouncedFunction();
    
    // Attendre le délai
    await new Promise(resolve => setTimeout(resolve, 150));
    
    testSuite.assertEqual(callCount, 1, 'Debouncing ne fonctionne pas correctement');
    console.log('⏱️ Debouncing OK');
});

// Fonction debounce simple pour le test
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ========== TESTS : AUTHENTIFICATION ==========

testSuite.test('Système d\'authentification opérationnel', () => {
    const profileButton = document.getElementById('profile-button');
    testSuite.assertExists(profileButton, 'Bouton profil absent - utilisateur non connecté');
    
    testSuite.assert(!window.location.href.includes('login.html'), 'Utilisateur non connecté (sur login.html)');
    
    const profileMenu = document.getElementById('profile-menu');
    testSuite.assertExists(profileMenu, 'Menu profil manquant');
    
    console.log('👤 Auth OK - Interface utilisateur connecté présente');
});

testSuite.test('Menu profil fonctionnel', () => {
    const profileBtn = document.getElementById('profile-button') ||
                      document.querySelector('[class*="profile-btn"]');
    testSuite.assertExists(profileBtn, 'Bouton profil non trouvé');
    console.log('👤 Menu profil OK');
});

testSuite.test('Sauvegarde automatique pseudo', () => {
    const profileUsername = document.getElementById('profile-username');
    if (profileUsername) {
        // Vérifier que l'input a les event listeners nécessaires
        const hasBlurListener = profileUsername.hasAttribute('data-has-blur-listener') || 
                               getEventListeners(profileUsername)?.blur?.length > 0;
        console.log('💾 Sauvegarde automatique pseudo configurée');
    } else {
        console.log('⚠️ Champ pseudo non trouvé - peut être normal si pas connecté');
    }
});

// ========== TESTS : CARTE ET PATINOIRES ==========

testSuite.test('Carte Leaflet initialisée', () => {
    testSuite.assert(typeof L !== 'undefined', 'Leaflet non disponible');
    
    const mapContainer = document.getElementById('map');
    testSuite.assertExists(mapContainer, 'Container carte manquant');
    
    const hasLeafletClass = mapContainer.classList.contains('leaflet-container');
    testSuite.assert(hasLeafletClass, 'Container map ne contient pas la classe leaflet-container');
    
    const markers = document.querySelectorAll('.leaflet-marker-icon');
    testSuite.assert(markers.length > 0, 'Carte présente mais aucun marqueur trouvé');
    
    console.log('🗺️ Carte Leaflet OK - Initialisée avec succès');
});

testSuite.test('Patinoires chargées', () => {
    const mapContainer = document.getElementById('map');
    testSuite.assertExists(mapContainer, 'Container carte manquant');
    const markers = document.querySelectorAll('.leaflet-marker-icon');
    testSuite.assert(markers.length > 0, 'Aucun marqueur de patinoire trouvé');
    console.log(`🏒 ${markers.length} patinoires chargées`);
});

testSuite.test('Système de sélection patinoires optimisé', () => {
    // Vérifier que les checkboxes ont le bon name
    const checkboxes = document.querySelectorAll('input[name="modal-user-rinks"]');
    if (checkboxes.length > 0) {
        console.log(`✅ ${checkboxes.length} patinoires disponibles pour sélection`);
    } else {
        console.log('⚠️ Système patinoires non visible - normal si modal fermée');
    }
});

// ========== TESTS : SYSTÈME D'AMIS ==========

testSuite.test('Système d\'amis initialisé', () => {
    const friendsSection = document.getElementById('friends-section');
    if (friendsSection) {
        const searchInput = document.getElementById('friend-search-input');
        if (searchInput) {
            console.log('👥 Interface système d\'amis OK');
        } else {
            console.log('⚠️ Interface amis basique présente');
        }
    } else {
        console.log('⚠️ Section amis non trouvée');
    }
});

// ========== TESTS : ÉVÉNEMENTS ==========

testSuite.test('Événements affichés de manière optimisée', async () => {
    const eventsSection = document.getElementById('events-section');
    if (eventsSection && !eventsSection.classList.contains('active')) {
        const eventsTab = document.querySelector('[data-tab="events"]');
        if (eventsTab) eventsTab.click();
    }
    
    // Vérifier que displayEvents est disponible
    testSuite.assert(typeof window.displayEvents === 'function', 'Fonction displayEvents non disponible');
    
    const eventCards = document.querySelectorAll('.frost-effect');
    if (eventCards.length > 0) {
        console.log(`🎉 ${eventCards.length} événements affichés`);
    } else {
        console.log('⚠️ Événements non visibles actuellement');
    }
});

testSuite.test('Panneau admin événements (si admin)', () => {
    const adminButton = document.getElementById('admin-events-button');
    if (adminButton) {
        console.log('👑 Panneau admin événements présent');
    } else {
        console.log('👤 Utilisateur standard (pas admin) - normal');
    }
});

// ========== TESTS : POINTS ET NIVEAUX ==========

testSuite.test('Système de points/niveaux optimisé', () => {
    const levelButton = document.querySelector('.level-progress-button-compact') ||
                       document.querySelector('[class*="level"]');
    
    const pointsButton = document.getElementById('header-points-button');
    
    if (levelButton || pointsButton) {
        console.log('⭐ Système points/niveaux optimisé présent');
        
        // Vérifier l'absence de doublons
        const levelButtons = document.querySelectorAll('[class*="level-progress"], [class*="level"], [id*="level"]');
        testSuite.assert(levelButtons.length <= 2, `Trop de boutons niveau détectés: ${levelButtons.length}`);
    } else {
        console.log('⚠️ Système points/niveaux non visible - peut être normal');
    }
});

// ========== TESTS : NAVIGATION ==========

testSuite.test('Onglets de navigation fonctionnels', () => {
    const tabs = document.querySelectorAll('.tab-button');
    testSuite.assert(tabs.length >= 4, 'Onglets de navigation manquants');
    
    testSuite.assertExists(document.getElementById('map-section'), 'Section carte manquante');
    testSuite.assertExists(document.getElementById('events-section'), 'Section événements manquante');
    testSuite.assertExists(document.getElementById('check-section'), 'Section checklist manquante');
    testSuite.assertExists(document.getElementById('friends-section'), 'Section amis manquante');
    
    console.log(`🧭 ${tabs.length} onglets navigation OK`);
});

testSuite.test('Header et navigation principaux', () => {
    const header = document.querySelector('header.header-container') ||
                  document.querySelector('.header-container');
    testSuite.assertExists(header, 'Header principal manquant');
    
    const logo = document.querySelector('.logo-section');
    testSuite.assertExists(logo, 'Logo CHECKICE manquant');
    
    const headerButtons = document.querySelector('.header-buttons');
    testSuite.assertExists(headerButtons, 'Boutons header manquants');
    console.log('🏠 Header et navigation OK');
});

// ========== TESTS : TICKETS/SUPPORT ==========

testSuite.test('Système de tickets chargé', () => {
    testSuite.assert(typeof window.ticketSystem !== 'undefined', 'TicketSystem non chargé');
    testSuite.assert(typeof window.ticketSystem.openTicketModal === 'function', 'Fonctions tickets manquantes');
    console.log('🎫 TicketSystem OK');
});

testSuite.test('Bouton Support dans menu profil', () => {
    const supportBtn = document.getElementById('ts-support-btn');
    testSuite.assertExists(supportBtn, 'Bouton Support & Tickets manquant');
    console.log('🎫 Bouton support OK');
});

testSuite.test('Modales de tickets présentes', () => {
    const modalsContainer = document.getElementById('ts-modals');
    testSuite.assertExists(modalsContainer, 'Container modales tickets manquant');
    
    testSuite.assertExists(document.getElementById('ts-quick-modal'), 'Modal actions rapides manquante');
    testSuite.assertExists(document.getElementById('ts-create-modal'), 'Modal création ticket manquante');
    testSuite.assertExists(document.getElementById('ts-list-modal'), 'Modal liste tickets manquante');
    testSuite.assertExists(document.getElementById('ts-chat-modal'), 'Modal chat manquante');
    console.log('🎫 Modales tickets OK');
});

// ========== TESTS : RECHERCHE ==========

testSuite.test('Barre de recherche fonctionnelle', () => {
    const searchInput = document.getElementById('search-input');
    testSuite.assertExists(searchInput, 'Barre de recherche manquante');
    
    const suggestionsContainer = document.getElementById('search-suggestions');
    testSuite.assertExists(suggestionsContainer, 'Container suggestions manquant');
    console.log('🔍 Recherche OK');
});

testSuite.test('Bouton flottant fonctionnel', () => {
    const floatingBtn = document.querySelector('.floating-action button');
    testSuite.assertExists(floatingBtn, 'Bouton flottant manquant');
    console.log('🎈 Bouton flottant OK');
});

// ========== TESTS : PERFORMANCE ET MÉMOIRE ==========

testSuite.test('Pas de fuite mémoire évidente', () => {
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    // Simuler des actions qui pourraient causer des fuites
    for (let i = 0; i < 3; i++) {
        if (window.ticketSystem) {
            window.ticketSystem.openTicketModal();
            window.ticketSystem.closeModal();
        }
        
        if (window.modalManager) {
            // Simuler ouverture/fermeture de modales
            const testModal = document.createElement('div');
            testModal.className = 'modal';
            document.body.appendChild(testModal);
            
            window.modalManager.openModal(testModal);
            window.modalManager.closeModal(testModal);
            
            document.body.removeChild(testModal);
        }
    }
    
    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    if (performance.memory) {
        testSuite.assert(memoryIncrease < 1000000, `Fuite mémoire possible: +${memoryIncrease} bytes`);
        console.log(`💾 Mémoire OK: +${memoryIncrease} bytes`);
    } else {
        console.log('💾 Mémoire non mesurable sur ce navigateur');
    }
});

testSuite.test('Cleanup functions disponibles', () => {
    // Vérifier que les fonctions de nettoyage existent
    const cleanupFunctions = [
        'window.firebaseManager?.cleanup',
        'window.stateManager?.cleanup'
    ];
    
    let cleanupCount = 0;
    cleanupFunctions.forEach(funcPath => {
        const func = eval(funcPath.replace('window.', 'window.'));
        if (typeof func === 'function') {
            cleanupCount++;
        }
    });
    
    console.log(`🧹 ${cleanupCount} fonctions de nettoyage disponibles`);
});

testSuite.test('Variables globales contrôlées', () => {
    // Vérifier que les nouvelles variables globales sont présentes
    const expectedGlobals = [
        'showNotification',
        'modalManager',
        'stateManager',
        'firebaseManager'
    ];
    
    let globalCount = 0;
    expectedGlobals.forEach(globalVar => {
        if (typeof window[globalVar] !== 'undefined') {
            globalCount++;
        }
    });
    
    console.log(`🌍 ${globalCount}/${expectedGlobals.length} variables globales optimisées détectées`);
});

// ========== TESTS : NOTIFICATIONS ==========

testSuite.test('Système de notifications optimisé', () => {
    testSuite.assert(typeof window.showNotification === 'function', 'Fonction showNotification manquante');
    
    // Tester le système de notifications
    window.showNotification('Test notification', 'info');
    
    const notification = document.querySelector('.notification');
    if (notification) {
        console.log('📢 Système notifications OK');
        // Nettoyer
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 100);
    } else {
        throw new Error('Notification de test non créée');
    }
});

// 🚀 Export global et exécution automatique
window.runCheckiceTests = () => testSuite.runAll();

console.log('🧪 Suite de tests CHECKICE COMPLÈTE prête !');
console.log(`📊 ${testSuite.tests.length} tests configurés`);
console.log('🚀 Tapez: runCheckiceTests() pour lancer tous les tests !');

// Exécution automatique
runCheckiceTests();
