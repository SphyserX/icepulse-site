// location.js - VERSION FINALE AVEC CENTRAGE CARTE
import { db } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

class LocationManager {
    constructor() {
        this.userLocation = null;
        this.nearbyRinks = [];
        this.isLocationEnabled = false;
        this.allRinks = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            console.log('⚠️ LocationManager déjà initialisé, abandon');
            return;
        }
        
        this.initialized = true;
        console.log('🗺️ Initialisation LocationManager...');
        
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        await this.showLocationPrompt();
    }

    async showLocationPrompt() {
        const existingModal = document.getElementById('location-modal');
        if (existingModal) {
            console.log('⚠️ Modale déjà présente, abandon');
            return;
        }
        
        const modal = this.createLocationModal();
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.classList.add('active');
        }, 100);
    }

    createLocationModal() {
        const modal = document.createElement('div');
        modal.id = 'location-modal';
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal-content frost-effect" style="max-width: 500px;">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 ice-gradient rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">📍 Trouvez les patinoires près de chez vous</h3>
                    <p class="text-gray-600">Autorisez la géolocalisation pour découvrir les patinoires les plus proches</p>
                </div>
                
                <div class="space-y-3">
                    <button id="allow-location-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>Autoriser la géolocalisation</span>
                    </button>
                    
                    <button id="manual-location-btn" class="w-full bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-3 px-4 rounded-xl transition-all duration-200">
                        📍 Saisir mon adresse manuellement
                    </button>
                    
                    <button id="skip-location-btn" class="w-full text-gray-500 hover:text-gray-700 py-2 transition-colors">
                        Passer
                    </button>
                </div>
                
                <div id="manual-location-section" class="hidden mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <label class="block text-gray-700 text-sm font-medium mb-2">Votre adresse</label>
                    <input 
                        type="text" 
                        id="address-search" 
                        placeholder="Tapez votre ville ou adresse..." 
                        class="w-full bg-white text-gray-800 px-4 py-3 rounded-lg border-2 border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <div id="address-suggestions" class="mt-2 bg-white rounded-lg max-h-48 overflow-y-auto hidden border border-blue-200"></div>
                </div>
            </div>
        `;
        
        this.setupLocationModalEvents(modal);
        return modal;
    }

    setupLocationModalEvents(modal) {
        const allowBtn = modal.querySelector('#allow-location-btn');
        const manualBtn = modal.querySelector('#manual-location-btn');
        const skipBtn = modal.querySelector('#skip-location-btn');
        const manualSection = modal.querySelector('#manual-location-section');
        const addressInput = modal.querySelector('#address-search');

        allowBtn.addEventListener('click', async () => {
            await this.requestGeolocation(modal);
        });

        manualBtn.addEventListener('click', () => {
            manualSection.classList.toggle('hidden');
            if (!manualSection.classList.contains('hidden')) {
                addressInput.focus();
            }
        });

        skipBtn.addEventListener('click', async () => {
            modal.remove();
            await this.showRandomRinks();
        });

        if (addressInput) {
            this.setupAddressAutocomplete(addressInput, modal);
        }
    }

    async requestGeolocation(modal) {
        const allowBtn = modal.querySelector('#allow-location-btn');
        
        if (allowBtn.disabled) return;
        
        allowBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Localisation en cours...
        `;
        allowBtn.disabled = true;

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            this.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            this.isLocationEnabled = true;
            
            await this.loadNearbyRinks();
            
            modal.remove();
            
            this.showNotification('✅ Position obtenue ! Patinoires chargées', 'success');
            
        } catch (error) {
            console.error('❌ Erreur géolocalisation:', error);
            
            allowBtn.disabled = false;
            allowBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Réessayer
            `;
            
            modal.querySelector('#manual-location-section').classList.remove('hidden');
            this.showNotification('⚠️ Veuillez saisir votre adresse manuellement', 'info');
        }
    }

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
            }, 400);
        });
    }

    async searchAddresses(query) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=fr&q=${encodeURIComponent(query)}`
            );
            const results = await response.json();
            this.displayAddressSuggestions(results);
        } catch (error) {
            console.error('❌ Erreur recherche adresse:', error);
        }
    }

    displayAddressSuggestions(results) {
        const container = document.getElementById('address-suggestions');
        
        if (!results || results.length === 0) {
            this.hideSuggestions();
            return;
        }

        container.innerHTML = results.map(result => {
            const displayName = result.display_name.split(',').slice(0, 3).join(', ');
            return `
                <div class="p-3 hover:bg-blue-50 cursor-pointer border-b border-blue-100 last:border-b-0 rounded transition-colors" 
                     data-lat="${result.lat}" data-lng="${result.lon}" data-name="${displayName}">
                    <div class="text-gray-800 font-medium text-sm">${displayName}</div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-lat]').forEach(item => {
            item.addEventListener('click', () => {
                this.selectAddress(
                    item.getAttribute('data-lat'),
                    item.getAttribute('data-lng'),
                    item.getAttribute('data-name')
                );
            });
        });

        container.classList.remove('hidden');
    }

    hideSuggestions() {
        const container = document.getElementById('address-suggestions');
        if (container) {
            container.classList.add('hidden');
        }
    }

    async selectAddress(lat, lng, displayName) {
        this.userLocation = {
            lat: parseFloat(lat),
            lng: parseFloat(lng)
        };
        
        this.isLocationEnabled = true;
        
        await this.loadNearbyRinks();
        
        document.getElementById('location-modal')?.remove();
        
        this.showNotification(`📍 Position définie: ${displayName}`, 'success');
    }

    async showRandomRinks() {
        if (!window.checkIceApp || !window.checkIceApp.allRinks || window.checkIceApp.allRinks.length === 0) {
            console.warn('⚠️ Attente du chargement des patinoires...');
            
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.checkIceApp && window.checkIceApp.allRinks && window.checkIceApp.allRinks.length > 0) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 5000);
            });
        }

        this.allRinks = window.checkIceApp.allRinks || [];
        console.log(`📥 ${this.allRinks.length} patinoires disponibles`);

        if (this.allRinks.length === 0) {
            console.warn('⚠️ Aucune patinoire trouvée');
            this.hideNearbySection();
            return;
        }

        const shuffled = [...this.allRinks].sort(() => 0.5 - Math.random());
        this.nearbyRinks = shuffled.slice(0, 3);
        
        console.log(`✅ ${this.nearbyRinks.length} patinoires aléatoires sélectionnées`);
        
        this.displayRandomRinks();
    }

    displayRandomRinks() {
        const container = document.getElementById('nearby-rinks');
        
        if (!container) {
            console.error('❌ Container #nearby-rinks introuvable');
            return;
        }
        
        if (this.nearbyRinks.length === 0) {
            this.hideNearbySection();
            return;
        }

        container.classList.remove('hidden');
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">🎲 Patinoires à découvrir</h2>
                    <p class="text-sm text-gray-600 mt-1">Découvrez ces patinoires sélectionnées pour vous</p>
                </div>
                <button onclick="window.locationManager.openAllRinksModal()" 
                        class="ice-button-secondary px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-600 hover:text-white transition-colors">
                    📋 Voir tout
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.nearbyRinks.map(rink => this.createRandomRinkCard(rink)).join('')}
            </div>
        `;
        
        setTimeout(() => {
            this.nearbyRinks.forEach(rink => {
                const rinkId = this.generateRinkId(rink);
                this.loadAverageRating(rinkId);
            });
        }, 100);
    }

    async loadNearbyRinks() {
        if (!this.userLocation) {
            console.warn('⚠️ Pas de position utilisateur');
            return;
        }

        if (!window.checkIceApp || !window.checkIceApp.allRinks || window.checkIceApp.allRinks.length === 0) {
            console.warn('⚠️ Attente du chargement des patinoires par map.js...');
            
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.checkIceApp && window.checkIceApp.allRinks && window.checkIceApp.allRinks.length > 0) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 5000);
            });
        }

        this.allRinks = window.checkIceApp.allRinks || [];
        console.log(`📥 ${this.allRinks.length} patinoires récupérées depuis window.checkIceApp`);

        if (this.allRinks.length === 0) {
            console.warn('⚠️ Aucune patinoire trouvée');
            this.hideNearbySection();
            return;
        }

        const rinksWithDistance = this.allRinks.map(rink => {
            const distance = this.calculateDistance(
                this.userLocation.lat,
                this.userLocation.lng,
                rink.coordinates[0],
                rink.coordinates[1]
            );
            
            return { ...rink, distance };
        }).sort((a, b) => a.distance - b.distance);

        this.nearbyRinks = rinksWithDistance.slice(0, 6);
        
        console.log(`✅ ${this.nearbyRinks.length} patinoires à proximité`);
        
        this.displayNearbyRinks();
    }

    displayNearbyRinks() {
        const container = document.getElementById('nearby-rinks');
        
        if (!container) {
            console.error('❌ Container #nearby-rinks introuvable');
            return;
        }
        
        if (this.nearbyRinks.length === 0) {
            this.hideNearbySection();
            return;
        }

        container.classList.remove('hidden');
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">📍 Patinoires à proximité</h2>
                    <p class="text-sm text-gray-600 mt-1">Les plus proches de votre position</p>
                </div>
                <button onclick="window.locationManager.openAllRinksModal()" 
                        class="ice-button-secondary px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-600 hover:text-white transition-colors">
                    📋 Voir tout
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${this.nearbyRinks.map(rink => this.createRinkCard(rink)).join('')}
            </div>
        `;
        
        setTimeout(() => {
            this.nearbyRinks.forEach(rink => {
                const rinkId = this.generateRinkId(rink);
                this.loadAverageRating(rinkId);
            });
        }, 100);
    }

    generateRinkId(rink) {
        return rink.name.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '');
    }

    createRinkCard(rink) {
        const rinkId = this.generateRinkId(rink);
        
        let horaires = 'Horaires non disponibles';
        if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
            horaires = rink.horaires;
        } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
            horaires = rink.hours;
        } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
            horaires = rink.schedule;
        }
        
        return `
            <div class="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 ice-shadow">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-12 h-12 rounded-xl ice-gradient flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                        🚗 ${rink.distance.toFixed(1)} km
                    </span>
                </div>

                <h3 class="font-bold text-gray-800 mb-2 text-lg">${rink.name}</h3>

                <div class="space-y-2 mb-4 text-sm text-gray-600">
                    <div class="flex items-start">
                        <span class="mr-2">📍</span>
                        <span>${rink.city || 'Ville inconnue'}</span>
                    </div>
                    <div class="flex items-start">
                        <span class="mr-2">🕒</span>
                        <span class="flex-1">${horaires}</span>
                    </div>
                    ${rink.phone ? `
                    <div class="flex items-start">
                        <span class="mr-2">📞</span>
                        <span>${rink.phone}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="flex items-center mb-4 text-sm">
                    <span class="mr-2">⭐</span>
                    <span class="font-semibold text-yellow-600" id="avg-rating-${rinkId}">-</span>
                </div>

                <button onclick="window.openRinkDetailsModal('${rinkId}')" 
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Voir la fiche complète</span>
                </button>
            </div>
        `;
    }

    createRandomRinkCard(rink) {
        const rinkId = this.generateRinkId(rink);
        
        let horaires = 'Horaires non disponibles';
        if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
            horaires = rink.horaires;
        } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
            horaires = rink.hours;
        } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
            horaires = rink.schedule;
        }
        
        return `
            <div class="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-purple-400 transition-all duration-200 ice-shadow">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-12 h-12 rounded-xl ice-gradient flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span class="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-semibold">
                        🎲 À découvrir
                    </span>
                </div>

                <h3 class="font-bold text-gray-800 mb-2 text-lg">${rink.name}</h3>

                <div class="space-y-2 mb-4 text-sm text-gray-600">
                    <div class="flex items-start">
                        <span class="mr-2">📍</span>
                        <span>${rink.city || 'Ville inconnue'}</span>
                    </div>
                    <div class="flex items-start">
                        <span class="mr-2">🕒</span>
                        <span class="flex-1">${horaires}</span>
                    </div>
                    ${rink.phone ? `
                    <div class="flex items-start">
                        <span class="mr-2">📞</span>
                        <span>${rink.phone}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="flex items-center mb-4 text-sm">
                    <span class="mr-2">⭐</span>
                    <span class="font-semibold text-yellow-600" id="avg-rating-${rinkId}">-</span>
                </div>

                <button onclick="window.openRinkDetailsModal('${rinkId}')" 
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Voir la fiche complète</span>
                </button>
            </div>
        `;
    }

    openAllRinksModal() {
        const modal = document.createElement('div');
        modal.id = 'all-rinks-modal';
        modal.className = 'modal';
        
        const sortedRinks = [...this.allRinks].sort((a, b) => a.name.localeCompare(b.name));
        
        modal.innerHTML = `
            <div class="modal-content frost-effect" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">
                <div class="sticky top-0 bg-white/95 backdrop-blur-sm p-6 border-b border-gray-200 z-10">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-3xl font-bold text-gray-800">🏒 Toutes les patinoires</h2>
                            <p class="text-sm text-gray-600 mt-1">${sortedRinks.length} patinoires disponibles</p>
                        </div>
                        <button onclick="document.getElementById('all-rinks-modal').remove()" 
                                class="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div class="relative">
                        <input 
                            type="text" 
                            id="rinks-search" 
                            placeholder="Rechercher une patinoire..." 
                            class="w-full py-3 px-4 pl-12 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-4 top-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                
                <div class="p-6">
                    <div id="all-rinks-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${sortedRinks.map(rink => this.createModalRinkCard(rink)).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('active'), 10);
        
        setTimeout(() => {
            sortedRinks.forEach(rink => {
                const rinkId = this.generateRinkId(rink);
                this.loadAverageRating(rinkId);
            });
        }, 100);
        
        const searchInput = document.getElementById('rinks-search');
        searchInput.addEventListener('input', (e) => {
            this.filterRinks(e.target.value.toLowerCase(), sortedRinks);
        });
    }

    filterRinks(searchTerm, allRinks) {
        const grid = document.getElementById('all-rinks-grid');
        
        if (!searchTerm) {
            grid.innerHTML = allRinks.map(rink => this.createModalRinkCard(rink)).join('');
        } else {
            const filtered = allRinks.filter(rink => 
                rink.name.toLowerCase().includes(searchTerm) || 
                (rink.city && rink.city.toLowerCase().includes(searchTerm))
            );
            
            if (filtered.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-3 text-center py-12">
                        <p class="text-gray-500 text-lg">Aucune patinoire trouvée</p>
                    </div>
                `;
            } else {
                grid.innerHTML = filtered.map(rink => this.createModalRinkCard(rink)).join('');
            }
        }
        
        setTimeout(() => {
            const visibleRinks = searchTerm 
                ? allRinks.filter(rink => 
                    rink.name.toLowerCase().includes(searchTerm) || 
                    (rink.city && rink.city.toLowerCase().includes(searchTerm))
                  )
                : allRinks;
                
            visibleRinks.forEach(rink => {
                const rinkId = this.generateRinkId(rink);
                this.loadAverageRating(rinkId);
            });
        }, 50);
    }

    createModalRinkCard(rink) {
        const rinkId = this.generateRinkId(rink);
        
        let horaires = 'Horaires non disponibles';
        if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
            horaires = rink.horaires;
        } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
            horaires = rink.hours;
        } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
            horaires = rink.schedule;
        }
        
        return `
            <div class="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-blue-400 transition-all duration-200 ice-shadow cursor-pointer"
                 onclick="window.openRinkDetailsModal('${rinkId}'); document.getElementById('all-rinks-modal').remove();">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-10 h-10 rounded-lg ice-gradient flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span class="font-semibold text-yellow-600 text-sm" id="avg-rating-${rinkId}">-</span>
                </div>

                <h3 class="font-bold text-gray-800 mb-2">${rink.name}</h3>

                <div class="space-y-1 text-xs text-gray-600">
                    <div class="flex items-center">
                        <span class="mr-1">📍</span>
                        <span class="truncate">${rink.city || 'Ville inconnue'}</span>
                    </div>
                    <div class="flex items-start">
                        <span class="mr-1 mt-0.5">🕒</span>
                        <span class="flex-1 line-clamp-2">${horaires}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAverageRating(rinkId) {
        try {
            const el = document.getElementById(`avg-rating-${rinkId}`);
            if (!el) return;

            const reviewsCollection = collection(db, 'reviews');
            const q = query(reviewsCollection, where('rinkId', '==', rinkId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                el.textContent = '-';
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

            el.textContent = count > 0 ? `${(sum / count).toFixed(1)} ⭐` : '-';
        } catch (error) {
            console.error('❌ Erreur moyenne rating:', error);
            const el = document.getElementById(`avg-rating-${rinkId}`);
            if (el) el.textContent = '-';
        }
    }

    hideNearbySection() {
        const container = document.getElementById('nearby-rinks');
        if (container) {
            container.classList.add('hidden');
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg text-white max-w-sm shadow-lg ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Initialiser UNE SEULE FOIS
if (!window.locationManager) {
    window.locationManager = new LocationManager();
    
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.locationManager.init();
        }, 2000);
    });
}

// ========================================
// ACTIVATION BARRE DE RECHERCHE PRINCIPALE - VERSION CORRIGÉE
// ========================================

// Fonction d'initialisation isolée qui sera appelée quand tout est prêt
function initializeMainSearchBar() {
    console.log('🔍 Initialisation barre de recherche principale...');
    
    const mainSearchInput = document.getElementById('search-input');
    const mainSuggestions = document.getElementById('search-suggestions');
    
    if (!mainSearchInput || !mainSuggestions) {
        console.warn('⚠️ Éléments de recherche introuvables, nouvelle tentative...');
        return false;
    }
    
    console.log('✅ Éléments trouvés:', { 
        input: mainSearchInput.id, 
        suggestions: mainSuggestions.id 
    });

    // ⚠️ IMPORTANT : Forcer les attributs anti-autocomplétion
    mainSearchInput.setAttribute('autocomplete', 'off');
    mainSearchInput.setAttribute('autocorrect', 'off');
    mainSearchInput.setAttribute('autocapitalize', 'off');
    mainSearchInput.setAttribute('spellcheck', 'false');
    
    // ⚠️ IMPORTANT : Vider la barre et cacher les suggestions au démarrage
    mainSearchInput.value = '';
    mainSuggestions.classList.remove('active');
    mainSuggestions.innerHTML = '';
    mainSuggestions.style.display = 'none';
    
    console.log('✅ Barre nettoyée, valeur actuelle:', mainSearchInput.value);
    
    let searchTimeout;
    
    mainSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.toLowerCase().trim();
        
        console.log('📝 Saisie:', query);
        
        if (query.length < 2) {
            mainSuggestions.classList.remove('active');
            mainSuggestions.innerHTML = '';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            console.log('🔎 Recherche pour:', query);
            searchMainRinks(query);
        }, 300);
    });
    
    // Fermer les suggestions au clic extérieur
    document.addEventListener('click', (e) => {
        if (!mainSearchInput.contains(e.target) && !mainSuggestions.contains(e.target)) {
            mainSuggestions.classList.remove('active');
        }
    });
    
    console.log('✅ Barre de recherche initialisée avec succès !');
    return true;
}

// Tentative d'initialisation avec retry
function tryInitializeSearch(attempts = 0) {
    const maxAttempts = 10;
    
    if (attempts >= maxAttempts) {
        console.error('❌ Impossible d\'initialiser la recherche après', maxAttempts, 'tentatives');
        return;
    }
    
    if (initializeMainSearchBar()) {
        console.log('✅ Recherche initialisée avec succès après', attempts + 1, 'tentative(s)');
    } else {
        console.log('⏳ Retry dans 200ms... (tentative', attempts + 1, '/', maxAttempts, ')');
        setTimeout(() => tryInitializeSearch(attempts + 1), 200);
    }
}

// Lancer l'initialisation au bon moment
if (document.readyState === 'loading') {
    // Le DOM n'est pas encore chargé
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM chargé, initialisation de la recherche...');
        setTimeout(() => tryInitializeSearch(), 100);
    });
} else {
    // Le DOM est déjà chargé
    console.log('📄 DOM déjà chargé, initialisation immédiate...');
    setTimeout(() => tryInitializeSearch(), 100);
}

// ========================================
// FONCTION RECHERCHE PRINCIPALE
// ========================================
function searchMainRinks(query) {
    console.log('🔍 searchMainRinks appelée avec:', query);
    
    const suggestions = document.getElementById('search-suggestions');
    if (!suggestions) {
        console.error('❌ Container suggestions introuvable');
        return;
    }
    
    // Vérifier que les patinoires sont disponibles
    if (!window.checkIceApp || !window.checkIceApp.allRinks || window.checkIceApp.allRinks.length === 0) {
        console.warn('⚠️ Patinoires non chargées');
        suggestions.innerHTML = `<div class="p-4 text-center">
            <p class="text-gray-500">Chargement des patinoires...</p>
        </div>`;
        suggestions.classList.add('active');
        return;
    }
    
    const allRinks = window.checkIceApp.allRinks;
    console.log('📊 Recherche dans', allRinks.length, 'patinoires');
    
    const filtered = allRinks.filter(rink => 
        rink.name.toLowerCase().includes(query) ||
        (rink.city && rink.city.toLowerCase().includes(query))
    );
    
    console.log('✅ Résultats trouvés:', filtered.length);
    
    if (filtered.length === 0) {
        suggestions.innerHTML = `<div class="p-4 text-center">
            <p class="text-gray-500">Aucune patinoire trouvée</p>
        </div>`;
    } else {
        suggestions.innerHTML = filtered.slice(0, 5).map(rink => {
            const rinkId = rink.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
            
            let horaires = 'Horaires non disponibles';
            if (rink.horaires && typeof rink.horaires === 'string' && rink.horaires.trim() !== '') {
                horaires = rink.horaires;
            } else if (rink.hours && typeof rink.hours === 'string' && rink.hours.trim() !== '') {
                horaires = rink.hours;
            } else if (rink.schedule && typeof rink.schedule === 'string' && rink.schedule.trim() !== '') {
                horaires = rink.schedule;
            }
            
            return `<div class="p-4 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                         onclick="centerMapOnRink('${rinkId}', ${rink.coordinates[0]}, ${rink.coordinates[1]})">
                <div class="flex items-start">
                    <div class="w-12 h-12 rounded-xl ice-gradient flex items-center justify-center mr-3 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-800">${rink.name}</h4>
                        <div class="flex items-center text-sm text-gray-600 mt-1">
                            <span class="mr-1">📍</span>
                            <span>${rink.city || 'Ville inconnue'}</span>
                        </div>
                        <div class="flex items-start text-xs text-gray-500 mt-1">
                            <span class="mr-1">🕐</span>
                            <span class="line-clamp-1">${horaires}</span>
                        </div>
                    </div>
                    <div class="ml-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    
    suggestions.classList.add('active');
}

// ========================================
// FONCTION CENTRAGE CARTE - VERSION AMÉLIORÉE
// ========================================
window.centerMapOnRink = function(rinkId, lat, lng) {
    console.log('🎯 Centrage sur patinoire:', rinkId, 'Coords:', lat, lng);

    // 1. Fermer les suggestions
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) {
        suggestions.classList.remove('active');
        console.log('✅ Suggestions fermées');
    }

    // 2. Vider la barre de recherche
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        console.log('✅ Barre de recherche vidée');
    }

    // 3. Basculer vers l'onglet carte
    const mapTab = document.querySelector('[data-tab="map"]');
    if (mapTab && !mapTab.classList.contains('tab-active')) {
        console.log('🔄 Basculement vers onglet carte...');
        mapTab.click();

        // Attendre que la carte soit visible avant de centrer
        setTimeout(() => {
            centerAndOpenPopup(rinkId, lat, lng);
        }, 400);
    } else {
        // La carte est déjà active, centrer immédiatement
        centerAndOpenPopup(rinkId, lat, lng);
    }
};

// Fonction auxiliaire pour centrer et ouvrir le popup
function centerAndOpenPopup(rinkId, lat, lng) {
    if (!window.map) {
        console.error('❌ Carte non initialisée');
        return;
    }

    if (!lat || !lng) {
        console.error('❌ Coordonnées invalides:', lat, lng);
        return;
    }

    console.log('🗺️ Centrage de la carte sur:', lat, lng);

    // Centrer la carte avec animation
    window.map.setView([lat, lng], 15, {
        animate: true,
        duration: 1,
        easeLinearity: 0.5
    });

    // Attendre la fin de l'animation pour ouvrir le popup
    setTimeout(() => {
        // Chercher le marker correspondant
        if (window.markers && window.markers[rinkId]) {
            console.log('✅ Marker trouvé, ouverture du popup:', rinkId);
            window.markers[rinkId].openPopup();

            // Animation visuelle du marker (bounce effect)
            const markerElement = window.markers[rinkId].getElement();
            if (markerElement) {
                markerElement.style.animation = 'bounce 0.6s ease';
                setTimeout(() => {
                    markerElement.style.animation = '';
                }, 600);
            }
        } else {
            console.warn('⚠️ Marker introuvable pour:', rinkId);
            console.log('🔍 Markers disponibles:', window.markers ? Object.keys(window.markers) : 'aucun');

            // Fallback : chercher dans tous les markers
            if (window.map._layers) {
                let found = false;
                Object.values(window.map._layers).forEach(layer => {
                    if (layer.getLatLng && layer.openPopup) {
                        const markerLatLng = layer.getLatLng();
                        // Vérifier si les coordonnées correspondent (avec tolérance)
                        if (Math.abs(markerLatLng.lat - lat) < 0.001 && 
                            Math.abs(markerLatLng.lng - lng) < 0.001) {
                            console.log('✅ Marker trouvé par coordonnées, ouverture popup');
                            layer.openPopup();
                            found = true;
                        }
                    }
                });

                if (!found) {
                    console.warn('❌ Impossible de trouver le marker même par coordonnées');
                }
            }
        }
    }, 1200);
}

// Animation CSS pour le bounce effect
const bounceStyle = document.createElement('style');
bounceStyle.textContent = `
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        25% { transform: translateY(-15px); }
        50% { transform: translateY(-8px); }
        75% { transform: translateY(-12px); }
    }
`;
if (!document.getElementById('bounce-animation-style')) {
    bounceStyle.id = 'bounce-animation-style';
    document.head.appendChild(bounceStyle);
}

export default LocationManager;