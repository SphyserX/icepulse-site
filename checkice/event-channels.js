// event-channels.js - SYSTÈME DE CANAL DE DIFFUSION POUR ÉVÉNEMENTS
import { db, auth } from './firebase.js';
import { collection, doc as firestoreDoc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, getDocs, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

/* ========================================
   📋 CONFIGURATION
======================================== */
const CHANNEL_CONFIG = {
    maxMessageLength: 1000,
    messagesPerPage: 50,
    autoScrollDelay: 100
};

/* ========================================
   🔧 CLASSE PRINCIPALE - EVENT CHANNELS
======================================== */
class EventChannelsSystem {
    constructor() {
        this.currentUser = null;
        this.activeChannelId = null;
        this.messageListener = null;
        this.channelsListener = null;
        this.userChannels = [];
        this.isLoadingChannels = false; // ✅ Flag pour éviter les appels simultanés
        this.init();
    }

    async init() {
        console.log('🚀 Initialisation système de canaux d\'événements...');
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserChannels();
                console.log('✅ Système de canaux prêt pour', user.email);
            } else {
                this.cleanup();
            }
        });
    }

    /* ========================================
       📝 MODIFICATION DU FORMULAIRE ADMIN
    ======================================== */
    enhanceEventAdminForm() {
        setTimeout(() => {
            const eventForm = document.getElementById('event-form');
            if (!eventForm) return;

            if (document.getElementById('broadcast-channel-section')) {
                return;
            }

            const channelSection = document.createElement('div');
            channelSection.id = 'broadcast-channel-section';
            channelSection.className = 'border-t border-gray-200 pt-4 mt-4';
            channelSection.innerHTML = `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">📢 Canal de diffusion</h3>
                    <p class="text-sm text-gray-600 mb-4">
                        Permettez aux organisateurs de communiquer avec tous les inscrits à l'événement
                    </p>
                </div>

                <div class="flex items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <input 
                        type="checkbox" 
                        id="enable-broadcast-channel"
                        class="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-3"
                    >
                    <label for="enable-broadcast-channel" class="text-sm font-medium text-gray-700 cursor-pointer">
                        Activer le canal de diffusion pour cet événement
                    </label>
                </div>

                <div id="channel-name-container" class="hidden">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Nom du canal
                    </label>
                    <input 
                        type="text" 
                        id="broadcast-channel-name"
                        placeholder="Ex: Annonces Tournoi de Hockey"
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                    <p class="text-xs text-gray-500 mt-1">
                        Ce nom sera visible par tous les inscrits
                    </p>
                </div>
            `;

            const organizersSection = eventForm.querySelector('[id="selected-organizers"]')?.closest('div')?.parentElement;
            if (organizersSection) {
                organizersSection.after(channelSection);
            } else {
                const buttonsContainer = eventForm.querySelector('.flex.space-x-3.pt-4');
                if (buttonsContainer) {
                    buttonsContainer.before(channelSection);
                }
            }

            const checkbox = document.getElementById('enable-broadcast-channel');
            const nameContainer = document.getElementById('channel-name-container');
            const nameInput = document.getElementById('broadcast-channel-name');

            checkbox?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    nameContainer?.classList.remove('hidden');
                    const eventTitle = document.getElementById('event-title')?.value;
                    if (eventTitle && !nameInput.value) {
                        nameInput.value = `📢 ${eventTitle}`;
                    }
                } else {
                    nameContainer?.classList.add('hidden');
                }
            });

            console.log('✅ Formulaire admin amélioré avec canal de diffusion');
        }, 500);
    }

    /* ========================================
       💾 SAUVEGARDE ET SYNCHRONISATION
    ======================================== */
    async handleEventSave(eventId, eventData, organizersIds, attendeesIds) {
        try {
            const channelEnabled = document.getElementById('enable-broadcast-channel')?.checked;
            const channelName = document.getElementById('broadcast-channel-name')?.value?.trim();

            if (!channelEnabled) {
                await this.archiveChannelIfExists(eventId);
                return;
            }

            if (!channelName) {
                throw new Error('Le nom du canal est requis');
            }

            const channelId = `event_${eventId}`;
            const channelRef = firestoreDoc(db, 'eventChannels', channelId);
            const channelDoc = await getDoc(channelRef);

            const allMembers = [...new Set([...(organizersIds || []), ...(attendeesIds || [])])];

            const channelData = {
                eventId: eventId,
                channelName: channelName,
                admins: organizersIds || [],
                members: allMembers,
                isActive: true,
                updatedAt: serverTimestamp()
            };

            if (channelDoc.exists()) {
                await updateDoc(channelRef, channelData);
                console.log('✅ Canal mis à jour', channelId);
            } else {
                channelData.createdAt = serverTimestamp();
                channelData.messagesCount = 0;
                await setDoc(channelRef, channelData);
                console.log('✅ Canal créé', channelId);
            }

            return channelId;
        } catch (error) {
            console.error('❌ Erreur sauvegarde canal', error);
            throw error;
        }
    }

    async archiveChannelIfExists(eventId) {
        try {
            const channelId = `event_${eventId}`;
            const channelRef = firestoreDoc(db, 'eventChannels', channelId);
            const channelDoc = await getDoc(channelRef);

            if (channelDoc.exists()) {
                await updateDoc(channelRef, {
                    isActive: false,
                    archivedAt: serverTimestamp()
                });
                console.log('📦 Canal archivé', channelId);
            }
        } catch (error) {
            console.error('❌ Erreur archivage canal', error);
        }
    }

    async syncChannelMembers(eventId, attendeesIds, organizersIds) {
        try {
            const channelId = `event_${eventId}`;
            const channelRef = firestoreDoc(db, 'eventChannels', channelId);
            const channelDoc = await getDoc(channelRef);

            if (!channelDoc.exists() || !channelDoc.data().isActive) {
                return;
            }

            const allMembers = [...new Set([...(organizersIds || []), ...(attendeesIds || [])])];

            await updateDoc(channelRef, {
                members: allMembers,
                admins: organizersIds || [],
                updatedAt: serverTimestamp()
            });

            console.log('🔄 Membres synchronisés pour', channelId);
        } catch (error) {
            console.error('❌ Erreur sync membres', error);
        }
    }

    /* ========================================
       📂 CHARGER LES CANAUX EN TEMPS RÉEL
    ======================================== */
    async loadUserChannels() {
        if (!this.currentUser) {
            console.warn('⚠️ Pas d\'utilisateur connecté');
            return;
        }

        if (this.channelsListener) {
            console.log('⚠️ Listener déjà actif, skip');
            return;
        }

        try {
            console.log('🔍 Écoute en temps réel des canaux pour', this.currentUser.uid);
            
            const channelsQuery = query(
                collection(db, 'eventChannels'),
                where('members', 'array-contains', this.currentUser.uid),
                where('isActive', '==', true)
            );

            this.channelsListener = onSnapshot(channelsQuery, async (snapshot) => {
                // ✅ Éviter les appels simultanés
                if (this.isLoadingChannels) {
                    console.log('⏳ Chargement déjà en cours, skip');
                    return;
                }

                this.isLoadingChannels = true;
                console.log(`📊 ${snapshot.size} canaux trouvés (temps réel)`);

                try {
                    // ✅ Charger tous les événements en parallèle
                    const channelPromises = snapshot.docs.map(async (docSnap) => {
                        const channelData = docSnap.data();
                        const eventDoc = await getDoc(firestoreDoc(db, 'events', channelData.eventId));
                        
                        if (eventDoc.exists()) {
                            return {
                                id: docSnap.id,
                                ...channelData,
                                eventData: eventDoc.data()
                            };
                        }
                        return null;
                    });

                    // ✅ Attendre que TOUS soient chargés
                    const channels = await Promise.all(channelPromises);
                    
                    // ✅ Assigner d'un coup (opération atomique)
                    this.userChannels = channels.filter(c => c !== null);

                    console.log(`✅ ${this.userChannels.length} canaux chargés automatiquement`);
                    
                    // ✅ Mise à jour de l'interface
                    const existingTab = document.getElementById('tab-channels');
                    if (!existingTab) {
                        this.addChannelsTabToSocialSection();
                    } else {
                        this.updateChannelBadge(existingTab);
                        this.updateChannelsPanel();
                    }
                } finally {
                    this.isLoadingChannels = false;
                }
            }, (error) => {
                console.error('❌ Erreur listener canaux', error);
                this.isLoadingChannels = false;
            });

        } catch (error) {
            console.error('❌ Erreur chargement canaux', error);
            this.isLoadingChannels = false;
        }
    }

    /* ========================================
       🎨 MISE À JOUR DU BADGE
    ======================================== */
    updateChannelBadge(tabElement) {
        const badge = tabElement.querySelector('.tab-badge');
        if (this.userChannels.length > 0) {
            if (badge) {
                badge.textContent = this.userChannels.length;
            } else {
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'tab-badge';
                badgeSpan.textContent = this.userChannels.length;
                tabElement.appendChild(badgeSpan);
            }
        } else if (badge) {
            badge.remove();
        }
    }

    /* ========================================
       🎨 AJOUT DE L'ONGLET DANS L'INTERFACE SOCIALE
    ======================================== */
    addChannelsTabToSocialSection() {
        const existingTab = document.getElementById('tab-channels');
        if (existingTab) {
            console.log('⚠️ Onglet Canaux existe déjà, skip');
            return;
        }

        const tabsContainer = document.querySelector('.modern-tabs');
        if (!tabsContainer) {
            console.warn('⚠️ Container des onglets non trouvé');
            return;
        }

        const channelsTab = document.createElement('button');
        channelsTab.className = 'tab-btn';
        channelsTab.setAttribute('data-tab', 'channels');
        channelsTab.id = 'tab-channels';
        channelsTab.innerHTML = `
            <span class="tab-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <path d="M8 10h8M8 14h6"/>
                </svg>
            </span>
            Canaux
            ${this.userChannels.length > 0 ? `<span class="tab-badge">${this.userChannels.length}</span>` : ''}
        `;

        const globalTab = document.getElementById('tab-global');
        if (globalTab) {
            globalTab.before(channelsTab);
        } else {
            tabsContainer.appendChild(channelsTab);
        }

        const tabContent = document.querySelector('.tab-content');
        if (tabContent) {
            const channelsPanel = document.createElement('div');
            channelsPanel.className = 'tab-panel';
            channelsPanel.id = 'panel-channels';
            
            channelsPanel.innerHTML = `
                <div id="channels-container" class="modern-list-container">
                    <!-- Canaux chargés automatiquement -->
                </div>
            `;

            const globalPanel = document.getElementById('panel-global');
            if (globalPanel) {
                globalPanel.before(channelsPanel);
            } else {
                tabContent.appendChild(channelsPanel);
            }
        }

        channelsTab.addEventListener('click', () => {
            const allTabButtons = document.querySelectorAll('.tab-btn');
            allTabButtons.forEach(btn => btn.classList.remove('active'));
            
            channelsTab.classList.add('active');
            
            const allTabPanels = document.querySelectorAll('.tab-panel');
            allTabPanels.forEach(panel => panel.classList.remove('active'));
            
            const targetPanel = document.getElementById('panel-channels');
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            
            this.updateChannelsPanel();
        });

        const allOtherTabs = document.querySelectorAll('.tab-btn:not(#tab-channels)');
        allOtherTabs.forEach(otherTab => {
            otherTab.addEventListener('click', () => {
                channelsTab.classList.remove('active');
                const channelsPanel = document.getElementById('panel-channels');
                if (channelsPanel) {
                    channelsPanel.classList.remove('active');
                }
            });
        });

        this.updateChannelsPanel();
        console.log('✅ Onglet Canaux créé');
    }

    /* ========================================
       📋 MISE À JOUR DU PANNEAU CANAUX
    ======================================== */
    updateChannelsPanel() {
        const container = document.getElementById('channels-container');
        if (!container) return;

        if (this.userChannels.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            <path d="M8 10h8M8 14h6"/>
                        </svg>
                    </div>
                    <h3>Aucun canal d'événement</h3>
                    <p>Inscrivez-vous à des événements avec canal de diffusion pour recevoir des annonces</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.userChannels.map(channel => {
            const isAdmin = channel.admins.includes(this.currentUser.uid);
            let isUpcoming = false;
            
            try {
                const eventDate = new Date(`${channel.eventData.date} ${channel.eventData.time}`);
                isUpcoming = eventDate > new Date();
            } catch (e) {
                console.warn('Date invalide pour l\'événement', channel.eventData.title);
            }

            return `
                <div class="modern-user-card channel-card" data-channel-id="${channel.id}" style="cursor: pointer;">
                    <div class="user-avatar">
                        <div class="avatar-circle" style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);">
                            📢
                        </div>
                        <div class="user-status ${isUpcoming ? 'online' : 'offline'}"></div>
                    </div>
                    
                    <div class="user-info">
                        <div class="user-name">${this.escapeHtml(channel.channelName)}</div>
                        <div class="user-meta">
                            <span class="user-level">📅 ${this.escapeHtml(channel.eventData.title)}</span>
                        </div>
                        <div class="user-status-text">
                            👥 ${channel.members.length} membres • 
                            ${isAdmin ? '<span style="color: #10b981;">🔧 Organisateur</span>' : '<span style="color: #6b7280;">👁️ Lecture seule</span>'}
                        </div>
                    </div>
                    
                    <div class="friend-actions">
                        <button class="modern-action-btn-small-blue channel-open-btn" 
                                data-channel-id="${channel.id}"
                                title="Ouvrir le canal">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const channelCards = container.querySelectorAll('.channel-card');
        channelCards.forEach(card => {
            const channelId = card.getAttribute('data-channel-id');
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.channel-open-btn')) {
                    this.openChannel(channelId);
                }
            });
        });

        const openButtons = container.querySelectorAll('.channel-open-btn');
        openButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const channelId = btn.getAttribute('data-channel-id');
                this.openChannel(channelId);
            });
        });
    }

    /* ========================================
       💬 INTERFACE CHAT DU CANAL
    ======================================== */
    async openChannel(channelId) {
        this.activeChannelId = channelId;
        
        const channelDoc = await getDoc(firestoreDoc(db, 'eventChannels', channelId));
        if (!channelDoc.exists()) {
            alert('Canal introuvable');
            return;
        }

        const channelData = channelDoc.data();
        const isAdmin = channelData.admins.includes(this.currentUser.uid);

        this.createChannelModal(channelData, isAdmin);
        await this.loadChannelMessages(channelId);
        this.startMessageListener(channelId);
    }

    createChannelModal(channelData, isAdmin) {
        const oldModal = document.getElementById('event-channel-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'event-channel-modal';
        modal.className = 'modal active fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="frost-effect rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col ice-shadow-lg">
                <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-2xl">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                            <span class="text-xl">📢</span>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold">${this.escapeHtml(channelData.channelName)}</h2>
                            <p class="text-blue-100 text-sm">
                                ${isAdmin ? '🔧 Mode organisateur' : '👁️ Mode lecture seule'}
                            </p>
                        </div>
                    </div>
                    <button onclick="eventChannelsSystem.closeChannelModal()" 
                            class="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div id="channel-messages-container" 
                     class="flex-1 overflow-y-auto p-6 space-y-4" 
                     style="max-height: 500px;">
                    <div class="text-center py-8 text-gray-500">
                        <div class="animate-pulse">Chargement des messages...</div>
                    </div>
                </div>

                ${isAdmin ? `
                    <div class="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                        <div class="flex space-x-3 items-end">
                            <div class="flex-1">
                                <textarea 
                                    id="channel-message-input"
                                    placeholder="Tapez votre annonce..."
                                    class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows="2"
                                    maxlength="${CHANNEL_CONFIG.maxMessageLength}"
                                    onkeypress="if(event.key==='Enter' && !event.shiftKey) { event.preventDefault(); eventChannelsSystem.sendMessage(); }"
                                ></textarea>
                                <div class="text-right text-xs text-gray-500 mt-1">
                                    <span id="channel-char-count">0</span>/${CHANNEL_CONFIG.maxMessageLength}
                                </div>
                            </div>
                            <button 
                                type="button"
                                onclick="eventChannelsSystem.sendMessage()"
                                class="ice-button px-6 py-3 rounded-xl text-white font-medium flex items-center space-x-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                                </svg>
                                <span>Envoyer</span>
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="p-4 bg-gray-100 border-t border-gray-200 text-center rounded-b-2xl">
                        <p class="text-sm text-gray-600">
                            🔒 Seuls les organisateurs peuvent publier dans ce canal
                        </p>
                    </div>
                `}
            </div>
        `;

        document.body.appendChild(modal);

        if (isAdmin) {
            const textarea = document.getElementById('channel-message-input');
            const counter = document.getElementById('channel-char-count');
            textarea?.addEventListener('input', () => {
                counter.textContent = textarea.value.length;
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeChannelModal();
            }
        });
    }

    /* ========================================
       📨 GESTION DES MESSAGES
    ======================================== */
    async loadChannelMessages(channelId) {
        const container = document.getElementById('channel-messages-container');
        if (!container) return;

        try {
            const messagesQuery = query(
                collection(db, 'eventChannels', channelId, 'messages'),
                orderBy('timestamp', 'asc')
            );

            const snapshot = await getDocs(messagesQuery);

            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-4">📭</div>
                        <p>Aucun message pour le moment</p>
                        <p class="text-sm text-gray-400 mt-2">Les annonces apparaîtront ici</p>
                    </div>
                `;
                return;
            }

            const messages = [];
            snapshot.forEach(docSnap => {
                messages.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            container.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');
            this.scrollToBottom();
        } catch (error) {
            console.error('❌ Erreur chargement messages', error);
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>Erreur de chargement des messages</p>
                </div>
            `;
        }
    }

    renderMessage(message) {
        const channelData = this.userChannels.find(c => c.id === this.activeChannelId);
        const isAdmin = channelData?.admins.includes(this.currentUser.uid);
        const isOwnMessage = message.senderId === this.currentUser.uid;

        const timestamp = message.timestamp?.toDate ? 
            message.timestamp.toDate().toLocaleString('fr-FR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            }) : 
            'Maintenant';

        return `
            <div class="modern-user-card" style="background: ${isOwnMessage ? '#eff6ff' : '#f9fafb'}; border-color: ${isOwnMessage ? '#3b82f6' : '#e5e7eb'};">
                <div class="flex items-start justify-between w-full">
                    <div class="flex items-start flex-1">
                        <div class="user-avatar mr-3">
                            <div class="avatar-circle" style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);">
                                ${this.getInitials(message.senderName)}
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center mb-1">
                                <span class="text-sm font-bold text-gray-800">${this.escapeHtml(message.senderName)}</span>
                                <span class="text-xs text-gray-400 ml-2">${timestamp}</span>
                            </div>
                            <div class="text-sm text-gray-700 whitespace-pre-wrap">
                                ${this.escapeHtml(message.text)}
                            </div>
                        </div>
                    </div>
                    ${isAdmin && isOwnMessage ? `
                        <div class="flex space-x-2 ml-3">
                            <button 
                                onclick="eventChannelsSystem.editMessage('${message.id}')"
                                class="text-blue-600 hover:text-blue-800 text-xs p-1"
                                title="Modifier">
                                ✏️
                            </button>
                            <button 
                                onclick="eventChannelsSystem.deleteMessage('${message.id}')"
                                class="text-red-600 hover:text-red-800 text-xs p-1"
                                title="Supprimer">
                                🗑️
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async sendMessage() {
        const input = document.getElementById('channel-message-input');
        if (!input || !this.activeChannelId) return;

        const text = input.value.trim();
        if (!text) return;

        try {
            const userDoc = await getDoc(firestoreDoc(db, 'users', this.currentUser.uid));
            const senderName = userDoc.exists() ? 
                (userDoc.data().username || this.currentUser.email) : 
                this.currentUser.email;

            await addDoc(collection(db, 'eventChannels', this.activeChannelId, 'messages'), {
                senderId: this.currentUser.uid,
                senderName: senderName,
                text: text,
                timestamp: serverTimestamp()
            });

            const channelRef = firestoreDoc(db, 'eventChannels', this.activeChannelId);
            const channelSnap = await getDoc(channelRef);
            await updateDoc(channelRef, {
                messagesCount: (channelSnap.data().messagesCount || 0) + 1,
                lastMessageAt: serverTimestamp()
            });

            input.value = '';
            document.getElementById('channel-char-count').textContent = '0';

            console.log('✅ Message envoyé');
        } catch (error) {
            console.error('❌ Erreur envoi message', error);
            alert('Erreur lors de l\'envoi du message');
        }
    }

    async editMessage(messageId) {
        const newText = prompt('Modifier le message :');
        if (!newText || !newText.trim()) return;

        try {
            const messageRef = firestoreDoc(db, 'eventChannels', this.activeChannelId, 'messages', messageId);
            await updateDoc(messageRef, {
                text: newText.trim(),
                editedAt: serverTimestamp()
            });
            console.log('✅ Message modifié');
        } catch (error) {
            console.error('❌ Erreur modification', error);
            alert('Erreur lors de la modification');
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('Supprimer ce message ?')) return;

        try {
            await deleteDoc(firestoreDoc(db, 'eventChannels', this.activeChannelId, 'messages', messageId));
            console.log('✅ Message supprimé');
        } catch (error) {
            console.error('❌ Erreur suppression', error);
            alert('Erreur lors de la suppression');
        }
    }

    startMessageListener(channelId) {
        if (this.messageListener) {
            this.messageListener();
        }

        const messagesQuery = query(
            collection(db, 'eventChannels', channelId, 'messages'),
            orderBy('timestamp', 'asc')
        );

        this.messageListener = onSnapshot(messagesQuery, (snapshot) => {
            const container = document.getElementById('channel-messages-container');
            if (!container) return;

            const messages = [];
            snapshot.forEach(docSnap => {
                messages.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            if (messages.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-4">📭</div>
                        <p>Aucun message pour le moment</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = messages.map(msg => this.renderMessage(msg)).join('');
            this.scrollToBottom();
        });
    }

    /* ========================================
       🧹 UTILITAIRES
    ======================================== */
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').substring(0, 2);
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = document.getElementById('channel-messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, CHANNEL_CONFIG.autoScrollDelay);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    closeChannelModal() {
        const modal = document.getElementById('event-channel-modal');
        if (modal) {
            modal.remove();
        }
        if (this.messageListener) {
            this.messageListener();
            this.messageListener = null;
        }
        this.activeChannelId = null;
    }

    cleanup() {
        this.closeChannelModal();
        if (this.channelsListener) {
            this.channelsListener();
            this.channelsListener = null;
        }
        this.userChannels = [];
        this.currentUser = null;
        this.isLoadingChannels = false;
    }
}

/* ========================================
   🚀 INITIALISATION GLOBALE
======================================== */
const eventChannelsSystem = new EventChannelsSystem();
window.eventChannelsSystem = eventChannelsSystem;

export async function handleEventChannelCreation(eventId, eventData) {
    const attendeesIds = eventData.attendees || [];
    const organizersIds = eventData.organizers || [];
    
    await eventChannelsSystem.handleEventSave(eventId, eventData, organizersIds, attendeesIds);
}

export async function syncEventChannelMembers(eventId, attendeesIds, organizersIds) {
    await eventChannelsSystem.syncChannelMembers(eventId, attendeesIds, organizersIds);
}

console.log('✅ event-channels.js chargé');
export default eventChannelsSystem;
