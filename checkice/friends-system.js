// ✅ FRIENDS-SYSTEM.JS - Système de réseau social CHECKICE CORRIGÉ
import { db, auth } from './firebase.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  or
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

// 🔍 RECHERCHE D'UTILISATEURS CORRIGÉE - Fonctionne avec pseudos ET emails
export async function searchUsers(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  try {
    const searchLower = searchTerm.toLowerCase().trim();
    console.log(`🔍 Recherche: "${searchTerm}"`);
    
    // Stratégie différente : récupérer TOUS les utilisateurs publics 
    // et filtrer côté client (plus fiable que les index composites Firebase)
    const usersQuery = query(
      collection(db, 'users'),
      limit(50) // ✅ CORRIGÉ : Supprimer temporarily le filtre isPublic
    );
    
    const snapshot = await getDocs(usersQuery);
    console.log(`📊 ${snapshot.size} utilisateurs totaux trouvés dans Firebase`);
    
    const users = new Map();
    
    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      console.log(`👤 Utilisateur: ${userData.displayName || userData.username || userData.email} - Public: ${userData.isPublic} - ID: ${docSnap.id}`);
      
      // ✅ Exclure l'utilisateur actuel
      if (docSnap.id === auth.currentUser?.uid) {
        console.log(`⏩ Exclu utilisateur actuel: ${docSnap.id}`);
        return;
      }
      
      // ✅ Vérifier d'abord si l'utilisateur est public
      if (!userData.isPublic) {
        console.log(`🔒 Utilisateur privé ignoré: ${userData.displayName || userData.email}`);
        return;
      }
      
      // Filtrer côté client par pseudo OU email
      const username = (userData.username || '').toLowerCase();
      const email = (userData.email || '').toLowerCase();
      const displayName = (userData.displayName || '').toLowerCase();
      
      console.log(`🔍 Recherche dans: username="${username}" email="${email}" displayName="${displayName}"`);
      
      if (username.includes(searchLower) || 
          email.includes(searchLower) || 
          displayName.includes(searchLower)) {
        
        console.log(`✅ MATCH trouvé: ${userData.displayName || userData.username || userData.email}`);
        
        users.set(docSnap.id, { 
          id: docSnap.id, 
          userId: docSnap.id,
          ...userData 
        });
      } else {
        console.log(`❌ Pas de match pour: ${userData.displayName || userData.username || userData.email}`);
      }
    });
    
    const results = Array.from(users.values()).slice(0, 8);
    console.log(`📋 ${results.length} utilisateurs trouvés au final`);
    
    return results;
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    return [];
  }
}

// 📤 ENVOYER DEMANDE D'AMI - CORRIGÉE
export async function sendFriendRequest(targetUserId, message = '') {
    const currentUserId = auth.currentUser?.uid;
    
    if (!currentUserId) {
        throw new Error('Non connecté');
    }

    // ✅ PROTECTION : Empêcher de s'ajouter soi-même
    if (currentUserId === targetUserId) {
        throw new Error('Impossible de s\'ajouter soi-même');
    }

    try {
        console.log(`🔄 Envoi demande: ${currentUserId} → ${targetUserId}`);

        // 1. Vérifier amitié existante
        const friendshipExists = await checkFriendshipExists(currentUserId, targetUserId);
        if (friendshipExists) {
            throw new Error('Vous êtes déjà amis');
        }

        // 2. Vérifier demandes dans BOTH directions
        const outgoingQuery = query(
            collection(db, 'friendRequests'), 
            where('from', '==', currentUserId), 
            where('to', '==', targetUserId), 
            where('status', '==', 'pending')
        );

        const incomingQuery = query(
            collection(db, 'friendRequests'), 
            where('from', '==', targetUserId), 
            where('to', '==', currentUserId), 
            where('status', '==', 'pending')
        );

        const [outgoingSnapshot, incomingSnapshot] = await Promise.all([
            getDocs(outgoingQuery),
            getDocs(incomingQuery)
        ]);

        if (!outgoingSnapshot.empty) {
            throw new Error('Demande déjà envoyée');
        }

        if (!incomingSnapshot.empty) {
            throw new Error('Cette personne vous a déjà envoyé une demande ! Vérifiez vos demandes reçues.');
        }

        // 3. Créer la demande
        const requestData = {
            from: currentUserId,
            to: targetUserId,
            status: 'pending',
            message: message || '',
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'friendRequests'), requestData);
        console.log(`✅ Demande créée avec ID: ${docRef.id}`);

        // 4. Créer notification pour le destinataire
        try {
            await createNotification(targetUserId, 'friend-request', {
                from: currentUserId,
                message: 'Nouvelle demande d\'ami',
                requestId: docRef.id
            });
            console.log(`✅ Notification envoyée à ${targetUserId}`);
        } catch (notifError) {
            console.warn('⚠️ Erreur notification (non bloquante):', notifError);
        }

        return { success: true, requestId: docRef.id };

    } catch (error) {
        console.error('❌ Erreur demande:', error);
        throw error;
    }
}

// ✅❌ RÉPONDRE À UNE DEMANDE
export async function respondToFriendRequest(requestId, action) {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Demande introuvable');
    }
    
    const requestData = requestSnap.data();
    const batch = writeBatch(db);
    
    if (action === 'accept') {
      // Créer l'amitié
      const friendshipRef = doc(collection(db, 'friendships'));
      batch.set(friendshipRef, {
        user1: requestData.from,
        user2: requestData.to,
        createdAt: serverTimestamp(),
        lastInteraction: serverTimestamp()
      });
      
      // Marquer comme acceptée
      batch.update(requestRef, {
        status: 'accepted',
        respondedAt: serverTimestamp()
      });
      
      // Notification d'acceptation
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: requestData.from,
        type: 'friend_accepted',
        data: { from: requestData.to },
        message: 'Demande d\'ami acceptée',
        read: false,
        createdAt: serverTimestamp()
      });
      
    } else {
      // Marquer comme refusée
      batch.update(requestRef, {
        status: 'declined',
        respondedAt: serverTimestamp()
      });
    }
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur réponse:', error);
    throw error;
  }
}

// 👥 RÉCUPÉRER LES AMIS AVEC CLASSEMENT
export async function getUserFriends(userId = auth.currentUser?.uid) {
  if (!userId) return [];
  
  try {
    // Récupérer les amitiés
    const query1 = query(
      collection(db, 'friendships'),
      where('user1', '==', userId)
    );
    
    const query2 = query(
      collection(db, 'friendships'),
      where('user2', '==', userId)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(query1),
      getDocs(query2)
    ]);
    
    const friendIds = [];
    
    snapshot1.forEach(doc => {
      friendIds.push(doc.data().user2);
    });
    
    snapshot2.forEach(doc => {
      friendIds.push(doc.data().user1);
    });
    
    // Récupérer les profils des amis
    const friendsData = [];
    
    for (const friendId of friendIds) {
      const friendDoc = await getDoc(doc(db, 'users', friendId));
      if (friendDoc.exists()) {
        const data = friendDoc.data();
        friendsData.push({ 
          id: friendId, 
          ...data,
          // Statut en ligne (basé sur lastSeen)
          isOnline: isUserOnline(data.lastSeen)
        });
      }
    }
    
    // 🏆 Trier par statut en ligne puis alphabétique
        return friendsData.sort((a, b) => {
            // 1. En ligne d'abord
            const aOnline = a.isOnline ? 1 : 0;
            const bOnline = b.isOnline ? 1 : 0;
            if (aOnline !== bOnline) {
                return bOnline - aOnline;
            }
            // 2. Puis alphabétique
            return (a.username || '').localeCompare(b.username || '');
        });
    
  } catch (error) {
    console.error('❌ Erreur récupération amis:', error);
    return [];
  }
}

// 📥 RÉCUPÉRER DEMANDES REÇUES
export async function getPendingFriendRequests() {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return [];
  
  try {
    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('to', '==', currentUserId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(requestsQuery);
    const requests = [];
    
    for (const requestDoc of snapshot.docs) {
      const requestData = requestDoc.data();
      
      // Récupérer les infos de l'expéditeur
      const senderDoc = await getDoc(doc(db, 'users', requestData.from));
      if (senderDoc.exists()) {
        requests.push({
          id: requestDoc.id,
          ...requestData,
          sender: { id: requestData.from, ...senderDoc.data() }
        });
      }
    }
    
    return requests;
  } catch (error) {
    console.error('❌ Erreur demandes:', error);
    return [];
  }
}

// 👤 RÉCUPÉRER PROFIL PUBLIC
export async function getPublicProfile(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('Utilisateur introuvable');
    }
    
    const userData = userDoc.data();
    if (!userData.isPublic) {
      throw new Error('Profil privé');
    }
    
    // Récupérer statistiques étendues
    const stats = await getUserStats(userId);
    
    return {
      id: userId,
      ...userData,
      stats
    };
  } catch (error) {
    console.error('❌ Erreur profil:', error);
    throw error;
  }
}

// 📊 STATISTIQUES UTILISATEUR
async function getUserStats(userId) {
  try {
    // Récupérer les patinoires visitées
    const visitedRinksQuery = query(
      collection(db, 'userRinks'),
      where('userId', '==', userId),
      where('visited', '==', true)
    );
    const visitedRinks = await getDocs(visitedRinksQuery);
    
    // Récupérer événements participés
    const eventsParticipatedQuery = query(
      collection(db, 'eventParticipants'),
      where('userId', '==', userId),
      where('status', '==', 'participated')
    );
    const eventsParticipated = await getDocs(eventsParticipatedQuery);
    
    // Récupérer événements inscrits
    const eventsRegisteredQuery = query(
      collection(db, 'eventParticipants'),
      where('userId', '==', userId),
      where('status', '==', 'registered')
    );
    const eventsRegistered = await getDocs(eventsRegisteredQuery);
    
    // Récupérer déplacements à venir
    const upcomingTripsQuery = query(
      collection(db, 'userTrips'),
      where('userId', '==', userId),
      where('date', '>', new Date()),
      orderBy('date', 'asc')
    );
    const upcomingTrips = await getDocs(upcomingTripsQuery);
    
    return {
      patinoires: visitedRinks.size,
      evenementsParticipes: eventsParticipated.size,
      evenementsInscrits: eventsRegistered.size,
      deplacementsAVenir: upcomingTrips.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    return {
      patinoires: 0,
      evenementsParticipes: 0,
      evenementsInscrits: 0,
      deplacementsAVenir: []
    };
  }
}

// 🔔 SYSTÈME DE NOTIFICATIONS
export async function getUserNotifications(userId = auth.currentUser?.uid) {
  if (!userId) return [];
  
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    const notifications = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Enrichir avec les données utilisateur si nécessaire
      if (data.data?.from) {
        const fromUserDoc = await getDoc(doc(db, 'users', data.data.from));
        if (fromUserDoc.exists()) {
          data.fromUser = fromUserDoc.data();
        }
      }
      
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    }
    
    return notifications;
  } catch (error) {
    console.error('❌ Erreur notifications:', error);
    return [];
  }
}

// ✉️ CRÉER NOTIFICATION - CORRIGÉE ET SIMPLIFIÉE
async function createNotification(userId, type, data) {
  try {
    console.log(`📤 Création notification: ${userId} | ${type}`);
    
    const notificationData = {
      userId,
      type,
      data,
      message: getNotificationMessage(type, data),
      read: false,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    console.log(`✅ Notification créée: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    throw error;
  }
}

// 📝 MESSAGE DE NOTIFICATION
function getNotificationMessage(type, data) {
  switch (type) {
    case 'friend-request':
    case 'friend_request':
      return 'Nouvelle demande d\'ami';
    case 'friend-accepted':
    case 'friend_accepted':
      return 'Demande d\'ami acceptée';
    case 'friend-rejected':
    case 'friend_rejected':
      return 'Demande d\'ami refusée';
    default:
      return 'Nouvelle notification';
  }
}

// 🟢 VÉRIFIER SI UTILISATEUR EN LIGNE
function isUserOnline(lastSeen) {
  if (!lastSeen) return false;
  
  const now = new Date();
  const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
  const diffMinutes = (now - lastSeenDate) / (1000 * 60);
  
  return diffMinutes < 5; // Considéré en ligne si vu dans les 5 dernières minutes
}

// 🔍 VÉRIFIER AMITIÉ EXISTANTE
async function checkFriendshipExists(userId1, userId2) {
  const query1 = query(
    collection(db, 'friendships'),
    where('user1', '==', userId1),
    where('user2', '==', userId2)
  );
  
  const query2 = query(
    collection(db, 'friendships'),
    where('user1', '==', userId2),
    where('user2', '==', userId1)
  );
  
  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(query1),
    getDocs(query2)
  ]);
  
  return !snapshot1.empty || !snapshot2.empty;
}

// 📍 METTRE À JOUR STATUT EN LIGNE
export async function updateUserPresence() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  
  try {
    await updateDoc(doc(db, 'users', userId), {
      lastSeen: serverTimestamp(),
      isOnline: true
    });
  } catch (error) {
    console.error('❌ Erreur présence:', error);
  }
}

// 🏃‍♂️ METTRE À JOUR STATUT HORS LIGNE
export async function setUserOffline() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  
  try {
    await updateDoc(doc(db, 'users', userId), {
      lastSeen: serverTimestamp(),
      isOnline: false
    });
  } catch (error) {
    console.error('❌ Erreur offline:', error);
  }
}

// 🚀 EXPOSER TOUTES LES FONCTIONS
console.log('✅ Friends-system.js chargé - Toutes corrections appliquées');
