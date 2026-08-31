import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBfz48JElbtgjXefl1HLGH3KbloTyIH0UQ",
  authDomain: "gen-lang-client-0224683648.firebaseapp.com",
  projectId: "gen-lang-client-0224683648",
  storageBucket: "gen-lang-client-0224683648.firebasestorage.app",
  messagingSenderId: "432276947345",
  appId: "1:432276947345:web:054daf5eb9872f55cb5a30"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
