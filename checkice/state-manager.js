// state-manager.js - Gestionnaire d'état centralisé
import { auth } from './firebase.js';
import { onSnapshot, doc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

class StateManager {
    constructor() {
        this.state = {
            user: null,
            rinks: [],
            friends: [],
            events: [],
            notifications: []
        };
        this.listeners = new Map();
        this.unsubscribes = new Map();
    }

    // Mettre à jour l'état et notifier les listeners
    setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.notifyListeners(key, value, oldValue);
    }

    // Obtenir une valeur de l'état
    getState(key) {
        return this.state[key];
    }

    // Ajouter un listener
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Retourner une fonction pour se désabonner
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
            }
        };
    }

    // Notifier tous les listeners d'une clé
    notifyListeners(key, newValue, oldValue) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error(`Erreur dans listener pour ${key}:`, error);
                }
            });
        }
    }

    // Nettoyer tous les listeners Firebase
    cleanup() {
        this.unsubscribes.forEach((unsubscribe, key) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.unsubscribes.clear();
    }
}

// Instance globale
export const stateManager = new StateManager();

// Initialiser l'écoute de l'utilisateur connecté
export function initializeStateManager() {
    auth.onAuthStateChanged(user => {
        stateManager.setState('user', user);
    });
}
