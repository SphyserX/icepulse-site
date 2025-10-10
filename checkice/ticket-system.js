// ticket-system.js - VERSION FINALE COMPLÈTE
import { db, auth } from "./firebase.js";
import { 
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, getDoc, serverTimestamp, arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// 🎯 Configuration du système
const TICKET_CATEGORIES = {
    'data-modification': { name: 'Modification données patinoires', icon: '📝', color: 'blue' },
    'bug-report': { name: 'Bug dans le site/application', icon: '🐛', color: 'red' },
    'feature-request': { name: 'Demande de nouvelle fonctionnalité', icon: '💡', color: 'purple' },
    'account-issue': { name: 'Problème de compte utilisateur', icon: '👤', color: 'orange' },
    'improvement-suggestion': { name: 'Suggestion d\'amélioration', icon: '⭐', color: 'green' },
    'content-report': { name: 'Signalement de contenu', icon: '⚠️', color: 'yellow' },
    'other': { name: 'Autre/Divers', icon: '📋', color: 'gray' }
};

const TICKET_STATUS = {
    'open': { name: 'Ouvert', color: 'blue', icon: '🔵' },
    'in-progress': { name: 'En cours', color: 'yellow', icon: '🟡' },
    'resolved': { name: 'Résolu', color: 'green', icon: '🟢' },
    'closed': { name: 'Fermé', color: 'gray', icon: '⚫' }
};

const PRIORITY_LEVELS = {
    'low': { name: 'Basse', color: 'green', icon: '🟢' },
    'normal': { name: 'Normale', color: 'blue', icon: '🔵' },
    'high': { name: 'Haute', color: 'orange', icon: '🟠' },
    'critical': { name: 'Critique', color: 'red', icon: '🔴' }
};

// 🎫 Classe principale du système de tickets COMPLÈTE
class TicketSystem {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.listeners = [];
        this.currentTicketId = null;
        this.messageListener = null;
        this.init();
    }

    async init() {
        console.log('🎫 Initialisation système de tickets complet...');
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.checkAdminStatus();
                this.setupInterface();
                console.log('✅ Système de tickets complet prêt pour:', user.email);
            }
        });
    }

    async checkAdminStatus() {
        if (!this.currentUser) return;
        
        try {
            const tokenResult = await this.currentUser.getIdTokenResult();
            this.isAdmin = tokenResult.claims.admin || tokenResult.claims.moderator || false;
        } catch (error) {
            console.log('Note: Vérification admin échouée (normal si pas configuré)');
            this.isAdmin = false;
        }
    }

    setupInterface() {
        setTimeout(() => {
            this.addSupportButtonToProfile();
            this.overrideFloatingButton();
            this.createModals();
        }, 2000);
    }

    addSupportButtonToProfile() {
        const profileMenu = document.getElementById('profile-menu');
        if (!profileMenu || document.getElementById('ts-support-btn')) return;

        const supportBtn = document.createElement('button');
        supportBtn.id = 'ts-support-btn';
        supportBtn.className = 'w-full text-left p-2 hover:bg-gray-100 rounded flex items-center';
        supportBtn.innerHTML = `<span class="mr-2">🎫</span>Support & Tickets`;
        
        supportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            profileMenu.classList.add('hidden');
            this.openTicketModal();
        });
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.parentNode.insertBefore(supportBtn, logoutBtn);
            console.log('✅ Bouton support ajouté au menu profil');
        }
    }

    overrideFloatingButton() {
        const floatingBtn = document.querySelector('.floating-action button');
        if (!floatingBtn) return;

        floatingBtn.onclick = (e) => {
            e.preventDefault();
            this.openQuickActionsModal();
        };
        console.log('✅ Bouton flottant connecté aux tickets');
    }

    createModals() {
        if (document.getElementById('ts-modals')) return;

        const modalsContainer = document.createElement('div');
        modalsContainer.id = 'ts-modals';
        modalsContainer.innerHTML = `
            <!-- Modal Actions Rapides -->
            <div id="ts-quick-modal" class="ts-modal hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="frost-effect rounded-2xl p-6 w-full max-w-md ice-shadow-lg">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-bold text-gray-800">Actions rapides</h2>
                        <button onclick="ticketSystem.closeModal('ts-quick-modal')" class="text-gray-500 hover:text-gray-700">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="space-y-3">
                        <button onclick="ticketSystem.openTicketModal()" class="w-full p-4 text-left rounded-xl hover:bg-blue-50 border border-blue-200 flex items-center">
                            <span class="text-2xl mr-4">🎫</span>
                            <div>
                                <h3 class="font-semibold text-gray-800">Créer un ticket</h3>
                                <p class="text-sm text-gray-600">Signaler un bug ou demander de l'aide</p>
                            </div>
                        </button>
                        <button onclick="ticketSystem.openTicketList()" class="w-full p-4 text-left rounded-xl hover:bg-green-50 border border-green-200 flex items-center">
                            <span class="text-2xl mr-4">📋</span>
                            <div>
                                <h3 class="font-semibold text-gray-800">${this.isAdmin ? 'Gérer les tickets' : 'Mes tickets'}</h3>
                                <p class="text-sm text-gray-600">Voir le statut de vos demandes</p>
                            </div>
                        </button>
                        <button onclick="ticketSystem.quickBugReport()" class="w-full p-4 text-left rounded-xl hover:bg-red-50 border border-red-200 flex items-center">
                            <span class="text-2xl mr-4">🐛</span>
                            <div>
                                <h3 class="font-semibold text-gray-800">Signaler un bug</h3>
                                <p class="text-sm text-gray-600">Rapport rapide avec capture</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Création Ticket COMPLÈTE -->
            <div id="ts-create-modal" class="ts-modal hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="frost-effect rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ice-shadow-lg">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 flex items-center">
                            <span class="mr-3">🎫</span>Créer un ticket de support
                        </h2>
                        <button onclick="ticketSystem.closeModal('ts-create-modal')" class="text-gray-500 hover:text-gray-700">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <form id="ts-ticket-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                            <select id="ts-category" required class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Sélectionnez une catégorie...</option>
                                ${Object.entries(TICKET_CATEGORIES).map(([key, cat]) => 
                                    `<option value="${key}">${cat.icon} ${cat.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
                            <input type="text" id="ts-title" required maxlength="100" 
                                   class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Résumé en quelques mots...">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description détaillée *</label>
                            <textarea id="ts-description" required rows="6" maxlength="2000"
                                      class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                      placeholder="Décrivez votre problème ou demande en détail..."></textarea>
                            <div class="text-right text-sm text-gray-500 mt-1">
                                <span id="ts-char-count">0</span>/2000 caractères
                            </div>
                        </div>
                        
                        <!-- 🆕 SECTION UPLOAD D'IMAGE -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                📸 Capture d'écran (optionnel)
                                <span class="text-xs text-gray-500">- Pour les bugs visuels</span>
                            </label>
                            <div class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                                <input type="file" id="ts-image-upload" accept="image/*" class="hidden">
                                <button type="button" onclick="document.getElementById('ts-image-upload').click()" 
                                        class="flex items-center justify-center space-x-2 mx-auto text-gray-600 hover:text-blue-600">
                                    <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                              d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span>Ajouter une capture</span>
                                </button>
                                <p class="text-xs text-gray-500 mt-2">JPG, PNG, GIF - Max 5MB</p>
                            </div>
                            <div id="ts-image-preview" class="mt-3 hidden">
                                <img id="ts-preview-img" class="max-w-full h-32 object-cover rounded-lg">
                                <button type="button" onclick="ticketSystem.removeImage()" 
                                        class="mt-2 text-red-500 text-sm hover:text-red-700">
                                    ✕ Supprimer l'image
                                </button>
                            </div>
                        </div>

                        <div class="flex space-x-3 pt-4">
                            <button type="button" onclick="ticketSystem.closeModal('ts-create-modal')" 
                                    class="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50">
                                Annuler
                            </button>
                            <button type="submit" class="flex-1 ice-button px-6 py-3 rounded-xl text-white font-medium">
                                Créer le ticket
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal Liste Tickets AVEC FILTRES -->
            <div id="ts-list-modal" class="ts-modal hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="frost-effect rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden ice-shadow-lg">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 flex items-center">
                            <span class="mr-3">📋</span>${this.isAdmin ? 'Gestion des tickets' : 'Mes tickets'}
                        </h2>
                        <div class="flex items-center space-x-3">
                            ${this.isAdmin ? `
                                <select id="ts-status-filter" class="p-2 border border-gray-300 rounded-lg text-sm">
                                    <option value="">Tous les statuts</option>
                                    ${Object.entries(TICKET_STATUS).map(([key, status]) => 
                                        `<option value="${key}">${status.icon} ${status.name}</option>`
                                    ).join('')}
                                </select>
                            ` : ''}
                            <button onclick="ticketSystem.closeModal('ts-list-modal')" class="text-gray-500 hover:text-gray-700">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div id="ts-tickets-container" class="overflow-y-auto max-h-[60vh] space-y-3">
                        <div class="text-center py-8 text-gray-500">Chargement des tickets...</div>
                    </div>
                </div>
            </div>

            <!-- Modal Chat Ticket COMPLÈTE -->
            <div id="ts-chat-modal" class="ts-modal hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="frost-effect rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col ice-shadow-lg">
                    <!-- Header du chat -->
                    <div class="flex items-center justify-between p-6 border-b border-gray-200">
                        <div class="flex items-center space-x-3">
                            <span class="text-2xl" id="ts-chat-icon">💬</span>
                            <div>
                                <h2 class="text-xl font-bold text-gray-800" id="ts-chat-title">Chat Support</h2>
                                <p class="text-sm text-gray-600" id="ts-chat-category"></p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            ${this.isAdmin ? `
                                <select id="ts-chat-status" class="p-2 border border-gray-300 rounded-lg text-sm">
                                    ${Object.entries(TICKET_STATUS).map(([key, status]) => 
                                        `<option value="${key}">${status.icon} ${status.name}</option>`
                                    ).join('')}
                                </select>
                                <select id="ts-chat-priority" class="p-2 border border-gray-300 rounded-lg text-sm">
                                    ${Object.entries(PRIORITY_LEVELS).map(([key, priority]) => 
                                        `<option value="${key}">${priority.icon} ${priority.name}</option>`
                                    ).join('')}
                                </select>
                            ` : ''}
                            <button onclick="ticketSystem.closeModal('ts-chat-modal')" class="text-gray-500 hover:text-gray-700">
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Messages container -->
                    <div id="ts-messages-container" class="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
                        <div class="text-center py-8 text-gray-500">Chargement des messages...</div>
                    </div>
                    
                    <!-- Input message -->
                    <div class="p-6 border-t border-gray-200">
                        <div class="flex space-x-3">
                            <input type="text" id="ts-message-input" placeholder="Tapez votre message..." 
                                   class="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   maxlength="500" onkeypress="if(event.key==='Enter') ticketSystem.sendMessage()">
                            <button type="button" onclick="ticketSystem.attachFile()" 
                                    class="px-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50">
                                📎
                            </button>
                            <button type="button" onclick="ticketSystem.sendMessage()" 
                                    class="ice-button px-6 py-3 rounded-xl text-white font-medium">
                                Envoyer
                            </button>
                        </div>
                        <input type="file" id="ts-chat-file" accept="image/*" class="hidden">
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalsContainer);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Fermer modales en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ts-modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Formulaire de création de ticket
        const form = document.getElementById('ts-ticket-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitTicket();
            });
        }

        // ✅ SUPPRESSION DE L'EVENT LISTENER INUTILE SUR LE FORMULAIRE DE MESSAGE

        // Compteur de caractères
        const textarea = document.getElementById('ts-description');
        const counter = document.getElementById('ts-char-count');
        if (textarea && counter) {
            textarea.addEventListener('input', () => {
                counter.textContent = textarea.value.length;
            });
        }

        // Upload d'image
        const imageUpload = document.getElementById('ts-image-upload');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                this.previewImage(e);
            });
        }

        // Filtre de statut
        const statusFilter = document.getElementById('ts-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.loadTickets();
            });
        }

        // Changement de statut/priorité
        const chatStatus = document.getElementById('ts-chat-status');
        const chatPriority = document.getElementById('ts-chat-priority');
        
        if (chatStatus) {
            chatStatus.addEventListener('change', () => {
                this.updateTicketStatus(this.currentTicketId, chatStatus.value);
            });
        }
        
        if (chatPriority) {
            chatPriority.addEventListener('change', () => {
                this.updateTicketPriority(this.currentTicketId, chatPriority.value);
            });
        }
    }

    // 🆕 GESTION DES IMAGES
    previewImage(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Vérifier la taille (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image trop lourde (max 5MB)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('ts-image-preview');
            const img = document.getElementById('ts-preview-img');
            
            img.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        document.getElementById('ts-image-upload').value = '';
        document.getElementById('ts-image-preview').classList.add('hidden');
    }

    // 🆕 CONVERSION IMAGE EN BASE64 POUR FIRESTORE
    async getImageAsBase64(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // ✅ MÉTHODES D'OUVERTURE (inchangées)
    openQuickActionsModal() {
        this.closeModal();
        document.getElementById('ts-quick-modal').classList.remove('hidden');
    }

    openTicketModal() {
        this.closeModal();
        document.getElementById('ts-create-modal').classList.remove('hidden');
        setTimeout(() => {
            const titleField = document.getElementById('ts-title');
            if (titleField) titleField.focus();
        }, 100);
    }

    async openTicketList() {
        this.closeModal();
        document.getElementById('ts-list-modal').classList.remove('hidden');
        await this.loadTickets();
    }

    quickBugReport() {
        this.openTicketModal();
        setTimeout(() => {
            const categorySelect = document.getElementById('ts-category');
            if (categorySelect) {
                categorySelect.value = 'bug-report';
            }
        }, 100);
    }

    // 🆕 SOUMISSION DE TICKET AVEC IMAGE
    async submitTicket() {
        if (!this.currentUser) {
            this.showNotification('Vous devez être connecté pour créer un ticket', 'error');
            return;
        }

        const category = document.getElementById('ts-category').value;
        const title = document.getElementById('ts-title').value;
        const description = document.getElementById('ts-description').value;
        const imageFile = document.getElementById('ts-image-upload').files[0];

        if (!category || !title || !description) {
            this.showNotification('Tous les champs sont obligatoires', 'error');
            return;
        }

        try {
            this.showNotification('Création du ticket en cours...', 'info');

            // Préparer les données
            const ticketData = {
                category,
                title,
                description,
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                status: 'open',
                priority: 'normal',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                messages: []
            };

            // Ajouter l'image si présente
            if (imageFile) {
                const imageBase64 = await this.getImageAsBase64(imageFile);
                ticketData.attachedImage = {
                    data: imageBase64,
                    name: imageFile.name,
                    size: imageFile.size,
                    type: imageFile.type
                };
            }

            const docRef = await addDoc(collection(db, 'tickets'), ticketData);
            
            // Message de bienvenue
            const welcomeMessage = {
                id: Date.now().toString(),
                text: `Bonjour ! Votre ticket a été créé avec succès. Un administrateur va examiner votre demande. Merci d'utiliser CHECKICE ! 🧊`,
                userId: 'system',
                userEmail: 'system',
                isAdmin: true,
                timestamp: new Date()
            };

            await updateDoc(docRef, {
                messages: [welcomeMessage],
                updatedAt: serverTimestamp()
            });
            
            this.showNotification('Ticket créé avec succès ! Vous recevrez une réponse bientôt.', 'success');
            this.closeModal('ts-create-modal');
            
            // Reset form
            document.getElementById('ts-ticket-form').reset();
            document.getElementById('ts-char-count').textContent = '0';
            this.removeImage();
            
        } catch (error) {
            console.error('Erreur création ticket:', error);
            this.showNotification('Erreur lors de la création du ticket: ' + error.message, 'error');
        }
    }

    // 🆕 CHARGEMENT TICKETS AVEC FILTRES
    async loadTickets() {
        const container = document.getElementById('ts-tickets-container');
        if (!container) return;

        try {
            let ticketsQuery;
            const statusFilter = document.getElementById('ts-status-filter')?.value || '';
            
            if (this.isAdmin) {
                if (statusFilter) {
                    ticketsQuery = query(collection(db, 'tickets'), where('status', '==', statusFilter), limit(50));
                } else {
                    ticketsQuery = query(collection(db, 'tickets'), limit(50));
                }
            } else {
                if (statusFilter) {
                    ticketsQuery = query(collection(db, 'tickets'), 
                        where('userId', '==', this.currentUser.uid),
                        where('status', '==', statusFilter));
                } else {
                    ticketsQuery = query(collection(db, 'tickets'), where('userId', '==', this.currentUser.uid));
                }
            }

            const querySnapshot = await getDocs(ticketsQuery);
            const tickets = [];
            
            querySnapshot.forEach((doc) => {
                tickets.push({ id: doc.id, ...doc.data() });
            });

            // Tri côté client
            tickets.sort((a, b) => {
                const dateA = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });

            if (tickets.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <span class="text-4xl mb-4 block">🎫</span>
                        ${statusFilter ? `Aucun ticket "${TICKET_STATUS[statusFilter]?.name}"` : 'Aucun ticket trouvé'}
                    </div>
                `;
                return;
            }

            container.innerHTML = tickets.map(ticket => this.renderTicketCard(ticket)).join('');
            
        } catch (error) {
            console.error('Erreur chargement tickets:', error);
            container.innerHTML = '<div class="text-center py-8 text-red-500">Erreur de chargement: ' + error.message + '</div>';
        }
    }

    // 🆕 RENDU ENRICHI DES CARTES TICKETS
    renderTicketCard(ticket) {
        const category = TICKET_CATEGORIES[ticket.category] || TICKET_CATEGORIES.other;
        const status = TICKET_STATUS[ticket.status] || TICKET_STATUS.open;
        const priority = PRIORITY_LEVELS[ticket.priority] || PRIORITY_LEVELS.normal;
        const createdDate = ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString('fr-FR') : 'Date inconnue';
        const messagesCount = ticket.messages?.length || 0;
        const hasImage = ticket.attachedImage ? '📸' : '';
        const lastMessage = ticket.messages && ticket.messages.length > 0 ? 
            ticket.messages[ticket.messages.length - 1] : null;

        return `
            <div class="ts-ticket-card frost-effect rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all" 
                 onclick="ticketSystem.openTicketChat('${ticket.id}')">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <span class="text-2xl">${category.icon}</span>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-semibold text-gray-800">${ticket.title}</h3>
                                ${hasImage}
                                ${this.isAdmin ? `<span class="ts-priority-${priority.color} px-1 py-0.5 text-xs rounded">
                                    ${priority.icon}
                                </span>` : ''}
                            </div>
                            <p class="text-sm text-gray-600">${category.name}</p>
                        </div>
                    </div>
                    <span class="ts-status-${status.color} px-2 py-1 text-xs font-medium rounded-full">
                        ${status.icon} ${status.name}
                    </span>
                </div>
                <p class="text-sm text-gray-600 mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${ticket.description}</p>
                ${lastMessage ? `
                    <div class="text-xs text-gray-500 mb-2 p-2 bg-gray-50 rounded">
                        <strong>${lastMessage.isAdmin ? '👑 Admin' : 'Vous'}:</strong> 
                        ${lastMessage.text.substring(0, 100)}${lastMessage.text.length > 100 ? '...' : ''}
                    </div>
                ` : ''}
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>Créé le ${createdDate}</span>
                    <div class="flex items-center space-x-3">
                        ${this.isAdmin ? `<span>Par: ${ticket.userEmail}</span>` : ''}
                        <span>💬 ${messagesCount} message${messagesCount > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 🆕 OUVERTURE DU CHAT COMPLET
    async openTicketChat(ticketId) {
        console.log('🎫 Ouverture chat pour ticket:', ticketId);
        // ✅ FERMER LES AUTRES MODALES SANS RESET
        const modals = document.querySelectorAll('.ts-modal');
        modals.forEach(modal => {
            if (modal && modal.id !== 'ts-chat-modal') {
                modal.classList.add('hidden');
            }
        });
        // ✅ DÉFINIR LE TICKET ID AVANT TOUT
        this.currentTicketId = ticketId;
        try {
            const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
            if (!ticketDoc.exists()) {
                this.showNotification('Ticket introuvable', 'error');
                return;
            }

            const ticketData = ticketDoc.data();
            const category = TICKET_CATEGORIES[ticketData.category] || TICKET_CATEGORIES.other;
            // Configurer l'en-tête
            document.getElementById('ts-chat-icon').textContent = category.icon;
            document.getElementById('ts-chat-title').textContent = ticketData.title;
            document.getElementById('ts-chat-category').textContent = category.name;
            // Configurer les selects admin
            if (this.isAdmin) {
                const statusSelect = document.getElementById('ts-chat-status');
                const prioritySelect = document.getElementById('ts-chat-priority');
                if (statusSelect) statusSelect.value = ticketData.status || 'open';
                if (prioritySelect) prioritySelect.value = ticketData.priority || 'normal';
            }
            // Afficher la modal
            document.getElementById('ts-chat-modal').classList.remove('hidden');
            // Charger les messages
            await this.loadMessages(ticketId);
            this.startMessageListener(ticketId);
            // ✅ VÉRIFICATION FINALE
            console.log('✅ Chat ouvert, ticket ID défini:', this.currentTicketId);
        } catch (error) {
            console.error('Erreur ouverture chat:', error);
            this.showNotification('Erreur lors de l\'ouverture du chat', 'error');
        }
    }

    // 🆕 CHARGEMENT DES MESSAGES
    async loadMessages(ticketId) {
        const container = document.getElementById('ts-messages-container');
        if (!container) return;

        try {
            const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
            if (!ticketDoc.exists()) return;

            const ticketData = ticketDoc.data();
            const messages = ticketData.messages || [];

            if (messages.length === 0) {
                container.innerHTML = '<div class="text-center py-8 text-gray-500">Aucun message</div>';
                return;
            }

            container.innerHTML = messages.map(message => this.renderMessage(message)).join('');
            
            // Scroll vers le bas
            container.scrollTop = container.scrollHeight;
            
        } catch (error) {
            console.error('Erreur chargement messages:', error);
        }
    }

    // 🆕 RENDU D'UN MESSAGE
    renderMessage(message) {
        const timestamp = message.timestamp instanceof Date ? 
            message.timestamp.toLocaleString('fr-FR') :
            message.timestamp?.toDate ? message.timestamp.toDate().toLocaleString('fr-FR') : 'Date inconnue';
        
        const isOwnMessage = message.userId === this.currentUser?.uid;
        const isSystem = message.userId === 'system';
        
        return `
            <div class="flex ${isOwnMessage && !isSystem ? 'justify-end' : 'justify-start'} mb-4">
                <div class="max-w-[70%] ${isOwnMessage && !isSystem ? 'order-2' : 'order-1'}">
                    <div class="flex items-center mb-1 ${isOwnMessage && !isSystem ? 'justify-end' : 'justify-start'}">
                        <span class="text-xs font-medium ${
                            isSystem ? 'text-blue-600' :
                            message.isAdmin ? 'text-purple-600' : 'text-gray-600'
                        }">
                            ${isSystem ? '🤖 Système' : 
                              message.isAdmin ? '👑 ' + message.userEmail :
                              isOwnMessage ? 'Vous' : message.userEmail}
                        </span>
                        <span class="text-xs text-gray-400 ml-2">${timestamp}</span>
                    </div>
                    <div class="p-3 rounded-xl ${
                        isSystem ? 'bg-blue-50 border border-blue-200' :
                        message.isAdmin ? 'bg-purple-50 border border-purple-200' :
                        isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-100'
                    }">
                        <p class="text-sm">${message.text}</p>
                        ${message.attachedImage ? `
                            <img src="${message.attachedImage.data}" 
                                 class="mt-2 max-w-full h-auto rounded-lg cursor-pointer"
                                 onclick="window.open(this.src, '_blank')">
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // 🆕 LISTENER TEMPS RÉEL POUR LES MESSAGES
    startMessageListener(ticketId) {
        // Nettoyer l'ancien listener
        if (this.messageListener) {
            this.messageListener();
        }

        // Nouveau listener
        this.messageListener = onSnapshot(doc(db, 'tickets', ticketId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const messages = data.messages || [];
                const container = document.getElementById('ts-messages-container');
                
                if (container) {
                    container.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');
                    container.scrollTop = container.scrollHeight;
                }
            }
        });
    }

    // 🆕 ENVOYER UN MESSAGE
    async sendMessage() {
        const input = document.getElementById('ts-message-input');
        const fileInput = document.getElementById('ts-chat-file');
        const messageText = input.value.trim();
        const file = fileInput.files[0];

        if (!messageText && !file) {
            this.showNotification('Veuillez saisir un message ou joindre un fichier', 'error');
            return;
        }

        if (!this.currentTicketId) return;

        try {
            const newMessage = {
                id: Date.now().toString(),
                text: messageText || '📎 Fichier joint',
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                isAdmin: this.isAdmin,
                timestamp: new Date()
            };

            // Ajouter le fichier si présent
            if (file) {
                const imageBase64 = await this.getImageAsBase64(file);
                newMessage.attachedImage = {
                    data: imageBase64,
                    name: file.name,
                    size: file.size,
                    type: file.type
                };
            }

            await updateDoc(doc(db, 'tickets', this.currentTicketId), {
                messages: arrayUnion(newMessage),
                updatedAt: serverTimestamp()
            });

            // Réinitialiser le formulaire
            input.value = '';
            fileInput.value = '';
            
        } catch (error) {
            console.error('Erreur envoi message:', error);
            this.showNotification('Erreur lors de l\'envoi du message', 'error');
        }
    }

    // 🆕 JOINDRE UN FICHIER
    attachFile() {
        document.getElementById('ts-chat-file').click();
    }

    // 🆕 MISE À JOUR STATUT TICKET
    async updateTicketStatus(ticketId, newStatus) {
        if (!ticketId || !this.isAdmin) return;

        try {
            await updateDoc(doc(db, 'tickets', ticketId), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            const statusInfo = TICKET_STATUS[newStatus];
            this.showNotification(`Statut changé en "${statusInfo.name}"`, 'success');
            
        } catch (error) {
            console.error('Erreur mise à jour statut:', error);
            this.showNotification('Erreur lors de la mise à jour', 'error');
        }
    }

    // 🆕 MISE À JOUR PRIORITÉ TICKET
    async updateTicketPriority(ticketId, newPriority) {
        if (!ticketId || !this.isAdmin) return;

        try {
            await updateDoc(doc(db, 'tickets', ticketId), {
                priority: newPriority,
                updatedAt: serverTimestamp()
            });

            const priorityInfo = PRIORITY_LEVELS[newPriority];
            this.showNotification(`Priorité changée en "${priorityInfo.name}"`, 'success');
            
        } catch (error) {
            console.error('Erreur mise à jour priorité:', error);
            this.showNotification('Erreur lors de la mise à jour', 'error');
        }
    }

    // ✅ UTILITAIRES (inchangés)
    closeModal(modalId = null) {
        // Nettoyer les listeners seulement si on ferme le chat
        if (modalId === 'ts-chat-modal' || modalId === null) {
            if (this.messageListener) {
                this.messageListener();
                this.messageListener = null;
            }
            this.currentTicketId = null; // ← Reset seulement si on ferme le chat
        }
        const modals = modalId ? [document.getElementById(modalId)] : document.querySelectorAll('.ts-modal');
        modals.forEach(modal => {
            if (modal) modal.classList.add('hidden');
        });
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 p-4 rounded-xl text-white font-semibold z-50 ${
                type === 'success' ? 'bg-green-500' : 
                type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }
    }
}

// ✅ Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.ticketSystem = new TicketSystem();
        console.log('🎫 Système de tickets COMPLET disponible globalement');
    }, 3000);
});

export default TicketSystem;
