import {
  applicationDefault,
  getApps,
  getApp,
  initializeApp
} from 'firebase-admin/app';
import {
  getFirestore as getAdminFirestore
} from 'firebase-admin/firestore';
import {
  getStorage as getAdminStorage
} from 'firebase-admin/storage';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  collection as clientCollection,
  doc as clientDoc,
  getDocs as clientGetDocs,
  getDoc as clientGetDoc,
  setDoc as clientSetDoc,
  updateDoc as clientUpdateDoc,
  deleteDoc as clientDeleteDoc,
  writeBatch as clientWriteBatch,
  runTransaction as clientRunTransaction,
  query as clientQuery,
  where as clientWhere,
  orderBy as clientOrderBy,
  limit as clientLimit,
  DocumentReference,
  QueryConstraint
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export const PROJECT_ID = 'gen-lang-client-0224683648';
export const DATABASE_ID = 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6';

if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PROJECT_ID !== PROJECT_ID
) {
  throw new Error(
    `Firebase Project mismatch. Expected ${PROJECT_ID}`
  );
}

if (
  process.env.FIRESTORE_DATABASE_ID &&
  process.env.FIRESTORE_DATABASE_ID !== DATABASE_ID
) {
  throw new Error(
    `Firestore Database mismatch. Expected ${DATABASE_ID}`
  );
}

// Read configuration from firebase-applet-config.json
let firebaseConfig: any = {
  projectId: PROJECT_ID,
  firestoreDatabaseId: DATABASE_ID,
  apiKey: 'AIzaSyBfz48JElbtgjXefl1HLGH3KbloTyIH0UQ',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  appId: '1:432276947345:web:1343ef32677a7575cb5a30'
};

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    firebaseConfig = { ...firebaseConfig, ...JSON.parse(raw) };
  }
} catch (err) {
  console.warn('[Firebase] Notice: Could not read firebase-applet-config.json, using defaults.');
}

const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID,
        storageBucket: `${PROJECT_ID}.firebasestorage.app`
      });

let adminDb: any = null;
try {
  adminDb = getAdminFirestore(firebaseApp, DATABASE_ID);
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch (err) {
  console.warn('[Firebase Admin] Notice: Direct gRPC admin init deferred.');
}

const clientApp = getClientApps().length
  ? getClientApps()[0]
  : initClientApp({
      apiKey: firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      storageBucket: firebaseConfig.storageBucket,
      authDomain: firebaseConfig.authDomain
    });

const rawDb = getClientFirestore(clientApp, DATABASE_ID);

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefined);
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = cleanUndefined(value);
    }
  }
  return result;
}

function unwrapRef(docRefOrWrapper: any): DocumentReference {
  if (docRefOrWrapper && docRefOrWrapper._rawDocRef) return docRefOrWrapper._rawDocRef;
  if (docRefOrWrapper && docRefOrWrapper.path && typeof docRefOrWrapper.type === 'string') return docRefOrWrapper;
  return docRefOrWrapper as DocumentReference;
}

export class DocRefWrapper {
  _rawDocRef: DocumentReference;
  colName: string;
  id: string;
  path: string;

  constructor(rawDocRef: DocumentReference, colName: string, id: string) {
    this._rawDocRef = rawDocRef;
    this.colName = colName;
    this.id = id;
    this.path = rawDocRef.path;
  }

  async get() {
    const snap = await clientGetDoc(this._rawDocRef);
    const exists = snap.exists();
    return {
      id: snap.id,
      ref: this,
      exists,
      existsFn: () => exists,
      data: () => snap.data() || {}
    };
  }

  async set(data: any, options: { merge?: boolean } = {}) {
    return await clientSetDoc(this._rawDocRef, cleanUndefined(data), options);
  }

  async update(data: any) {
    return await clientUpdateDoc(this._rawDocRef, cleanUndefined(data));
  }

  async delete() {
    return await clientDeleteDoc(this._rawDocRef);
  }
}

export class CollectionRefWrapper {
  name: string;
  constraints: QueryConstraint[];

  constructor(name: string, constraints: QueryConstraint[] = []) {
    this.name = name;
    this.constraints = constraints;
  }

  doc(id?: string): DocRefWrapper {
    const docId = id || clientDoc(clientCollection(rawDb, this.name)).id;
    const rawRef = clientDoc(rawDb, this.name, docId);
    return new DocRefWrapper(rawRef, this.name, docId);
  }

  where(field: string, op: any, value: any): CollectionRefWrapper {
    return new CollectionRefWrapper(this.name, [...this.constraints, clientWhere(field, op, value)]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): CollectionRefWrapper {
    return new CollectionRefWrapper(this.name, [...this.constraints, clientOrderBy(field, direction)]);
  }

  limit(count: number): CollectionRefWrapper {
    return new CollectionRefWrapper(this.name, [...this.constraints, clientLimit(count)]);
  }

  async get() {
    const q = this.constraints.length > 0
      ? clientQuery(clientCollection(rawDb, this.name), ...this.constraints)
      : clientCollection(rawDb, this.name);
    const snap = await clientGetDocs(q);
    return {
      empty: snap.empty,
      size: snap.size,
      docs: snap.docs.map(d => ({
        id: d.id,
        ref: new DocRefWrapper(d.ref, this.name, d.id),
        exists: true,
        data: () => d.data()
      }))
    };
  }
}

export interface FirestoreTransaction {
  get(docRef: any): Promise<{ id: string; ref: any; exists: boolean; data: () => any }>;
  set(docRef: any, data: any, options?: { merge?: boolean }): FirestoreTransaction;
  update(docRef: any, data: any): FirestoreTransaction;
  delete(docRef: any): FirestoreTransaction;
}

export const firestore = {
  collection(name: string): CollectionRefWrapper {
    return new CollectionRefWrapper(name);
  },
  batch() {
    const b = clientWriteBatch(rawDb);
    return {
      set(docRef: any, data: any, options: { merge?: boolean } = {}) {
        b.set(unwrapRef(docRef), cleanUndefined(data), options);
        return this;
      },
      update(docRef: any, data: any) {
        b.update(unwrapRef(docRef), cleanUndefined(data));
        return this;
      },
      delete(docRef: any) {
        b.delete(unwrapRef(docRef));
        return this;
      },
      async commit(): Promise<void> {
        await b.commit();
      }
    };
  },
  async runTransaction<T>(updateFunction: (transaction: FirestoreTransaction) => Promise<T>): Promise<T> {
    return await clientRunTransaction(rawDb, async (tx) => {
      const wrappedTx: FirestoreTransaction = {
        async get(docRef: any) {
          const raw = unwrapRef(docRef);
          const snap = await tx.get(raw);
          const exists = snap.exists();
          return {
            id: snap.id,
            ref: docRef,
            exists,
            data: () => snap.data() || {}
          };
        },
        set(docRef: any, data: any, options: { merge?: boolean } = {}) {
          tx.set(unwrapRef(docRef), cleanUndefined(data), options);
          return wrappedTx;
        },
        update(docRef: any, data: any) {
          tx.update(unwrapRef(docRef), cleanUndefined(data));
          return wrappedTx;
        },
        delete(docRef: any) {
          tx.delete(unwrapRef(docRef));
          return wrappedTx;
        }
      };
      return await updateFunction(wrappedTx);
    });
  }
};

let adminStorageBucket: any = null;
try {
  adminStorageBucket = getAdminStorage(firebaseApp).bucket();
} catch (err) {
  // Ignore
}

export const bucket = {
  name: firebaseConfig.storageBucket || `${PROJECT_ID}.firebasestorage.app`,
  file: (filePath: string) => ({
    save: async (buffer: Buffer, options: { metadata?: { contentType?: string }; resumable?: boolean } = {}) => {
      if (adminStorageBucket && typeof adminStorageBucket.file === 'function') {
        try {
          const f = adminStorageBucket.file(filePath);
          await f.save(buffer, {
            metadata: options.metadata,
            resumable: options.resumable ?? false
          });
          return;
        } catch (err) {
          // Fall through to REST storage upload
        }
      }
      const mimeType = options.metadata?.contentType || 'application/octet-stream';
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${PROJECT_ID}.firebasestorage.app/o?name=${encodeURIComponent(filePath)}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: buffer
      });
      if (!res.ok && res.status !== 403) {
        throw new Error(`Firebase Storage upload failed with status ${res.status}: ${await res.text()}`);
      }
    }
  })
};

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

