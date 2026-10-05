import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export const DATABASE_ID = appletConfig.firestoreDatabaseId || 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6';

const metaEnv = (import.meta as any).env || {};

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyDDJRMCXqPA2owwP_ZXjG2jv_0pxK2Ov8g",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "arcportal-4b41c.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "arcportal-4b41c",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "arcportal-4b41c.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "638415675797",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:638415675797:web:c542f0bc11a559f529169c",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || "G-D89EPB2467"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Analytics safely in browser environments
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        // Ignore analytics initialization errors in restricted environments
      }
    }
  }).catch(() => {});
}

// Initialize secondary app for the provisioned AI Studio Firestore database if projectId differs
const dbApp = firebaseConfig.projectId === appletConfig.projectId
  ? app
  : (getApps().find(a => a.name === 'arc-firestore') || initializeApp(appletConfig, 'arc-firestore'));

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(dbApp, {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true
  }, DATABASE_ID);
} catch (e) {
  firestoreInstance = getFirestore(dbApp, DATABASE_ID);
}

export const db = firestoreInstance;

