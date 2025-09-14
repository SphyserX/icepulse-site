import { db } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

async function addInitialRinks() {
    const rinks = [
        { 
            name: "Patinoire de Bercy", 
            city: "Paris", 
            status: "open", 
            coordinates: [48.8392, 2.3785], // Bercy Arena
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire Charlemagne", 
            city: "Lyon", 
            status: "open", 
            coordinates: [45.7640, 4.8357], // Centre Lyon approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Palais Omnisports", 
            city: "Marseille", 
            status: "open", 
            coordinates: [43.2965, 5.3698], // Centre Marseille approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire de Grenoble", 
            city: "Grenoble", 
            status: "open", 
            coordinates: [45.1885, 5.7245], // Centre Grenoble approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire Jean Bouin", 
            city: "Nice", 
            status: "open", 
            coordinates: [43.7102, 7.2620], // Centre Nice approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire Mériadeck", 
            city: "Bordeaux", 
            status: "open", 
            coordinates: [44.8378, -0.5792], // Centre Bordeaux approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire Alex Jany", 
            city: "Toulouse", 
            status: "open", 
            coordinates: [43.6047, 1.4442], // Centre Toulouse approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire Iceberg", 
            city: "Strasbourg", 
            status: "open", 
            coordinates: [48.5734, 7.7521], // Centre Strasbourg approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire Serge Charles", 
            city: "Lille", 
            status: "open", 
            coordinates: [50.6292, 3.0573], // Centre Lille approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire du Petit Port", 
            city: "Nantes", 
            status: "open", 
            coordinates: [47.2184, -1.5536], // Centre Nantes approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire La Gayeulles", 
            city: "Rennes", 
            status: "open", 
            coordinates: [48.1173, -1.6778], // Centre Rennes approximatif
            createdAt: new Date().toISOString() 
        },
        { 
            name: "Patinoire Polesud", 
            city: "Grenoble", 
            status: "open", 
            coordinates: [45.1667, 5.7167], // Secteur Polesud Grenoble
            createdAt: new Date().toISOString() 
        }
    ];

    console.log('🚀 Ajout des patinoires avec coordonnées GPS...');

    for (const rink of rinks) {
        try {
            const docRef = await addDoc(collection(db, "rinks"), rink);
            console.log(`✅ ${rink.name} ajoutée avec ID: ${docRef.id} - GPS: [${rink.coordinates.join(', ')}]`);
        } catch (error) {
            console.error(`❌ Erreur ${rink.name}:`, error);
        }
    }

    console.log('🎉 Toutes les patinoires ont été ajoutées avec leurs coordonnées GPS !');
}

addInitialRinks();
