// firebase-manager.js - Gestionnaire Firebase optimisé
import { db } from './firebase.js';
import { collection, query, where, onSnapshot, getDoc, doc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { stateManager } from './state-manager.js';

class FirebaseManager {
    constructor() {
        this.cache = new Map();
        this.listeners = new Map();
        this.pendingRequests = new Map();
    }

    // Cache intelligent avec TTL
    async getCachedData(key, fetchFunction, ttl = 300000) { // 5 minutes par défaut
        const cached = this.cache.get(key);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < ttl) {
            return cached.data;
        }

        // Éviter les requêtes multiples simultanées
        if (this.pendingRequests.has(key)) {
            return await this.pendingRequests.get(key);
        }

        const promise = fetchFunction();
        this.pendingRequests.set(key, promise);

        try {
            const data = await promise;
            this.cache.set(key, { data, timestamp: now });
            this.pendingRequests.delete(key);
            return data;
        } catch (error) {
            this.pendingRequests.delete(key);
            throw error;
        }
    }

    // Listener optimisé pour éviter les doublons
    addListener(key, queryRef, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key)(); // Nettoyer l'ancien listener
        }

        const unsubscribe = onSnapshot(queryRef, 
            (snapshot) => {
                try {
                    callback(snapshot);
                } catch (error) {
                    console.error(`Erreur listener ${key}:`, error);
                }
            },
            (error) => {
                console.error(`Erreur Firebase listener ${key}:`, error);
            }
        );

        this.listeners.set(key, unsubscribe);
        return unsubscribe;
    }

    // Nettoyer un listener spécifique
    removeListener(key) {
        const unsubscribe = this.listeners.get(key);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(key);
        }
    }

    // Nettoyer tous les listeners
    cleanup() {
        this.listeners.forEach((unsubscribe, key) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.listeners.clear();
        this.cache.clear();
        this.pendingRequests.clear();
    }

    // Invalider le cache
    invalidateCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }
}

export const firebaseManager = new FirebaseManager();

// Fonction utilitaire pour les requêtes avec retry
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    
    throw lastError;
}
