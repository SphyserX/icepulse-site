// location.js
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

class LocationManager {
    constructor() {
        this.userLocation = null;
        this.nearbyRinks = [];
        this.isLocationEnabled = false;
        this.allRinks = [];
    }

    // Initialiser le système de localisation
    async init() {
        await this.showLocationPrompt();
    }

    // Afficher la demande de géolocalisation avec une belle interface
    async showLocationPrompt() {
        const modal = this.createLocationModal();
        document.body.appendChild(modal);
        modal.classList.add('active');
    }

    // Créer la modale de demande de localisation
    createLocationModal() {
        const modal = document.createElement('div');
        modal.id = 'location-modal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content frost-effect max-w-md">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 ice-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">Trouvez les patinoires près de chez vous</h3>
                    <p class="text-gray-300">Autorisez la géolocalisation pour découvrir les patinoires les plus proches</p>
                </div>

                <div class="space-y-3">
                    <button id="allow-location-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>Autoriser la géolocalisation</span>
                    </button>

                    <button id="manual-location-btn" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200">
                        Saisir mon adresse manuellement
                    </button>

                    <button id="skip-location-btn" class="w-full text-gray-400 hover:text-white py-2 transition-colors">
                        Ignorer et voir toutes les patinoires
                    </button>
                </div>

                <!-- Section de saisie manuelle -->
                <div id="manual-location-section" class="hidden mt-4 p-4 bg-gray-800 rounded-xl">
                    <label class="block text-gray-300 text-sm font-medium mb-2">Votre adresse :</label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="address-search" 
                            placeholder="Tapez votre ville ou adresse..."
                            class="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                        <div id="address-suggestions" class="absolute z-10 w-full bg-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto hidden"></div>
                    </div>
                </div>
            </div>
        `;

        this.setupLocationModalEvents(modal);
        return modal;
    }

    // Configurer les événements de la modale
    setupLocationModalEvents(modal) {
        const allowBtn = modal.querySelector('#allow-location-btn');
        const manualBtn = modal.querySelector('#manual-location-btn');
        const skipBtn = modal.querySelector('#skip-location-btn');
        const manualSection = modal.querySelector('#manual-location-section');
        const addressInput = modal.querySelector('#address-search');

        // Permettre la géolocalisation
        allowBtn.addEventListener('click', async () => {
            await this.requestGeolocation(modal);
        });

        // Saisie manuelle
        manualBtn.addEventListener('click', () => {
            manualSection.classList.toggle('hidden');
            addressInput.focus();
        });

        // Ignorer
        skipBtn.addEventListener('click', () => {
            this.showAllRinks();
            modal.remove();
        });

        // Autocomplétion d'adresse
        this.setupAddressAutocomplete(addressInput, modal);
    }

    // Demander la géolocalisation
    async requestGeolocation(modal) {
        const allowBtn = modal.querySelector('#allow-location-btn');
        allowBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Localisation en cours...
        `;

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                });
            });

            this.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            this.isLocationEnabled = true;
            await this.loadNearbyRinks();
            modal.remove();
            this.showNotification('Position obtenue ! Chargement des patinoires à proximité...', 'success');

        } catch (error) {
            console.error('Erreur géolocalisation:', error);
            allowBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Géolocalisation refusée
            `;
            
            // Afficher la section manuelle
            modal.querySelector('#manual-location-section').classList.remove('hidden');
            this.showNotification('Veuillez saisir votre adresse manuellement', 'info');
        }
    }

    // Configuration de l'autocomplétion d'adresse avec Nominatim
    setupAddressAutocomplete(input, modal) {
        let searchTimeout;

        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();

            if (query.length < 3) {
                this.hideSuggestions();
                return;
            }

            searchTimeout = setTimeout(async () => {
                await this.searchAddresses(query);
            }, 300);
        });

        // Cacher les suggestions quand on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#address-search') && !e.target.closest('#address-suggestions')) {
                this.hideSuggestions();
            }
        });
    }

    // Rechercher des adresses avec l'API Nominatim
    async searchAddresses(query) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=fr&q=${encodeURIComponent(query)}`
            );
            const results = await response.json();
            this.displayAddressSuggestions(results);
        } catch (error) {
            console.error('Erreur recherche adresse:', error);
        }
    }

    // Afficher les suggestions d'adresse
    displayAddressSuggestions(results) {
        const container = document.getElementById('address-suggestions');
        
        if (!results || results.length === 0) {
            this.hideSuggestions();
            return;
        }

        container.innerHTML = results.map(result => {
            const displayName = result.display_name.split(',').slice(0, 3).join(', ');
            return `
                <div class="p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0" 
                     onclick="window.locationManager.selectAddress(${result.lat}, ${result.lon}, '${displayName}')">
                    <div class="text-white font-medium">${displayName}</div>
                </div>
            `;
        }).join('');

        container.classList.remove('hidden');
    }

    // Cacher les suggestions
    hideSuggestions() {
        const container = document.getElementById('address-suggestions');
        if (container) {
            container.classList.add('hidden');
        }
    }

    // Sélectionner une adresse
    async selectAddress(lat, lng, displayName) {
        this.userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
        this.isLocationEnabled = true;
        
        await this.loadNearbyRinks();
        document.getElementById('location-modal')?.remove();
        this.showNotification(`Position définie : ${displayName}`, 'success');
    }

    // Charger toutes les patinoires depuis Firebase - ADAPTÉ À TA STRUCTURE
    async loadAllRinksFromFirebase() {
        try {
            console.log('🔄 Chargement des patinoires depuis Firebase pour géolocalisation...');
            
            const rinksCollection = collection(db, 'rinks');
            const rinksSnapshot = await getDocs(rinksCollection);
            
            this.allRinks = [];
            
            rinksSnapshot.forEach(doc => {
                const rinkData = doc.data();
                
                // Adaptation à ta structure Firebase
                if (rinkData.coordinates && Array.isArray(rinkData.coordinates) && rinkData.coordinates.length >= 2) {
                    // Conversion du statut anglais vers français
                    const getStatusInFrench = (status) => {
                        switch(status?.toLowerCase()) {
                            case 'open': return 'Ouverte';
                            case 'closed': return 'Fermée';
                            case 'maintenance': return 'Maintenance';
                            default: return 'Statut inconnu';
                        }
                    };

                    this.allRinks.push({
                        id: doc.id,
                        name: rinkData.name || 'Sans nom',
                        city: rinkData.city || 'Ville inconnue',
                        coordinates: [
                            parseFloat(rinkData.coordinates[0]), // latitude
                            parseFloat(rinkData.coordinates[1])  // longitude
                        ],
                        status: getStatusInFrench(rinkData.status),
                        statusRaw: rinkData.status, // Garder le statut original
                        phone: rinkData.phone || '',
                        createdAt: rinkData.createdAt || ''
                    });
                }
            });
            
            console.log(`✅ ${this.allRinks.length} patinoires chargées pour géolocalisation`);
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des patinoires:', error);
            this.allRinks = [];
        }
    }

    // Charger les patinoires à proximité
    async loadNearbyRinks() {
        if (!this.userLocation) return;

        // Charger toutes les patinoires depuis Firebase
        await this.loadAllRinksFromFirebase();

        if (this.allRinks.length === 0) {
            console.log('Aucune patinoire trouvée dans Firebase');
            return;
        }

        // Calculer les distances et trier
        const rinksWithDistance = this.allRinks.map(rink => {
            const distance = this.calculateDistance(
                this.userLocation.lat, this.userLocation.lng,
                rink.coordinates[0], rink.coordinates[1]
            );
            return { ...rink, distance };
        }).sort((a, b) => a.distance - b.distance);

        // Garder les 10 plus proches
        this.nearbyRinks = rinksWithDistance.slice(0, 10);
        
        console.log(`🎯 ${this.nearbyRinks.length} patinoires à proximité trouvées`);
        this.displayNearbyRinks();
    }

    // Afficher toutes les patinoires
    async showAllRinks() {
        await this.loadAllRinksFromFirebase();
        this.displayAllRinks();
    }

    // Afficher les patinoires à proximité
    displayNearbyRinks() {
        const container = document.getElementById('nearby-rinks');
        if (!container || this.nearbyRinks.length === 0) return;

        container.innerHTML = `
            <div class="mb-4">
                <h3 class="text-xl font-bold text-white mb-2">🎯 Patinoires à proximité</h3>
                <p class="text-gray-300 text-sm">Les patinoires les plus proches de votre position</p>
            </div>
            ${this.nearbyRinks.map(rink => this.createRinkCard(rink, true)).join('')}
        `;
    }

    // Afficher toutes les patinoires
    displayAllRinks() {
        const container = document.getElementById('nearby-rinks');
        if (!container || this.allRinks.length === 0) return;

        container.innerHTML = `
            <div class="mb-4">
                <h3 class="text-xl font-bold text-white mb-2">🏟️ Toutes les patinoires</h3>
                <p class="text-gray-300 text-sm">${this.allRinks.length} patinoires disponibles</p>
            </div>
            ${this.allRinks.map(rink => this.createRinkCard(rink, false)).join('')}
        `;
    }

    // Créer une carte de patinoire
    createRinkCard(rink, showDistance) {
        const distanceText = showDistance ? `<span class="text-xs text-gray-400">${rink.distance.toFixed(1)} km</span>` : '';
        
        return `
            <div class="bg-gray-800 rounded-xl p-4 mb-3 border border-gray-700 hover:border-blue-500 transition-all duration-200">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-white">${rink.name}</h4>
                    <span class="px-2 py-1 rounded-full text-xs ${rink.statusRaw === 'open' ? 'bg-green-500' : 'bg-red-500'} text-white">
                        ${rink.status}
                    </span>
                </div>
                <div class="text-gray-300 text-sm mb-3">
                    <div>${rink.city}${distanceText ? ' • ' + distanceText : ''}</div>
                    ${rink.phone ? `<div class="mt-1">📞 ${rink.phone}</div>` : ''}
                </div>
                <button 
                    onclick="addToChecklist('${rink.name}', '${rink.city}')" 
                    class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors">
                    Ajouter à ma liste
                </button>
            </div>
        `;
    }

    // Calculer la distance entre deux points (formule de Haversine)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // Afficher une notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white max-w-sm ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Initialiser le gestionnaire de localisation
window.locationManager = new LocationManager();

export default LocationManager;
