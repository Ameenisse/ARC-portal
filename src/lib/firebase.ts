import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

export const DATABASE_ID = 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6';

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

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true
  }, DATABASE_ID);
} catch (e) {
  firestoreInstance = getFirestore(app, DATABASE_ID);
}

export const db = firestoreInstance;

