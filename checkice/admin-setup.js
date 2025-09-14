const admin = require('firebase-admin');

// Initialiser Firebase Admin avec la clé de service
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

// ✨ Fonction pour définir un utilisateur comme admin
async function setAdminClaim(email) {
  try {
    console.log(`🔍 Recherche de l'utilisateur: ${email}`);
    const user = await auth.getUserByEmail(email);
    
    // Ajouter le custom claim "admin"
    await auth.setCustomUserClaims(user.uid, {
      admin: true
    });
    
    console.log(`✅ ${email} est maintenant administrateur !`);
    console.log(`   UID: ${user.uid}`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ L'utilisateur ${email} n'existe pas dans Firebase Auth`);
      console.log(`   → Connectez-vous d'abord avec cet email sur votre app`);
    } else {
      console.error(`❌ Erreur pour ${email}:`, error.message);
    }
  }
}

// ✨ Fonction pour vérifier les claims d'un utilisateur
async function checkUserClaims(email) {
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`\n📋 Claims pour ${email}:`);
    console.log(`   Admin: ${user.customClaims?.admin || false}`);
    console.log(`   UID: ${user.uid}`);
  } catch (error) {
    console.error(`❌ Erreur pour ${email}:`, error.message);
  }
}

// 🚀 EXÉCUTION
async function main() {
  console.log('🔧 Configuration des administrateurs CHECKICE...\n');
  
  // ✨ Configurer admin@gmail.com comme administrateur
  await setAdminClaim('admin@gmail.com');
  
  // Vérifier les claims
  await checkUserClaims('admin@gmail.com');
  
  console.log('\n✅ Configuration terminée !');
  console.log('🔄 Rechargez votre app pour que les claims prennent effet.');
  
  process.exit();
}

main().catch(console.error);
