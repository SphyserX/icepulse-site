// map.js
import { sampleRinks, addToChecklist } from './checklist.js';

let map;
let markers = [];

export function initializeMap() {
    // Initialiser la carte centrée sur la France
    map = L.map('map').setView([46.603354, 1.888334], 6);

    // Ajouter les tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Ajouter les marqueurs pour chaque patinoire
    sampleRinks.forEach(rink => addRinkMarker(rink));
}

function addRinkMarker(rink) {
    // Couleur du marqueur selon le statut
    const markerColor = rink.status === 'Ouverte' ? 'green' : 
                       rink.status === 'Maintenance' ? 'red' : 'orange';

    // Créer le marqueur
    const marker = L.marker(rink.coordinates).addTo(map);

    // Contenu du popup
    const popupContent = `
        <div class="p-4 min-w-[280px]">
            <h3 class="font-bold text-lg text-gray-800 mb-2">${rink.name}</h3>
            <div class="space-y-2 mb-4">
                <div class="flex justify-between">
                    <span class="text-gray-600">Statut:</span>
                    <span class="font-semibold ${rink.status === 'Ouverte' ? 'text-green-600' : 'text-red-600'}">${rink.status}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Qualité glace:</span>
                    <span class="font-semibold">${rink.ice_quality}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Surfaçage:</span>
                    <span class="font-semibold">${rink.next_maintenance}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Attente:</span>
                    <span class="font-semibold">${rink.wait_time}</span>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="addToChecklistFromMap('${rink.name}', '${rink.city}')" 
                        class="ice-button px-4 py-2 text-white rounded-lg text-sm flex-1">
                    ➕ Ajouter
                </button>
                <button onclick="showRinkDetails('${rink.name}')"
                        class="ice-button-secondary px-4 py-2 rounded-lg text-sm flex-1">
                    📍 Détails
                </button>
            </div>
        </div>
    `;

    marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'custom-popup'
    });

    markers.push(marker);
}

// Fonctions globales pour les boutons du popup
window.addToChecklistFromMap = async function(rinkName, city) {
    await addToChecklist(rinkName, city);
    map.closePopup();
};

window.showRinkDetails = function(rinkName) {
    if (window.checkIceApp) {
        window.checkIceApp.showNotification(`Détails de ${rinkName} - Fonctionnalité en développement`, 'info');
    }
    map.closePopup();
};

// Fonction pour rechercher une patinoire
export function searchRink(searchTerm) {
    const results = sampleRinks.filter(rink => 
        rink.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rink.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return results;
}

// Centrer la carte sur une patinoire
export function focusOnRink(rinkName) {
    const rink = sampleRinks.find(r => r.name === rinkName);
    if (rink && map) {
        map.setView(rink.coordinates, 12);
        
        // Ouvrir le popup du marqueur correspondant
        const marker = markers.find(m => 
            m.getLatLng().lat === rink.coordinates[0] && 
            m.getLatLng().lng === rink.coordinates[1]
        );
        if (marker) {
            marker.openPopup();
        }
    }
}
