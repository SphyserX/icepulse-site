// app.js
import { db, auth } from "./firebase.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    getDoc,
    setDoc,
    query,
    where,
    arrayUnion,
    arrayRemove,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

class CheckIceApp {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'map';
        this.userStats = {
            points: 0,
            level: 1,
            visitedRinks: 0,
            friends: 0
        };
        
        this.userPosition = null;
        this.nearbyRinks = [];
        this.allRinks = [];
        this.isGeolocationEnabled = false;
        this.isLoadingChecklist = false;
        
        this.init();
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        this.setupTabs();
        this.setupChecklist();
        this.setupNotifications();
        this.setupPointsSystem();
        this.setupGeolocation();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.loadUserData();
            } else {
                window.location.href = "/checkice/login.html";
            }
        });
    }

    // === GESTION DES ONGLETS ===
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const contentSections = document.querySelectorAll('.content-section');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                this.switchTab(targetTab, tabButtons, contentSections);
            });
        });
    }

    switchTab(targetTab, tabButtons, contentSections) {
        tabButtons.forEach(btn => btn.classList.remove('tab-active'));
        contentSections.forEach(section => section.classList.remove('active'));

        const activeButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const activeSection = document.getElementById(`${targetTab}-section`);

        if (activeButton && activeSection) {
            activeButton.classList.add('tab-active');
            activeSection.classList.add('active');
            this.currentTab = targetTab;
        }
    }

    setupChecklist() {
        console.log('🔧 DEBUG: setupChecklist() - Configuration des événements');
        
        document.addEventListener('click', (e) => {
            if (e.target.closest('.check-circle') || e.target.closest('.check-circle-dynamic')) {
                const checklistItem = e.target.closest('.checklist-item') || e.target.closest('.checklist-item-dynamic');
                if (checklistItem) {
                    const rinkId = checklistItem.getAttribute('data-rink-id');
                    if (rinkId) {
                        const rink = this.nearbyRinks.find(r => r.id === rinkId);
                        if (rink) {
                            this.toggleEnhancedChecklistItem(rink, checklistItem);
                        }
                    }
                }
            }
        });
    }

    async loadChecklist() {
        console.log('🔍 DEBUG: Début loadChecklist()');
        
        if (!this.currentUser) {
            console.log('❌ DEBUG: Pas d\'utilisateur connecté');
            return;
        }

        if (this.isLoadingChecklist) {
            console.log('⚠️ DEBUG: Chargement déjà en cours, ignoré');
            return;
        }
        this.isLoadingChecklist = true;
        
        console.log('✅ DEBUG: Utilisateur connecté:', this.currentUser.uid);

        try {
            const checklistContainer = document.querySelector('#check-section .space-y-4');
            console.log('📦 DEBUG: Container checklist trouvé:', !!checklistContainer);
            
            if (!checklistContainer) {
                console.log('❌ DEBUG: Container checklist introuvable !');
                return;
            }

            this.showLoadingMessage(checklistContainer);

            console.log('🔄 DEBUG: Chargement des patinoires depuis Firebase...');
            await this.loadAllRinksFromFirebase();
            
            if (this.nearbyRinks.length === 0) {
                console.log('⚠️ DEBUG: Aucune patinoire trouvée dans Firebase');
                this.showNoRinksMessage(checklistContainer);
                return;
            }

            console.log(`📊 DEBUG: ${this.nearbyRinks.length} patinoires chargées depuis Firebase`);

            // Charger les données utilisateur
            const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const visitedRinks = userData.visitedRinks || [];
            
            console.log(`📊 DEBUG: Patinoires visitées: ${visitedRinks.length}`);

            this.userStats.points = userData.points || 0;
            this.userStats.level = userData.level || 1;
            this.userStats.visitedRinks = visitedRinks.length;

            // Marquer les patinoires visitées
            this.nearbyRinks.forEach(rink => {
                rink.visited = visitedRinks.includes(rink.id);
            });

            const sortedRinks = this.sortRinksBySections(this.nearbyRinks);
            
            console.log(`📊 DEBUG: Patinoires à afficher: ${sortedRinks.length}`);
            console.log('📊 DEBUG: Détail des patinoires:', sortedRinks.map(r => `${r.name} (${r.visited ? 'visitée' : 'à découvrir'})`));

            this.displayDynamicChecklist(sortedRinks);
            this.updateStatsDisplay();
            
            console.log('✅ DEBUG: loadChecklist() terminé');
            
        } catch (error) {
            console.error('❌ DEBUG: Erreur dans loadChecklist():', error);
            const checklistContainer = document.querySelector('#check-section .space-y-4');
            if (checklistContainer) {
                this.showErrorMessage(checklistContainer, error.message);
            }
        } finally {
            this.isLoadingChecklist = false;
        }
    }

    showLoadingMessage(container) {
        const header = container.querySelector('h2');
        container.innerHTML = '';
        if (header) container.appendChild(header);
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'text-center py-8';
        loadingDiv.innerHTML = `
            <div class="inline-flex items-center space-x-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="text-blue-600 font-medium">Chargement des patinoires depuis Firebase...</span>
            </div>
        `;
        container.appendChild(loadingDiv);
    }

    showNoRinksMessage(container) {
        const header = container.querySelector('h2');
        container.innerHTML = '';
        if (header) container.appendChild(header);
        
        const noRinksDiv = document.createElement('div');
        noRinksDiv.className = 'text-center py-12';
        noRinksDiv.innerHTML = `
            <div class="text-gray-500">
                <div class="text-6xl mb-4">🏒</div>
                <h3 class="text-xl font-semibold mb-2">Aucune patinoire disponible</h3>
                <p class="text-sm">Les patinoires seront ajoutées dans la base de données Firebase.</p>
                <button onclick="window.checkIceApp.loadChecklist()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    🔄 Actualiser
                </button>
            </div>
        `;
        container.appendChild(noRinksDiv);
    }

    showErrorMessage(container, errorMsg) {
        const header = container.querySelector('h2');
        container.innerHTML = '';
        if (header) container.appendChild(header);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-center py-12';
        errorDiv.innerHTML = `
            <div class="text-red-500">
                <div class="text-4xl mb-4">⚠️</div>
                <h3 class="text-xl font-semibold mb-2">Erreur de chargement</h3>
                <p class="text-sm mb-4">${errorMsg}</p>
                <button onclick="window.checkIceApp.loadChecklist()" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    🔄 Réessayer
                </button>
            </div>
        `;
        container.appendChild(errorDiv);
    }

    async loadAllRinksFromFirebase() {
        console.log('🔄 Chargement dynamique des patinoires depuis Firebase...');
        
        try {
            const rinksCollection = collection(db, "rinks");
            const rinksSnapshot = await getDocs(rinksCollection);
            
            this.allRinks = [];
            this.nearbyRinks = [];
            
            if (rinksSnapshot.empty) {
                console.log('📭 Collection "rinks" vide dans Firebase');
                return;
            }
            
            rinksSnapshot.forEach((doc) => {
                const rinkData = doc.data();
                console.log(`📍 Patinoire trouvée: ${rinkData.name || 'Sans nom'}`);
                
                if (rinkData.name) {
                    let lat = 0, lng = 0;
                    
                    if (rinkData.coordinates && Array.isArray(rinkData.coordinates)) {
                        lat = parseFloat(rinkData.coordinates[0]) || 0;
                        lng = parseFloat(rinkData.coordinates[1]) || 0;
                    } else if (rinkData.lat && rinkData.lng) {
                        lat = parseFloat(rinkData.lat) || 0;
                        lng = parseFloat(rinkData.lng) || 0;
                    } else if (rinkData.latitude && rinkData.longitude) {
                        lat = parseFloat(rinkData.latitude) || 0;
                        lng = parseFloat(rinkData.longitude) || 0;
                    }
                    
                    const rink = {
                        id: doc.id,
                        name: rinkData.name,
                        city: rinkData.city || rinkData.ville || 'Ville inconnue',
                        address: rinkData.address || rinkData.adresse || '',
                        lat: lat,
                        lng: lng,
                        visited: false,
                        status: rinkData.status || 'Inconnue',
                        ice_quality: rinkData.ice_quality || '',
                        phone: rinkData.phone || '',
                        website: rinkData.website || ''
                    };
                    
                    this.allRinks.push(rink);
                    console.log(`✅ Patinoire ajoutée: ${rink.name} (${lat}, ${lng})`);
                }
            });
            
            console.log(`✅ ${this.allRinks.length} patinoires chargées depuis Firebase`);
            
            if (this.isGeolocationEnabled && this.userPosition) {
                await this.calculateDistances();
            } else {
                this.nearbyRinks = [...this.allRinks];
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement depuis Firebase:', error);
            throw error;
        }
    }

    sortRinksBySections(rinks) {
        console.log('🔤 DEBUG: Tri alphabétique par sections');
        
        if (!rinks || !Array.isArray(rinks) || rinks.length === 0) {
            console.log('⚠️ DEBUG: Liste de patinoires vide ou invalide');
            return [];
        }
        
        const unvisited = rinks.filter(rink => !rink.visited);
        const visited = rinks.filter(rink => rink.visited);
        
        const sortAlphabetically = (a, b) => a.name.localeCompare(b.name, 'fr');
        
        unvisited.sort(sortAlphabetically);
        visited.sort(sortAlphabetically);
        
        console.log(`📊 Non visitées: ${unvisited.length}, Visitées: ${visited.length}`);
        
        return [...unvisited, ...visited];
    }

    displayDynamicChecklist(rinks) {
        console.log('🔍 DEBUG: Début displayDynamicChecklist()');
        console.log(`📊 DEBUG: Nombre de patinoires reçues: ${rinks.length}`);
        
        if (!rinks || !Array.isArray(rinks)) {
            console.error('❌ DEBUG: rinks n\'est pas un tableau valide:', rinks);
            rinks = [];
        }
        
        const checklistContainer = document.querySelector('#check-section .space-y-4');
        console.log('📊 DEBUG: Container trouvé:', !!checklistContainer);
        
        if (!checklistContainer) {
            console.log('❌ DEBUG: Container checklist non trouvé !');
            return;
        }

        // Garder seulement le header principal
        const mainHeader = checklistContainer.querySelector('h2');
        console.log('📊 DEBUG: Header principal trouvé:', !!mainHeader);
        
        checklistContainer.innerHTML = '';
        if (mainHeader) {
            checklistContainer.appendChild(mainHeader);
            console.log('✅ DEBUG: Header principal restauré');
        }

        if (rinks.length === 0) {
            console.log('⚠️ DEBUG: Aucune patinoire à afficher');
            this.showNoRinksMessage(checklistContainer);
            return;
        }

        // Séparer les patinoires par section
        const unvisitedRinks = rinks.filter(rink => !rink.visited);
        const visitedRinks = rinks.filter(rink => rink.visited);
        
        console.log(`📊 DEBUG: ${unvisitedRinks.length} à découvrir, ${visitedRinks.length} visitées`);

        // SECTION 1: PATINOIRES À DÉCOUVRIR
        if (unvisitedRinks.length > 0) {
            const toVisitSection = document.createElement('div');
            toVisitSection.className = 'mb-8';
            
            const toVisitHeader = document.createElement('div');
            toVisitHeader.className = 'flex items-center mb-6';
            toVisitHeader.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span class="text-white font-bold text-sm">🎯</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">À découvrir</h3>
                    <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">${unvisitedRinks.length}</span>
                </div>
            `;
            
            toVisitSection.appendChild(toVisitHeader);
            
            const toVisitList = document.createElement('div');
            toVisitList.className = 'space-y-4';
            
            unvisitedRinks.forEach((rink, index) => {
                console.log(`➕ DEBUG: Création item à découvrir ${index + 1}: ${rink.name}`);
                const checklistItem = this.createEnhancedChecklistItem(rink, index);
                toVisitList.appendChild(checklistItem);
            });
            
            toVisitSection.appendChild(toVisitList);
            checklistContainer.appendChild(toVisitSection);
        }

        // SECTION 2: PATINOIRES VISITÉES
        if (visitedRinks.length > 0) {
            const visitedSection = document.createElement('div');
            visitedSection.className = 'mt-8';
            
            const visitedHeader = document.createElement('div');
            visitedHeader.className = 'flex items-center mb-6';
            visitedHeader.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <span class="text-white font-bold text-sm">✓</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">Visitées</h3>
                    <span class="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">${visitedRinks.length}</span>
                </div>
            `;
            
            visitedSection.appendChild(visitedHeader);
            
            const visitedList = document.createElement('div');
            visitedList.className = 'space-y-4';
            
            visitedRinks.forEach((rink, index) => {
                console.log(`➕ DEBUG: Création item visité ${index + 1}: ${rink.name}`);
                const checklistItem = this.createEnhancedChecklistItem(rink, index + unvisitedRinks.length);
                visitedList.appendChild(checklistItem);
            });
            
            visitedSection.appendChild(visitedList);
            checklistContainer.appendChild(visitedSection);
        }

        // MESSAGE SI AUCUNE PATINOIRE VISITÉE
        if (unvisitedRinks.length > 0 && visitedRinks.length === 0) {
            const encouragementDiv = document.createElement('div');
            encouragementDiv.className = 'mt-8 text-center py-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-dashed border-blue-200';
            encouragementDiv.innerHTML = `
                <div class="text-gray-600">
                    <div class="text-4xl mb-3">🏒</div>
                    <h4 class="text-lg font-semibold mb-2">Première visite ?</h4>
                    <p class="text-sm">Cliquez sur une patinoire ci-dessus pour commencer votre collection !</p>
                </div>
            `;
            checklistContainer.appendChild(encouragementDiv);
        }

        console.log('✅ DEBUG: Sections créées');
        
        setTimeout(() => {
            console.log('🎨 DEBUG: Animation des items');
            this.animateChecklistItems();
        }, 100);
        
        console.log('✅ DEBUG: displayDynamicChecklist() terminé');
    }

    createEnhancedChecklistItem(rink, index) {
        const item = document.createElement('div');
        item.className = `checklist-item-dynamic rounded-xl p-4 flex items-center transition-all duration-300 ${rink.visited ? 'checked' : ''}`;
        item.setAttribute('data-rink-id', rink.id);
        item.setAttribute('data-points', '50');
        item.style.animationDelay = `${index * 0.1}s`;

        const distanceText = rink.distance && this.isGeolocationEnabled ? 
            `${rink.distance < 1 ? Math.round(rink.distance * 1000) + 'm' : rink.distance.toFixed(1) + 'km'}` : 
            '';

        item.innerHTML = `
            <div class="check-circle-dynamic relative">
                <div class="w-12 h-12 rounded-full border-3 ${rink.visited ? 'border-green-400 bg-green-50' : 'border-blue-200 bg-white'} flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110">
                    ${rink.visited ? 
                        '<div class="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>' :
                        '<div class="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-blue-400 transition-all duration-300"></div>'
                    }
                </div>
                ${!rink.visited ? `
                    <div class="absolute -top-2 -right-2 points-badge-dynamic text-xs font-bold px-2 py-1 rounded-full text-white shadow-lg">
                        +50
                    </div>
                ` : ''}
            </div>

            <div class="flex-1 ml-4">
                <h3 class="font-semibold text-gray-800 text-lg">${rink.name}</h3>
                <div class="flex items-center space-x-3 mt-1">
                    <span class="text-sm font-medium ${rink.visited ? 'text-green-600' : 'text-blue-600'}">
                        ${rink.visited ? '✓ Visitée' : 'À découvrir'}
                    </span>
                    <span class="text-sm text-gray-500">• ${rink.city}</span>
                    ${distanceText ? `<span class="text-sm text-blue-600 font-medium distance-indicator">📍 ${distanceText}</span>` : ''}
                </div>
                ${rink.address ? `<div class="text-xs text-gray-400 mt-1">📍 ${rink.address}</div>` : ''}
            </div>

            ${rink.visited ? `
                <div class="flex items-center space-x-2 text-green-600">
                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span class="text-sm font-bold">✓</span>
                    </div>
                </div>
            ` : ''}
        `;

        return item;
    }

    // ✅ VERSION SÉCURISÉE avec gestion d'erreurs complète
    async toggleEnhancedChecklistItem(rink, itemElement) {
        try {
            console.log('🎯 Toggle patinoire:', rink.name, 'visitée:', rink.visited);
            
            const checkCircle = itemElement.querySelector('.check-circle-dynamic');
            const pointsBadge = itemElement.querySelector('.points-badge-dynamic');
            
            // Animation du clic
            checkCircle.style.transition = 'all 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            checkCircle.style.transform = 'scale(1.1)';
            
            setTimeout(() => {
                checkCircle.style.transform = 'scale(1)';
            }, 150);

            if (pointsBadge && !rink.visited) {
                pointsBadge.style.animation = 'pointsEarned 0.3s ease-out';
            }
            
            const wasVisited = rink.visited;
            const nowVisited = !wasVisited;
            
            console.log(`📝 Changement d'état: ${wasVisited} → ${nowVisited}`);
            
            // SAUVEGARDE FIREBASE EN PARALLÈLE
            const savePromises = [];
            
            if (nowVisited) {
                // Marquer comme visitée
                savePromises.push(this.markRinkAsVisited(rink.id));
                savePromises.push(this.updateUserStats(50));
                this.showNotification(`🎉 +50 points ! ${rink.name} visitée !`, 'success');
            } else {
                // Démarquer comme visitée
                savePromises.push(this.unmarkRinkAsVisited(rink.id));
                savePromises.push(this.updateUserStats(-50));
                this.showNotification(`⬅️ -50 points ! ${rink.name} décochée`, 'info');
            }
            
            // ATTENDRE LA SAUVEGARDE AVANT DE CONTINUER
            await Promise.all(savePromises);
            
            // Mettre à jour l'état local seulement APRÈS succès Firebase
            rink.visited = nowVisited;
            
            if (nowVisited) {
                itemElement.classList.add('checked');
            } else {
                itemElement.classList.remove('checked');
            }
            
            // ATTENDRE AVANT RÉORGANISATION
            setTimeout(async () => {
                console.log(`🎬 Début réorganisation: ${rink.name}`);
                
                itemElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                itemElement.style.opacity = '0';
                itemElement.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    this.reorganizeChecklist();
                }, 300);
                
            }, 500);
            
        } catch (error) {
            console.error('❌ Erreur toggle patinoire:', error);
            this.showNotification('Erreur lors de la sauvegarde. Veuillez réessayer.', 'error');
            
            // ANNULER LES CHANGEMENTS EN CAS D'ERREUR
            await this.loadChecklist();
        }
    }

    // ✅ VERSION CORRIGÉE avec arrayUnion pour éviter les doublons
    async markRinkAsVisited(rinkId) {
        const user = this.currentUser;
        if (!user) {
            console.error('❌ Utilisateur non connecté');
            return;
        }

        try {
            console.log('💾 Sauvegarde visite patinoire:', rinkId);
            
            const userDocRef = doc(db, "users", user.uid);
            
            // UTILISER arrayUnion pour éviter les doublons automatiquement
            await updateDoc(userDocRef, {
                visitedRinks: arrayUnion(rinkId),
                lastVisit: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            console.log('✅ Visite sauvegardée avec succès:', rinkId);
            
            // VÉRIFICATION : Relire pour confirmer la sauvegarde
            const updatedDoc = await getDoc(userDocRef);
            if (updatedDoc.exists()) {
                const updatedData = updatedDoc.data();
                console.log('📊 visitedRinks après sauvegarde:', updatedData.visitedRinks || []);
            }
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde visite:', error);
            throw error;
        }
    }

    // ✅ VERSION CORRIGÉE avec arrayRemove
    async unmarkRinkAsVisited(rinkId) {
        const user = this.currentUser;
        if (!user) {
            console.error('❌ Utilisateur non connecté');
            return;
        }

        try {
            console.log('🗑️ Suppression visite patinoire:', rinkId);
            
            const userDocRef = doc(db, "users", user.uid);
            
            // UTILISER arrayRemove pour supprimer
            await updateDoc(userDocRef, {
                visitedRinks: arrayRemove(rinkId),
                lastVisit: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            console.log('✅ Visite supprimée avec succès:', rinkId);
            
        } catch (error) {
            console.error('❌ Erreur suppression visite:', error);
            throw error;
        }
    }

    async reorganizeChecklist() {
        console.log('🔄 Réorganisation de la checklist...');
        
        try {
            const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const visitedRinks = userData.visitedRinks || [];
            
            this.nearbyRinks.forEach(rink => {
                rink.visited = visitedRinks.includes(rink.id);
            });

            const sortedRinks = this.sortRinksBySections(this.nearbyRinks);
            this.displayDynamicChecklist(sortedRinks);
            
            console.log('✅ Réorganisation terminée');
            
        } catch (error) {
            console.error('❌ Erreur réorganisation:', error);
        }
    }

    async updateUserStats(pointsChange) {
        const user = this.currentUser;
        if (!user) return;

        try {
            this.userStats.points = Math.max(0, this.userStats.points + pointsChange);
            this.userStats.level = Math.floor(this.userStats.points / 200) + 1;
            this.updateStatsDisplay();
            
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);
            
            const currentData = userSnap.exists() ? userSnap.data() : {};
            const newPoints = Math.max(0, (currentData.points || 0) + pointsChange);
            const newLevel = Math.floor(newPoints / 200) + 1;
            
            await updateDoc(userDocRef, {
                points: newPoints,
                level: newLevel,
                updatedAt: new Date().toISOString()
            });
            
            if (newLevel > (currentData.level || 1)) {
                setTimeout(() => {
                    this.showNotification(`🎊 Niveau ${newLevel} atteint !`, 'success');
                }, 500);
            } else if (newLevel < (currentData.level || 1)) {
                setTimeout(() => {
                    this.showNotification(`📉 Niveau ${newLevel}`, 'info');
                }, 500);
            }
            
        } catch (error) {
            console.error('❌ Erreur mise à jour stats:', error);
        }
    }

    animateChecklistItems() {
        console.log('🎨 DEBUG: Animation des items');
        const items = document.querySelectorAll('.checklist-item-dynamic');
        items.forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    setupGeolocation() {
        console.log('🔧 Setup géolocalisation...');
        
        const geoButton = document.querySelector('#enable-geolocation');
        if (geoButton) {
            geoButton.addEventListener('click', () => {
                this.getUserLocation();
            });
        }
        
        if (navigator.geolocation) {
            this.getUserLocation();
        }
    }

    async getUserLocation() {
        console.log('📍 Demande de géolocalisation...');
        
        if (!navigator.geolocation) {
            console.log('❌ Géolocalisation non supportée');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                });
            });

            this.userPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            this.isGeolocationEnabled = true;
            console.log('✅ Position obtenue:', this.userPosition);
            
            if (this.allRinks.length > 0) {
                await this.calculateDistances();
                await this.loadChecklist();
            }
            
        } catch (error) {
            console.error('❌ Erreur géolocalisation:', error);
            this.isGeolocationEnabled = false;
        }
    }

    async calculateDistances() {
        if (!this.userPosition || this.allRinks.length === 0) return;
        
        console.log('📏 Calcul des distances...');
        
        this.nearbyRinks = this.allRinks.map(rink => {
            const distance = this.calculateDistance(
                this.userPosition.lat,
                this.userPosition.lng,
                rink.lat,
                rink.lng
            );
            
            return {
                ...rink,
                distance: distance
            };
        });
        
        this.nearbyRinks.sort((a, b) => a.distance - b.distance);
        
        console.log(`✅ ${this.nearbyRinks.length} patinoires avec distances calculées`);
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    async loadUserData() {
        console.log('👤 Chargement données utilisateur...');
        
        if (!this.currentUser) return;
        
        try {
            const userDocRef = doc(db, "users", this.currentUser.uid);
            const userSnap = await getDoc(userDocRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                this.userStats = {
                    points: userData.points || 0,
                    level: userData.level || 1,
                    visitedRinks: (userData.visitedRinks || []).length,
                    friends: userData.friends?.length || 0
                };
            } else {
                await setDoc(userDocRef, {
                    email: this.currentUser.email,
                    username: '',
                    points: 0,
                    level: 1,
                    visitedRinks: [],
                    friends: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            
            this.updateStatsDisplay();
            await this.loadChecklist();
            
        } catch (error) {
            console.error('❌ Erreur chargement utilisateur:', error);
        }
    }

    updateStatsDisplay() {
        const pointsElement = document.querySelector('#points-counter');
        const levelElement = document.querySelector('#user-level');
        const rinksElement = document.querySelector('#visited-rinks-count');
        
        if (pointsElement) {
            pointsElement.textContent = this.userStats.points;
            pointsElement.classList.add('updated');
            setTimeout(() => pointsElement.classList.remove('updated'), 800);
            console.log(`✅ Points mis à jour: ${this.userStats.points}`);
        } else {
            console.log('⚠️ Élément #points-counter non trouvé');
        }
        
        if (levelElement) {
            levelElement.textContent = this.userStats.level;
        }
        
        if (rinksElement) {
            rinksElement.textContent = this.userStats.visitedRinks;
        }
        
        const progressBar = document.querySelector('#level-progress');
        if (progressBar) {
            const currentLevelPoints = (this.userStats.level - 1) * 200;
            const nextLevelPoints = this.userStats.level * 200;
            const progress = ((this.userStats.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
    }

    setupNotifications() {
        console.log('🔔 Setup notifications...');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-xl text-white font-semibold z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'info' ? 'bg-blue-500' : 'bg-gray-500'
        }`;
        notification.textContent = message;
        notification.style.animation = 'slideInRight 0.3s ease-out';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    setupPointsSystem() {
        console.log('🎯 Setup système de points...');
    }

    async addToChecklist(rinkName, city) {
        console.log(`➕ Ajout à la checklist: ${rinkName}, ${city}`);
    }
}

// Initialiser l'application
window.checkIceApp = new CheckIceApp();
export default CheckIceApp;
