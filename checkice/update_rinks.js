// ============================================================================
// update-rinks.js - GESTION PATINOIRES CHECKICE
// ============================================================================
// 
// Ce script permet de :
// ✅ MODIFIER des patinoires existantes (ID préservés)
// ✅ AJOUTER de nouvelles patinoires (nouveaux ID auto-générés)
//
// Structure de données basée sur la collection 'rinks' de CheckICE :
// - name: Nom de la patinoire (string)
// - city: Ville (string)
// - adresse: Adresse complète (string)
// - coordinates: [latitude, longitude] (array de 2 numbers)
// - status: "open" | "closed" | "renovation" (string)
// - phone: Numéro de téléphone (string)
// - horaires: Horaires d'ouverture (string, format libre)
// - tarifs: Tarifs d'entrée (string, format libre)
// - website: URL du site web (string)
// - createdAt: Date de création (Timestamp Firebase, ajouté automatiquement)
// - updatedAt: Date de modification (Timestamp Firebase, ajouté automatiquement)
//
// ============================================================================

import { db } from './firebase.js';
import { collection, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ============================================================================
// SECTION 1 : PATINOIRES EXISTANTES À MODIFIER
// ============================================================================
// 
// Pour modifier une patinoire existante :
// - L'ID Firebase DOIT être fourni (ne sera jamais modifié)
// - Seuls les champs fournis seront mis à jour (merge: true)
// - Les relations avec reviews, visitedRinks, etc. restent intactes
//
// Structure d'un objet :
// {
//     id: "ID_FIREBASE_EXISTANT",
//     data: {
//         name: "Nom de la patinoire",
//         city: "Ville",
//         adresse: "Adresse complète",
//         coordinates: [latitude, longitude],
//         status: "open" | "closed" | "renovation",
//         phone: "Numéro",
//         horaires: "Horaires",
//         tarifs: "Tarifs",
//         website: "URL"
//     }
// }
//
// ⚠️ IMPORTANT : Tu peux modifier UN ou PLUSIEURS champs, pas besoin de tous les mettre

const existingRinksToUpdate = [
    // EXEMPLE 1 : Modification complète
    {
        id: "5R3QmDcz1yIYhsGjutyA",
        data: {
            name: "Ice Club Montpellier",
            city: "Montpellier",
            adresse: "Avenue de Heidelberg, 34000 Montpellier",
            coordinates: [43.611, 3.8767],
            status: "open",
            phone: "04 67 11 22 33",
            horaires: "Mar-Dim: 14h-21h, Fermé lundi (sauf vacances)",
            tarifs: "Adulte: 8€, Enfant: 5€, Groupe scolaire: 4€, Soirée: 10€",
            website: "https://www.ice-club-montpellier.fr"
        }
    },
    
    // EXEMPLE 2 : Modification partielle (seulement certains champs)
    {
        id: "zsrr0vG7DThqKb50aSPr",
        data: {
            status: "closed",
            horaires: "Fermée pour rénovation - Réouverture prévue mars 2026",
            tarifs: "Fermée temporairement"
        }
    }
    
    // 📌 AJOUTE ICI LES AUTRES PATINOIRES À MODIFIER
    // Copie la structure ci-dessus et remplace les valeurs
];

// ============================================================================
// SECTION 2 : NOUVELLES PATINOIRES À AJOUTER
// ============================================================================
//
// Pour ajouter une nouvelle patinoire :
// - PAS d'ID à fournir (sera généré automatiquement par Firebase)
// - TOUS les champs sont OBLIGATOIRES sauf createdAt (ajouté automatiquement)
// - Un nouvel ID unique sera créé et retourné
//
// Structure d'un objet :
// {
//     name: "Nom de la patinoire",
//     city: "Ville",
//     adresse: "Adresse complète",
//     coordinates: [latitude, longitude],
//     status: "open" | "closed" | "renovation",
//     phone: "Numéro",
//     horaires: "Horaires",
//     tarifs: "Tarifs",
//     website: "URL"
// }
//
// ⚠️ IMPORTANT : Tous les champs doivent être remplis pour les nouvelles patinoires

const newRinksToAdd = [
    // EXEMPLE 1 : Nouvelle patinoire complète
    {
        name: "Patinoire du Zénith",
        city: "Rennes",
        adresse: "12 Rue du Sport, 35000 Rennes",
        coordinates: [48.1119, -1.6743],
        status: "open",
        phone: "02 99 12 34 56",
        horaires: "Lun-Ven: 14h-22h, Sam-Dim: 10h-23h",
        tarifs: "Adulte: 7.5€, Enfant: 5€, Étudiant: 6€",
        website: "https://www.patinoire-rennes-zenith.fr"
    },
    
    // EXEMPLE 2 : Autre nouvelle patinoire
    {
        name: "Ice Arena Dijon",
        city: "Dijon",
        adresse: "45 Boulevard de Chicago, 21000 Dijon",
        coordinates: [47.3220, 5.0415],
        status: "open",
        phone: "03 80 45 67 89",
        horaires: "Mar-Dim: 14h-21h30, Fermé lundi",
        tarifs: "Adulte: 8€, Enfant: 4.5€, Senior: 6€, Famille: 25€",
        website: "https://www.ice-arena-dijon.fr"
    }
    
    // 📌 AJOUTE ICI LES AUTRES NOUVELLES PATINOIRES
    // Copie la structure ci-dessus et remplace les valeurs
];

// ============================================================================
// SECTION 3 : FONCTIONS FIREBASE
// ============================================================================

/**
 * Modifie une patinoire existante dans Firestore
 * @param {string} rinkId - L'ID Firebase de la patinoire (ne sera jamais modifié)
 * @param {Object} updates - Les champs à mettre à jour
 * @returns {Promise<void>}
 */
async function updateExistingRink(rinkId, updates) {
    await setDoc(doc(db, 'rinks', rinkId), {
        ...updates,
        updatedAt: new Date() // Timestamp de modification
    }, { 
        merge: true // Ne modifie que les champs fournis, garde le reste
    });
}

/**
 * Ajoute une nouvelle patinoire dans Firestore
 * @param {Object} rinkData - Les données complètes de la nouvelle patinoire
 * @returns {Promise<string>} - L'ID Firebase auto-généré de la nouvelle patinoire
 */
async function addNewRink(rinkData) {
    const docRef = await addDoc(collection(db, 'rinks'), {
        ...rinkData,
        createdAt: new Date() // Timestamp de création
    });
    return docRef.id; // Retourne le nouvel ID généré
}

// ============================================================================
// SECTION 4 : TRAITEMENT PRINCIPAL
// ============================================================================

/**
 * Traite toutes les modifications et ajouts de patinoires
 * @returns {Promise<Object>} - Résultats de l'opération (succès, erreurs)
 */
async function processAllRinks() {
    console.log('🚀 DÉBUT - Traitement des patinoires CheckICE\n');
    console.log('=' .repeat(60));
    
    const results = {
        updated: [],  // Patinoires modifiées
        added: [],    // Patinoires ajoutées
        errors: []    // Erreurs rencontrées
    };
    
    // ========== ÉTAPE 1 : MODIFICATIONS ==========
    if (existingRinksToUpdate.length > 0) {
        console.log(`\n🔧 MODIFICATIONS : ${existingRinksToUpdate.length} patinoires\n`);
        
        for (const rink of existingRinksToUpdate) {
            try {
                const rinkName = rink.data.name || `ID: ${rink.id}`;
                console.log(`  🔄 Modification : ${rinkName}`);
                console.log(`     ID préservé : ${rink.id}`);
                
                // Appel Firebase pour modifier
                await updateExistingRink(rink.id, rink.data);
                
                console.log(`  ✅ Succès\n`);
                results.updated.push({
                    id: rink.id,
                    name: rinkName
                });
                
                // Anti rate-limit Firebase (300ms entre chaque opération)
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`  ❌ Erreur : ${error.message}\n`);
                results.errors.push({
                    id: rink.id,
                    type: 'modification',
                    error: error.message
                });
            }
        }
    } else {
        console.log('\n⚠️ Aucune modification à effectuer\n');
    }
    
    // ========== ÉTAPE 2 : AJOUTS ==========
    if (newRinksToAdd.length > 0) {
        console.log(`\n📍 AJOUTS : ${newRinksToAdd.length} nouvelles patinoires\n`);
        
        for (const rink of newRinksToAdd) {
            try {
                console.log(`  🔄 Ajout : ${rink.name} (${rink.city})`);
                
                // Appel Firebase pour ajouter
                const newId = await addNewRink(rink);
                
                console.log(`  ✅ Succès - Nouvel ID : ${newId}\n`);
                results.added.push({
                    id: newId,
                    name: rink.name,
                    city: rink.city
                });
                
                // Anti rate-limit Firebase (300ms entre chaque opération)
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.error(`  ❌ Erreur : ${error.message}\n`);
                results.errors.push({
                    name: rink.name,
                    type: 'ajout',
                    error: error.message
                });
            }
        }
    } else {
        console.log('\n⚠️ Aucun ajout à effectuer\n');
    }
    
    // ========== ÉTAPE 3 : RÉSUMÉ ==========
    console.log('\n' + '='.repeat(60));
    console.log('🎉 FIN DU TRAITEMENT');
    console.log('='.repeat(60));
    console.log(`\n📊 RÉSULTATS :`);
    console.log(`   🔧 ${results.updated.length} patinoires modifiées (ID préservés)`);
    console.log(`   📍 ${results.added.length} patinoires ajoutées (nouveaux ID)`);
    console.log(`   ❌ ${results.errors.length} erreurs`);
    
    // Afficher les détails des modifications
    if (results.updated.length > 0) {
        console.log(`\n✅ PATINOIRES MODIFIÉES :`);
        results.updated.forEach(r => {
            console.log(`   • ${r.name} [ID: ${r.id}]`);
        });
    }
    
    // Afficher les détails des ajouts
    if (results.added.length > 0) {
        console.log(`\n✅ PATINOIRES AJOUTÉES :`);
        results.added.forEach(r => {
            console.log(`   • ${r.name} (${r.city}) [Nouveau ID: ${r.id}]`);
        });
    }
    
    // Afficher les erreurs
    if (results.errors.length > 0) {
        console.log(`\n⚠️ ERREURS :`);
        results.errors.forEach(e => {
            console.log(`   • ${e.name || e.id} (${e.type}) : ${e.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    return results;
}

// ============================================================================
// SECTION 5 : INTERFACE UTILISATEUR (BOUTON)
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Créer le bouton d'action
    const button = document.createElement('button');
    button.textContent = '🚀 Mettre à jour les patinoires';
    button.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 16px 32px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        font-family: 'Inter', -apple-system, sans-serif;
        transition: all 0.3s ease;
    `;
    
    // Animation hover
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.5)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.4)';
    });
    
    // Action au clic
    button.addEventListener('click', async () => {
        // Confirmation avant exécution
        const totalOperations = existingRinksToUpdate.length + newRinksToAdd.length;
        const confirmMessage = 
            `⚠️ CONFIRMATION\n\n` +
            `Opérations prévues :\n` +
            `🔧 ${existingRinksToUpdate.length} modifications (ID préservés)\n` +
            `📍 ${newRinksToAdd.length} ajouts (nouveaux ID)\n\n` +
            `Total : ${totalOperations} patinoires\n\n` +
            `Continuer ?`;
        
        if (!confirm(confirmMessage)) {
            console.log('❌ Opération annulée par l\'utilisateur');
            return;
        }
        
        // Désactiver le bouton pendant le traitement
        button.disabled = true;
        button.textContent = '⏳ Traitement en cours...';
        button.style.background = 'linear-gradient(135deg, #6b7280, #9ca3af)';
        button.style.cursor = 'not-allowed';
        
        try {
            // Lancer le traitement
            const results = await processAllRinks();
            
            // Message de succès
            const successMessage = 
                `✅ Opération terminée !\n\n` +
                `🔧 ${results.updated.length} modifications\n` +
                `📍 ${results.added.length} ajouts\n` +
                `❌ ${results.errors.length} erreurs\n\n` +
                `Consulte la console pour les détails.`;
            
            alert(successMessage);
            
            showNotification(successMessage, 'success');

            // Proposer de recharger avec modale personnalisée
            setTimeout(async () => {
            const reload = await showCustomConfirm(
                'Recharger la page ?',
                'Les modifications seront visibles après rechargement.'
            );
            if (reload) location.reload();
            }, 1500);

            
        } catch (error) {
            // Gestion des erreurs critiques
            console.error('❌ ERREUR CRITIQUE :', error);
            alert(`❌ Erreur critique :\n${error.message}`);
            
            // Réactiver le bouton
            button.disabled = false;
            button.textContent = '🔄 Réessayer';
            button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            button.style.cursor = 'pointer';
        }
    });
    
    // Ajouter le bouton à la page
    document.body.appendChild(button);
    
    // Log de chargement
    console.log('🔧 Script CheckICE chargé et prêt');
    console.log(`📊 Données détectées :`);
    console.log(`   • ${existingRinksToUpdate.length} patinoires à modifier`);
    console.log(`   • ${newRinksToAdd.length} patinoires à ajouter`);
});

// ============================================================================
// EXPORTS (pour usage externe si besoin)
// ============================================================================

export { 
    updateExistingRink, 
    addNewRink, 
    processAllRinks 
};
