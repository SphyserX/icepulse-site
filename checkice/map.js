// map.js - VERSION FINALE COMPLÈTE AVEC AVIS OPTIONNELS (ÉTOILES SEULEMENT)
import { db } from './firebase.js';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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
        loadRinksDirectlyFromFirebase();
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

        // Charger les patinoires après un délai
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

// FONCTION PRINCIPALE - Charger directement depuis Firebase
async function loadRinksDirectlyFromFirebase() {
    try {
        console.log("🔧 Chargement DIRECT depuis Firebase...");
        
        const querySnapshot = await getDocs(collection(db, 'rinks'));
        const firebaseRinks = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`📍 Firebase: ${data.name} - Horaires: ${data.horaires}`);
            firebaseRinks.push(data);
        });
        
        console.log(`✅ ${firebaseRinks.length} patinoires chargées depuis Firebase`);
        
        // Mise à jour de checkIceApp pour compatibilité
        if (!window.checkIceApp) {
            window.checkIceApp = {};
        }
        window.checkIceApp.allRinks = firebaseRinks;
        
        // Charger sur la carte avec les données Firebase
        loadRinksFromData(firebaseRinks);
        
        // *** SOLUTION INTÉGRÉE *** - Créer directement la checklist
        setTimeout(() => {
            console.log('🔄 Création de la checklist intégrée...');
            createDirectChecklist();
        }, 2000);
        
    } catch (error) {
        console.error("❌ Erreur chargement Firebase:", error);
    }
}

// Fonction factorisée pour charger les données sur la carte
function loadRinksFromData(rinks) {
    try {
        console.log(`${rinks.length} patinoires disponibles`);

        // DEBUG - Vérification des données chargées
        console.log('=== DEBUG CHARGEMENT PATINOIRES ===');
        rinks.forEach((rink, index) => {
            console.log(`Rink ${index}: ${rink.name} - Horaires: ${rink.horaires}`);
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
        rinks.forEach((rink) => {
            let lat, lng;

            // Gestion des coordonnées
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
                    
                    marker.bindPopup(createCompactPopup(rink, lat, lng), {
                        maxWidth: 340,
                        className: 'checkice-compact-popup'
                    });

                    markers.push(marker);
                    addedCount++;
                } catch (markerError) {
                    console.error(`Erreur ajout marqueur ${rink.name}:`, markerError);
                }
            }
        });

        console.log(`✅ ${addedCount} patinoires affichées sur la carte`);

    } catch (error) {
        console.error("❌ Erreur chargement données:", error);
    }
}

// POPUP COMPACT au thème CHECKICE AVEC CORRECTION HORAIRES
function createCompactPopup(rink, lat, lng) {
    // Informations essentielles
    const ville = rink.city || rink.ville || rink.address || 'Ville inconnue';
    
    // VERSION CORRIGÉE pour l'extraction des horaires
    let horaires = 'Horaires non disponibles';
    
    if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
        horaires = rink.horaires;
    } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
        horaires = rink.hours;
    } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
        horaires = rink.schedule;
    }

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

// *** FONCTION CORRIGÉE POUR CHARGER LES AVIS DEPUIS FIREBASE ***
async function loadReviewsAndRating(rinkId) {
    try {
        console.log('🔍 Recherche avis pour rinkId:', rinkId);
        
        const reviewsCollection = collection(db, 'reviews');
        const q = query(reviewsCollection, where('rinkId', '==', rinkId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('❌ Aucun avis trouvé dans Firebase, utilisation des avis factices');
            // Fallback vers les avis de démonstration
            const fakeReviews = getFakeReviewsForRink(rinkId);
            if (fakeReviews.length > 0) {
                const avgRating = fakeReviews.reduce((sum, review) => sum + review.rating, 0) / fakeReviews.length;
                return { averageRating: avgRating, reviews: fakeReviews };
            }
            return { averageRating: null, reviews: [] };
        }

        let sum = 0;
        const reviews = [];

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            console.log('📊 Avis trouvé:', data);
            
            const review = {
                id: docSnap.id, // Important pour la modification
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

        const averageRating = reviews.length > 0 ? sum / reviews.length : null;
        console.log(`✅ ${reviews.length} avis chargés, moyenne: ${averageRating}`);
        
        return { averageRating, reviews };

    } catch (error) {
        console.error('❌ Erreur chargement reviews:', error);
        return { averageRating: null, reviews: [] };
    }
}

// *** SYSTÈME D'AVIS AVEC COMMENTAIRE OPTIONNEL ***
function createReviewForm(rinkId, rinkName, existingReview = null) {
    const isEditing = !!existingReview;
    
    const formContainer = document.createElement('div');
    formContainer.className = 'review-form-container';
    formContainer.style.cssText = `
        margin-top: 16px;
        padding: 20px;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #3b82f6;
        border-radius: 12px;
        animation: slideIn 0.3s ease;
    `;

    formContainer.innerHTML = `
        <style>
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
            .star-rating {
                display: flex;
                gap: 4px;
                margin: 8px 0;
            }
            .star {
                font-size: 24px;
                color: #d1d5db;
                cursor: pointer;
                transition: color 0.2s ease;
                user-select: none;
            }
            .star.active {
                color: #fbbf24;
            }
            .star:hover {
                color: #f59e0b;
            }
        </style>
        
        <h4 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">
            ${isEditing ? '✏️ Modifier mon avis' : '⭐ Ajouter un avis'} - ${rinkName}
        </h4>
        
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px;">
                Note sur 5 <span style="color: #ef4444;">*</span> :
            </label>
            <div class="star-rating" id="star-rating-${rinkId}">
                ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}">★</span>`).join('')}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                Cliquez sur les étoiles pour noter (obligatoire)
            </div>
        </div>
        
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 8px;">
                Votre commentaire <span style="color: #6b7280; font-weight: normal;">(optionnel)</span> :
            </label>
            <textarea 
                id="review-comment-${rinkId}" 
                rows="4" 
                maxlength="500"
                placeholder="Partagez votre expérience sur cette patinoire (optionnel)..."
                style="
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    resize: vertical;
                    font-family: inherit;
                    box-sizing: border-box;
                "
            ></textarea>
            <div style="font-size: 12px; color: #6b7280; text-align: right; margin-top: 4px;">
                <span id="char-count-${rinkId}">0</span>/500 caractères
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button 
                id="cancel-review-${rinkId}"
                style="
                    padding: 10px 20px;
                    background: #f3f4f6;
                    color: #374151;
                    border: 2px solid #d1d5db;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                "
            >
                Annuler
            </button>
            <button 
                id="submit-review-${rinkId}"
                style="
                    padding: 10px 20px;
                    background: #3b82f6;
                    color: white;
                    border: 2px solid #3b82f6;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                "
            >
                ${isEditing ? 'Modifier' : 'Publier'} l'avis
            </button>
        </div>
    `;

    // Variables pour le formulaire
    let selectedRating = isEditing ? existingReview.rating : 0;
    
    // Gestion des étoiles
    const stars = formContainer.querySelectorAll('.star');
    const commentTextarea = formContainer.querySelector(`#review-comment-${rinkId}`);
    const charCount = formContainer.querySelector(`#char-count-${rinkId}`);
    const submitBtn = formContainer.querySelector(`#submit-review-${rinkId}`);
    const cancelBtn = formContainer.querySelector(`#cancel-review-${rinkId}`);

    // Pré-remplir si modification
    if (isEditing) {
        commentTextarea.value = existingReview.comment || '';
        charCount.textContent = (existingReview.comment || '').length;
        updateStars(existingReview.rating);
    }

    // Fonction pour mettre à jour les étoiles
    function updateStars(rating) {
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
        selectedRating = rating;
        validateForm();
    }

    // Event listeners pour les étoiles
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            updateStars(rating);
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => {
                s.style.color = i < rating ? '#f59e0b' : '#d1d5db';
            });
        });
    });

    // Restaurer les étoiles au survol
    formContainer.querySelector('.star-rating').addEventListener('mouseleave', () => {
        updateStars(selectedRating);
    });

    // Compteur de caractères
    commentTextarea.addEventListener('input', () => {
        const length = commentTextarea.value.length;
        charCount.textContent = length;
        charCount.style.color = length > 450 ? '#ef4444' : '#6b7280';
        validateForm();
    });

    // *** VALIDATION CORRIGÉE - SEULE LA NOTE EST OBLIGATOIRE ***
    function validateForm() {
        const hasRating = selectedRating > 0;
        // Le commentaire est maintenant optionnel
        
        submitBtn.disabled = !hasRating;
        submitBtn.style.opacity = submitBtn.disabled ? '0.5' : '1';
        submitBtn.style.cursor = submitBtn.disabled ? 'not-allowed' : 'pointer';
    }

    // *** SOUMISSION CORRIGÉE - COMMENTAIRE OPTIONNEL ***
    submitBtn.addEventListener('click', async () => {
        const comment = commentTextarea.value.trim();
        
        // Seule la note est obligatoire maintenant
        if (selectedRating === 0) {
            alert('Veuillez donner une note en cliquant sur les étoiles.');
            return;
        }

        const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        if (!currentUser || !currentUser.uid) {
            alert('Vous devez être connecté pour laisser un avis.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Enregistrement...';

        try {
            if (isEditing) {
                // Modifier l'avis existant
                await updateDoc(doc(db, 'reviews', existingReview.id), {
                    rating: selectedRating,
                    comment: comment || '', // Commentaire peut être vide
                    updatedAt: new Date()
                });
                console.log('✅ Avis modifié avec succès');
            } else {
                // Ajouter nouvel avis
                await addDoc(collection(db, 'reviews'), {
                    rinkId: rinkId,
                    rinkName: rinkName,
                    userId: currentUser.uid,
                    userName: currentUser.email || currentUser.displayName || 'Utilisateur',
                    rating: selectedRating,
                    comment: comment || '', // Commentaire peut être vide
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log('✅ Nouvel avis ajouté avec succès');
            }

            // Animation de succès
            formContainer.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => formContainer.remove(), 300);
            
            // Recharger la modale
            setTimeout(async () => {
                const modal = document.getElementById('rink-details-modal');
                if (modal) modal.remove();
                await window.openRinkDetailsModal(rinkId);
            }, 400);

        } catch (error) {
            console.error('❌ Erreur sauvegarde avis:', error);
            alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
            
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? 'Modifier l\'avis' : 'Publier l\'avis';
        }
    });

    // Annulation
    cancelBtn.addEventListener('click', () => {
        formContainer.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => formContainer.remove(), 300);
    });

    // Validation initiale
    validateForm();

    return formContainer;
}

// *** MODALE FICHE COMPLÈTE AVEC AVIS INTERACTIFS ***
window.openRinkDetailsModal = async function(rinkId) {
    console.log('🔍 Ouverture fiche pour rinkId:', rinkId);

    let rink = null;
    if (window.checkIceApp && window.checkIceApp.allRinks) {
        rink = window.checkIceApp.allRinks.find(r => generateRinkId(r) === rinkId);
    }

    if (!rink) {
        alert('Patinoire introuvable');
        return;
    }

    console.log('📍 Patinoire trouvée:', rink.name);

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

    // EXTRACTION ROBUSTE DES HORAIRES
    let horairesModale = 'Horaires non disponibles';
    if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
        horairesModale = rink.horaires;
    } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
        horairesModale = rink.hours;
    } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
        horairesModale = rink.schedule;
    }

    // *** CHARGER LES AVIS DEPUIS FIREBASE ***
    console.log('🔄 Chargement des avis pour:', rinkId);
    const { averageRating, reviews } = await loadReviewsAndRating(rinkId);
    console.log(`📊 Avis chargés: ${reviews.length} avis, note moyenne: ${averageRating}`);

    // Vérifier si l'utilisateur connecté a déjà un avis
    const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
    const userReview = currentUser ? reviews.find(r => r.userId === currentUser.uid) : null;

    // Créer la section avis avec bouton d'ajout/modification
    const reviewsSection = `
        <div class="rink-reviews-section" style="margin-top: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <h3 style="color: #3b82f6; font-size: 16px; font-weight: 600; margin: 0;">
                    💬 Avis des utilisateurs (${reviews.length})
                </h3>
                ${currentUser ? `
                    <button 
                        id="add-review-btn-${rinkId}"
                        style="
                            padding: 8px 16px;
                            background: ${userReview ? '#f59e0b' : '#3b82f6'};
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        "
                    >
                        ${userReview ? '✏️ Modifier mon avis' : '⭐ Ajouter un avis'}
                    </button>
                ` : `
                    <div style="padding: 8px 16px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #6b7280;">
                        Connectez-vous pour laisser un avis
                    </div>
                `}
            </div>
            
            ${reviews.length > 0 ? `
                <div style="display: grid; gap: 12px; max-height: 300px; overflow-y: auto;">
                    ${reviews.map(review => `
                        <div style="
                            padding: 12px; 
                            background: rgba(59,130,246,0.05); 
                            border-radius: 12px; 
                            border: 1px solid rgba(59,130,246,0.1);
                            ${review.userId === currentUser?.uid ? 'border-color: #f59e0b; background: rgba(245,158,11,0.1);' : ''}
                        ">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <div style="display: flex; gap: 2px;">
                                    ${[1,2,3,4,5].map(i => `<span style="color: ${i <= review.rating ? '#fbbf24' : '#d1d5db'}; font-size: 14px;">★</span>`).join('')}
                                </div>
                                <span style="font-weight: 600; color: #374151; font-size: 13px;">${review.userName || 'Anonyme'}</span>
                                ${review.userId === currentUser?.uid ? '<span style="font-size: 11px; color: #f59e0b; font-weight: 600;">(Votre avis)</span>' : ''}
                                <span style="font-size: 11px; color: #6b7280;">
                                    ${review.createdAt ? 
                                        (review.createdAt.seconds ? 
                                            new Date(review.createdAt.seconds * 1000).toLocaleDateString('fr-FR') : 
                                            new Date(review.createdAt).toLocaleDateString('fr-FR')) : 
                                        'Date inconnue'}
                                </span>
                            </div>
                            ${review.comment ? `<div style="color: #475569; font-size: 14px; line-height: 1.4;">${review.comment}</div>` : `<div style="color: #9ca3af; font-style: italic; font-size: 13px;">Avis sans commentaire</div>`}
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div style="padding: 16px; background: rgba(107,114,128,0.1); border-radius: 12px; text-align: center;">
                    <p style="color: #6b7280; font-style: italic; margin: 0;">Aucun avis disponible pour cette patinoire.</p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">Soyez le premier à laisser un avis !</p>
                </div>
            `}
            
            <div id="review-form-container-${rinkId}"></div>
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
                
                ${rink.tarifs ? `<div class="rink-info-item">
                    <span class="rink-info-icon">💰</span>
                    <span class="rink-info-label">Tarifs :</span>
                    <span class="rink-info-value">${rink.tarifs}</span>
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
            
            <!-- SECTION AVIS INTERACTIVE -->
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

    // Event listener pour le bouton d'ajout/modification d'avis
    const addReviewBtn = document.getElementById(`add-review-btn-${rinkId}`);
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => {
            const formContainer = document.getElementById(`review-form-container-${rinkId}`);
            
            // Supprimer le formulaire existant s'il y en a un
            if (formContainer.children.length > 0) {
                formContainer.innerHTML = '';
                return;
            }
            
            // Créer et ajouter le formulaire
            const reviewForm = createReviewForm(rinkId, rink.name, userReview);
            formContainer.appendChild(reviewForm);
            
            // Scroll vers le formulaire
            reviewForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    setTimeout(() => modal.classList.add('active'), 10);
};

// Avis de démonstration étendus
function getFakeReviewsForRink(rinkId) {
    const fakeReviewsData = {
        'PatinioireOlympiquedeParis': [
            { userName: 'Marie D.', rating: 5, comment: 'Magnifique patinoire ! Personnel très accueillant et glace parfaite. Je recommande vivement pour une sortie en famille.', createdAt: new Date('2024-01-15') },
            { userName: 'Thomas M.', rating: 4, comment: 'Super expérience ! Seul bémol : un peu cher mais ça vaut le coup. Les vestiaires sont très propres.', createdAt: new Date('2024-01-20') },
            { userName: 'Sophie L.', rating: 5, comment: '', createdAt: new Date('2024-01-25') } // Exemple d'avis sans commentaire
        ],
        'IceArenaLyon': [
            { userName: 'Pierre L.', rating: 4, comment: 'Très bonne patinoire avec un bon équipement. L\'ambiance est sympa, surtout le weekend avec la musique.', createdAt: new Date('2024-01-12') },
            { userName: 'Julie M.', rating: 3, comment: '', createdAt: new Date('2024-01-18') } // Exemple d'avis sans commentaire
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
        { userName: 'Utilisateur A.', rating: 4, comment: 'Bonne patinoire, expérience agréable !', createdAt: new Date('2024-01-01') },
        { userName: 'Utilisateur B.', rating: 3, comment: '', createdAt: new Date('2024-01-05') } // Exemple d'avis sans commentaire
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

// Fonction pour ouvrir les directions - CORRIGÉE
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

// CHECKLIST FIREBASE PAR UTILISATEUR - Version corrigée avec header fixé
async function createDirectChecklist() {
    try {
        console.log('🎯 Création checklist Firebase par utilisateur');
        
        if (!window.checkIceApp?.allRinks?.length) {
            console.log('❌ Pas de données patinoires disponibles');
            return;
        }
        
        // Récupérer l'utilisateur connecté
        const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        if (!currentUser || !currentUser.uid) {
            console.log('❌ Utilisateur non connecté - checklist basique');
            createBasicChecklist();
            return;
        }
        
        const container = document.getElementById('check-section');
        if (!container) {
            console.log('❌ Container check-section non trouvé');
            return;
        }
        
        // Charger les visites depuis Firebase
        const visitQuery = query(
            collection(db, 'userVisits'),
            where('userId', '==', currentUser.uid)
        );
        
        const visitSnapshot = await getDocs(visitQuery);
        const visitedRinks = [];
        
        visitSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.visited && data.rinkName) {
                visitedRinks.push(data.rinkName);
            }
        });
        
        console.log(`📊 ${visitedRinks.length} visites chargées depuis Firebase`);
        
        // Charger les points utilisateur depuis Firebase
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userPoints = userSnap.exists() ? (userSnap.data().points || 0) : 0;
        const userLevel = calculateUserLevel(userPoints);
        
        const rinks = window.checkIceApp.allRinks;
        
        // *** HTML CORRIGÉ AVEC HEADER SIMPLE ***
        container.innerHTML = `
            <div style="padding: 20px;">
                <!-- Header simple sans email -->
                <div style="margin-bottom: 32px; text-align: center;">
                    <h2 style="margin: 0; color: #1f2937; font-size: 24px;">🎯 Patinoires CheckICE</h2>
                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 16px;">${rinks.length} patinoires disponibles</p>
                </div>
                
                <!-- Section À découvrir -->
                <div style="margin-bottom: 32px;">
                    <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">
                        🎯 À découvrir (${rinks.filter(r => !visitedRinks.includes(r.name)).length})
                    </h3>
                    <div style="display: grid; gap: 12px;">
                        ${rinks.filter(rink => !visitedRinks.includes(rink.name)).map(rink => `
                            <div style="padding: 16px; background: white; border: 2px solid #e5e7eb; border-radius: 12px;">
                                <div style="display: flex; align-items: flex-start; gap: 14px;">
                                    <div style="width: 28px; height: 28px; border: 3px solid #d1d5db; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;"
                                         data-rink-name="${rink.name.replace(/'/g, "&#39;").replace(/"/g, "&quot;")}"
                                         onclick="handleRinkToggle(this)"
                                         onmouseover="this.style.borderColor='#10b981'; this.style.transform='scale(1.1)'" 
                                         onmouseout="this.style.borderColor='#d1d5db'; this.style.transform='scale(1)'"></div>
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                            <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1f2937;">${rink.name}</h4>
                                            <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">50 pts</span>
                                        </div>
                                        <div style="color: #6b7280; font-size: 14px;">
                                            <strong>${rink.city || 'Ville inconnue'}</strong><br>
                                            <span style="color: #059669;">${rink.horaires || 'Horaires non disponibles'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Section Visitées -->
                ${visitedRinks.length > 0 ? `
                <div>
                    <h3 style="color: #1f2937; font-size: 18px; margin-bottom: 16px;">✅ Visitées (${visitedRinks.length})</h3>
                    <div style="display: grid; gap: 12px;">
                        ${rinks.filter(rink => visitedRinks.includes(rink.name)).map(rink => `
                            <div style="padding: 16px; background: #f8fafc; border: 2px solid #10b981; border-radius: 12px; opacity: 0.8;">
                                <div style="display: flex; align-items: flex-start; gap: 14px;">
                                    <div style="width: 28px; height: 28px; background: #10b981; border: 3px solid #10b981; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;"
                                         data-rink-name="${rink.name.replace(/'/g, "&#39;").replace(/"/g, "&quot;")}"
                                         onclick="handleRinkToggle(this)">
                                        <span style="color: white; font-weight: bold; font-size: 16px;">✓</span>
                                    </div>
                                    <div style="flex: 1;">
                                        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1f2937; text-decoration: line-through;">${rink.name}</h4>
                                        <div style="color: #6b7280; font-size: 14px;">${rink.city || 'Ville inconnue'} • 50 pts</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
            </div>
        `;
        
        console.log(`✅ Checklist Firebase créée: ${visitedRinks.length}/${rinks.length} visitées, ${userPoints} pts, niveau ${userLevel.name}`);
        
    } catch (error) {
        console.error('❌ Erreur création checklist Firebase:', error);
        // Fallback vers version basique
        createBasicChecklist();
    }
}

// Fonction basique pour utilisateurs non connectés
function createBasicChecklist() {
    const container = document.getElementById('check-section');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <h3 style="color: #6b7280; margin-bottom: 16px;">🔒 Connexion requise</h3>
            <p style="color: #6b7280; margin-bottom: 20px;">Connectez-vous pour accéder à votre checklist personnalisée et gagner des points !</p>
            <button onclick="window.location.href='login.html'" style="
                padding: 12px 24px; 
                background: #3b82f6; 
                color: white; 
                border: none; 
                border-radius: 8px; 
                font-weight: 600;
                cursor: pointer;
            ">Se connecter</button>
        </div>
    `;
}

// FONCTION FIREBASE - Toggle visite avec points
async function toggleRinkVisitDirect(rinkName, checkboxElement) {
    try {
        // Récupérer l'utilisateur connecté
        const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        if (!currentUser || !currentUser.uid) {
            alert('Vous devez être connecté pour marquer des visites');
            return;
        }
        
        console.log(`🎯 Toggle visite Firebase: ${rinkName} pour ${currentUser.uid}`);
        
        // Vérifier le statut actuel dans Firestore
        const visitQuery = query(
            collection(db, 'userVisits'),
            where('userId', '==', currentUser.uid),
            where('rinkName', '==', rinkName)
        );
        
        const querySnapshot = await getDocs(visitQuery);
        const isCurrentlyVisited = !querySnapshot.empty;
        
        if (isCurrentlyVisited) {
            // ❌ SUPPRIMER la visite et retirer les points
            console.log(`❌ Suppression visite: ${rinkName}`);
            
            for (const docSnap of querySnapshot.docs) {
                await deleteDoc(doc(db, 'userVisits', docSnap.id));
            }
            
            // Retirer 50 points
            await updateUserPoints(currentUser.uid, -50);
            
            // Mettre à jour l'UI
            checkboxElement.style.background = 'transparent';
            checkboxElement.style.borderColor = '#d1d5db';
            checkboxElement.innerHTML = '';
            
        } else {
            // ✅ AJOUTER la visite et les points
            console.log(`✅ Ajout visite: ${rinkName}`);
            
            await addDoc(collection(db, 'userVisits'), {
                userId: currentUser.uid,
                rinkName: rinkName,
                visited: true,
                visitDate: new Date(),
                createdAt: new Date(),
                points: 50
            });
            
            // Ajouter 50 points
            await updateUserPoints(currentUser.uid, 50);
            
            // Mettre à jour l'UI
            checkboxElement.style.background = '#10b981';
            checkboxElement.style.borderColor = '#10b981';
            checkboxElement.innerHTML = '<span style="color: white; font-weight: bold; font-size: 16px;">✓</span>';
        }
        
        // Recharger la checklist après un délai
        setTimeout(() => {
            createDirectChecklist();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erreur toggle visite Firebase:', error);
        alert('Erreur de sauvegarde. Veuillez réessayer.');
    }
}

// FONCTION FIREBASE - Mettre à jour les points utilisateur
async function updateUserPoints(userId, pointsToAdd) {
    try {
        console.log(`💰 Mise à jour points Firebase: ${pointsToAdd} pts pour ${userId}`);
        
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            // Mettre à jour les points existants
            const currentPoints = userSnap.data().points || 0;
            const newPoints = Math.max(0, currentPoints + pointsToAdd); // Éviter points négatifs
            
            await updateDoc(userRef, {
                points: newPoints,
                lastActivity: new Date()
            });
            
            console.log(`✅ Points Firebase mis à jour: ${currentPoints} → ${newPoints}`);
            
        } else {
            // Créer le profil utilisateur avec les points initiaux
            const initialPoints = Math.max(0, pointsToAdd);
            
            await setDoc(userRef, {
                points: initialPoints,
                createdAt: new Date(),
                lastActivity: new Date()
            });
            
            console.log(`🆕 Profil Firebase créé avec ${initialPoints} points`);
        }
        
    } catch (error) {
        console.error('❌ Erreur mise à jour points Firebase:', error);
    }
}

// FONCTION - Calculer le niveau utilisateur
function calculateUserLevel(points) {
    if (points >= 1000) return { name: 'Expert', level: 5, color: '#ef4444' };
    if (points >= 750) return { name: 'Collectionneur', level: 4, color: '#f59e0b' };
    if (points >= 500) return { name: 'Explorateur', level: 3, color: '#8b5cf6' };
    if (points >= 250) return { name: 'Amateur', level: 2, color: '#6366f1' };
    return { name: 'Débutant', level: 1, color: '#94a3b8' };
}


// Exposer les fonctions globalement
window.toggleRinkVisitDirect = toggleRinkVisitDirect;

// ✅ FONCTION CORRIGÉE POUR GÉRER LES CLICS SANS ERREUR DE SYNTAXE
window.handleRinkToggle = function(element) {
    const rinkName = element.getAttribute('data-rink-name');
    if (rinkName) {
        // Décoder les entités HTML
        const decodedName = rinkName
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');
        toggleRinkVisitDirect(decodedName, element);
    }
};

// Fonctions utilitaires de debug
window.mapDebug = {
    refreshDirect: loadRinksDirectlyFromFirebase,
    count: () => markers.length,
    checkData: () => console.log('Firebase data:', window.checkIceApp?.allRinks),
    testFirebase: () => createDirectChecklist(),
    testReviews: (rinkId) => loadReviewsAndRating(rinkId || 'PatinioireOlympiquedeParis')
};

console.log("Map.js FINAL - Version complète avec avis optionnels (étoiles seulement)");
