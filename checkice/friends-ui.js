// friends-ui.js - DESIGN PROFESSIONNEL MODERNE THÈME BLEU COMPLET CORRIGÉ
import { searchUsers, sendFriendRequest, respondToFriendRequest, getUserFriends, getPendingFriendRequests, getPublicProfile, getUserNotifications, updateUserPresence } from './friends-system.js';
import { auth } from './firebase.js';

// INITIALISATION MODERNE
export function initializeFriendsUI() {
    console.log('🔄 Initialisation interface sociale moderne...');
    
    setupModernInterface();
    setupSearchEvents();
    setupNotifications();
    loadInitialData();
    
    // Mettre à jour la présence toutes les 2 minutes
    setInterval(() => updateUserPresence(), 2 * 60 * 1000);
    
    console.log('✅ Interface sociale moderne initialisée !');
}

// INTERFACE MODERNE PROFESSIONNELLE
function setupModernInterface() {
    const friendsSection = document.getElementById('friends-section');
    if (!friendsSection) {
        console.error('Section friends-section non trouvée');
        return;
    }

    // Remplacer complètement le contenu avec le nouveau design BLEU
    friendsSection.innerHTML = `
        <!-- Header avec statistiques BLEU -->
        <div class="social-header">
            <div class="social-stats-grid">
                <div class="stat-card">
                    <div class="stat-icon stat-icon-blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div class="stat-content">
                        <div class="stat-number" id="friends-total">0</div>
                        <div class="stat-label">Amis</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon stat-icon-blue">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </div>
                    <div class="stat-content">
                        <div class="stat-number" id="requests-total">0</div>
                        <div class="stat-label">Demandes</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon stat-icon-green">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                            <point cx="12" cy="17"/>
                        </svg>
                    </div>
                    <div class="stat-content">
                        <div class="stat-number" id="online-total">0</div>
                        <div class="stat-label">En ligne</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Barre de recherche moderne BLEUE -->
        <div class="modern-search-container">
            <div class="search-input-wrapper">
                <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                </svg>
                <input 
                    type="text" 
                    id="friend-search-input" 
                    placeholder="Rechercher des utilisateurs..." 
                    class="modern-search-input"
                >
                <div class="search-loading" id="search-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                </div>
            </div>
            <div id="search-results" class="modern-search-results" style="display: none;"></div>
        </div>

        <!-- Onglets modernes BLEUS -->
        <div class="modern-tabs">
            <button class="tab-btn active" data-tab="requests" id="tab-requests">
                <span class="tab-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                </span>
                Demandes
                <span class="tab-badge" id="requests-badge" style="display: none;">0</span>
            </button>
            
            <button class="tab-btn" data-tab="friends" id="tab-friends">
                <span class="tab-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                </span>
                Mes amis
            </button>
            
            <button class="tab-btn" data-tab="global" id="tab-global">
                <span class="tab-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                </span>
                Global
            </button>
        </div>

        <!-- Contenu des onglets -->
        <div class="tab-content">
            <div class="tab-panel active" id="panel-requests">
                <div id="requests-container" class="modern-list-container">
                    <!-- Demandes chargées ici -->
                </div>
            </div>
            
            <div class="tab-panel" id="panel-friends">
                <div id="friends-container" class="modern-list-container">
                    <!-- Amis chargés ici -->
                </div>
            </div>
            
            <div class="tab-panel" id="panel-global">
                <div id="global-container" class="modern-list-container">
                    <!-- Classement global chargé ici -->
                </div>
            </div>
        </div>
    `;

    setupTabNavigation();
}

// NAVIGATION ONGLETS
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    if (tabButtons.length === 0) {
        console.error('Aucun bouton d\'onglet trouvé');
        return;
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Mettre à jour les boutons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Mettre à jour les panneaux
            tabPanels.forEach(panel => panel.classList.remove('active'));
            const targetPanel = document.getElementById(`panel-${targetTab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            
            // Charger les données appropriées
            loadTabData(targetTab);
        });
    });
}

// RECHERCHE MODERNE
function setupSearchEvents() {
    const searchInput = document.getElementById('friend-search-input');
    const searchResults = document.getElementById('search-results');
    const searchLoading = document.getElementById('search-loading');
    let searchTimeout;

    if (!searchInput) {
        console.error('Input de recherche non trouvé');
        return;
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (searchTerm.length < 2) {
            if (searchResults) searchResults.style.display = 'none';
            return;
        }

        if (searchLoading) searchLoading.style.display = 'block';

        searchTimeout = setTimeout(async () => {
            try {
                const users = await searchUsers(searchTerm);
                displaySearchResults(users);
            } catch (error) {
                console.error('Erreur recherche:', error);
                displaySearchError();
            } finally {
                if (searchLoading) searchLoading.style.display = 'none';
            }
        }, 300);
    });

    // Fermer les résultats en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.modern-search-container')) {
            if (searchResults) searchResults.style.display = 'none';
        }
    });
}

// AFFICHAGE RÉSULTATS RECHERCHE AVEC BOUTON VOIR PROFIL
function displaySearchResults(users) {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    if (users.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-search">
                <div class="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                </div>
                <p>Aucun utilisateur trouvé</p>
            </div>
        `;
    } else {
        searchResults.innerHTML = users.map(user => {
            // Vérifier si le profil est public (par défaut true si non défini)
            const isProfilePublic = user.profilePublic !== false;
            
            return `
                <div class="modern-user-card" data-user-id="${user.id}">
                    <div class="user-avatar">
                        <div class="avatar-circle" style="background: ${getAvatarColorBlue(user.email)}">
                            ${getInitials(user.displayName || user.username || user.email)}
                        </div>
                        <div class="user-status ${user.isOnline ? 'online' : 'offline'}"></div>
                    </div>
                    <div class="user-info">
                        <div class="user-name">${user.displayName || user.username || user.email.split('@')[0]}</div>
                        <div class="user-meta">
                            <span class="user-level">Niveau ${user.level || 1}</span>
                            <span class="user-points">${user.points || 0} pts</span>
                        </div>
                        ${user.username ? `<div class="user-username">@${user.username}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${isProfilePublic ? `
                            <button class="modern-action-btn-small-blue" onclick="window.showUserProfile('${user.id}')" title="Voir profil">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </button>
                        ` : `
                            <div style="padding: 6px 12px; background: #f3f4f6; border-radius: 6px; color: #6b7280; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                                Privé
                            </div>
                        `}
                        <button class="modern-action-btn-blue" onclick="window.sendFriendRequestUI('${user.id}', '${(user.displayName || user.username || user.email).replace(/'/g, "\\'")}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Ajouter
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    searchResults.style.display = 'block';
}

function displaySearchError() {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    searchResults.innerHTML = `
        <div class="empty-search">
            <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
            </div>
            <p>Erreur de recherche - Réessayez</p>
        </div>
    `;
    searchResults.style.display = 'block';
}

// AFFICHAGE DEMANDES D'AMIS
function displayFriendRequests(requests) {
    const container = document.getElementById('requests-container');
    if (!container) {
        console.error('Container requests non trouvé');
        return;
    }

    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <h3>Aucune demande en attente</h3>
                <p>Les nouvelles demandes d'amis apparaîtront ici.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="modern-user-card request-card">
            <div class="user-avatar">
                <div class="avatar-circle" style="background: ${getAvatarColorBlue(request.sender.email)}">
                    ${getInitials(request.sender.displayName || request.sender.username || request.sender.email)}
                </div>
                <div class="request-indicator-blue">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
            </div>
            <div class="user-info">
                <div class="user-name">${request.sender.displayName || request.sender.username || request.sender.email.split('@')[0]}</div>
                <div class="user-meta">
                    <span class="user-level">Niveau ${request.sender.level || 1}</span>
                    <span class="user-points">${request.sender.points || 0} pts</span>
                </div>
                <div class="request-time">${getTimeAgo(request.createdAt.toDate ? request.createdAt.toDate() : request.createdAt)}</div>
            </div>
            <div class="request-actions">
                <button class="modern-action-btn-blue accept" onclick="window.respondToFriendRequestUI('${request.id}', 'accept')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Accepter
                </button>
                <button class="modern-action-btn-secondary decline" onclick="window.respondToFriendRequestUI('${request.id}', 'decline')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Refuser
                </button>
            </div>
        </div>
    `).join('');
}

// AFFICHAGE LISTE AMIS
function displayFriendsList(friends) {
    const container = document.getElementById('friends-container');
    if (!container) {
        console.error('Container friends non trouvé');
        return;
    }

    if (friends.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                </div>
                <h3>Aucun ami pour le moment</h3>
                <p>Utilisez la recherche pour trouver des amis à ajouter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = friends.map((friend, index) => `
        <div class="modern-user-card friend-card">
            <div class="friend-rank-blue">#${index + 1}</div>
            <div class="user-avatar">
                <div class="avatar-circle" style="background: ${getAvatarColorBlue(friend.email)}">
                    ${getInitials(friend.displayName || friend.username || friend.email)}
                </div>
                <div class="user-status ${friend.isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="user-info">
                <div class="user-name">${friend.displayName || friend.username || friend.email.split('@')[0]}</div>
                <div class="user-meta">
                    <span class="user-level">Niveau ${friend.level || 1}</span>
                    <span class="user-points">${friend.points || 0} pts</span>
                </div>
                <div class="user-status-text">${friend.isOnline ? 'En ligne' : getLastSeenText(friend.lastSeen)}</div>
            </div>
            <div class="friend-actions">
                <button class="modern-action-btn-small-blue" onclick="window.showUserProfile('${friend.id}')" title="Profil">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                </button>
                <button class="modern-action-btn-small-blue" onclick="window.openChatModal('${friend.displayName || friend.username || friend.email}', '${friend.id}')" title="Message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// FONCTIONS UTILITAIRES - THEME BLEU
function getAvatarColorBlue(email) {
    const blueColors = [
        'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
        'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
        'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)'
    ];
    
    const hash = email.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    return blueColors[Math.abs(hash) % blueColors.length];
}

function getInitials(name) {
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').substring(0, 2);
}

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}j`;
}

function getLastSeenText(lastSeen) {
    if (!lastSeen) return 'Hors ligne';
    return getTimeAgo(lastSeen.toDate ? lastSeen.toDate() : lastSeen);
}

// FONCTIONS D'ACTION GLOBALES
window.sendFriendRequestUI = async function(targetUserId, targetName) {
    try {
        console.log(`🔄 Envoi demande vers ${targetUserId} (${targetName})`);
        
        await sendFriendRequest(targetUserId);
        console.log(`✅ Demande envoyée à ${targetName}`);
        
        // Nettoyer la recherche
        const searchResults = document.getElementById('search-results');
        const searchInput = document.getElementById('friend-search-input');
        if (searchResults) searchResults.style.display = 'none';
        if (searchInput) searchInput.value = '';
        
    } catch (error) {
        console.error('❌ Erreur envoi demande:', error.message);
        alert('Erreur: ' + error.message);
    }
};

window.respondToFriendRequestUI = async function(requestId, action) {
    try {
        console.log(`🔄 Réponse à la demande ${requestId}: ${action}`);
        
        await respondToFriendRequest(requestId, action);
        const message = action === 'accept' ? '✅ Ami ajouté !' : 'ℹ️ Demande refusée';
        console.log(message);
        
        // Recharger les données
        await loadTabData('requests');
        await loadTabData('friends');
        
    } catch (error) {
        console.error('❌ Erreur réponse demande:', error.message);
        alert('Erreur: ' + error.message);
    }
};

// CHARGEMENT DES DONNÉES
async function loadInitialData() {
    try {
        await loadTabData('requests');
        updateStatistics();
    } catch (error) {
        console.error('Erreur chargement initial:', error);
    }
}

async function loadTabData(tab) {
    try {
        switch (tab) {
            case 'requests':
                const requests = await getPendingFriendRequests();
                displayFriendRequests(requests);
                updateRequestsBadge(requests.length);
                break;
                
            case 'friends':
                const friends = await getUserFriends();
                displayFriendsList(friends);
                break;
                
            case 'global':
                displayGlobalPlaceholder();
                break;
        }
    } catch (error) {
        console.error(`Erreur chargement ${tab}:`, error);
    }
}

function displayGlobalPlaceholder() {
    const container = document.getElementById('global-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-state text-center py-12">
            <div class="loading-spinner-large mx-auto mb-4"></div>
            <p class="text-gray-600">Chargement du classement global...</p>
        </div>
    `;

    loadRealGlobalRanking();
}

async function loadRealGlobalRanking() {
    const container = document.getElementById('global-container');
    if (!container) return;

    try {
        console.log('🏆 Chargement du classement global depuis Firebase...');
        
        const { db } = await import('./firebase.js');
        const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js');

        const usersRef = collection(db, 'users');
        const topUsersQuery = query(
            usersRef, 
            orderBy('points', 'desc'), 
            limit(10)
        );

        const querySnapshot = await getDocs(topUsersQuery);
        
        if (querySnapshot.empty) {
            displayEmptyGlobalRanking();
            return;
        }

        const topUsers = [];
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            topUsers.push({
                id: doc.id,
                ...userData
            });
        });

        console.log(`📊 ${topUsers.length} utilisateurs chargés pour le classement global`);
        displayRealGlobalRanking(topUsers);

    } catch (error) {
        console.error('Erreur lors du chargement du classement global:', error);
        displayGlobalError(error);
    }
}

function displayRealGlobalRanking(users) {
    const container = document.getElementById('global-container');
    if (!container) return;

    container.innerHTML = `
        <div class="global-ranking-header mb-6">
            <h3 class="text-xl font-bold text-gray-800 mb-2">🏆 Classement Global CHECKICE</h3>
            <p class="text-gray-600">Top ${users.length} des explorateurs</p>
        </div>
        <div class="global-list">
            ${users.map((user, index) => `
                <div class="modern-user-card global-user-card">
                    <div class="global-rank ${index < 3 ? 'top-rank' : ''}">#${index + 1}</div>
                    <div class="user-avatar">
                        <div class="avatar-circle" style="background: ${getAvatarColorBlue(user.email)}">
                            ${getInitials(user.displayName || user.username || user.email)}
                        </div>
                        <div class="user-status ${user.isOnline ? 'online' : 'offline'}"></div>
                    </div>
                    <div class="user-info flex-1">
                        <div class="user-name">${user.displayName || user.username || user.email.split('@')[0]}</div>
                        <div class="user-meta">
                            <span class="user-level">Niveau ${user.level || 1}</span>
                            <span class="user-points-highlight">${user.points || 0} pts</span>
                        </div>
                    </div>
                    <div class="global-actions">
                        ${user.id !== auth.currentUser?.uid ? `
                            <button class="modern-action-btn-small-blue" onclick="window.sendFriendRequestUI('${user.id}', '${user.displayName || user.username || user.email}')" title="Ajouter ami">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </button>
                        ` : `
                            <span class="current-user-badge">C'est vous!</span>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function displayEmptyGlobalRanking() {
    const container = document.getElementById('global-container');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
            </div>
            <h3>🏆 Classement Global</h3>
            <p>Aucun utilisateur dans le classement pour le moment.</p>
        </div>
    `;
}

function displayGlobalError(error) {
    const container = document.getElementById('global-container');
    if (!container) return;

    container.innerHTML = `
        <div class="error-state text-center py-12">
            <div class="error-icon mb-4">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-red-500">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Erreur de chargement</h3>
            <p class="text-gray-600 mb-4">Impossible de charger le classement global.</p>
            <p class="text-sm text-gray-500">${error.message}</p>
            <button class="modern-action-btn-blue mt-4" onclick="loadRealGlobalRanking()">
                Réessayer
            </button>
        </div>
    `;
}

function updateRequestsBadge(count) {
    const badge = document.getElementById('requests-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function updateStatistics() {
    try {
        const [friends, requests] = await Promise.all([
            getUserFriends(),
            getPendingFriendRequests()
        ]);
        
        const friendsTotal = document.getElementById('friends-total');
        const requestsTotal = document.getElementById('requests-total');
        const onlineTotal = document.getElementById('online-total');
        
        if (friendsTotal) friendsTotal.textContent = friends.length;
        if (requestsTotal) requestsTotal.textContent = requests.length;
        if (onlineTotal) onlineTotal.textContent = friends.filter(f => f.isOnline).length;
        
    } catch (error) {
        console.error('Erreur statistiques:', error);
    }
}

function setupNotifications() {
    console.log('🔔 Notifications système social configurées');
}

// ✅ FONCTION CHAT CORRIGÉE
window.openChatModal = function(friendName, friendId) {
    console.log('💬 Tentative ouverture chat:', {friendName, friendId});
    
    if (!friendId || friendId === 'undefined' || friendId === '') {
        console.error('❌ FriendId invalide:', friendId);
        friendId = friendName ? friendName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now() : 'temp_' + Date.now();
        console.log('🔄 ID temporaire généré:', friendId);
    }
    
    if (window.friendsChat) {
        window.friendsChat.openFriendChat(friendId, friendName);
    } else {
        console.error('❌ Système de chat non initialisé');
        
        if (typeof showNotification === 'function') {
            showNotification('Le système de chat se charge...', 'info');
        } else {
            alert('Le système de chat se charge...');
        }
    }
};

console.log('👥 Interface sociale moderne chargée !');

// ========== MODAL PROFIL UTILISATEUR - VERSION FINALE AVEC PSEUDO CENTRÉ ==========

window.showUserProfile = async function(userId) {
    console.log('👤 Affichage profil:', userId);
    
    try {
        const { db } = await import('./firebase.js');
        const { doc, getDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js');
        
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
            if (typeof showNotification === 'function') {
                showNotification('Utilisateur introuvable', 'error');
            }
            return;
        }
        
        const userData = userDoc.data();
        
        // Calculer la date d'inscription
        const memberSince = userData.createdAt ? new Date(userData.createdAt.toDate ? userData.createdAt.toDate() : userData.createdAt) : null;
        const memberSinceText = memberSince ? memberSince.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Inconnu';
        
        // Points de l'utilisateur
        const userPoints = userData.points || 0;
        
        // Récupérer les patinoires préférées
        const favoriteRinks = userData.myRinks || [];
        let favoriteRinksHTML = '';
        
        if (favoriteRinks.length > 0) {
            // Charger toutes les patinoires depuis Firebase
            const rinksSnapshot = await getDocs(collection(db, 'rinks'));
            const rinksMap = {};
            rinksSnapshot.forEach(doc => {
                rinksMap[doc.id] = doc.data().name;
            });
            
            console.log('🔍 Debug patinoires:', {
                myRinks: favoriteRinks,
                rinksMap: rinksMap
            });
            
            // Vérifier si myRinks contient des IDs ou des noms
            const rinkNames = favoriteRinks.map(rink => {
                if (typeof rink === 'string' && !rinksMap[rink]) {
                    return rink;
                }
                return rinksMap[rink] || 'Patinoire inconnue';
            });
            
            favoriteRinksHTML = rinkNames.map(name => `
                <div style="padding: 6px 12px; margin: 4px 0; background: #eff6ff; border-radius: 6px; color: #1e40af; font-size: 13px; display: flex; align-items: center; border-left: 2px solid #3b82f6;">
                    <span style="margin-right: 6px;">⭐</span>
                    <span>${name}</span>
                </div>
            `).join('');
        } else {
            favoriteRinksHTML = `
                <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 13px;">
                    Aucune patinoire préférée
                </div>
            `;
        }
        
        const modal = document.createElement('div');
        modal.className = 'rink-details-modal';
        modal.id = 'user-profile-modal';
        
        const displayName = userData.displayName || userData.username || userData.email.split('@')[0];
        const initials = getInitials(displayName);
        const avatarColor = getAvatarColorBlue(userData.email);
        
        modal.innerHTML = `
            <div class="rink-details-content" style="max-width: 600px; position: relative;">
                <!-- Bouton fermer EN HAUT À DROITE -->
                <button class="rink-details-close" onclick="closeUserProfileModal()" style="position: absolute; top: 16px; right: 16px; z-index: 10;">×</button>
                
                <!-- Header avec layout 2 colonnes -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px; border-bottom: 1px solid #e5e7eb;">
                    <!-- Colonne gauche : Avatar, Nom CENTRÉ, Points, Date inscription -->
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <!-- Avatar -->
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: ${avatarColor}; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); margin-bottom: 16px;">
                            ${initials}
                        </div>
                        
                        <!-- Pseudo CENTRÉ -->
                        <h2 class="rink-details-title" style="margin: 0 0 16px 0; text-align: center;">${displayName}</h2>
                        
                        <!-- Badge Points doré stylé -->
                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 20px; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3); margin-bottom: 12px;">
                            <span style="font-size: 16px;">⭐</span>
                            <span style="color: white; font-weight: 600; font-size: 14px;">${userPoints} pts</span>
                        </div>
                        
                        <!-- Date d'inscription -->
                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; color: #6b7280; font-size: 12px;">
                            <span>📅</span>
                            <span>Membre depuis ${memberSinceText}</span>
                        </div>
                    </div>

                    
                    <!-- Colonne droite : Patinoires préférées avec scrollbar stylée -->
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">
                            <span style="font-size: 18px; margin-right: 8px;">⭐</span>
                            <span style="font-weight: 600; color: #1e40af; font-size: 15px;">Patinoires préférées</span>
                        </div>
                        <div style="max-height: 200px; overflow-y: auto; padding-right: 8px; scrollbar-width: thin; scrollbar-color: #3b82f6 #e5e7eb;">
                            ${favoriteRinksHTML}
                        </div>
                    </div>
                </div>
                
                <!-- Bio en bas avec plus d'espace -->
                ${userData.bio ? `
                    <div style="padding: 24px;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 18px; margin-right: 8px;">💭</span>
                            <span style="font-weight: 600; color: #374151;">Bio</span>
                        </div>
                        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border-left: 3px solid #3b82f6;">
                            <p style="color: #6b7280; font-size: 14px; font-style: italic; margin: 0; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">"${userData.bio}"</p>
                        </div>
                    </div>
                ` : `
                    <div style="padding: 24px;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 18px; margin-right: 8px;">💭</span>
                            <span style="font-weight: 600; color: #374151;">Bio</span>
                        </div>
                        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
                            <p style="color: #9ca3af; font-size: 13px; margin: 0;">Aucune bio</p>
                        </div>
                    </div>
                `}
                
                <!-- Actions -->
                <div class="rink-details-actions" style="padding: 0 24px 24px 24px;">
                    ${userId !== auth.currentUser?.uid ? `
                        <button class="rink-action-btn rink-action-primary" onclick="sendRealFriendRequest('${userId}', '${displayName.replace(/'/g, "\\'")}'); closeUserProfileModal();">
                            Ajouter en ami
                        </button>
                    ` : ''}
                    <button class="rink-action-btn rink-action-secondary" onclick="closeUserProfileModal()">
                        Fermer
                    </button>
                </div>
            </div>
            
            <style>
                /* Scrollbar stylée pour WebKit (Chrome, Safari) */
                #user-profile-modal div::-webkit-scrollbar {
                    width: 6px;
                }
                
                #user-profile-modal div::-webkit-scrollbar-track {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                
                #user-profile-modal div::-webkit-scrollbar-thumb {
                    background: #3b82f6;
                    border-radius: 10px;
                }
                
                #user-profile-modal div::-webkit-scrollbar-thumb:hover {
                    background: #2563eb;
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
    } catch (error) {
        console.error('❌ Erreur affichage profil:', error);
        if (typeof showNotification === 'function') {
            showNotification('Erreur lors du chargement du profil', 'error');
        }
    }
};

window.closeUserProfileModal = function() {
    const modal = document.getElementById('user-profile-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
};

async function sendRealFriendRequest(userId, userName) {
    try {
        const { sendFriendRequest } = await import('./friends-system.js');
        await sendFriendRequest(userId);
        
        if (typeof showNotification === 'function') {
            showNotification(`Demande envoyée à ${userName}`, 'success');
        }
        
        await loadTabData('requests');
    } catch (error) {
        console.error('❌ Erreur envoi demande:', error);
        if (typeof showNotification === 'function') {
            showNotification('Erreur lors de l\'envoi de la demande', 'error');
        }
    }
}
