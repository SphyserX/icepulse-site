// add-rinks.js - VERSION COMPLÈTE AVEC TOUTES LES DONNÉES REQUISES
import { db } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Fonction d'ajout de patinoire
async function addRink(rinkData) {
    try {
        console.log('🔄 Ajout patinoire:', rinkData.name);
        const docRef = await addDoc(collection(db, 'rinks'), {
            ...rinkData,
            createdAt: new Date()
        });
        console.log("✅ Patinoire ajoutée avec l'ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Erreur ajout patinoire:", error);
        throw error;
    }
}

// Fonction d'ajout d'avis
async function addReview(reviewData) {
    try {
        console.log('🔄 Ajout avis:', reviewData.userName, 'pour', reviewData.rinkName);
        const docRef = await addDoc(collection(db, 'reviews'), reviewData);
        console.log("✅ Avis ajouté avec l'ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Erreur ajout avis:", error);
        throw error;
    }
}

// DONNÉES PATINOIRES COMPLÈTES - TOUS LES CHAMPS REQUIS
const sampleRinksData = [
    {
        name: "Patinoire Olympique de Paris",
        city: "Paris",
        adresse: "15 Avenue des Champs-Élysées, 75008 Paris",
        coordinates: [48.8566, 2.3522],
        status: "open",
        phone: "01 42 76 50 25",
        horaires: "Lun-Ven: 14h-22h, Sam-Dim: 10h-23h",
        tarifs: "Adulte: 8€, Enfant: 5€, Location patins: 3€",
        website: "https://www.patinoire-paris.fr"
    },
    {
        name: "Ice Arena Lyon",
        city: "Lyon", 
        adresse: "125 Rue de la République, 69002 Lyon",
        coordinates: [45.7640, 4.8357],
        status: "open",
        phone: "04 78 95 12 34",
        horaires: "Lun-Dim: 9h-23h (Restauration sur place)",
        tarifs: "Adulte: 7€, Enfant: 4€, Étudiant: 5€, Groupe: -20%",
        website: "https://www.ice-arena-lyon.com"
    },
    {
        name: "Patinoire des Alpes",
        city: "Grenoble",
        adresse: "88 Boulevard Jean Pain, 38000 Grenoble",
        coordinates: [45.1885, 5.7245],
        status: "open", 
        phone: "04 76 44 88 77",
        horaires: "Mar-Dim: 14h-21h, Fermé lundi (Sauf vacances scolaires)",
        tarifs: "Adulte: 6€, Enfant: 3€, Famille (4 pers): 20€, Senior: 4€",
        website: "https://www.patinoire-grenoble-alpes.fr"
    },
    {
        name: "Iceberg Toulouse",
        city: "Toulouse",
        adresse: "45 Allée Jean Jaurès, 31000 Toulouse",
        coordinates: [43.6047, 1.4442],
        status: "open",
        phone: "05 61 23 45 67",
        horaires: "Lun-Ven: 15h-22h, Week-end: 10h-24h (Nocturne vendredi)",
        tarifs: "Adulte: 9€, Enfant: 6€, Soirée (après 20h): 12€, Étudiant: 7€",
        website: "https://www.iceberg-toulouse.com"
    },
    {
        name: "Patinoire Atlantique",
        city: "Nantes",
        adresse: "12 Quai de la Fosse, 44000 Nantes",
        coordinates: [47.2184, -1.5536],
        status: "open",
        phone: "02 40 15 89 32",
        horaires: "Lun-Ven: 14h-21h, Sam-Dim: 10h-22h",
        tarifs: "Adulte: 7€, Enfant: 4€, Senior: 5€, Pass 10 entrées: 60€",
        website: "https://www.patinoire-nantes-atlantique.fr"
    },
    {
        name: "Patinoire de Bordeaux",
        city: "Bordeaux",
        adresse: "185 Cours du Médoc, 33300 Bordeaux",
        coordinates: [44.8378, -0.5792],
        status: "open",
        phone: "05 56 33 44 55",
        horaires: "Mar-Dim: 13h30-22h, Fermé lundi",
        tarifs: "Adulte: 8€, Enfant: 5€, Location patins: 3€, Cours débutant: 15€",
        website: "https://www.bordeaux-glace.fr"
    },
    {
        name: "Ice Palace Marseille",
        city: "Marseille",
        adresse: "76 Avenue du Prado, 13008 Marseille",
        coordinates: [43.2965, 5.3698],
        status: "open",
        phone: "04 91 22 33 44",
        horaires: "Lun-Dim: 10h-23h (Ouvert tous les jours)",
        tarifs: "Adulte: 9€, Enfant: 6€, Tarif réduit: 7€, Anniversaire: 12€/enfant",
        website: "https://www.ice-palace-marseille.com"
    },
    {
        name: "Patinoire de Nice Côte d'Azur",
        city: "Nice",
        adresse: "310 Avenue de la Californie, 06200 Nice",
        coordinates: [43.7102, 7.2620],
        status: "open",
        phone: "04 93 55 66 77",
        horaires: "Lun-Ven: 15h-21h30, Week-end: 10h-22h30",
        tarifs: "Adulte: 10€, Enfant: 7€, Location patins: 4€, VIP: 15€",
        website: "https://www.patinoire-nice.fr"
    },
    {
        name: "Patinoire Charlemagne",
        city: "Lyon",
        adresse: "292 Rue Charlemagne, 69100 Villeurbanne", 
        coordinates: [45.7578, 4.8320],
        status: "closed",
        phone: "04 78 89 90 01",
        horaires: "Fermée pour rénovation - Réouverture prévue fin 2024",
        tarifs: "Fermée temporairement",
        website: "https://www.patinoire-charlemagne-lyon.fr"
    },
    {
        name: "Arctic Arena Lille",
        city: "Lille",
        adresse: "55 Boulevard de la Liberté, 59000 Lille",
        coordinates: [50.6292, 3.0573],
        status: "open",
        phone: "03 20 44 55 66",
        horaires: "Lun-Ven: 14h-22h, Sam-Dim: 9h30-23h",
        tarifs: "Adulte: 7€, Enfant: 4€, Étudiant: 5€, Carte 5 entrées: 30€",
        website: "https://www.arctic-arena-lille.com"
    },
    {
        name: "Patinoire de Strasbourg",
        city: "Strasbourg",
        adresse: "1 Rue de la Patinoire, 67000 Strasbourg",
        coordinates: [48.5734, 7.7521],
        status: "open",
        phone: "03 88 77 88 99",
        horaires: "Lun-Dim: 13h-21h (Horaires étendus vacances)",
        tarifs: "Adulte: 6€, Enfant: 3€, Location patins: 2€, Cours: 12€",
        website: "https://www.patinoire-strasbourg.eu"
    },
    {
        name: "Ice Club Montpellier",
        city: "Montpellier", 
        adresse: "Avenue de Heidelberg, 34000 Montpellier",
        coordinates: [43.6110, 3.8767],
        status: "open",
        phone: "04 67 11 22 33",
        horaires: "Mar-Dim: 14h-21h, Fermé lundi (sauf vacances)",
        tarifs: "Adulte: 8€, Enfant: 5€, Groupe scolaire: 4€, Soirée: 10€",
        website: "https://www.ice-club-montpellier.fr"
    }
];

// AVIS ÉTENDUS POUR TOUTES LES PATINOIRES
const sampleReviews = [
    // Paris
    {
        rinkId: "PatinioireOlympiquedeParis",
        rinkName: "Patinoire Olympique de Paris",
        userId: "user_001",
        userName: "Marie Dubois",
        rating: 5,
        comment: "Magnifique patinoire ! Personnel très accueillant et glace parfaite. Je recommande vivement pour une sortie en famille.",
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
    },
    {
        rinkId: "PatinioireOlympiquedeParis", 
        rinkName: "Patinoire Olympique de Paris",
        userId: "user_002",
        userName: "Thomas Martin",
        rating: 4,
        comment: "Super expérience ! Seul bémol : un peu cher mais ça vaut le coup. Les vestiaires sont très propres.",
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
    },
    
    // Lyon Ice Arena
    {
        rinkId: "IceArenaLyon",
        rinkName: "Ice Arena Lyon", 
        userId: "user_003",
        userName: "Pierre Lefebvre",
        rating: 4,
        comment: "Très bonne patinoire avec un bon équipement. L'ambiance est sympa, surtout le weekend avec la musique.",
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-12')
    },
    {
        rinkId: "IceArenaLyon",
        rinkName: "Ice Arena Lyon",
        userId: "user_004", 
        userName: "Julie Moreau",
        rating: 3,
        comment: "Patinoire correcte mais souvent bondée. Mieux vaut réserver à l'avance pour éviter l'attente.",
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-18')
    },
    
    // Grenoble
    {
        rinkId: "PatinoiredesAlpes",
        rinkName: "Patinoire des Alpes",
        userId: "user_005",
        userName: "Antoine Bernard", 
        rating: 5,
        comment: "Cadre exceptionnel avec vue sur les montagnes ! Glace de qualité olympique et tarifs raisonnables.",
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10')
    },
    
    // Toulouse 
    {
        rinkId: "IcebergToulouse",
        rinkName: "Iceberg Toulouse",
        userId: "user_006",
        userName: "Lucas Durand",
        rating: 4,
        comment: "Patinoire moderne avec de bons équipements. Les soirées à thème sont géniales ! Parking facile.",
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-14')
    },
    
    // Nantes
    {
        rinkId: "PatinoireAtlantique", 
        rinkName: "Patinoire Atlantique",
        userId: "user_007",
        userName: "Maxime Girard",
        rating: 3,
        comment: "Patinoire sympa mais un peu vieillissante. Les tarifs sont corrects et l'accueil est chaleureux.",
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16')
    },
    
    // Bordeaux
    {
        rinkId: "PatinoidedeBordeaux",
        rinkName: "Patinoire de Bordeaux", 
        userId: "user_008",
        userName: "Camille Laurent",
        rating: 4,
        comment: "Belle patinoire, bien entretenue. Les cours pour débutants sont très bien organisés.",
        createdAt: new Date('2024-01-22'),
        updatedAt: new Date('2024-01-22')
    },
    
    // Marseille
    {
        rinkId: "IcePalaceMarseille",
        rinkName: "Ice Palace Marseille",
        userId: "user_009", 
        userName: "Sarah Benali",
        rating: 5,
        comment: "Patinoire fantastique ! Ouverte tous les jours, parfait pour les vacances. Animation au top.",
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25')
    },
    
    // Nice
    {
        rinkId: "PatinoiredeNiceCotedAzur",
        rinkName: "Patinoire de Nice Côte d'Azur",
        userId: "user_010",
        userName: "Kevin Martinez",
        rating: 4,
        comment: "Vue magnifique et patinoire de qualité. Un peu cher mais l'expérience en vaut la peine.",
        createdAt: new Date('2024-01-28'),
        updatedAt: new Date('2024-01-28')
    }
];

// Fonction qui s'exécute vraiment
async function initializeAllData() {
    try {
        console.log('🚀 DÉBUT - Initialisation des données complètes CheckICE Firebase');
        
        // Vérifier que Firebase est prêt
        if (!db) {
            throw new Error('Firebase non initialisé');
        }
        
        let rinkCount = 0;
        let reviewCount = 0;
        
        // Ajouter les patinoires avec toutes les données
        console.log('📍 Ajout des patinoires complètes...');
        for (const rinkData of sampleRinksData) {
            try {
                // Vérification que tous les champs requis sont présents
                const requiredFields = ['name', 'city', 'adresse', 'phone', 'horaires', 'tarifs', 'website'];
                const missingFields = requiredFields.filter(field => !rinkData[field]);
                
                if (missingFields.length > 0) {
                    console.warn(`⚠️ ${rinkData.name} - Champs manquants:`, missingFields);
                }
                
                await addRink(rinkData);
                rinkCount++;
                console.log(`✅ ${rinkData.name} ajoutée avec ${Object.keys(rinkData).length} champs`);
                
                // Petit délai pour éviter les limitations Firebase
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`❌ Erreur patinoire ${rinkData.name}:`, error);
            }
        }
        
        // Ajouter les avis étendus
        console.log('⭐ Ajout des avis étendus...');
        for (const reviewData of sampleReviews) {
            try {
                await addReview(reviewData);
                reviewCount++;
                // Petit délai pour éviter les limitations
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`❌ Erreur avis ${reviewData.userName}:`, error);
            }
        }
        
        console.log(`🎉 TERMINÉ ! ${rinkCount} patinoires complètes et ${reviewCount} avis ajoutés`);
        console.log(`📋 Champs disponibles par patinoire: name, city, adresse, coordinates, status, phone, horaires, tarifs, website`);
        
        // Notification visuelle
        if (typeof showNotification === 'function') {
            showNotification(`Données complètes ajoutées: ${rinkCount} patinoires, ${reviewCount} avis`, 'success');
        } else {
            alert(`✅ Données CheckICE complètes ajoutées !\n${rinkCount} patinoires avec tous les champs\n${reviewCount} avis détaillés`);
        }
        
    } catch (error) {
        console.error('❌ ERREUR CRITIQUE:', error);
        alert('❌ Erreur lors de l\'ajout des données: ' + error.message);
    }
}

// Auto-exécution sécurisée
document.addEventListener('DOMContentLoaded', function() {
    // Ajouter un bouton de test dans la page
    const testButton = document.createElement('button');
    testButton.textContent = '🚀 Ajouter CheckICE données complètes';
    testButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        font-family: 'Inter', sans-serif;
        font-size: 14px;
    `;
    
    testButton.onclick = async function() {
        if (confirm('⚠️ Cela va ajouter 12 patinoires complètes avec tous les champs requis. Continuer ?')) {
            testButton.disabled = true;
            testButton.textContent = '⏳ Ajout des données complètes...';
            
            try {
                await initializeAllData();
                testButton.textContent = '✅ Données complètes ajoutées !';
                testButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                setTimeout(() => {
                    testButton.remove();
                }, 3000);
            } catch (error) {
                testButton.disabled = false;
                testButton.textContent = '❌ Erreur - Réessayer';
                testButton.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            }
        }
    };
    
    document.body.appendChild(testButton);
    
    console.log('🔧 Bouton CheckICE données complètes ajouté');
});

// Export pour usage manuel
window.initializeCheckICECompleteData = initializeAllData;

// Export des fonctions
export { addRink, addReview, initializeAllData };
