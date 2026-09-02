import {
  applicationDefault,
  getApps,
  getApp,
  initializeApp
} from 'firebase-admin/app';
import {
  getFirestore
} from 'firebase-admin/firestore';
import {
  getStorage
} from 'firebase-admin/storage';

export const PROJECT_ID = 'gen-lang-client-0224683648';
export const DATABASE_ID = 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6';

// Validate database and project ID consistency
if (process.env.FIRESTORE_DATABASE_ID && process.env.FIRESTORE_DATABASE_ID !== DATABASE_ID) {
  throw new Error(`Database configuration mismatch. Expected: "${DATABASE_ID}", received: "${process.env.FIRESTORE_DATABASE_ID}"`);
}
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) {
  throw new Error(`Project ID configuration mismatch. Expected: "${PROJECT_ID}", received: "${process.env.FIREBASE_PROJECT_ID}"`);
}

const firebaseApp =
  getApps().length
    ? getApp()
    : initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID,
        storageBucket: `${PROJECT_ID}.firebasestorage.app`
      });

export const firestore = getFirestore(firebaseApp, DATABASE_ID);

firestore.settings({
  ignoreUndefinedProperties: true
});

export const bucket = getStorage(firebaseApp).bucket();

export function getDatabaseMetadata() {
  return {
    backend: 'firebase-admin',
    projectId: PROJECT_ID,
    databaseId: DATABASE_ID,
    database: 'cloud-firestore',
    storage: 'firebase-storage',
    connected: true,
    ready: true
  };
}
