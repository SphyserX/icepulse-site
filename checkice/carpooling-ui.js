// ========================================
// 🚗 CHECKICE CARPOOLING - INTERFACE UI COMPLÈTE
// Version finale avec toutes les modales implémentées
// ========================================

import { db, auth } from './firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

import carpoolingSystem from './carpooling-system.js';
import { showCustomConfirm, showCustomPrompt } from './utils.js';

console.log('🚗 Interface covoiturage CHECKICE complète !');




// ========================================
// SYSTÈME DE MODALE DE RÉSERVATION (VERSION INFALLIBLE)
// ========================================

/**
 * Crée et affiche une modale pour envoyer un message de réservation.
 * Cette version utilise uniquement des styles inline pour éviter les conflits CSS.
 */
window.openBookingMessageModal = function(tripId) {
  console.log(`[MODAL] 🔥 Ouverture pour le trajet: ${tripId}`);

  // Supprimer toute ancienne modale pour éviter les doublons
  const existingModal = document.getElementById('booking-message-modal-container');
  if (existingModal) {
    existingModal.remove();
  }

  // Créer le conteneur principal de la modale
  const modalContainer = document.createElement('div');
  modalContainer.id = 'booking-message-modal-container';
  
  // Appliquer les styles qui garantissent la visibilité
  Object.assign(modalContainer.style, {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: '99999' // S'assure qu'elle est au-dessus de tout
  });

  // Contenu HTML de la modale
  modalContainer.innerHTML = `
    <div style="background: white; border-radius: 16px; width: 90%; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); animation: modal-fade-in 0.3s ease-out;">
      <!-- En-tête -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0;">Message au conducteur</h2>
        <button onclick="document.getElementById('booking-message-modal-container').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #9ca3af;">&times;</button>
      </div>

      <!-- Corps -->
      <div style="padding: 24px;">
        <p style="color: #4b5563; margin-top: 0; margin-bottom: 16px;">
          Vous pouvez ajouter un message pour accompagner votre demande de réservation.
        </p>
        <textarea 
          id="booking-message-input" 
          placeholder="Exemple: Bonjour, je suis très intéressé(e) par votre trajet !" 
          style="width: 100%; min-height: 100px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; box-sizing: border-box; resize: vertical;"
        ></textarea>
      </div>

      <!-- Pied de page -->
      <div style="display: flex; gap: 12px; padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
        <button 
          onclick="document.getElementById('booking-message-modal-container').remove()"
          style="flex: 1; padding: 12px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 8px; font-weight: 600; cursor: pointer;"
        >
          Annuler
        </button>
        <button 
          onclick="window.submitBookingRequest('${tripId}')"
          style="flex: 1; padding: 12px; border: none; background: #4f46e5; color: white; border-radius: 8px; font-weight: 600; cursor: pointer;"
        >
          Envoyer la demande
        </button>
      </div>
    </div>
  `;

  // Ajouter la modale au corps de la page
  document.body.appendChild(modalContainer);
  console.log('[MODAL] ✅ Modale ajoutée au DOM et visible.');

  // Mettre le focus sur le champ de texte
  setTimeout(() => {
    document.getElementById('booking-message-input').focus();
  }, 50);
};

/**
 * Soumet la demande de réservation et ferme la modale.
 */
window.submitBookingRequest = async function(tripId) {
  console.log(`[SUBMIT] 📨 Envoi de la réservation pour le trajet: ${tripId}`);
  const messageInput = document.getElementById('booking-message-input');
  const message = messageInput ? messageInput.value : '';

  const modal = document.getElementById('booking-message-modal-container');
  if (modal) {
    // Afficher un loader sur le bouton
    const submitButton = modal.querySelector('button[onclick^="window.submitBookingRequest"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Envoi en cours...';
    }
  }

  try {
    // Appeler le système de covoiturage pour faire la réservation
    await carpoolingSystem.requestBooking(tripId, message);

    // Fermer la modale
    if (modal) modal.remove();

    // Afficher une confirmation et rafraîchir la vue des trajets
    alert('✅ Demande de réservation envoyée !');
    await window.openTripDetailsModal(tripId); // Rouvre la modale des détails pour voir le statut "En attente"

  } catch (error) {
    console.error('❌ Erreur lors de la soumission de la réservation:', error);
    alert('❌ Une erreur est survenue: ' + error.message);
    // Réactiver le bouton en cas d'erreur
    if (modal) {
      const submitButton = modal.querySelector('button[onclick^="window.submitBookingRequest"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = '🚗 Envoyer la demande';
      }
    }
  }
};


// ========================================
// INITIALISATION PRINCIPALE
// ========================================

export async function initializeCarpooling() {
  console.log('🚗 Initialisation covoiturage CHECKICE...');

  // Charger les patinoires
  const rinks = window.checkIceApp?.allRinks || [];
  console.log(`📍 ${rinks.length} patinoires chargées`);

  // Créer l'interface
  createCarpoolingUI();

  // Charger les trajets disponibles
  await loadTabContent('search');

  console.log('✅ Covoiturage initialisé !');
}

// ========================================
// CRÉATION DE L'INTERFACE PREMIUM
// ========================================

function createCarpoolingUI() {
  const carpoolingSection = document.getElementById('carpooling-section');

  if (!carpoolingSection) {
    console.error('❌ Section carpooling-section introuvable');
    return;
  }

  carpoolingSection.innerHTML = `
    <!-- Header covoiturage -->
    <div class="carpooling-header frost-effect">
      <h1 class="carpooling-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
          <polygon points="12 15 17 21 7 21 12 15"></polygon>
        </svg>
        Covoiturage entre patinoires
      </h1>

      <!-- Onglets horizontaux -->
      <div class="carpooling-tabs">
        <button class="tab-btn tab-active" data-tab="search" onclick="window.loadCarpoolingTab('search')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>Rechercher</span>
        </button>

        <button class="tab-btn" data-tab="my-trips" onclick="window.loadCarpoolingTab('my-trips')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Mes trajets</span>
        </button>

        <button class="tab-btn" data-tab="my-bookings" onclick="window.loadCarpoolingTab('my-bookings')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Mes réservations</span>
        </button>

        <button class="tab-btn" data-tab="history" onclick="window.loadCarpoolingTab('history')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Historique
        </button>
      </div>
    </div>

    <!-- Contenu dynamique -->
    <div id="carpooling-content" class="carpooling-content">
      <div class="text-center py-8">
        <div class="animate-spin text-4xl mb-4">⏳</div>
        <p class="text-gray-500">Chargement...</p>
      </div>
    </div>
  `;
}


// ========================================
// ✅ ONGLET HISTORIQUE (VERSION REFACTORISÉE)
// ========================================
async function showHistoryTab() {
  const content = document.getElementById('carpooling-content');
  
  content.innerHTML = `
    <div class="history-header">
      <h3 class="history-title">📜 Historique des trajets</h3>
      <p class="history-subtitle">Consultez vos trajets et réservations passés</p>
      
      <div class="history-toggle-buttons">
        <button class="ice-button" id="history-driver-btn">
          🚗 En tant que conducteur
        </button>
        <button class="ice-button-secondary" id="history-passenger-btn">
          🎫 En tant que passager
        </button>
      </div>
    </div>
    
    <div id="history-results">
      <p class="history-loading">Chargement de l'historique...</p>
    </div>
  `;

  await loadDriverHistory();

  document.getElementById('history-driver-btn').addEventListener('click', async () => {
    document.getElementById('history-driver-btn').className = 'ice-button';
    document.getElementById('history-passenger-btn').className = 'ice-button-secondary';
    await loadDriverHistory();
  });

  document.getElementById('history-passenger-btn').addEventListener('click', async () => {
    document.getElementById('history-driver-btn').className = 'ice-button-secondary';
    document.getElementById('history-passenger-btn').className = 'ice-button';
    await loadPassengerHistory();
  });
}

// ========================================
// CHARGEMENT DES ONGLETS
// ========================================

window.loadCarpoolingTab = async function(tab) {
  console.log(`📂 Chargement onglet: ${tab}`);

  // Mise à jour des onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('tab-active');
    if (btn.dataset.tab === tab) {
      btn.classList.add('tab-active');
    }
  });

  await loadTabContent(tab);
};

async function loadTabContent(tab) {
  const content = document.getElementById('carpooling-content');

  if (!content) return;

  content.innerHTML = `
    <div class="text-center py-8">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p class="text-gray-500">Chargement...</p>
    </div>
  `;

  try {
    switch(tab) {
      case 'search':
        await loadSearchTab();
        break;
      case 'my-trips':
        await loadMyTripsTab();
        break;
      case 'my-bookings':
        await loadMyBookingsTab();
        break;
      case 'history':  // ✅ AJOUT DU CAS HISTORIQUE
        await showHistoryTab();
        break;
      default:
        content.innerHTML = `
          <div class="text-center py-8">
            <div class="text-4xl mb-4">❓</div>
            <p class="text-gray-500">Onglet inconnu</p>
          </div>
        `;
    }
  } catch (error) {
    console.error('Erreur chargement onglet:', error);
    content.innerHTML = `
      <div class="text-center py-8">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-red-500">Erreur de chargement</p>
        <button class="ice-button mt-4" onclick="window.loadCarpoolingTab('${tab}')">Réessayer</button>
      </div>
    `;
  }
}


// ========================================
// ONGLET RECHERCHE
// ========================================

async function loadSearchTab() {
  const content = document.getElementById('carpooling-content');

  // Filtres de recherche
  content.innerHTML = `
    <div class="carpooling-filters frost-effect">
      <h3 class="text-lg font-bold text-gray-800 mb-4">🔍 Rechercher un trajet</h3>

      <div class="filters-grid">
        <div>
          <label class="filter-label">Départ</label>
          <select id="filter-departure" class="filter-select">
            <option value="">Toutes les patinoires</option>
            ${getPatinoires()}
          </select>
        </div>

        <div>
          <label class="filter-label">Arrivée</label>
          <select id="filter-arrival" class="filter-select">
            <option value="">Toutes les patinoires</option>
            ${getPatinoires()}
          </select>
        </div>

        <div>
          <label class="filter-label">Date</label>
          <input type="date" id="filter-date" class="filter-input" min="${new Date().toISOString().split('T')[0]}">
        </div>

        <div>
          <label class="filter-label">Places minimum</label>
          <select id="filter-seats" class="filter-select">
            <option value="">Toutes</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>

        <div>
          <label class="filter-label">Prix maximum</label>
          <input type="number" id="filter-max-price" class="filter-input" placeholder="€" min="0">
        </div>

        <div class="flex items-end">
          <button class="ice-button w-full" onclick="window.applySearchFilters()">
            Rechercher
          </button>
        </div>
      </div>
    </div>

    <div id="search-results" class="trips-grid">
      <div class="text-center py-8">
        <div class="text-4xl mb-4">🔍</div>
        <p class="text-gray-500">Utilisez les filtres pour rechercher un trajet</p>
      </div>
    </div>
  `;

  // Charger tous les trajets disponibles
  await searchTrips();
}

// ========================================
// RECHERCHE DE TRAJETS
// ========================================

window.applySearchFilters = async function() {
  await searchTrips();
};

async function searchTrips() {
  const resultsContainer = document.getElementById('search-results');

  if (!resultsContainer) return;

  resultsContainer.innerHTML = `
    <div class="col-span-full text-center py-8">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p class="text-gray-500">Recherche en cours...</p>
    </div>
  `;

  try {
    // Récupérer les filtres
    const filters = {
      departureRinkId: document.getElementById('filter-departure')?.value || null,
      arrivalRinkId: document.getElementById('filter-arrival')?.value || null,
      date: document.getElementById('filter-date')?.value || null,
      minSeats: parseInt(document.getElementById('filter-seats')?.value) || null,
      maxPrice: parseFloat(document.getElementById('filter-max-price')?.value) || null
    };

    // Rechercher les trajets
    const allTrips = await carpoolingSystem.searchTrips(filters);
    
    // --- FILTRAGE AVANCÉ ---
    const currentUserId = auth.currentUser?.uid;

    const trips = allTrips.filter(trip => {
      // Condition 1: Exclure les trajets que l'utilisateur conduit lui-même.
      if (trip.driverId === currentUserId) {
        return false;
      }
      
      // Condition 2: Exclure les trajets où l'utilisateur est déjà passager (confirmé ou en attente).
      if (trip.passengers?.some(passenger => passenger.passengerId === currentUserId)) {
        return false;
      }
      
      // Si aucune des conditions d'exclusion n'est remplie, on garde le trajet dans les résultats.
      return true; 
    });


    if (trips.length === 0) {
      resultsContainer.innerHTML = `
        <div class="col-span-full text-center py-8">
          <div class="text-6xl mb-4">🚗</div>
          <p class="text-gray-500 text-lg">Aucun trajet trouvé</p>
          <p class="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = trips.map(trip => createTripCard(trip, 'search')).join('');

  } catch (error) {
    console.error('Erreur recherche trajets:', error);
    resultsContainer.innerHTML = `
      <div class="col-span-full text-center py-8">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-red-500">Erreur lors de la recherche</p>
        <button class="ice-button mt-4" onclick="window.applySearchFilters()">Réessayer</button>
      </div>
    `;
  }
}


// ========================================
// ONGLET MES TRAJETS (CONDUCTEUR)
// ========================================

async function loadMyTripsTab() {
  const content = document.getElementById('carpooling-content');

  content.innerHTML = `
    <div class="text-center py-8">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p class="text-gray-500">Chargement de vos trajets...</p>
    </div>
  `;

  try {
    const myTrips = await carpoolingSystem.getMyTrips();

    if (myTrips.length === 0) {
      content.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">🚗</div>
          <p class="text-gray-500 text-lg mb-2">Aucun trajet créé</p>
          <p class="text-gray-400 text-sm mb-6">Proposez un trajet et partagez les frais !</p>
          <button class="ice-button px-8 py-3 rounded-xl" onclick="window.openCreateTripModal()">
            Créer mon premier trajet
          </button>
        </div>
      `;
      return;
    }

    content.innerHTML = `<div class="trips-grid">${myTrips.map(trip => createTripCard(trip, 'my-trips')).join('')}</div>`;

  } catch (error) {
    console.error('Erreur chargement mes trajets:', error);
    content.innerHTML = `
      <div class="text-center py-8">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-red-500">Erreur de chargement</p>
      </div>
    `;
  }
}

// ========================================
// ONGLET MES RÉSERVATIONS (PASSAGER)
// ========================================

async function loadMyBookingsTab() {
  const content = document.getElementById('carpooling-content');

  content.innerHTML = `
    <div class="text-center py-8">
      <div class="animate-spin text-4xl mb-4">⏳</div>
      <p class="text-gray-500">Chargement de vos réservations...</p>
    </div>
  `;

  try {
    const myBookings = await carpoolingSystem.getMyBookings();

    if (myBookings.length === 0) {
      content.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">🎫</div>
          <p class="text-gray-500 text-lg mb-2">Aucune réservation</p>
          <p class="text-gray-400 text-sm mb-6">Recherchez un trajet pour voyager moins cher !</p>
          <button class="ice-button px-8 py-3 rounded-xl" onclick="window.loadCarpoolingTab('search')">
            Rechercher un trajet
          </button>
        </div>
      `;
      return;
    }

    content.innerHTML = `<div class="trips-grid">${myBookings.map(trip => createTripCard(trip, 'my-bookings')).join('')}</div>`;

  } catch (error) {
    console.error('Erreur chargement réservations:', error);
    content.innerHTML = `
      <div class="text-center py-8">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-red-500">Erreur de chargement</p>
      </div>
    `;
  }
}

// ========================================
// CRÉATION D'UNE CARTE DE TRAJET
// ========================================

function createTripCard(trip, context) {
  const isFull = trip.availableSeats === 0;
  const isDriver = trip.driverId === auth.currentUser?.uid;

  // Statut de ma réservation (si passager)
  const myBooking = trip.passengers?.find(p => p.passengerId === auth.currentUser?.uid);
  const bookingStatus = myBooking ? myBooking.status : null;

  // Formater la date
  const tripDate = trip.departureDate.toDate ? trip.departureDate.toDate() : new Date(trip.departureDate);
  const dateStr = tripDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  return `
    <div class="trip-card frost-effect">
      <!-- En-tête du trajet -->
      <div class="trip-header">
        <div class="trip-route">
          <div class="route-point">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
            </svg>
            <div>
              <div class="route-name">${trip.departureRinkName}</div>
              <div class="route-time">${trip.departureTime}</div>
            </div>
          </div>

          <div class="route-line">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </div>

          <div class="route-point">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <div>
              <div class="route-name">${trip.arrivalRinkName}</div>
              <div class="route-date">${dateStr}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Infos conducteur -->
      <div class="trip-driver">
        <div class="driver-avatar" style="${getAvatarGradient(trip.driverName)}">
          ${getInitials(trip.driverName)}
        </div>
        <div class="driver-info">
          <div class="driver-name">${trip.driverName}</div>
          ${trip.vehicleModel ? `<div class="driver-vehicle">🚗 ${trip.vehicleModel}</div>` : ''}
        </div>
      </div>

      <!-- Point de rendez-vous -->
      ${trip.meetingPoint ? `
        <div class="trip-meeting-point">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>RDV: ${trip.meetingPoint}</span>
        </div>
      ` : ''}

      <!-- Description -->
      ${trip.description ? `<div class="trip-description">${trip.description}</div>` : ''}

      <!-- Infos trajet -->
      <div class="trip-info">
        <div class="trip-info-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span><strong>${trip.availableSeats}</strong> place${trip.availableSeats > 1 ? 's' : ''} disponible${trip.availableSeats > 1 ? 's' : ''}</span>
        </div>

        <div class="trip-info-item trip-price">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <span><strong>${trip.price > 0 ? trip.price + '€' : 'Gratuit'}</strong> / personne</span>
        </div>
      </div>

      <!-- Badges de statut -->
      <div class="trip-badges">
        ${isFull ? '<span class="badge badge-full">Complet</span>' : ''}
        ${bookingStatus === 'pending' ? '<span class="badge badge-pending">En attente</span>' : ''}
        ${bookingStatus === 'confirmed' ? '<span class="badge badge-confirmed">Confirmé</span>' : ''}
        ${bookingStatus === 'rejected' ? '<span class="badge badge-rejected">Refusé</span>' : ''}
        ${isDriver ? '<span class="badge badge-driver">Votre trajet</span>' : ''}
      </div>

      <!-- Actions -->
      <div class="trip-actions">
        ${getActionButtons(trip, context, isFull, isDriver, bookingStatus)}
      </div>

      <!-- Nombre de demandes (pour conducteur) -->
      ${isDriver && trip.passengers && trip.passengers.filter(p => p.status === 'pending').length > 0 ? `
        <div class="trip-requests-badge">
          ${trip.passengers.filter(p => p.status === 'pending').length} demande${trip.passengers.filter(p => p.status === 'pending').length > 1 ? 's' : ''} en attente
        </div>
      ` : ''}
    </div>
  `;
}

// ========================================
// BOUTONS D'ACTION SELON LE CONTEXTE
// ========================================

function getActionButtons(trip, context) {
  const currentUserId = auth.currentUser?.uid;
  const isDriver = trip.driverId === currentUserId;
  
  console.log(`🔍 getActionButtons: tripId=${trip.id}, context=${context}, isDriver=${isDriver}, driverId=${trip.driverId}, currentUserId=${currentUserId}`);

  // ✅ BOUTONS POUR MES TRAJETS (SI JE SUIS CONDUCTEUR)
  if (isDriver && context === 'my-trips') {
    return `
      <button class="trip-btn trip-btn-primary" onclick="window.openManagePassengersModal('${trip.id}')">
        Gérer les passagers
      </button>
      <button class="trip-btn trip-btn-secondary" onclick="window.openTripDetailsModal('${trip.id}')">
        Détails
      </button>
      <button class="trip-btn trip-btn-danger" onclick="window.cancelTrip('${trip.id}')">
        Annuler le trajet
      </button>
    `;
  }

  // Boutons pour MES réservations (passager)
  if (context === 'my-bookings') {
    const myBooking = trip.passengers?.find(p => p.passengerId === currentUserId);
    const status = myBooking?.status || 'unknown';

    if (status === 'confirmed') {
      return `
        <button class="trip-btn trip-btn-secondary" onclick="window.openTripDetailsModal('${trip.id}')">
          Voir les détails
        </button>
        <button class="trip-btn trip-btn-danger" onclick="window.cancelMyBooking('${trip.id}')">
          Annuler ma réservation
        </button>
      `;
    } else if (status === 'pending') {
      return `
        <button class="trip-btn trip-btn-secondary" onclick="window.openTripDetailsModal('${trip.id}')">
          Voir les détails
        </button>
        <span class="trip-status-badge" style="padding: 8px 16px; background: rgba(251, 191, 36, 0.1); color: #f59e0b; border-radius: 8px; font-size: 13px; font-weight: 600;">
          ⏳ En attente
        </span>
      `;
    }
  }

  // Boutons pour RECHERCHE (trajets des autres)
  if (context === 'search' && !isDriver) {
    if (trip.availableSeats > 0 && trip.status === 'upcoming') {
      return `
        <button class="trip-btn trip-btn-primary" onclick="window.openBookingMessageModal('${trip.id}')">
          Réserver
        </button>
        <button class="trip-btn trip-btn-secondary" onclick="window.openTripDetailsModal('${trip.id}')">
          Détails
        </button>
      `;
    } else {
      return `
        <button class="trip-btn trip-btn-secondary" onclick="window.openTripDetailsModal('${trip.id}')">
          Voir les détails
        </button>
        <span class="trip-status-badge" style="padding: 8px 16px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 8px; font-size: 13px; font-weight: 600;">
          Complet
        </span>
      `;
    }
  }

  // Par défaut
  return `
    <button class="trip-btn trip-btn-secondary" onclick="window.openTripDetailsModal('${trip.id}')">
      Voir les détails
    </button>
  `;
}


// ========================================
// MODALE: CRÉER UN TRAJET
// ========================================

window.openCreateTripModal = function() {
  const modal = document.createElement('div');
  modal.className = 'carpooling-modal active';
  modal.innerHTML = `
    <div class="carpooling-modal-content frost-effect">
      <div class="carpooling-modal-header">
        <h2>🚗 Créer un trajet</h2>
        <button class="carpooling-modal-close" onclick="this.closest('.carpooling-modal').remove()">✕</button>
      </div>

      <div class="carpooling-modal-body">
        <form id="create-trip-form" class="carpooling-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Départ *</label>
              <select id="create-departure" class="form-select" required>
                <option value="">Choisissez une patinoire</option>
                ${getPatinoires()}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Arrivée *</label>
              <select id="create-arrival" class="form-select" required>
                <option value="">Choisissez une patinoire</option>
                ${getPatinoires()}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input type="date" id="create-date" class="form-input" required min="${new Date().toISOString().split('T')[0]}">
            </div>

            <div class="form-group">
              <label class="form-label">Heure de départ *</label>
              <input type="time" id="create-time" class="form-input" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre de places *</label>
              <select id="create-seats" class="form-select" required>
                <option value="1">1 place</option>
                <option value="2">2 places</option>
                <option value="3" selected>3 places</option>
                <option value="4">4 places</option>
                <option value="5">5 places</option>
                <option value="6">6 places</option>
                <option value="7">7 places</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Prix par personne (€) *</label>
              <input type="number" id="create-price" class="form-input" min="0" step="0.5" value="5" required>
              <small class="form-help">Paiement sur place au conducteur</small>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Modèle de véhicule</label>
            <input type="text" id="create-vehicle" class="form-input" placeholder="Ex: Renault Clio grise">
          </div>

          <div class="form-group">
            <label class="form-label">Point de rendez-vous</label>
            <input type="text" id="create-meeting-point" class="form-input" placeholder="Ex: Parking principal de la patinoire">
            <small class="form-help">Où les passagers doivent-ils vous retrouver ?</small>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="create-description" class="form-textarea" rows="3" placeholder="Informations complémentaires..."></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="trip-btn trip-btn-secondary" onclick="this.closest('.carpooling-modal').remove()">
              Annuler
            </button>
            <button type="submit" class="trip-btn trip-btn-primary">
              Publier le trajet
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Gestionnaire de soumission
  document.getElementById('create-trip-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Création...';

    try {
      const departureSelect = document.getElementById('create-departure');
      const arrivalSelect = document.getElementById('create-arrival');

      const tripData = {
        departureRinkId: departureSelect.value,
        departureRinkName: departureSelect.options[departureSelect.selectedIndex].text,
        arrivalRinkId: arrivalSelect.value,
        arrivalRinkName: arrivalSelect.options[arrivalSelect.selectedIndex].text,
        departureDate: document.getElementById('create-date').value,
        departureTime: document.getElementById('create-time').value,
        seats: document.getElementById('create-seats').value,
        price: document.getElementById('create-price').value,
        vehicleModel: document.getElementById('create-vehicle').value,
        meetingPoint: document.getElementById('create-meeting-point').value,
        description: document.getElementById('create-description').value
      };

      await carpoolingSystem.createTrip(tripData);

      modal.remove();
      showNotification('✅ Trajet créé avec succès !', 'success');

      // Recharger l'onglet mes trajets
      window.loadCarpoolingTab('my-trips');

    } catch (error) {
      console.error('Erreur création trajet:', error);
      showNotification('❌ ' + error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Publier le trajet';
    }
  });
};

// ========================================
// MODALE: RÉSERVER UN TRAJET
// ========================================

window.requestBooking = function(tripId) {
  const modal = document.createElement('div');
  modal.className = 'carpooling-modal active';
  modal.innerHTML = `
    <div class="carpooling-modal-content frost-effect" style="max-width: 500px;">
      <div class="carpooling-modal-header">
        <h2>🎫 Demander une réservation</h2>
        <button class="carpooling-modal-close" onclick="this.closest('.carpooling-modal').remove()">✕</button>
      </div>

      <div class="carpooling-modal-body">
        <form id="booking-form" class="carpooling-form">
          <div class="form-group">
            <label class="form-label">Message pour le conducteur (optionnel)</label>
            <textarea id="booking-message" class="form-textarea" rows="4" placeholder="Ex: Bonjour, je serais intéressé(e) par votre trajet..."></textarea>
            <small class="form-help">Le conducteur pourra accepter ou refuser votre demande</small>
          </div>

          <div class="info-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div>
              <strong>Paiement sur place</strong>
              <p>Le prix sera à régler directement au conducteur</p>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="trip-btn trip-btn-secondary" onclick="this.closest('.carpooling-modal').remove()">
              Annuler
            </button>
            <button type="submit" class="trip-btn trip-btn-primary">
              Envoyer la demande
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi...';

    try {
      const message = document.getElementById('booking-message').value.trim();
      await carpoolingSystem.requestBooking(tripId, message);

      modal.remove();
      showNotification('✅ Demande envoyée !', 'success');

      // Recharger la recherche
      await searchTrips();

    } catch (error) {
      console.error('Erreur réservation:', error);
      showNotification('❌ ' + error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Envoyer la demande';
    }
  });
};

// ========================================
// MODALE: GÉRER LES PASSAGERS (CONDUCTEUR)
// ========================================

window.openManagePassengersModal = async function(tripId) {
  const modal = document.createElement('div');
  modal.className = 'carpooling-modal active';
  modal.innerHTML = `
    <div class="carpooling-modal-content frost-effect">
      <div class="carpooling-modal-header">
        <h2>👥 Gérer les passagers</h2>
        <button class="carpooling-modal-close" onclick="this.closest('.carpooling-modal').remove()">✕</button>
      </div>

      <div class="carpooling-modal-body">
        <div class="text-center py-8">
          <div class="animate-spin text-4xl mb-4">⏳</div>
          <p class="text-gray-500">Chargement...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  try {
    const trip = await carpoolingSystem.getTripById(tripId);
    const passengers = trip.passengers || [];

    const pendingRequests = passengers.filter(p => p.status === 'pending');
    const confirmedPassengers = passengers.filter(p => p.status === 'confirmed');

    const modalBody = modal.querySelector('.carpooling-modal-body');
    modalBody.innerHTML = `
      ${pendingRequests.length > 0 ? `
        <div class="passengers-section">
          <h3 class="passengers-section-title">⏳ Demandes en attente (${pendingRequests.length})</h3>
          <div class="passengers-list">
            ${pendingRequests.map(passenger => `
              <div class="passenger-card">
                <div class="passenger-info">
                  <div class="passenger-avatar" style="${getAvatarGradient(passenger.passengerName)}">
                    ${getInitials(passenger.passengerName)}
                  </div>
                  <div>
                    <div class="passenger-name">${passenger.passengerName}</div>
                    ${passenger.message ? `<div class="passenger-message">"${passenger.message}"</div>` : ''}
                    <div class="passenger-date">Demande du ${new Date(passenger.requestedAt).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                <div class="passenger-actions">
                  <button class="trip-btn trip-btn-primary" onclick="window.respondToBooking('${tripId}', '${passenger.passengerId}', 'accept')">
                    ✓ Accepter
                  </button>
                  <button class="trip-btn trip-btn-danger" onclick="window.respondToBooking('${tripId}', '${passenger.passengerId}', 'reject')">
                    ✕ Refuser
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${confirmedPassengers.length > 0 ? `
        <div class="passengers-section">
          <h3 class="passengers-section-title">✅ Passagers confirmés (${confirmedPassengers.length})</h3>
          <div class="passengers-list">
            ${confirmedPassengers.map(passenger => `
              <div class="passenger-card">
                <div class="passenger-info">
                  <div class="passenger-avatar" style="${getAvatarGradient(passenger.passengerName)}">
                    ${getInitials(passenger.passengerName)}
                  </div>
                  <div>
                    <div class="passenger-name">${passenger.passengerName}</div>
                    <div class="passenger-date">Confirmé le ${new Date(passenger.confirmedAt).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                <div class="passenger-actions">
                  <button class="trip-btn trip-btn-secondary" onclick="closeTripModalAndOpenChat('${tripId}', '${passenger.passengerName}', '${passenger.passengerId}')">
                    💬 Contacter
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${pendingRequests.length === 0 && confirmedPassengers.length === 0 ? `
        <div class="text-center py-8">
          <div class="text-6xl mb-4">👥</div>
          <p class="text-gray-500">Aucune demande de réservation pour le moment</p>
        </div>
      ` : ''}
    `;

  } catch (error) {
    console.error('Erreur chargement passagers:', error);
    modal.querySelector('.carpooling-modal-body').innerHTML = `
      <div class="text-center py-8">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-red-500">Erreur de chargement</p>
      </div>
    `;
  }
};

// ========================================
// RÉPONDRE À UNE DEMANDE DE RÉSERVATION
// ========================================

window.respondToBooking = async function(tripId, passengerId, action) {
  const actionText = action === 'accept' ? 'accepter' : 'refuser';

  // ✅ Utiliser la modale personnalisée pour "reject"
  if (action === 'reject') {
    const confirmed = await showCustomConfirm(
      'Refuser cette demande ?',
      'Cette action est irréversible. Le passager en sera immédiatement notifié.'
    );
    
    if (!confirmed) return;
  }

  try {
    await carpoolingSystem.respondToBooking(tripId, passengerId, action);
    showNotification(`✅ Demande ${action === 'accept' ? 'acceptée' : 'refusée'}`, 'success');

    // Recharger la modale
    document.querySelector('.carpooling-modal')?.remove();
    await window.openManagePassengersModal(tripId);

    // TODO: Envoyer notification push au passager (placeholder)
    console.log('🔔 [PLACEHOLDER] Notification push à envoyer au passager:', passengerId);

  } catch (error) {
    console.error('Erreur réponse réservation:', error);
    showNotification('❌ ' + error.message, 'error');
  }
};

// ========================================
// ANNULER UN TRAJET (CONDUCTEUR)
// ========================================

window.cancelTrip = async function(tripId) {
  // ✅ Modale personnalisée au lieu de window.confirm()
  const confirmed = await showCustomConfirm(
    'Annuler ce trajet ?',
    'Les passagers confirmés seront automatiquement notifiés de l\'annulation. Cette action est irréversible.',
    '⚠️'
  );
  
  if (!confirmed) return;

  try {
    await carpoolingSystem.cancelTrip(tripId);
    showNotification('✅ Trajet annulé', 'success');

    // Recharger mes trajets
    window.loadCarpoolingTab('my-trips');

    // TODO: Envoyer notification push aux passagers (placeholder)
    console.log('🔔 [PLACEHOLDER] Notification push à envoyer aux passagers confirmés');

  } catch (error) {
    console.error('Erreur annulation trajet:', error);
    showNotification('❌ ' + error.message, 'error');
  }
};


// ========================================
// ANNULER UNE RÉSERVATION (PASSAGER)
// ========================================

window.cancelBooking = async function(tripId) {
  // ✅ Modale personnalisée au lieu de window.confirm()
  const confirmed = await showCustomConfirm(
    'Annuler cette réservation ?',
    'Le conducteur sera immédiatement notifié de votre annulation. Vous pourrez faire une nouvelle demande si le trajet a encore des places disponibles.',
    '⚠️'
  );
  
  if (!confirmed) return;

  try {
    await carpoolingSystem.cancelBooking(tripId);
    showNotification('✅ Réservation annulée', 'success');

    // Recharger les réservations
    window.loadCarpoolingTab('my-bookings');

    // TODO: Envoyer notification push au conducteur (placeholder)
    console.log('🔔 [PLACEHOLDER] Notification push à envoyer au conducteur');

  } catch (error) {
    console.error('Erreur annulation réservation:', error);
    showNotification('❌ ' + error.message, 'error');
  }
};


// ========================================
// MODALE: DÉTAILS D'UN TRAJET - VERSION COMPLÈTE
// ========================================

window.openTripDetailsModal = async function(tripId) {
  const modal = document.createElement('div');
  modal.className = 'carpooling-modal active';
  modal.innerHTML = `
    <div class="carpooling-modal-content frost-effect">
      <div class="carpooling-modal-header">
        <h2>🚗 Détails du trajet</h2>
        <button class="carpooling-modal-close" onclick="this.closest('.carpooling-modal').remove()">✕</button>
      </div>

      <div class="carpooling-modal-body">
        <div class="text-center py-8">
          <div class="animate-spin text-4xl mb-4">⏳</div>
          <p class="text-gray-500">Chargement...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  try {
    const trip = await carpoolingSystem.getTripById(tripId);
    const currentUserId = auth.currentUser?.uid;

    // Déterminer le rôle de l'utilisateur
    const isDriver = trip.driverId === currentUserId;
    const myPassengerData = trip.passengers?.find(p => p.passengerId === currentUserId);
    const isPassenger = !!myPassengerData;
    const passengerStatus = myPassengerData?.status || null;

    const tripDate = trip.departureDate.toDate ? trip.departureDate.toDate() : new Date(trip.departureDate);
    const dateStr = tripDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Séparer les passagers par statut
    const confirmedPassengers = trip.passengers?.filter(p => p.status === 'confirmed') || [];
    const pendingPassengers = trip.passengers?.filter(p => p.status === 'pending') || [];

    const modalBody = modal.querySelector('.carpooling-modal-body');
    modalBody.innerHTML = `
      <div class="trip-details">
        <!-- ITINÉRAIRE -->
        <div class="trip-details-section">
          <h3 class="trip-details-title">📍 Itinéraire</h3>
          <div class="trip-details-route">
            <div class="route-point">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
              </svg>
              <div>
                <div class="route-name">${trip.departureRinkName}</div>
                <div class="route-time">${dateStr} à ${trip.departureTime}</div>
              </div>
            </div>

            <div class="route-arrow">⬇️</div>

            <div class="route-point">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <div class="route-name">${trip.arrivalRinkName}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- CONDUCTEUR -->
        <div class="trip-details-section">
          <h3 class="trip-details-title">👤 Conducteur</h3>
          <div class="trip-driver">
            <div class="driver-avatar" style="${getAvatarGradient(trip.driverName)}">
              ${getInitials(trip.driverName)}
            </div>
            <div class="driver-info">
              <div class="driver-name">${trip.driverName}</div>
              ${trip.vehicleModel ? `<div class="driver-vehicle">🚗 ${trip.vehicleModel}</div>` : ''}
              ${trip.driverRating ? `
                <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                  <span style="color: #fbbf24;">⭐</span>
                  <span style="font-size: 13px; color: #64748b;">${trip.driverRating.toFixed(1)}/5 (${trip.driverRatingsCount || 0} avis)</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- PASSAGERS CONFIRMÉS -->
        ${confirmedPassengers.length > 0 ? `
          <div class="trip-details-section">
            <h3 class="trip-details-title">✅ Passagers confirmés (${confirmedPassengers.length})</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${confirmedPassengers.map(passenger => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(16, 185, 129, 0.05); border-radius: 8px; border-left: 3px solid #10b981;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="driver-avatar" style="${getAvatarGradient(passenger.passengerName)}; width: 36px; height: 36px; font-size: 14px;">
                      ${getInitials(passenger.passengerName)}
                    </div>
                    <div>
                      <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${passenger.passengerName}</div>
                      <div style="font-size: 12px; color: #64748b;">Confirmé le ${new Date(passenger.confirmedAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                  ${(isDriver || passengerStatus === 'confirmed') ? `
                    <button onclick="closeTripModalAndOpenChat('${passenger.passengerId}', '${passenger.passengerName}', '${tripId}')"
                            style="
                              padding: 6px 12px;
                              background: #3b82f6;
                              color: white;
                              border: none;
                              border-radius: 6px;
                              font-size: 13px;
                              font-weight: 600;
                              cursor: pointer;
                              transition: background 0.2s;
                            "
                            onmouseover="this.style.background='#2563eb'"
                            onmouseout="this.style.background='#3b82f6'"
                    >
                      💬 Contacter
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- DEMANDES EN ATTENTE (SI CONDUCTEUR) -->
        ${isDriver && pendingPassengers.length > 0 ? `
          <div class="trip-details-section">
            <h3 class="trip-details-title">⏳ Demandes en attente (${pendingPassengers.length})</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${pendingPassengers.map(passenger => `
                <div style="padding: 12px; background: rgba(251, 191, 36, 0.05); border-radius: 8px; border-left: 3px solid #f59e0b;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div class="driver-avatar" style="${getAvatarGradient(passenger.passengerName)}; width: 36px; height: 36px; font-size: 14px;">
                      ${getInitials(passenger.passengerName)}
                    </div>
                    <div style="flex: 1;">
                      <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${passenger.passengerName}</div>
                      <div style="font-size: 12px; color: #64748b;">Demandé le ${new Date(passenger.requestedAt).toLocaleDateString('fr-FR')}</div>
                      ${passenger.message ? `<div style="font-size: 13px; color: #475569; margin-top: 4px; font-style: italic;">"${passenger.message}"</div>` : ''}
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button onclick="handleBookingResponse('${tripId}', '${passenger.passengerId}', 'accept')"
                            style="
                              flex: 1;
                              padding: 8px;
                              background: #10b981;
                              color: white;
                              border: none;
                              border-radius: 6px;
                              font-size: 13px;
                              font-weight: 600;
                              cursor: pointer;
                            "
                    >
                      ✅ Accepter
                    </button>
                    <button onclick="handleBookingResponse('${tripId}', '${passenger.passengerId}', 'reject')"
                            style="
                              flex: 1;
                              padding: 8px;
                              background: #ef4444;
                              color: white;
                              border: none;
                              border-radius: 6px;
                              font-size: 13px;
                              font-weight: 600;
                              cursor: pointer;
                            "
                    >
                      ❌ Refuser
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- BOUTON CONTACTER LE CONDUCTEUR (SI PASSAGER CONFIRMÉ) -->
        ${!isDriver && passengerStatus === 'confirmed' ? `
          <div class="trip-details-section">
            <h3 class="trip-details-title">💬 Communication</h3>
            <button onclick="closeTripModalAndOpenChat('${trip.driverId}', '${trip.driverName}', '${tripId}')"
                    style="
                      width: 100%;
                      padding: 12px 16px;
                      background: #3b82f6;
                      color: white;
                      border: none;
                      border-radius: 10px;
                      font-size: 15px;
                      font-weight: 600;
                      cursor: pointer;
                      transition: background 0.2s;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 8px;
                    "
                    onmouseover="this.style.background='#2563eb'"
                    onmouseout="this.style.background='#3b82f6'"
            >
              💬 Contacter le conducteur
            </button>
          </div>
        ` : ''}

        <!-- POINT DE RENDEZ-VOUS -->
        ${trip.meetingPoint ? `
          <div class="trip-details-section">
            <h3 class="trip-details-title">📍 Point de rendez-vous</h3>
            <p class="trip-details-text">${trip.meetingPoint}</p>
          </div>
        ` : ''}

        <!-- DESCRIPTION -->
        ${trip.description ? `
          <div class="trip-details-section">
            <h3 class="trip-details-title">📝 Description</h3>
            <p class="trip-details-text">${trip.description}</p>
          </div>
        ` : ''}

        <!-- INFORMATIONS -->
        <div class="trip-details-section">
          <h3 class="trip-details-title">ℹ️ Informations</h3>
          <div class="trip-info-list">
            <div class="trip-info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>${trip.availableSeats} place${trip.availableSeats > 1 ? 's' : ''} disponible${trip.availableSeats > 1 ? 's' : ''} sur ${trip.seats}</span>
            </div>
            <div class="trip-info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>${trip.price > 0 ? trip.price + '€' : 'Gratuit'} par personne</span>
            </div>
            <div class="trip-info-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Publié ${getTimeAgo(trip.createdAt.toDate ? trip.createdAt.toDate() : new Date(trip.createdAt))}</span>
            </div>
          </div>
        </div>
      </div>

<!-- ACTIONS -->
<div class="trip-details-actions">
  ${!isDriver && !isPassenger && trip.availableSeats > 0 && trip.status === 'upcoming' ? `
    <button class="trip-btn trip-btn-primary" onclick="window.openBookingMessageModal('${tripId}')">
      🚗 Réserver une place
    </button>
  ` : ''}
  
  ${!isDriver && passengerStatus === 'pending' ? `
    <div style="padding: 12px; background: rgba(251, 191, 36, 0.1); border-radius: 8px; text-align: center; margin-bottom: 12px;">
      <div style="font-weight: 600; color: #f59e0b; margin-bottom: 4px;">⏳ Demande en attente</div>
      <div style="font-size: 13px; color: #64748b;">Le conducteur n'a pas encore répondu</div>
    </div>
    <button class="trip-btn trip-btn-secondary" onclick="window.cancelMyBooking('${tripId}')">
      ❌ Annuler ma demande
    </button>
  ` : ''}

  ${!isDriver && passengerStatus === 'confirmed' ? `
    <button class="trip-btn trip-btn-secondary" onclick="window.cancelMyBooking('${tripId}')">
      ❌ Annuler ma réservation
    </button>
  ` : ''}

  ${isDriver ? `
    <button class="trip-btn trip-btn-danger" onclick="window.cancelTrip('${tripId}')">
      🚫 Annuler ce trajet
    </button>
  ` : ''}

  <button class="trip-btn trip-btn-secondary" onclick="this.closest('.carpooling-modal').remove()">
    Fermer
  </button>
</div>
`;

} catch (error) {
  console.error('Erreur chargement détails:', error);
  modal.querySelector('.carpooling-modal-body').innerHTML = `
    <div class="text-center py-8">
      <div class="text-4xl mb-4">❌</div>
      <p class="text-red-500">Erreur de chargement: ${error.message}</p>
    </div>
  `;
}
};

// ========================================
// FONCTIONS AUXILIAIRES POUR LES ACTIONS
// ========================================

window.handleBookingResponse = async function(tripId, passengerId, action) {
  try {
    await carpoolingSystem.respondToBooking(tripId, passengerId, action);
    
    // Fermer et rouvrir la modal pour rafraîchir
    document.querySelector('.carpooling-modal')?.remove();
    await window.openTripDetailsModal(tripId);
    
    // Rafraîchir l'onglet actif
    const activeTab = document.querySelector('.carpooling-tab.active')?.dataset.tab || 'search';
    await loadTabContent(activeTab);
    
  } catch (error) {
    alert('Erreur: ' + error.message);
  }
};




window.cancelMyBooking = async function(tripId) {
  // ✅ Modale personnalisée au lieu de confirm()
  const confirmed = await showCustomConfirm(
    'Annuler votre réservation ?',
    'Le conducteur sera automatiquement notifié. Cette action est irréversible.',
    '⚠️'
  );
  
  if (!confirmed) return;
  
  try {
    await carpoolingSystem.cancelBooking(tripId);
    
    // Fermer la modale
    document.querySelector('.carpooling-modal')?.remove();
    
    // ✅ showNotification au lieu d'alert
    showNotification('✅ Réservation annulée', 'success');
    
    // Rafraîchir l'onglet actif
    const activeTab = document.querySelector('.tab-btn.tab-active')?.dataset.tab || 'search';
    await window.loadCarpoolingTab(activeTab);
    
  } catch (error) {
    console.error('Erreur annulation réservation:', error);
    // ✅ showNotification au lieu d'alert
    showNotification('❌ ' + error.message, 'error');
  }
};


window.cancelTripFromModal = async function(tripId) {
  // ✅ Modale personnalisée élégante
  const confirmed = await showCustomConfirm(
    'Annuler ce trajet ?',
    'Tous les passagers confirmés seront automatiquement notifiés de l\'annulation. Cette action est irréversible.',
    '⚠️'
  );
  
  if (!confirmed) return;
  
  try {
    await carpoolingSystem.cancelTrip(tripId);
    
    // Fermer la modale de détails
    document.querySelector('.carpooling-modal')?.remove();
    
    // ✅ Notification élégante au lieu d'alert
    showNotification('✅ Trajet annulé. Les passagers ont été notifiés.', 'success');
    
    // Rafraîchir l'onglet actif
    const activeTab = document.querySelector('.tab-btn.tab-active')?.dataset.tab || 'search';
    await window.loadCarpoolingTab(activeTab);
    
  } catch (error) {
    console.error('Erreur annulation trajet:', error);
    // ✅ Notification d'erreur élégante
    showNotification('❌ ' + error.message, 'error');
  }
};


// Fonction helper pour "il y a X temps"
function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'à l\'instant';
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)}j`;
  
  return `le ${date.toLocaleDateString('fr-FR')}`;
}


// ========================================
// MODALE: CHAT COVOITURAGE (copié du système existant)
// ========================================

window.openCarpoolChatModal = function(tripId, otherUserName, otherUserId = null) {
  // Utiliser le système de chat existant
  if (window.friendsChat && typeof window.friendsChat.openFriendChat === 'function') {
    // Si on a l'ID de l'autre utilisateur, ouvrir le chat directement
    if (otherUserId) {
      window.friendsChat.openFriendChat(otherUserId, otherUserName);
    } else {
      showNotification('💬 Système de chat en cours de développement', 'info');
    }
  } else {
    showNotification('💬 Système de chat non disponible', 'info');
  }
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function getPatinoires() {
  const rinks = window.checkIceApp?.allRinks || [];
  return rinks.map(rink => {
    const rinkId = generateRinkId(rink);
    return `<option value="${rinkId}">${rink.name}${rink.city ? ' - ' + rink.city : ''}</option>`;
  }).join('');
}

function generateRinkId(rink) {
  return rink.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}

function getAvatarGradient(name) {
  const gradients = [
    'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'background: linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ];

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').substring(0, 2);
}

function showNotification(message, type = 'info') {
  // Utiliser le système de notification existant
  if (window.showNotification) {
    window.showNotification(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// ========================================
// INITIALISATION AUTOMATIQUE
// ========================================

// Méthode 1: Écouter l'événement personnalisé (comme map.js)
window.addEventListener('checkiceDataReady', (event) => {
  console.log('🚗 Événement checkiceDataReady reçu, initialisation covoiturage...');
  if (event.detail?.rinks && event.detail.rinks.length > 0) {
    initializeCarpooling();
  }
});

// Méthode 2: Retry pattern avec timeout de sécurité
function initCarpoolingSystem() {
  console.log('🚗 Tentative d\'initialisation du covoiturage...');
  
  if (window.checkIceApp?.allRinks && window.checkIceApp.allRinks.length > 0) {
    console.log('✅ Patinoires disponibles, initialisation du covoiturage...');
    initializeCarpooling();
  } else {
    console.log('⏳ En attente des patinoires...');
    if (!window.carpoolingInitRetries) window.carpoolingInitRetries = 0;
    if (window.carpoolingInitRetries < 20) {
      window.carpoolingInitRetries++;
      setTimeout(initCarpoolingSystem, 1000);
    } else {
      console.error('❌ Timeout: impossible de charger les patinoires');
    }
  }
}

window.closeTripModalAndOpenChat = function(userId, userName, tripId) {
  console.log('🔄 Fermeture de toutes les modales covoiturage...');
  
  // 1. Fermer TOUTES les modales de covoiturage (au cas où il y en a plusieurs)
  const allCarpoolingModals = document.querySelectorAll('.carpooling-modal');
  allCarpoolingModals.forEach(modal => {
    modal.remove();
    console.log('✅ Modale fermée');
  });

  // 2. Petit délai pour transition fluide
  setTimeout(() => {
    // 3. Ouvrir le chat
    if (window.openCarpoolingChat) {
      window.openCarpoolingChat(userId, userName, tripId);
    } else if (window.openChatModal) {
      window.openChatModal(userName, userId);
    } else {
      console.error('❌ Fonction de chat introuvable');
    }
  }, 150);
};





async function loadDriverHistory() {
  const resultsDiv = document.getElementById('history-results');
  
  try {
    resultsDiv.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Chargement...</p>';
    
    const trips = await carpoolingSystem.getMyTripsHistory();
    
    if (trips.length === 0) {
      resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; color: #94a3b8;">
            <path d="M32 16v16l8 4m8-4a24 24 0 11-48 0 24 24 0 0148 0z"></path>
          </svg>
          <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Aucun trajet dans l'historique</p>
          <p style="color: #64748b;">Vos trajets passés apparaîtront ici</p>
        </div>
      `;
      return;
    }

    let html = '<div style="display: grid; gap: 20px;">';
    
    for (const trip of trips) {
      const tripDate = trip.departureDate.toDate();
      const formattedDate = tripDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      
      const statusBadge = trip.status === 'cancelled' 
        ? '<span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">❌ Annulé</span>'
        : '<span style="background: #e5e7eb; color: #4b5563; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">✅ Terminé</span>';

      const confirmedPassengers = trip.passengers?.filter(p => p.status === 'confirmed') || [];
      
      html += `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${statusBadge}
          
          <div style="margin: 16px 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg width="20" height="20" fill="currentColor" style="color: #3b82f6;">
                <circle cx="10" cy="10" r="4"></circle>
              </svg>
              <span style="font-weight: 600; color: #1e293b;">${trip.departureRinkName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" fill="currentColor" style="color: #10b981;">
                <path d="M10 2C6.13 2 3 5.13 3 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path>
              </svg>
              <span style="font-weight: 600; color: #1e293b;">${trip.arrivalRinkName}</span>
            </div>
          </div>

          <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; color: #64748b; margin-top: 12px;">
            <span>📅 ${formattedDate}</span>
            <span>🕐 ${trip.departureTime}</span>
            <span>👥 ${confirmedPassengers.length}/${trip.seats} passagers</span>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    resultsDiv.innerHTML = html;
    
  } catch (error) {
    console.error('Erreur chargement historique:', error);
    resultsDiv.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <p style="font-weight: 600; margin-bottom: 8px;">❌ Erreur de chargement</p>
        <p style="font-size: 14px;">${error.message}</p>
      </div>
    `;
  }
}

async function loadPassengerHistory() {
  const resultsDiv = document.getElementById('history-results');
  
  try {
    resultsDiv.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Chargement...</p>';
    
    const bookings = await carpoolingSystem.getMyBookingsHistory();
    
    if (bookings.length === 0) {
      resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <svg width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; color: #94a3b8;">
            <rect x="8" y="12" width="48" height="48" rx="4" ry="4"></rect>
            <path d="M48 8v8M16 8v8M8 28h48"></path>
          </svg>
          <p style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Aucune réservation dans l'historique</p>
          <p style="color: #64748b;">Vos réservations passées apparaîtront ici</p>
        </div>
      `;
      return;
    }

    let html = '<div style="display: grid; gap: 20px;">';
    
    for (const trip of bookings) {
      const tripDate = trip.departureDate.toDate();
      const formattedDate = tripDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      
      const myBooking = trip.passengers?.find(p => p.passengerId === auth.currentUser.uid);
      const myStatus = myBooking?.status || 'unknown';
      
      let statusBadge;
      if (trip.status === 'cancelled') {
        statusBadge = '<span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">❌ Trajet annulé</span>';
      } else if (myStatus === 'confirmed') {
        statusBadge = '<span style="background: #d1fae5; color: #059669; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">✅ Confirmé</span>';
      } else {
        statusBadge = '<span style="background: #e5e7eb; color: #6b7280; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">⏳ En attente</span>';
      }

      const canReview = trip.isPast && myStatus === 'confirmed' && trip.status !== 'cancelled';
      
      html += `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${statusBadge}
          
          <div style="margin: 16px 0;">
            <p style="font-size: 14px; color: #64748b; margin-bottom: 8px;">👤 Conducteur: <strong style="color: #1e293b;">${trip.driverName}</strong></p>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg width="20" height="20" fill="currentColor" style="color: #3b82f6;">
                <circle cx="10" cy="10" r="4"></circle>
              </svg>
              <span style="font-weight: 600; color: #1e293b;">${trip.departureRinkName}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" fill="currentColor" style="color: #10b981;">
                <path d="M10 2C6.13 2 3 5.13 3 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path>
              </svg>
              <span style="font-weight: 600; color: #1e293b;">${trip.arrivalRinkName}</span>
            </div>
          </div>

          <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; color: #64748b; margin-bottom: 16px;">
            <span>📅 ${formattedDate}</span>
            <span>🕐 ${trip.departureTime}</span>
            <span>💰 ${trip.price}€</span>
          </div>

          ${canReview ? `
            <button onclick="openReviewModal('${trip.id}', '${trip.driverName}')" 
              style="width: 100%; padding: 10px; background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
              ⭐ Laisser un avis
            </button>
          ` : ''}
        </div>
      `;
    }
    
    html += '</div>';
    resultsDiv.innerHTML = html;
    
  } catch (error) {
    console.error('Erreur chargement historique:', error);
    resultsDiv.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <p style="font-weight: 600; margin-bottom: 8px;">❌ Erreur de chargement</p>
        <p style="font-size: 14px;">${error.message}</p>
      </div>
    `;
  }
}

window.openReviewModal = function(tripId, driverName) {
  const modal = document.createElement('div');
  modal.id = 'review-modal-container';
  modal.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    z-index: 99999;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <h3 style="margin: 0 0 8px 0; font-size: 24px; color: #1e293b;">⭐ Évaluer le conducteur</h3>
      <p style="margin: 0 0 24px 0; color: #64748b;">Comment s'est passé le trajet avec ${driverName} ?</p>

      <div style="text-align: center; margin-bottom: 24px;">
        <div id="star-rating" style="display: inline-flex; gap: 8px; cursor: pointer;">
          ${[1, 2, 3, 4, 5].map(star => `
            <svg width="40" height="40" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" data-star="${star}" style="transition: all 0.2s;">
              <path d="M20 4l4.94 10.03 11.06 1.61-8 7.8 1.89 11.02L20 28.77l-9.89 5.69L12 23.44l-8-7.8 11.06-1.61z"></path>
            </svg>
          `).join('')}
        </div>
        <p id="rating-text" style="margin-top: 12px; color: #64748b; font-size: 14px;">Cliquez pour noter</p>
      </div>

      <textarea id="review-comment" placeholder="Partagez votre expérience (optionnel)" 
        style="width: 100%; min-height: 100px; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-family: inherit; resize: vertical; margin-bottom: 16px;"></textarea>

      <div style="display: flex; gap: 12px;">
        <button id="cancel-review-btn" style="flex: 1; padding: 12px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
          Annuler
        </button>
        <button id="submit-review-btn" disabled style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; opacity: 0.5;">
          Publier l'avis
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let selectedRating = 0;
  const stars = modal.querySelectorAll('[data-star]');
  const ratingText = modal.getElementById('rating-text');
  const submitBtn = modal.getElementById('submit-review-btn');

  const ratingLabels = {
    1: '😞 Décevant',
    2: '😐 Moyen',
    3: '🙂 Bien',
    4: '😊 Très bien',
    5: '🤩 Excellent'
  };

  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const rating = parseInt(star.dataset.star);
      updateStars(rating, false);
    });

    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.star);
      updateStars(selectedRating, true);
      ratingText.textContent = ratingLabels[selectedRating];
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    });
  });

  modal.querySelector('#star-rating').addEventListener('mouseleave', () => {
    if (selectedRating > 0) {
      updateStars(selectedRating, true);
    } else {
      updateStars(0, false);
    }
  });

  function updateStars(rating, permanent) {
    stars.forEach(star => {
      const starValue = parseInt(star.dataset.star);
      if (starValue <= rating) {
        star.style.fill = permanent ? '#fbbf24' : '#fde047';
        star.style.stroke = '#f59e0b';
      } else {
        star.style.fill = '#e2e8f0';
        star.style.stroke = '#94a3b8';
      }
    });
  }

  modal.querySelector('#cancel-review-btn').addEventListener('click', () => {
    modal.remove();
  });

  modal.querySelector('#submit-review-btn').addEventListener('click', async () => {
    const comment = modal.querySelector('#review-comment').value.trim();
    
    try {
      submitBtn.textContent = 'Publication...';
      submitBtn.disabled = true;
      
      await carpoolingSystem.rateTripDriver(tripId, selectedRating, comment);
      
      modal.remove();
      showNotification('✅ Avis publié avec succès !', 'success');
      await loadPassengerHistory();
      
    } catch (error) {
      console.error('Erreur publication avis:', error);
      showNotification('❌ ' + error.message, 'error');
      submitBtn.textContent = 'Publier l\'avis';
      submitBtn.disabled = false;
    }
  });
};




// Démarrer l'initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCarpoolingSystem);
} else {
  initCarpoolingSystem();
}

// Export
export default {
  initializeCarpooling,
  loadCarpoolingTab: window.loadCarpoolingTab
};

