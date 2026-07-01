// One-time migration: add the youtubeLinks field (empty array) to every
// SongDetails document that doesn't already have it as an array.
// Run with: node scripts/backfillYoutubeLinks.js   (from the frontend/ directory)
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const BATCH_LIMIT = 500;

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, 'SongDetails'));
  const missing = snapshot.docs.filter((d) => !Array.isArray(d.data().youtubeLinks));

  console.log(`${snapshot.size} total SongDetails documents, ${missing.length} missing youtubeLinks`);

  for (let i = 0; i < missing.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = missing.slice(i, i + BATCH_LIMIT);
    chunk.forEach((d) => batch.update(doc(db, 'SongDetails', d.id), { youtubeLinks: [] }));
    await batch.commit();
    console.log(`Updated ${Math.min(i + BATCH_LIMIT, missing.length)}/${missing.length}`);
  }

  console.log('Backfill complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
