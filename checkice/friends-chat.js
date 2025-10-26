// friends-chat.js - SYSTÈME DE CHAT ENTRE AMIS INSPIRÉ DU SYSTÈME TICKETS
import { db, auth } from './firebase.js';
import { 
    collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, 
    query, where, orderBy, limit, onSnapshot, writeBatch, serverTimestamp, 
    arrayUnion, setDoc // ✅ AJOUTER setDoc
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';


// 🎨 CONFIGURATION DU CHAT
const CHAT_CONFIG = {
    maxMessageLength: 500,
    maxMessages: 100,
    autoScrollDelay: 100,
    typingTimeout: 3000,
    messagesPagination: 20
};

// 📱 CLASSE PRINCIPALE DU SYSTÈME DE CHAT
class FriendsChat {
    constructor() {
        this.currentUser = null;
        this.activeChatId = null;
        this.currentFriendId = null;
        this.currentFriendName = null;
        this.messageListener = null;
        this.typingListener = null;
        this.chatsList = new Map();
        this.isTyping = false;
        this.typingTimeout = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initialisation système de chat entre amis...');
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                this.setupChatInterface();
                await this.loadUserChats();
                console.log('💬 Chat système prêt pour:', user.email);
            } else {
                this.cleanup();
            }
        });
    }

    // 🎯 INTERFACE UTILISATEUR
    setupChatInterface() {
        setTimeout(() => {
            this.createChatModal();
            this.setupChatButton();
        }, 2000);
    }

    // 🔘 EXPOSER FONCTION GLOBALE
    setupChatButton() {
        window.openChatModal = (friendName, friendId) => {
            this.openFriendChat(friendId, friendName);
        };
    }

    // 🏗️ CRÉER LA MODAL DE CHAT
    createChatModal() {
        if (document.getElementById('friends-chat-modal')) return;

        const chatModal = document.createElement('div');
        chatModal.id = 'friends-chat-modal';
        chatModal.className = 'friends-chat-modal hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        
        chatModal.innerHTML = `
            <div class="frost-effect rounded-2xl w-full max-w-4xl max-h-90vh flex flex-col ice-shadow-lg">
                <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-2xl">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold" id="chat-friend-name">Chat avec ami</h2>
                            <p class="text-blue-100 text-sm" id="chat-status">En ligne</p>
                        </div>
                    </div>
                    <button onclick="friendsChat.closeChatModal()" class="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="flex-1 overflow-hidden flex flex-col">
                    <div id="chat-messages-container" class="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
                        <div class="text-center py-8 text-gray-500">
                            <div class="animate-pulse">Chargement des messages...</div>
                        </div>
                    </div>
                    
                    <div id="typing-indicator" class="hidden px-6 py-2 text-sm text-gray-500 italic">
                        <span id="typing-user"></span> est en train d'écrire...
                    </div>
                </div>

                <div class="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <div class="flex space-x-3 items-end">
                        <div class="flex-1">
                            <textarea id="chat-message-input" 
                                    placeholder="Tapez votre message..." 
                                    class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows="1"
                                    maxlength="${CHAT_CONFIG.maxMessageLength}"
                                    onkeypress="if(event.key==='Enter' && !event.shiftKey) { event.preventDefault(); friendsChat.sendMessage(); }"
                                    oninput="friendsChat.handleTyping()"></textarea>
                            <div class="text-right text-xs text-gray-500 mt-1">
                                <span id="message-char-count">0</span>/${CHAT_CONFIG.maxMessageLength}
                            </div>
                        </div>
                        
                        <button type="button" onclick="friendsChat.sendMessage()" 
                                class="ice-button px-6 py-3 rounded-xl text-white font-medium flex items-center space-x-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                            </svg>
                            <span>Envoyer</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(chatModal);
        this.setupChatEvents();
    }

    // 🎮 ÉVÉNEMENTS DU CHAT
    setupChatEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'friends-chat-modal') {
                this.closeChatModal();
            }
        });

        const textarea = document.getElementById('chat-message-input');
        const counter = document.getElementById('message-char-count');
        if (textarea && counter) {
            textarea.addEventListener('input', () => {
                counter.textContent = textarea.value.length;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            });
        }
    }

    // 💬 OUVRIR CHAT AVEC UN AMI
    async openFriendChat(friendId, friendName) {
        console.log('📱 Ouverture chat avec:', friendName, friendId);
        
        try {
            this.currentFriendId = friendId;
            this.currentFriendName = friendName;
            
            const chatId = await this.getOrCreateChatId(friendId);
            this.activeChatId = chatId;
            
            document.getElementById('chat-friend-name').textContent = `Chat avec ${friendName}`;
            document.getElementById('chat-status').textContent = 'En ligne';
            
            document.getElementById('friends-chat-modal').classList.remove('hidden');
            
            await this.loadChatMessages(chatId);
            this.startMessageListener(chatId);
            
            setTimeout(() => {
                const input = document.getElementById('chat-message-input');
                if (input) input.focus();
            }, 100);
            
        } catch (error) {
            console.error('❌ Erreur ouverture chat:', error);
            this.showNotification('Erreur lors de l\'ouverture du chat', 'error');
        }
    }

    // ✅ SÉCURISÉE - OBTENIR OU CRÉER ID DU CHAT
    async getOrCreateChatId(friendId) {
        console.log('🆔 Création chat ID pour:', friendId);
        
        // ✅ VALIDATION CRITIQUE
        if (!friendId || friendId === 'undefined' || typeof friendId !== 'string') {
            throw new Error(`ID ami invalide: ${friendId}`);
        }
        
        const currentUserId = this.currentUser.uid;
        if (!currentUserId) {
            throw new Error('Utilisateur non connecté');
        }
        
        // ✅ Créer un ID unique basé sur les deux utilisateurs (toujours dans le même ordre)
        const participants = [currentUserId, friendId].sort();
        const chatId = `chat_${participants[0]}_${participants[1]}`;
        
        console.log('💭 Chat ID généré:', chatId);
        
        try {
            // Vérifier si le chat existe
            const chatDocRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatDocRef);
            
            if (!chatDoc.exists()) {
                console.log('🆕 Création nouveau chat:', chatId);
                
                // ✅ UTILISER setDoc au lieu d'updateDoc pour créer un nouveau document
                await setDoc(chatDocRef, {
                    participants: participants,
                    createdAt: serverTimestamp(),
                    lastMessage: null,
                    lastMessageAt: serverTimestamp(),
                    messagesCount: 0
                });
                
                console.log('✅ Chat créé avec succès');
            } else {
                console.log('📋 Chat existant trouvé');
            }
            
            return chatId;
            
        } catch (error) {
            console.error('❌ Erreur création chat:', error);
            throw error;
        }
    }

    // 📥 CHARGER MESSAGES DU CHAT
    async loadChatMessages(chatId) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        try {
            const messagesQuery = query(
                collection(db, 'chatMessages'),
                where('chatId', '==', chatId),
                orderBy('timestamp', 'desc'),
                limit(CHAT_CONFIG.messagesPagination)
            );

            const snapshot = await getDocs(messagesQuery);
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-4">💬</div>
                        <p>Aucun message pour le moment</p>
                        <p class="text-sm text-gray-400">Envoyez le premier message !</p>
                    </div>
                `;
                return;
            }

            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            messages.reverse();

            container.innerHTML = messages.map(message => this.renderMessage(message)).join('');
            this.scrollToBottom();

        } catch (error) {
            console.error('❌ Erreur chargement messages:', error);
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>Erreur de chargement des messages</p>
                    <button onclick="friendsChat.loadChatMessages('${chatId}')" class="mt-2 text-blue-500 hover:underline">
                        Réessayer
                    </button>
                </div>
            `;
        }
    }

    // 🎨 RENDU D'UN MESSAGE
    renderMessage(message) {
        const isOwnMessage = message.senderId === this.currentUser.uid;
        const timestamp = message.timestamp?.toDate ? 
            message.timestamp.toDate().toLocaleString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
            }) : 'Maintenant';

        return `
            <div class="flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4">
                <div class="max-w-xs lg:max-w-md">
                    ${!isOwnMessage ? `
                        <div class="flex items-center mb-1">
                            <span class="text-xs font-medium text-gray-600">${this.escapeHtml(message.senderName || 'Ami')}</span>
                            <span class="text-xs text-gray-400 ml-2">${timestamp}</span>
                        </div>
                    ` : ''}
                    
                    <div class="p-3 rounded-xl ${
                        isOwnMessage ? 
                            'bg-blue-500 text-white ml-auto' : 
                            'bg-gray-100 text-gray-800'
                    }">
                        <p class="text-sm whitespace-pre-wrap">${this.escapeHtml(message.text || '')}</p>
                    </div>
                    
                    ${isOwnMessage ? `
                        <div class="text-right mt-1">
                            <span class="text-xs text-gray-400">${timestamp}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // ✅ CORRIGER CETTE PARTIE dans sendMessage()
    async sendMessage() {
        const input = document.getElementById('chat-message-input');
        if (!input || !this.activeChatId) return;

        const messageText = input.value.trim();
        if (!messageText) return;

        try {
            // Ajouter le message à Firestore
            await addDoc(collection(db, 'chatMessages'), {
                chatId: this.activeChatId,
                senderId: this.currentUser.uid,
                senderName: this.currentUser.displayName || this.currentUser.email,
                text: messageText,
                timestamp: serverTimestamp()
            });

            // ✅ CORRIGER : Utiliser updateDoc SEULEMENT si le document existe
            const chatDocRef = doc(db, 'chats', this.activeChatId);
            const chatDoc = await getDoc(chatDocRef);
            
            if (chatDoc.exists()) {
                // Le document existe, on peut utiliser updateDoc
                await updateDoc(chatDocRef, {
                    lastMessage: messageText,
                    lastMessageAt: serverTimestamp()
                });
            } else {
                // Le document n'existe pas, utiliser setDoc
                await setDoc(chatDocRef, {
                    participants: [this.currentUser.uid, this.currentFriendId].sort(),
                    createdAt: serverTimestamp(),
                    lastMessage: messageText,
                    lastMessageAt: serverTimestamp(),
                    messagesCount: 1
                });
            }

            // Vider l'input
            input.value = '';
            input.style.height = 'auto';
            document.getElementById('message-char-count').textContent = '0';

            console.log('✅ Message envoyé');

        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            this.showNotification('Erreur lors de l\'envoi du message', 'error');
        }
    }

    // 👂 ÉCOUTER LES NOUVEAUX MESSAGES EN TEMPS RÉEL
    startMessageListener(chatId) {
        if (this.messageListener) {
            this.messageListener();
        }

        const messagesQuery = query(
            collection(db, 'chatMessages'),
            where('chatId', '==', chatId),
            orderBy('timestamp', 'desc'),
            limit(CHAT_CONFIG.messagesPagination)
        );

        this.messageListener = onSnapshot(messagesQuery, (snapshot) => {
            if (snapshot.empty) return;

            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            messages.reverse();

            const container = document.getElementById('chat-messages-container');
            if (container) {
                container.innerHTML = messages.map(message => this.renderMessage(message)).join('');
                this.scrollToBottom();
            }
        });
    }

    // ⌨️ GESTION DE LA FRAPPE
    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.sendTypingStatus(true);
        }

        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.sendTypingStatus(false);
        }, CHAT_CONFIG.typingTimeout);
    }

    // 📡 ENVOYER STATUT DE FRAPPE
    async sendTypingStatus(isTyping) {
        // TODO: Implémenter le statut de frappe en temps réel
        // Pour l'instant, juste un log
        console.log(`${isTyping ? '⌨️' : '✋'} Statut de frappe:`, isTyping);
    }

    // 🔄 FAIRE DÉFILER VERS LE BAS
    scrollToBottom() {
        setTimeout(() => {
            const container = document.getElementById('chat-messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, CHAT_CONFIG.autoScrollDelay);
    }

    // ❌ FERMER LA MODAL
    closeChatModal() {
        const modal = document.getElementById('friends-chat-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Nettoyer les listeners
        if (this.messageListener) {
            this.messageListener();
            this.messageListener = null;
        }

        this.activeChatId = null;
        this.currentFriendId = null;
        this.currentFriendName = null;
    }

    // 🧹 NETTOYAGE
    cleanup() {
        if (this.messageListener) {
            this.messageListener();
        }
        
        const modal = document.getElementById('friends-chat-modal');
        if (modal) {
            modal.remove();
        }
    }

    // 📚 CHARGER LISTE DES CHATS
    async loadUserChats() {
        if (!this.currentUser) return;

        try {
            const chatsQuery = query(
                collection(db, 'chats'),
                where('participants', 'array-contains', this.currentUser.uid)
            );

            const snapshot = await getDocs(chatsQuery);
            snapshot.forEach(doc => {
                this.chatsList.set(doc.id, { id: doc.id, ...doc.data() });
            });

            console.log(`💬 ${this.chatsList.size} chats chargés`);

        } catch (error) {
            console.error('❌ Erreur chargement chats:', error);
        }
    }

    // 🔒 ÉCHAPPER HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 📢 NOTIFICATION
    showNotification(message, type = 'info') {
        // Utiliser le système de notification existant
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// ============================================================================
// 🚗 FONCTION UNIFIÉE : Ouvrir chat depuis covoiturage
// Réutilise le même système de chat que les amis
// ============================================================================

window.openCarpoolingChat = async function(friendId, friendName, tripId) {
    console.log(`🚗 Ouverture chat covoiturage: ${friendName} (trajet ${tripId})`);
    
    // Utiliser la fonction existante de friends-chat
    if (window.openChatModal) {
        window.openChatModal(friendName, friendId);
        
        // Optionnel : Ajouter un message automatique mentionnant le trajet
        setTimeout(() => {
            const messageInput = document.getElementById('message-input');
            if (messageInput && tripId) {
                messageInput.placeholder = `Message concernant le trajet...`;
            }
        }, 500);
    } else {
        console.error('❌ Fonction openChatModal introuvable');
    }
};

// Exposer globalement
window.openCarpoolingChat = openCarpoolingChat;


// 🚀 INITIALISER LE SYSTÈME DE CHAT
const friendsChat = new FriendsChat();
window.friendsChat = friendsChat;

export default friendsChat;
