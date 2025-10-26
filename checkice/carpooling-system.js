// ========================================
// 🚗 CHECKICE CARPOOLING SYSTEM - BACKEND COMPLET
// Toutes les fonctions Firebase implémentées
// ========================================

import { db, auth } from './firebase.js';
import { 
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

// ✅ IMPORT DES NOTIFICATIONS (UNE SEULE FOIS)
import { createNotification } from './notification-system.js';

// ========================================
// CRÉATION DE TRAJET
// ========================================
// ... le reste de ton code continue normalement


// ========================================
// CRÉATION DE TRAJET
// ========================================

export async function createTrip(tripData) {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');

  const trip = {
    driverId: auth.currentUser.uid,
    driverName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
    driverAvatar: auth.currentUser.photoURL || null,
    departureRinkId: tripData.departureRinkId,
    departureRinkName: tripData.departureRinkName,
    arrivalRinkId: tripData.arrivalRinkId,
    arrivalRinkName: tripData.arrivalRinkName,
    departureDate: Timestamp.fromDate(new Date(tripData.departureDate)),
    departureTime: tripData.departureTime,
    seats: parseInt(tripData.seats),
    availableSeats: parseInt(tripData.seats),
    price: parseFloat(tripData.price) || 0,
    description: tripData.description || '',
    vehicleModel: tripData.vehicleModel || '',
    meetingPoint: tripData.meetingPoint || '',
    status: 'upcoming',
    passengers: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'carpooling_trips'), trip);
  console.log('✅ Trajet créé:', docRef.id);

  return docRef.id;
}

// ========================================
// RECHERCHER DES TRAJETS
// ========================================

export async function searchTrips(filters = {}) {
  console.log('🔍 Recherche trajets avec filtres:', filters);

  let q = query(
    collection(db, 'carpooling_trips'),
    where('status', '==', 'upcoming'),
    orderBy('departureDate', 'asc')
  );

  const snapshot = await getDocs(q);
  let trips = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const tripDate = data.departureDate.toDate();

    // Exclure les trajets passés
    if (tripDate >= new Date()) {
      trips.push({
        id: doc.id,
        ...data
      });
    }
  });

  // Filtrage côté client (Firestore a des limites sur les queries multiples)
  if (filters.departureRinkId) {
    trips = trips.filter(t => t.departureRinkId === filters.departureRinkId);
  }

  if (filters.arrivalRinkId) {
    trips = trips.filter(t => t.arrivalRinkId === filters.arrivalRinkId);
  }

  if (filters.date) {
    const filterDate = new Date(filters.date);
    trips = trips.filter(t => {
      const tripDate = t.departureDate.toDate();
      return tripDate.toDateString() === filterDate.toDateString();
    });
  }

  if (filters.minSeats) {
    trips = trips.filter(t => t.availableSeats >= filters.minSeats);
  }

  if (filters.maxPrice) {
    trips = trips.filter(t => t.price <= filters.maxPrice);
  }

  console.log(`📊 ${trips.length} trajets trouvés`);
  return trips;
}

// ========================================
// MES TRAJETS (CONDUCTEUR)
// ========================================

export async function getMyTrips() {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');

  const q = query(
    collection(db, 'carpooling_trips'),
    where('driverId', '==', auth.currentUser.uid),
    where('status', '!=', 'cancelled'), // ✅ EXCLURE LES TRAJETS ANNULÉS
    orderBy('departureDate', 'desc')
  );

  const snapshot = await getDocs(q);
  const trips = [];

  snapshot.forEach(doc => {
    trips.push({
      id: doc.id,
      ...doc.data()
    });
  });

  console.log(`🚗 ${trips.length} trajets créés`);
  return trips;
}

// ========================================
// MES RÉSERVATIONS (PASSAGER)
// ========================================

export async function getMyBookings() {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');

  const q = query(
    collection(db, 'carpooling_trips'),
    where('status', '==', 'upcoming'),
    orderBy('departureDate', 'asc')
  );

  const snapshot = await getDocs(q);
  const bookings = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    // Filtrer seulement les trajets où je suis passager
    const myBooking = data.passengers?.find(p => p.passengerId === auth.currentUser.uid);
    if (myBooking) {
      bookings.push({
        id: doc.id,
        ...data
      });
    }
  });

  console.log(`🎫 ${bookings.length} réservations`);
  return bookings;
}

// ========================================
// DEMANDER UNE RÉSERVATION - AVEC NOTIFICATIONS
// ========================================
export async function requestBooking(tripId, message = '') {
    if (!auth.currentUser) throw new Error('Vous devez être connecté');

    const tripRef = doc(db, 'carpooling_trips', tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
        throw new Error('Trajet introuvable');
    }

    const tripData = tripDoc.data();

    // Vérifications
    if (tripData.driverId === auth.currentUser.uid) {
        throw new Error('Vous ne pouvez pas réserver votre propre trajet');
    }

    if (tripData.availableSeats <= 0) {
        throw new Error('Plus de places disponibles');
    }

    const alreadyBooked = tripData.passengers?.some(p => p.passengerId === auth.currentUser.uid);
    if (alreadyBooked) {
        throw new Error('Vous avez déjà une demande pour ce trajet');
    }

    // Ajouter le passager avec statut "pending"
    const passenger = {
        passengerId: auth.currentUser.uid,
        passengerName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        passengerAvatar: auth.currentUser.photoURL || null,
        message: message,
        status: 'pending',
        requestedAt: new Date().toISOString()
    };

    await updateDoc(tripRef, {
        passengers: arrayUnion(passenger),
        updatedAt: serverTimestamp()
    });

    // ✅ NOUVEAU : Notifier le conducteur
    await createNotification(tripData.driverId, 'carpooling-request', {
        message: `${passenger.passengerName} demande une place pour ${tripData.departureRinkName} → ${tripData.arrivalRinkName}`,
        fromUserId: auth.currentUser.uid,
        fromUserName: passenger.passengerName,
        tripId: tripId,
        tripRoute: `${tripData.departureRinkName} → ${tripData.arrivalRinkName}`
    });

    console.log('✅ Demande de réservation envoyée + notification');
}

// ========================================
// RÉPONDRE À UNE DEMANDE (CONDUCTEUR) - AVEC NOTIFICATIONS
// ========================================
export async function respondToBooking(tripId, passengerId, action) {
    if (!auth.currentUser) throw new Error('Vous devez être connecté');

    const tripRef = doc(db, 'carpooling_trips', tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
        throw new Error('Trajet introuvable');
    }

    const tripData = tripDoc.data();

    // Vérifier que c'est bien le conducteur
    if (tripData.driverId !== auth.currentUser.uid) {
        throw new Error('Vous n\'êtes pas le conducteur de ce trajet');
    }

    // Trouver le passager
    const passengers = tripData.passengers || [];
    const passengerIndex = passengers.findIndex(p => p.passengerId === passengerId);

    if (passengerIndex === -1) {
        throw new Error('Passager introuvable');
    }

    const passenger = passengers[passengerIndex];

    if (action === 'accept') {
        // Vérifier les places disponibles
        if (tripData.availableSeats <= 0) {
            throw new Error('Plus de places disponibles');
        }

        // Mettre à jour le statut
        passengers[passengerIndex].status = 'confirmed';
        passengers[passengerIndex].confirmedAt = new Date().toISOString();

        // Décrémenter les places disponibles
        const newAvailableSeats = tripData.availableSeats - 1;

        await updateDoc(tripRef, {
            passengers: passengers,
            availableSeats: newAvailableSeats,
            status: newAvailableSeats === 0 ? 'full' : 'upcoming',
            updatedAt: serverTimestamp()
        });

        // ✅ NOUVEAU : Notifier le passager
        await createNotification(passengerId, 'carpooling-accepted', {
            message: `${tripData.driverName} a accepté votre demande pour ${tripData.departureRinkName} → ${tripData.arrivalRinkName}`,
            fromUserId: auth.currentUser.uid,
            fromUserName: tripData.driverName,
            tripId: tripId,
            tripRoute: `${tripData.departureRinkName} → ${tripData.arrivalRinkName}`
        });

        console.log('✅ Réservation acceptée + notification');

    } else if (action === 'reject') {
        // Retirer le passager de la liste
        passengers.splice(passengerIndex, 1);

        await updateDoc(tripRef, {
            passengers: passengers,
            updatedAt: serverTimestamp()
        });

        // ✅ NOUVEAU : Notifier le passager
        await createNotification(passengerId, 'carpooling-refused', {
            message: `${tripData.driverName} a refusé votre demande pour ${tripData.departureRinkName} → ${tripData.arrivalRinkName}`,
            fromUserId: auth.currentUser.uid,
            fromUserName: tripData.driverName,
            tripId: tripId,
            tripRoute: `${tripData.departureRinkName} → ${tripData.arrivalRinkName}`
        });

        console.log('✅ Réservation refusée + notification');
    }
}

// ========================================
// ANNULER UN TRAJET (CONDUCTEUR) - AVEC NOTIFICATIONS
// ========================================
export async function cancelTrip(tripId) {
    if (!auth.currentUser) throw new Error('Vous devez être connecté');

    const tripRef = doc(db, 'carpooling_trips', tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
        throw new Error('Trajet introuvable');
    }

    const tripData = tripDoc.data();

    // Vérifier que c'est bien le conducteur
    if (tripData.driverId !== auth.currentUser.uid) {
        throw new Error('Vous n\'êtes pas le conducteur de ce trajet');
    }

    // Marquer le trajet comme annulé
    await updateDoc(tripRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // ✅ NOUVEAU : Notifier tous les passagers confirmés
    const confirmedPassengers = tripData.passengers?.filter(p => p.status === 'confirmed') || [];
    
    for (const passenger of confirmedPassengers) {
        await createNotification(passenger.passengerId, 'carpooling-cancelled', {
            message: `Le trajet ${tripData.departureRinkName} → ${tripData.arrivalRinkName} a été annulé par le conducteur`,
            fromUserId: auth.currentUser.uid,
            fromUserName: tripData.driverName,
            tripId: tripId,
            tripRoute: `${tripData.departureRinkName} → ${tripData.arrivalRinkName}`
        });
    }

    console.log(`✅ Trajet annulé + ${confirmedPassengers.length} notifications envoyées`);
}

// ========================================
// ANNULER UNE RÉSERVATION (PASSAGER) - AVEC NOTIFICATIONS
// ========================================
export async function cancelBooking(tripId) {
    if (!auth.currentUser) throw new Error('Vous devez être connecté');

    const tripRef = doc(db, 'carpooling_trips', tripId);
    const tripDoc = await getDoc(tripRef);

    if (!tripDoc.exists()) {
        throw new Error('Trajet introuvable');
    }

    const tripData = tripDoc.data();

    // Trouver ma réservation
    const passengers = tripData.passengers || [];
    const myIndex = passengers.findIndex(p => p.passengerId === auth.currentUser.uid);

    if (myIndex === -1) {
        throw new Error('Vous n\'avez pas de réservation pour ce trajet');
    }

    const wasConfirmed = passengers[myIndex].status === 'confirmed';

    // Retirer de la liste
    passengers.splice(myIndex, 1);

    // Si la réservation était confirmée, libérer une place
    const updateData = {
        passengers: passengers,
        updatedAt: serverTimestamp()
    };

    if (wasConfirmed) {
        updateData.availableSeats = tripData.availableSeats + 1;
        updateData.status = 'upcoming'; // Remettre en "upcoming" si c'était "full"
    }

    await updateDoc(tripRef, updateData);

    // ✅ NOUVEAU : Notifier le conducteur si c'était confirmé
    if (wasConfirmed) {
        const passengerName = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
        await createNotification(tripData.driverId, 'carpooling-cancelled', {
            message: `${passengerName} a annulé sa réservation pour ${tripData.departureRinkName} → ${tripData.arrivalRinkName}`,
            fromUserId: auth.currentUser.uid,
            fromUserName: passengerName,
            tripId: tripId,
            tripRoute: `${tripData.departureRinkName} → ${tripData.arrivalRinkName}`
        });
    }

    console.log('✅ Réservation annulée' + (wasConfirmed ? ' + notification envoyée' : ''));
}


// ========================================
// OBTENIR UN TRAJET PAR ID
// ========================================

export async function getTripById(tripId) {
  const tripRef = doc(db, 'carpooling_trips', tripId);
  const tripDoc = await getDoc(tripRef);

  if (!tripDoc.exists()) {
    throw new Error('Trajet introuvable');
  }

  return {
    id: tripDoc.id,
    ...tripDoc.data()
  };
}

// ========================================
// NOTER UN TRAJET (système d'avis copié de map.js)
// ========================================

export async function rateTripDriver(tripId, rating, comment = '') {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');

  if (rating < 1 || rating > 5) {
    throw new Error('La note doit être entre 1 et 5');
  }

  // Vérifier que le trajet existe et que l'utilisateur était passager
  const tripRef = doc(db, 'carpooling_trips', tripId);
  const tripDoc = await getDoc(tripRef);

  if (!tripDoc.exists()) {
    throw new Error('Trajet introuvable');
  }

  const tripData = tripDoc.data();
  const wasPassenger = tripData.passengers?.some(p => 
    p.passengerId === auth.currentUser.uid && p.status === 'confirmed'
  );

  if (!wasPassenger) {
    throw new Error('Vous devez avoir été passager confirmé pour noter ce trajet');
  }

  // Vérifier si l'utilisateur a déjà noté ce trajet
  const existingRatingQuery = query(
    collection(db, 'carpooling_ratings'),
    where('tripId', '==', tripId),
    where('userId', '==', auth.currentUser.uid)
  );

  const existingSnapshot = await getDocs(existingRatingQuery);

  const ratingData = {
    tripId: tripId,
    driverId: tripData.driverId,
    driverName: tripData.driverName,
    userId: auth.currentUser.uid,
    userName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
    rating: rating,
    comment: comment,
    updatedAt: serverTimestamp()
  };

  if (!existingSnapshot.empty) {
    // Modifier l'avis existant
    const existingDoc = existingSnapshot.docs[0];
    await updateDoc(doc(db, 'carpooling_ratings', existingDoc.id), ratingData);
    console.log('✅ Avis modifié');
  } else {
    // Créer un nouvel avis
    ratingData.createdAt = serverTimestamp();
    await addDoc(collection(db, 'carpooling_ratings'), ratingData);
    console.log('✅ Avis publié');
  }
}

// ========================================
// OBTENIR LES AVIS D'UN CONDUCTEUR
// ========================================

export async function getDriverRatings(driverId) {
  const q = query(
    collection(db, 'carpooling_ratings'),
    where('driverId', '==', driverId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const ratings = [];
  let totalRating = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    ratings.push({
      id: doc.id,
      ...data
    });
    totalRating += data.rating;
  });

  const averageRating = ratings.length > 0 ? totalRating / ratings.length : null;

  return {
    ratings,
    averageRating,
    totalRatings: ratings.length
  };
}

// ========================================
// HISTORIQUE DES TRAJETS (CONDUCTEUR)
// ========================================
export async function getMyTripsHistory() {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');
  
  const q = query(
    collection(db, 'carpooling_trips'),
    where('driverId', '==', auth.currentUser.uid),
    orderBy('departureDate', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const trips = [];
  const now = new Date();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const tripDate = data.departureDate.toDate();
    
    // Inclure les trajets passés (date < maintenant) OU annulés
    if (tripDate < now || data.status === 'cancelled') {
      trips.push({
        id: doc.id,
        ...data,
        isPast: tripDate < now
      });
    }
  });
  
  console.log(`📜 ${trips.length} trajets dans l'historique`);
  return trips;
}

// ========================================
// HISTORIQUE DES RÉSERVATIONS (PASSAGER)
// ========================================
export async function getMyBookingsHistory() {
  if (!auth.currentUser) throw new Error('Vous devez être connecté');
  
  const q = query(
    collection(db, 'carpooling_trips'),
    orderBy('departureDate', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const bookings = [];
  const now = new Date();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const tripDate = data.departureDate.toDate();
    
    // Filtrer seulement les trajets où je suis passager
    const myBooking = data.passengers?.find(p => p.passengerId === auth.currentUser.uid);
    
    if (myBooking && (tripDate < now || data.status === 'cancelled')) {
      bookings.push({
        id: doc.id,
        ...data,
        myBookingStatus: myBooking.status,
        isPast: tripDate < now
      });
    }
  });
  
  console.log(`📜 ${bookings.length} réservations dans l'historique`);
  return bookings;
}


// ========================================
// EXPORT PAR DÉFAUT
// ========================================

export default {
  createTrip,
  searchTrips,
  getMyTrips,
  getMyBookings,
  getMyTripsHistory,      
  getMyBookingsHistory,
  requestBooking,
  respondToBooking,
  cancelTrip,
  cancelBooking,
  getTripById,
  rateTripDriver,
  getDriverRatings
};
