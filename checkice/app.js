// map.js - VERSION COMPLÈTE AVEC CORRECTION HORAIRES + DEBUG + SYNCHRONISATION CHECKLIST
import { db } from './firebase.js';
import { collection, getDocs, query, where, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

let map;
let markers = [];
let isInitialized = false;
let initInProgress = false;

export async function initializeMap() {
    if (initInProgress) {
        console.log("Initialisation en cours, abandon...");
        return;
    }

    if (isInitialized && map) {
        console.log("Carte déjà initialisée, refresh des données...");
        loadRinksDirectlyFromFirebase(); // ← CORRECTION: chargement direct
        return;
    }

    initInProgress = true;

    try {
        console.log("🗺️ Initialisation carte Firebase");

        // Vérifier que Leaflet est disponible
        if (typeof L === 'undefined') {
            throw new Error('Leaflet non chargé');
        }

        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            throw new Error('Élément #map introuvable');
        }

        // Nettoyer le conteneur
        mapContainer.innerHTML = '';
        if (map) {
            map.remove();
            map = null;
        }

        // Créer la carte
        map = L.map('map').setView([46.603354, 1.888334], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        isInitialized = true;
        console.log("✅ Carte créée avec succès");

        // Event listener pour charger les notes moyennes
        map.on('popupopen', (e) => {
            const html = e.popup.getContent();
            const m = html.match(/avg-rating-([A-Za-z0-9]+)/);
            if (m && m[1]) {
                setTimeout(() => loadAverageRating(m[1]), 100);
            }
        });

        // Charger les patinoires après un délai - NOUVELLE APPROCHE
        setTimeout(loadRinksDirectlyFromFirebase, 2000);

    } catch (error) {
        console.error("❌ Erreur création carte:", error);
        
        // Afficher l'erreur à l'utilisateur
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 400px; background: #f3f4f6; border-radius: 12px; color: #6b7280;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 8px;">🗺️</div>
                        <div style="font-weight: 600; margin-bottom: 4px;">Erreur de chargement de la carte</div>
                        <div style="font-size: 14px;">${error.message}</div>
                    </div>
                </div>
            `;
        }
        isInitialized = false;
    } finally {
        initInProgress = false;
    }
}

// NOUVELLE FONCTION - Charger directement depuis Firebase pour récupérer les horaires
async function loadRinksDirectlyFromFirebase() {
    try {
        console.log("🔧 Chargement DIRECT depuis Firebase pour corriger les horaires...");
        
        const querySnapshot = await getDocs(collection(db, 'rinks'));
        const firebaseRinks = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('=== DONNÉES FIREBASE DIRECTES ===');
            console.log('Patinoire:', data.name);
            console.log('Horaires Firebase:', data.horaires);
            console.log('Toutes les propriétés Firebase:', Object.keys(data));
            console.log('================================');
            firebaseRinks.push(data);
        });
        
        console.log(`📍 ${firebaseRinks.length} patinoires chargées directement depuis Firebase`);
        
        // Remplacer les données de checkIceApp si elles existent
        if (window.checkIceApp) {
            console.log("🔄 Mise à jour de window.checkIceApp.allRinks avec les vraies données Firebase");
            window.checkIceApp.allRinks = firebaseRinks;
        } else {
            console.log("⚠️ window.checkIceApp introuvable, création...");
            window.checkIceApp = { allRinks: firebaseRinks };
        }
        
        // Maintenant charger les patinoires avec les bonnes données
        loadRinksFromData(firebaseRinks);
        
        // *** CORRECTION PRINCIPALE *** - Déclencher le rechargement de la checklist
        console.log('🔄 Déclenchement du rechargement de la checklist...');
        
        // Méthode 1: Événement personnalisé
        window.dispatchEvent(new CustomEvent('checkiceDataReady', {
            detail: { rinks: firebaseRinks }
        }));
        
        // Méthode 2: Appel direct si la fonction existe
        setTimeout(() => {
            if (typeof window.loadChecklist === 'function') {
                console.log('📋 Rechargement direct de la checklist...');
                window.loadChecklist();
            }
        }, 1000);
        
        // Méthode 3: Storage event pour compatibilité
        localStorage.setItem('checkiceDataUpdated', Date.now().toString());
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'checkiceDataUpdated',
            newValue: Date.now().toString()
        }));
        
    } catch (error) {
        console.error("❌ Erreur chargement direct Firebase:", error);
        // Fallback vers checkIceApp si disponible
        if (window.checkIceApp && window.checkIceApp.allRinks) {
            console.log("🔄 Fallback vers checkIceApp...");
            loadRinksFromCheckIceApp();
        }
    }
}

// Charger les patinoires depuis checkIceApp (version originale pour compatibilité)
async function loadRinksFromCheckIceApp() {
    try {
        console.log("🏒 Chargement patinoires depuis checkIceApp...");

        if (!window.checkIceApp || !window.checkIceApp.allRinks) {
            console.log("checkIceApp pas prêt, tentative directe Firebase...");
            loadRinksDirectlyFromFirebase();
            return;
        }

        const rinks = window.checkIceApp.allRinks;
        loadRinksFromData(rinks);

    } catch (error) {
        console.error("❌ Erreur chargement checkIceApp:", error);
    }
}

// NOUVELLE FONCTION - Charger les patinoires depuis des données (factorisée)
function loadRinksFromData(rinks) {
    try {
        console.log(`${rinks.length} patinoires disponibles`);

        // **DEBUG - Vérification des données chargées**
        console.log('=== DEBUG CHARGEMENT PATINOIRES ===');
        console.log('Toutes les patinoires chargées:', rinks);
        rinks.forEach((rink, index) => {
            console.log(`Rink ${index}:`, {
                name: rink.name,
                horaires: rink.horaires,
                hours: rink.hours,
                schedule: rink.schedule,
                status: rink.status,
                allKeys: Object.keys(rink)
            });
        });
        console.log('=====================================');

        // Nettoyer les marqueurs existants
        markers.forEach(marker => {
            if (map && map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        markers = [];

        let addedCount = 0;

        // Ajouter chaque patinoire
        rinks.forEach((rink, index) => {
            let lat, lng;

            // Essayer différents formats de coordonnées
            if (rink.coordinates && Array.isArray(rink.coordinates) && rink.coordinates.length === 2) {
                lat = parseFloat(rink.coordinates[0]);
                lng = parseFloat(rink.coordinates[1]);
            } else if (rink.lat && rink.lng) {
                lat = parseFloat(rink.lat);
                lng = parseFloat(rink.lng);
            } else if (rink.latitude && rink.longitude) {
                lat = parseFloat(rink.latitude);
                lng = parseFloat(rink.longitude);
            }

            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                try {
                    const marker = L.marker([lat, lng]).addTo(map);
                    
                    // Popup compact au thème CHECKICE
                    marker.bindPopup(createCompactPopup(rink, lat, lng), {
                        maxWidth: 340,
                        className: 'checkice-compact-popup'
                    });

                    markers.push(marker);
                    addedCount++;
                } catch (markerError) {
                    console.error(`Erreur ajout marqueur ${rink.name}:`, markerError);
                }
            } else {
                console.warn(`Coordonnées invalides pour ${rink.name}:`, lat, lng);
            }
        });

        console.log(`${addedCount} patinoires affichées sur la carte`);

    } catch (error) {
        console.error("❌ Erreur chargement données:", error);
    }
}

// POPUP COMPACT au thème CHECKICE AVEC CORRECTION HORAIRES
function createCompactPopup(rink, lat, lng) {
    // **DEBUG DÉTAILLÉ - Analyse des données**
    console.log('=== DEBUG HORAIRES POPUP ===');
    console.log('Données complètes rink:', rink);
    console.log('rink.horaires:', rink.horaires);
    console.log('rink.hours:', rink.hours);
    console.log('rink.schedule:', rink.schedule);
    console.log('Type de rink.horaires:', typeof rink.horaires);
    console.log('Valeur exacte rink.horaires:', JSON.stringify(rink.horaires));
    console.log('Propriétés disponibles:', Object.keys(rink));
    console.log('============================');

    // Informations essentielles
    const ville = rink.city || rink.ville || rink.address || 'Ville inconnue';
    
    // **VERSION CORRIGÉE ET ROBUSTE pour l'extraction des horaires**
    let horaires = 'Horaires non disponibles';
    
    if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
        horaires = rink.horaires;
    } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
        horaires = rink.hours;
    } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
        horaires = rink.schedule;
    } else if (rink.openingHours && typeof rink.openingHours === 'string' && rink.openingHours.trim() !== '') {
        horaires = rink.openingHours;
    } else if (rink.time_schedule && typeof rink.time_schedule === 'string' && rink.time_schedule.trim() !== '') {
        horaires = rink.time_schedule;
    }
    
    // **DEBUG FINAL - Vérification de l'extraction**
    console.log('Horaires extraits FINAUX:', horaires);
    console.log('Ville extraite:', ville);

    // ID unique pour cette patinoire
    const rinkId = generateRinkId(rink);

    return `
        <div class="compact-popup-card">
            <div class="compact-header">
                <h3 class="compact-title">${rink.name}</h3>
            </div>
            
            <div class="compact-info-row">
                <span class="compact-icon">📍</span>
                <span>${ville}</span>
            </div>
            
            <div class="compact-info-row">
                <span class="compact-icon">🕒</span>
                <span>${horaires}</span>
            </div>
            
            <div class="compact-rating">
                <span class="compact-icon">⭐</span>
                <span>Note: <span id="avg-rating-${rinkId}">-</span></span>
            </div>
            
            <div class="compact-actions">
                <button class="compact-btn" onclick="openRinkDetailsModal('${rinkId}')">
                    Fiche complète
                </button>
            </div>
        </div>
    `;
}

// Générer un ID unique basé sur le nom de la patinoire
function generateRinkId(rink) {
    return rink.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
}

// Charger la note moyenne pour le popup compact
async function loadAverageRating(rinkId) {
    try {
        const el = document.getElementById(`avg-rating-${rinkId}`);
        if (!el) return;

        const reviewsCollection = collection(db, 'reviews');
        const q = query(reviewsCollection, where('rinkId', '==', rinkId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Utiliser les avis de démonstration pour calculer la moyenne
            const fakeReviews = getFakeReviewsForRink(rinkId);
            const avgRating = fakeReviews.reduce((sum, review) => sum + review.rating, 0) / fakeReviews.length;
            el.textContent = avgRating.toFixed(1);
            return;
        }

        let sum = 0, count = 0;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (typeof data.rating === 'number') {
                sum += data.rating;
                count++;
            }
        });

        el.textContent = count ? (sum / count).toFixed(1) : '-';

    } catch (error) {
        console.error('Erreur moyenne rating:', error);
        const el = document.getElementById(`avg-rating-${rinkId}`);
        if (el) el.textContent = '-';
    }
}

// Fonction pour charger les avis depuis Firebase avec ta structure
async function loadReviewsAndRating(rinkId) {
    try {
        const reviewsCollection = collection(db, 'reviews');
        const q = query(reviewsCollection, where('rinkId', '==', rinkId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { averageRating: null, reviews: [] };
        }

        let sum = 0;
        const reviews = [];

        querySnapshot.forEach(doc => {
            const data = doc.data();
            
            // Utiliser ta structure Firebase
            const review = {
                comment: data.comment,
                createdAt: data.createdAt,
                rating: data.rating,
                rinkId: data.rinkId,
                rinkName: data.rinkName,
                updatedAt: data.updatedAt,
                userId: data.userId,
                userName: data.userName
            };

            if (typeof data.rating === 'number') {
                sum += data.rating;
            }
            reviews.push(review);
        });

        const averageRating = sum / reviews.length;
        return { averageRating, reviews };

    } catch (e) {
        console.error('Erreur chargement reviews:', e);
        return { averageRating: null, reviews: [] };
    }
}

// MODALE FICHE COMPLÈTE MODIFIÉE - Sans coordonnées, statut et date création + Adresse corrigée
window.openRinkDetailsModal = async function(rinkId) {
    console.log('Ouverture fiche pour rinkId:', rinkId);

    let rink = null;
    if (window.checkIceApp && window.checkIceApp.allRinks) {
        rink = window.checkIceApp.allRinks.find(r => generateRinkId(r) === rinkId);
    }

    if (!rink) {
        alert('Patinoire introuvable');
        return;
    }

    // **DEBUG - Vérification des données dans la modale**
    console.log('=== DEBUG MODALE ===');
    console.log('Données rink trouvées:', rink);
    console.log('rink.horaires dans modale:', rink.horaires);
    console.log('rink.adresse dans modale:', rink.adresse); // ← CORRIGÉ: adresse au lieu d'address
    console.log('Toutes les propriétés:', Object.keys(rink));
    console.log('====================');

    // Utiliser les coordonnées (pour le bouton itinéraire uniquement)
    let lat, lng;
    if (rink.coordinates && Array.isArray(rink.coordinates) && rink.coordinates.length === 2) {
        lat = parseFloat(rink.coordinates[0]);
        lng = parseFloat(rink.coordinates[1]);
    } else if (rink.lat && rink.lng) {
        lat = parseFloat(rink.lat);
        lng = parseFloat(rink.lng);
    } else if (rink.latitude && rink.longitude) {
        lat = parseFloat(rink.latitude);
        lng = parseFloat(rink.longitude);
    }

    // **EXTRACTION ROBUSTE DES HORAIRES POUR LA MODALE**
    let horairesModale = 'Horaires non disponibles';
    if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
        horairesModale = rink.horaires;
    } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
        horairesModale = rink.hours;
    } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
        horairesModale = rink.schedule;
    } else if (rink.openingHours && typeof rink.openingHours === 'string' && rink.openingHours.trim() !== '') {
        horairesModale = rink.openingHours;
    }

    // Charger la note moyenne et les avis
    const { averageRating, reviews } = await loadReviewsAndRating(rinkId);

    // Créer le HTML pour la section avis
    const reviewsSection = reviews.length > 0 ? `
        <div class="rink-reviews-section">
            <h3 style="color: #3b82f6; font-size: 16px; font-weight: 600; margin: 20px 0 12px 0; display: flex; align-items: center; gap: 8px;">
                💬 Avis des utilisateurs (${reviews.length})
            </h3>
            <div style="display: grid; gap: 12px;">
                ${reviews.map(review => `
                    <div style="padding: 12px; background: rgba(59,130,246,0.05); border-radius: 12px; border: 1px solid rgba(59,130,246,0.1);">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <div style="display: flex; gap: 2px;">
                                ${[1,2,3,4,5].map(i => `<span style="color: ${i <= review.rating ? '#fbbf24' : '#d1d5db'}; font-size: 14px;">★</span>`).join('')}
                            </div>
                            <span style="font-weight: 600; color: #374151; font-size: 13px;">${review.userName || 'Anonyme'}</span>
                            <span style="font-size: 11px; color: #6b7280;">
                                ${review.createdAt ? 
                                    (review.createdAt.seconds ? 
                                        new Date(review.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : 
                                        '') : 
                                    ''}
                            </span>
                        </div>
                        <div style="color: #475569; font-size: 14px; line-height: 1.4;">${review.comment}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : `
        <div class="rink-reviews-section">
            <h3 style="color: #3b82f6; font-size: 16px; font-weight: 600; margin: 20px 0 12px 0;">💬 Avis des utilisateurs</h3>
            <p style="color: #6b7280; font-style: italic;">Aucun avis disponible pour cette patinoire.</p>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'rink-details-modal';
    modal.id = 'rink-details-modal';
    modal.innerHTML = `
        <div class="rink-details-content">
            <div class="rink-details-header">
                <h2 class="rink-details-title">${rink.name}</h2>
                <button class="rink-details-close" onclick="closeRinkDetailsModal()">✕</button>
            </div>
            
            <div class="rink-details-info">
                ${rink.city ? `<div class="rink-info-item">
                    <span class="rink-info-icon">🏙️</span>
                    <span class="rink-info-label">Ville :</span>
                    <span class="rink-info-value">${rink.city}</span>
                </div>` : ''}
                
                ${rink.adresse ? `<div class="rink-info-item">
                    <span class="rink-info-icon">📍</span>
                    <span class="rink-info-label">Adresse :</span>
                    <span class="rink-info-value">${rink.adresse}</span>
                </div>` : ''}
                
                <div class="rink-info-item">
                    <span class="rink-info-icon">🕒</span>
                    <span class="rink-info-label">Horaires :</span>
                    <span class="rink-info-value">${horairesModale}</span>
                </div>
                
                ${rink.phone ? `<div class="rink-info-item">
                    <span class="rink-info-icon">📞</span>
                    <span class="rink-info-label">Téléphone :</span>
                    <span class="rink-info-value">
                        <a href="tel:${rink.phone}" class="rink-info-link">${rink.phone}</a>
                    </span>
                </div>` : ''}
                
                ${rink.tarifs || rink.price ? `<div class="rink-info-item">
                    <span class="rink-info-icon">💰</span>
                    <span class="rink-info-label">Tarifs :</span>
                    <span class="rink-info-value">${rink.tarifs || rink.price}</span>
                </div>` : ''}
                
                ${rink.website ? `<div class="rink-info-item">
                    <span class="rink-info-icon">🌐</span>
                    <span class="rink-info-label">Site web :</span>
                    <span class="rink-info-value">
                        <a href="${rink.website}" target="_blank" class="rink-info-link">${rink.website}</a>
                    </span>
                </div>` : ''}
                
                <!-- NOTE MOYENNE -->
                <div class="rink-info-item" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(59,130,246,0.1);">
                    <span class="rink-info-icon">⭐</span>
                    <span class="rink-info-label">Note moyenne :</span>
                    <span class="rink-info-value" style="font-weight: 600; color: #fbbf24;">
                        ${averageRating ? averageRating.toFixed(1) + '/5' : 'Aucune note'}
                    </span>
                </div>
            </div>
            
            <!-- SECTION AVIS -->
            ${reviewsSection}
            
            <div class="rink-details-actions">
                ${lat && lng ? `<button class="rink-action-btn rink-action-primary" onclick="openDirections(${lat}, ${lng}, '${rink.name.replace(/'/g, '')}', '${rink.city ? rink.city.replace(/'/g, '') : ''}')">
                    🗺️ Itinéraire
                </button>` : ''}
                <button class="rink-action-btn rink-action-secondary" onclick="closeRinkDetailsModal()">
                    Fermer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
};

// Avis de démonstration (fallback si pas d'avis Firebase)
function getFakeReviewsForRink(rinkId) {
    const fakeReviewsData = {
        'PatinioireOlympiquedeParis': [
            { userName: 'Marie D.', rating: 5, comment: 'Magnifique patinoire ! Personnel très accueillant et glace parfaite.' },
            { userName: 'Thomas M.', rating: 4, comment: 'Super expérience ! Un peu cher mais ça vaut le coup.' },
            { userName: 'Sophie L.', rating: 5, comment: 'Parfait pour une première fois ! Les moniteurs sont patients.' }
        ],
        'IceArenaLyon': [
            { userName: 'Pierre L.', rating: 4, comment: 'Très bonne patinoire avec un bon équipement. L\'ambiance est sympa.' },
            { userName: 'Julie M.', rating: 3, comment: 'Patinoire correcte mais souvent bondée. Mieux vaut réserver.' }
        ]
    };

    // Chercher les avis correspondants
    for (const [key, reviews] of Object.entries(fakeReviewsData)) {
        if (key.toLowerCase().includes(rinkId.toLowerCase()) || rinkId.toLowerCase().includes(key.toLowerCase())) {
            return reviews;
        }
    }

    // Avis génériques si pas de correspondance
    return [
        { userName: 'Utilisateur A.', rating: 4, comment: 'Bonne patinoire, expérience agréable !' },
        { userName: 'Utilisateur B.', rating: 3, comment: 'Correct pour passer un bon moment en famille.' }
    ];
}

// Fonction pour fermer la modale
window.closeRinkDetailsModal = function() {
    const modal = document.getElementById('rink-details-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
};

// Fonction pour ouvrir les directions
window.openDirections = function(lat, lng, name, city) {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    let url;
    if (isIOS) {
        url = `https://maps.apple.com/?q=${encodeURIComponent(name + ', ' + city)}&ll=${lat},${lng}`;
    } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name + ', ' + city)}`;
    }
    
    window.open(url, '_blank');
};

// Fonctions utilitaires de debug
window.mapDebug = {
    refresh: loadRinksFromCheckIceApp,
    refreshDirect: loadRinksDirectlyFromFirebase,
    count: () => markers.length,
    testRating: (rinkId) => loadAverageRating(rinkId),
    checkData: () => console.log('checkIceApp:', window.checkIceApp?.allRinks)
};

console.log("Map.js CORRIGÉ avec chargement direct Firebase + synchronisation checklist chargé");


// VRAIE FONCTION LOADCHECKLIST - À ajouter dans app.js
async function loadChecklist() {
    try {
        console.log('🔍 DEBUG: Début loadChecklist()');
        
        // Vérifier l'authentification
        if (!currentUser) {
            console.log('❌ DEBUG: Utilisateur non connecté');
            return;
        }
        
        // Vérifier le conteneur
        const container = document.getElementById('check-section');
        if (!container) {
            console.log('❌ DEBUG: Container check-section non trouvé');
            return;
        }
        
        // Attendre les données si nécessaire
        if (!window.checkIceApp || !window.checkIceApp.allRinks || window.checkIceApp.allRinks.length === 0) {
            console.log('⏳ DEBUG: Données patinoires pas prêtes, attente...');
            let retryCount = 0;
            const maxRetries = 10;
            
            const waitForData = () => {
                if (window.checkIceApp?.allRinks?.length > 0) {
                    console.log('✅ Données enfin disponibles, rechargement...');
                    loadChecklist();
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`⏳ Retry ${retryCount}/${maxRetries}...`);
                    setTimeout(waitForData, 1000);
                } else {
                    console.log('❌ Timeout - impossible de charger les données');
                }
            };
            
            setTimeout(waitForData, 1000);
            return;
        }
        
        console.log(`📊 DEBUG: ${window.checkIceApp.allRinks.length} patinoires chargées`);
        
        // Charger les données utilisateur
        await loadUserData();
        
        // Charger et trier les patinoires
        const allRinks = window.checkIceApp.allRinks;
        const sortedRinks = sortRinksByProximityAndAlphabet(allRinks);
        
        // Afficher la checklist
        displayDynamicChecklist(sortedRinks);
        
        // Mettre à jour les stats
        await updateUserStats();
        
        console.log('✅ DEBUG: loadChecklist() terminé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur loadChecklist:', error);
    }
}

// Fonction d'affichage de la checklist
function displayDynamicChecklist(rinks) {
    try {
        const container = document.getElementById('check-section');
        
        // Nettoyer mais préserver le header
        const existingHeader = container.querySelector('.main-checklist-header');
        if (existingHeader) {
            container.innerHTML = '';
            container.appendChild(existingHeader);
        }
        
        // Séparer visitées et non visitées
        const unvisitedRinks = rinks.filter(rink => !userVisitedRinks.includes(rink.name));
        const visitedRinks = rinks.filter(rink => userVisitedRinks.includes(rink.name));
        
        // Section "À découvrir"
        if (unvisitedRinks.length > 0) {
            const unvisitedSection = document.createElement('div');
            unvisitedSection.className = 'checklist-section';
            unvisitedSection.innerHTML = `
                <div class="section-header">
                    <h3 class="section-title">🎯 À découvrir (${unvisitedRinks.length})</h3>
                    <div class="section-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(visitedRinks.length / rinks.length * 100)}%"></div>
                        </div>
                    </div>
                </div>
                <div class="checklist-items" id="unvisited-items"></div>
            `;
            container.appendChild(unvisitedSection);
            
            const unvisitedContainer = document.getElementById('unvisited-items');
            unvisitedRinks.forEach(rink => {
                const item = createChecklistItem(rink, false);
                unvisitedContainer.appendChild(item);
            });
        }
        
        // Section "Visitées"
        if (visitedRinks.length > 0) {
            const visitedSection = document.createElement('div');
            visitedSection.className = 'checklist-section visited';
            visitedSection.innerHTML = `
                <div class="section-header">
                    <h3 class="section-title">✅ Visitées (${visitedRinks.length})</h3>
                </div>
                <div class="checklist-items" id="visited-items"></div>
            `;
            container.appendChild(visitedSection);
            
            const visitedContainer = document.getElementById('visited-items');
            visitedRinks.forEach(rink => {
                const item = createChecklistItem(rink, true);
                visitedContainer.appendChild(item);
            });
        }
        
        // Animation
        setTimeout(() => {
            const items = document.querySelectorAll('.checklist-item');
            items.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
        }, 100);
        
    } catch (error) {
        console.error('❌ Erreur displayDynamicChecklist:', error);
    }
}

// Fonction de création d'item
function createChecklistItem(rink, isVisited = false) {
    const item = document.createElement('div');
    item.className = `checklist-item ${isVisited ? 'visited' : ''}`;
    item.setAttribute('data-rink-id', rink.name);
    
    item.innerHTML = `
        <div class="item-content">
            <div class="item-checkbox ${isVisited ? 'checked' : ''}" 
                 onclick="toggleRinkVisit('${rink.name}', this)">
                <div class="checkmark">${isVisited ? '✓' : ''}</div>
            </div>
            <div class="item-info">
                <div class="item-main">
                    <span class="item-name">${rink.name}</span>
                    <span class="item-points">+50 pts</span>
                </div>
                <div class="item-details">
                    <span class="item-city">${rink.city || 'Ville inconnue'}</span>
                    <span class="item-hours">${rink.horaires || 'Horaires non disponibles'}</span>
                    ${rink.status === 'closed' ? '<span class="status-badge closed">Fermée</span>' : ''}
                </div>
            </div>
        </div>
    `;
    
    return item;
}

// Fonction toggle avec points
async function toggleRinkVisit(rinkName, checkboxElement) {
    try {
        if (!currentUser) {
            alert('Vous devez être connecté pour marquer une patinoire comme visitée');
            return;
        }
        
        const isCurrentlyVisited = userVisitedRinks.includes(rinkName);
        
        if (isCurrentlyVisited) {
            // Supprimer la visite
            const visitQuery = query(
                collection(db, 'userVisits'),
                where('userId', '==', currentUser.uid),
                where('rinkName', '==', rinkName)
            );
            
            const querySnapshot = await getDocs(visitQuery);
            querySnapshot.forEach(async (docSnap) => {
                await updateDoc(doc(db, 'userVisits', docSnap.id), {
                    visited: false,
                    updatedAt: new Date()
                });
            });
            
            userVisitedRinks = userVisitedRinks.filter(name => name !== rinkName);
            checkboxElement.classList.remove('checked');
            checkboxElement.querySelector('.checkmark').textContent = '';
            
        } else {
            // Ajouter la visite (+50 points)
            await addDoc(collection(db, 'userVisits'), {
                userId: currentUser.uid,
                rinkName: rinkName,
                visited: true,
                visitDate: new Date(),
                createdAt: new Date(),
                points: 50
            });
            
            userVisitedRinks.push(rinkName);
            checkboxElement.classList.add('checked');
            checkboxElement.querySelector('.checkmark').textContent = '✓';
        }
        
        // Recharger la checklist
        setTimeout(() => {
            loadChecklist();
        }, 500);
        
        // Mettre à jour les stats
        await updateUserStats();
        
    } catch (error) {
        console.error('❌ Erreur toggle visite:', error);
        alert('Erreur lors de la mise à jour. Veuillez réessayer.');
    }
}

// Exposer globalement pour map.js
window.loadChecklist = loadChecklist;

// Event listeners
window.addEventListener('checkiceDataReady', () => {
    console.log('🔄 Données Firebase prêtes, rechargement checklist...');
    setTimeout(loadChecklist, 1000);
});

console.log('✅ Checklist system loaded and ready');
