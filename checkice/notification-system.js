// ============================================================================
// 🔔 CHECKICE UNIVERSAL NOTIFICATION SYSTEM
// Système de notifications centralisé et réutilisable pour toute l'app
// ============================================================================

import { db, auth } from './firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit,
    onSnapshot,
    serverTimestamp,
    writeBatch 
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

// 📋 CONFIGURATION
const NOTIFICATION_CONFIG = {
    maxNotifications: 50,
    autoMarkReadDelay: 3000, // 3 secondes après ouverture
    refreshInterval: 30000 // Rafraîchir toutes les 30 secondes
};

// 🎨 TYPES DE NOTIFICATIONS AVEC ICÔNES ET COULEURS
const NOTIFICATION_TYPES = {
    // Social
    'friend-request': { icon: '👤', color: '#3b82f6', title: 'Demande d\'ami' },
    'friend-accepted': { icon: '✅', color: '#10b981', title: 'Ami accepté' },
    'message': { icon: '💬', color: '#8b5cf6', title: 'Nouveau message' },
    
    // Covoiturage
    'carpooling-request': { icon: '🚗', color: '#f59e0b', title: 'Demande de réservation' },
    'carpooling-accepted': { icon: '✅', color: '#10b981', title: 'Réservation acceptée' },
    'carpooling-refused': { icon: '❌', color: '#ef4444', title: 'Réservation refusée' },
    'carpooling-cancelled': { icon: '🚫', color: '#ef4444', title: 'Trajet annulé' },
    'carpooling-message': { icon: '💬', color: '#3b82f6', title: 'Message covoiturage' },
    
    // Événements
    'event-invitation': { icon: '🎉', color: '#ec4899', title: 'Invitation événement' },
    'event-reminder': { icon: '⏰', color: '#f59e0b', title: 'Rappel événement' },
    'event-cancelled': { icon: '🚫', color: '#ef4444', title: 'Événement annulé' },
    
    // Système
    'system': { icon: 'ℹ️', color: '#64748b', title: 'Notification système' },
    'default': { icon: '🔔', color: '#3b82f6', title: 'Notification' }
};

// ============================================================================
// 🔧 CLASSE PRINCIPALE
// ============================================================================

class NotificationSystem {
    constructor() {
        this.currentUser = null;
        this.notifications = [];
        this.unreadCount = 0;
        this.listener = null;
        this.isInitialized = false;
        this.badgeElement = null;
        this.panelElement = null;
    }

    // 🚀 INITIALISATION
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ Notification system déjà initialisé');
            return;
        }

        console.log('🔔 Initialisation système de notifications universel...');

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.setupUI();
                await this.startListening();
                console.log('✅ Notifications actives pour:', user.email);
            } else {
                this.cleanup();
            }
        });

        this.isInitialized = true;
    }

    // 🎨 CRÉER L'INTERFACE
    async setupUI() {
        // Attendre que le DOM soit chargé
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Trouver le bouton notifications dans le header
        const notifButton = document.querySelector('.notification-btn') || 
                           document.getElementById('notifications-btn') ||
                           document.querySelector('[data-notifications]');

        if (!notifButton) {
            console.warn('⚠️ Bouton notifications introuvable dans le DOM');
            return;
        }

        console.log('✅ Bouton notifications trouvé:', notifButton);

        // Créer le badge de compteur
        this.createBadge(notifButton);

        // Créer le panel de notifications
        this.createPanel();

        // Connecter le clic
        notifButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.togglePanel();
        });

        // Fermer panel si clic extérieur
        document.addEventListener('click', (e) => {
            if (this.panelElement && 
                !this.panelElement.contains(e.target) && 
                !notifButton.contains(e.target)) {
                this.closePanel();
            }
        });
    }

    // 🔴 CRÉER BADGE DE COMPTEUR
    createBadge(button) {
        // Supprimer badge existant
        const existingBadge = button.querySelector('.notification-badge');
        if (existingBadge) existingBadge.remove();

        // Créer nouveau badge
        this.badgeElement = document.createElement('span');
        this.badgeElement.className = 'notification-badge';
        this.badgeElement.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            display: none;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
            animation: pulse 2s infinite;
        `;

        // Assurer que le bouton parent a position relative
        button.style.position = 'relative';
        button.appendChild(this.badgeElement);

        // Animation CSS
        if (!document.getElementById('notification-badge-style')) {
            const style = document.createElement('style');
            style.id = 'notification-badge-style';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 📋 CRÉER PANEL DE NOTIFICATIONS
    createPanel() {
        // Supprimer panel existant
        const existingPanel = document.getElementById('notifications-panel');
        if (existingPanel) existingPanel.remove();

        this.panelElement = document.createElement('div');
        this.panelElement.id = 'notifications-panel';
        this.panelElement.className = 'notifications-panel hidden';
        this.panelElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;

        this.panelElement.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">
                        🔔 Notifications
                    </h3>
                    <button id="mark-all-read-btn" style="
                        background: none;
                        border: none;
                        color: #3b82f6;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        padding: 4px 8px;
                        border-radius: 6px;
                        transition: background 0.2s;
                    ">Tout marquer lu</button>
                </div>
                <p id="notif-count" style="margin: 0; font-size: 13px; color: #64748b;"></p>
            </div>
            <div id="notifications-list" style="
                overflow-y: auto;
                max-height: 500px;
                padding: 10px;
            "></div>
        `;

        document.body.appendChild(this.panelElement);

        // Connecter bouton "Tout marquer lu"
        document.getElementById('mark-all-read-btn')?.addEventListener('click', () => {
            this.markAllAsRead();
        });
    }

    // 🎯 OUVRIR/FERMER PANEL
    togglePanel() {
        if (this.panelElement.classList.contains('hidden')) {
            this.openPanel();
        } else {
            this.closePanel();
        }
    }

    openPanel() {
        this.panelElement.classList.remove('hidden');
        this.panelElement.style.display = 'flex';
        this.renderNotifications();
    }

    closePanel() {
        this.panelElement.classList.add('hidden');
        this.panelElement.style.display = 'none';
    }

    // 👂 ÉCOUTER LES NOTIFICATIONS EN TEMPS RÉEL
    async startListening() {
        if (this.listener) {
            console.log('⚠️ Listener déjà actif');
            return;
        }

        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', this.currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(NOTIFICATION_CONFIG.maxNotifications)
        );

        this.listener = onSnapshot(notificationsQuery, (snapshot) => {
            this.notifications = [];
            this.unreadCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                this.notifications.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                });

                if (!data.read) {
                    this.unreadCount++;
                }
            });

            console.log(`📬 ${this.notifications.length} notifications | ${this.unreadCount} non lues`);
            this.updateBadge();
            
            // Rafraîchir le panel si ouvert
            if (!this.panelElement.classList.contains('hidden')) {
                this.renderNotifications();
            }
        });
    }

    // 🔄 METTRE À JOUR LE BADGE
    updateBadge() {
        if (!this.badgeElement) return;

        if (this.unreadCount > 0) {
            this.badgeElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.badgeElement.style.display = 'flex';
        } else {
            this.badgeElement.style.display = 'none';
        }
    }

    // 🎨 AFFICHER LES NOTIFICATIONS
    renderNotifications() {
        const listElement = document.getElementById('notifications-list');
        const countElement = document.getElementById('notif-count');

        if (!listElement) return;

        countElement.textContent = this.unreadCount > 0 
            ? `${this.unreadCount} non lue${this.unreadCount > 1 ? 's' : ''}`
            : 'Tout est lu';

        if (this.notifications.length === 0) {
            listElement.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔔</div>
                    <p style="margin: 0; font-size: 15px; font-weight: 600;">Aucune notification</p>
                    <p style="margin: 5px 0 0 0; font-size: 13px;">Vous êtes à jour !</p>
                </div>
            `;
            return;
        }

        listElement.innerHTML = this.notifications.map(notif => {
            const type = NOTIFICATION_TYPES[notif.type] || NOTIFICATION_TYPES.default;
            const timeAgo = this.getTimeAgo(notif.createdAt);

            return `
                <div class="notification-item ${notif.read ? 'read' : 'unread'}" 
                     data-notif-id="${notif.id}"
                     style="
                        padding: 14px;
                        margin-bottom: 8px;
                        background: ${notif.read ? 'rgba(0, 0, 0, 0.02)' : 'rgba(59, 130, 246, 0.05)'};
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border-left: 3px solid ${notif.read ? 'transparent' : type.color};
                        position: relative;
                     "
                     onmouseover="this.style.background='rgba(59, 130, 246, 0.08)'"
                     onmouseout="this.style.background='${notif.read ? 'rgba(0, 0, 0, 0.02)' : 'rgba(59, 130, 246, 0.05)'}'"
                >
                    <div style="display: flex; align-items: start; gap: 12px;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: ${type.color};
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            flex-shrink: 0;
                        ">${type.icon}</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
                                ${type.title}
                            </div>
                            <div style="font-size: 13px; color: #475569; margin-bottom: 6px; line-height: 1.4;">
                                ${notif.message || 'Notification'}
                            </div>
                            <div style="font-size: 11px; color: #94a3b8;">
                                ${timeAgo}
                            </div>
                        </div>
                        ${!notif.read ? '<div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; position: absolute; top: 14px; right: 14px;"></div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Connecter les clics
        listElement.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notifId = item.dataset.notifId;
                this.handleNotificationClick(notifId);
            });
        });
    }

    // 🖱️ GÉRER CLIC SUR NOTIFICATION
    async handleNotificationClick(notifId) {
        const notif = this.notifications.find(n => n.id === notifId);
        if (!notif) return;

        // Marquer comme lue
        if (!notif.read) {
            await this.markAsRead(notifId);
        }

        // Actions selon le type
        switch (notif.type) {
            case 'friend-request':
                // Ouvrir onglet amis
                if (window.switchTab) window.switchTab('friends');
                break;
            
            case 'carpooling-request':
            case 'carpooling-accepted':
            case 'carpooling-refused':
            case 'carpooling-cancelled':
                // Ouvrir onglet covoiturage
                if (window.switchTab) window.switchTab('carpooling');
                break;

            case 'message':
            case 'carpooling-message':
                // Ouvrir chat avec l'utilisateur
                if (notif.data?.fromUserId && window.openChatModal) {
                    window.openChatModal(notif.data.fromUserName, notif.data.fromUserId);
                }
                break;

            case 'event-invitation':
            case 'event-reminder':
                // Ouvrir onglet événements
                if (window.switchTab) window.switchTab('events');
                break;
        }

        this.closePanel();
    }

    // ✅ MARQUER COMME LUE
    async markAsRead(notifId) {
        try {
            await updateDoc(doc(db, 'notifications', notifId), {
                read: true,
                readAt: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Erreur marquage lu:', error);
        }
    }

    // ✅ MARQUER TOUTES COMME LUES
    async markAllAsRead() {
        const batch = writeBatch(db);
        const unreadNotifs = this.notifications.filter(n => !n.read);

        unreadNotifs.forEach(notif => {
            batch.update(doc(db, 'notifications', notif.id), {
                read: true,
                readAt: serverTimestamp()
            });
        });

        try {
            await batch.commit();
            console.log(`✅ ${unreadNotifs.length} notifications marquées comme lues`);
        } catch (error) {
            console.error('❌ Erreur marquage multiple:', error);
        }
    }

    // 🕒 CALCULER "IL Y A X TEMPS"
    getTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'À l\'instant';
        if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)}j`;
        
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    // 🧹 NETTOYAGE
    cleanup() {
        if (this.listener) {
            this.listener();
            this.listener = null;
        }
        this.currentUser = null;
        this.notifications = [];
        this.unreadCount = 0;
        if (this.badgeElement) this.badgeElement.style.display = 'none';
    }
}

// ============================================================================
// 📤 FONCTIONS UTILITAIRES PUBLIQUES
// ============================================================================

// Créer notification (utilisable par n'importe quel module)
export async function createNotification(userId, type, data) {
    try {
        const typeConfig = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.default;
        
        const notificationData = {
            userId,
            type,
            data: data || {},
            message: data.message || typeConfig.title,
            read: false,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'notifications'), notificationData);
        console.log(`✅ Notification créée: ${docRef.id} (${type})`);
        return docRef.id;
    } catch (error) {
        console.error('❌ Erreur création notification:', error);
        throw error;
    }
}

// Supprimer notification
export async function deleteNotification(notifId) {
    try {
        await deleteDoc(doc(db, 'notifications', notifId));
        console.log(`✅ Notification supprimée: ${notifId}`);
    } catch (error) {
        console.error('❌ Erreur suppression:', error);
    }
}

// Supprimer toutes les notifications d'un utilisateur
export async function clearAllNotifications(userId = auth.currentUser?.uid) {
    if (!userId) return;

    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✅ ${snapshot.size} notifications supprimées`);
    } catch (error) {
        console.error('❌ Erreur nettoyage:', error);
    }
}

// ============================================================================
// 🚀 INITIALISATION GLOBALE
// ============================================================================

const notificationSystem = new NotificationSystem();

// Auto-init quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => notificationSystem.init());
} else {
    notificationSystem.init();
}

// Exposer globalement
window.notificationSystem = notificationSystem;

export default notificationSystem;
console.log('✅ Notification System v2.0 - Universel et Réutilisable');
