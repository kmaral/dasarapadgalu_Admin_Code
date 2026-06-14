import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCiZWVGhHnlwcNZMYET3JQDnR3PB8LD65s",
  authDomain: "haribhajane-eb8b5.firebaseapp.com",
  projectId: "haribhajane-eb8b5",
  storageBucket: "haribhajane-eb8b5.appspot.com",
  messagingSenderId: "451016284083",
  appId: "1:451016284083:web:f713529e16e38160"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
