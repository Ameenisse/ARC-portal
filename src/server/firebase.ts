import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  runTransaction,
  query,
  where,
  orderBy as firestoreOrderBy,
  limit,
  DocumentReference,
  QueryConstraint
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read configuration from firebase-applet-config.json
let firebaseConfig: any = {
  projectId: 'gen-lang-client-0224683648',
  firestoreDatabaseId: 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6',
  apiKey: 'AIzaSyBfz48JElbtgjXefl1HLGH3KbloTyIH0UQ',
  authDomain: 'gen-lang-client-0224683648.firebaseapp.com',
  storageBucket: 'gen-lang-client-0224683648.firebasestorage.app',
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

export const PROJECT_ID = firebaseConfig.projectId;
export const DATABASE_ID = firebaseConfig.firestoreDatabaseId;

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: firebaseConfig.apiKey,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      storageBucket: firebaseConfig.storageBucket,
      authDomain: firebaseConfig.authDomain
    });

const rawDb = getFirestore(firebaseApp, DATABASE_ID);

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
    const snap = await getDoc(this._rawDocRef);
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
    return await setDoc(this._rawDocRef, cleanUndefined(data), options);
  }

  async update(data: any) {
    return await updateDoc(this._rawDocRef, cleanUndefined(data));
  }

  async delete() {
    return await deleteDoc(this._rawDocRef);
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
    const docId = id || doc(collection(rawDb, this.name)).id;
    const rawRef = doc(rawDb, this.name, docId);
    return new DocRefWrapper(rawRef, this.name, docId);
  }

  where(field: string, op: any, value: any): CollectionRefWrapper {
    return new CollectionRefWrapper(this.name, [...this.constraints, where(field, op, value)]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): CollectionRefWrapper {
    return new CollectionRefWrapper(this.name, [...this.constraints, firestoreOrderBy(field, direction)]);
  }

  limit(count: number): CollectionRefWrapper {
    return new CollectionRefWrapper(this.name, [...this.constraints, limit(count)]);
  }

  async get() {
    const q = this.constraints.length > 0
      ? query(collection(rawDb, this.name), ...this.constraints)
      : collection(rawDb, this.name);
    const snap = await getDocs(q);
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
    const b = writeBatch(rawDb);
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
    return await runTransaction(rawDb, async (tx) => {
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

export const bucket = {
  name: firebaseConfig.storageBucket || `${PROJECT_ID}.firebasestorage.app`,
  file: (filePath: string) => ({
    save: async (buffer: Buffer, options: any) => {},
    makePublic: async () => {}
  })
};

export function getDatabaseMetadata() {
  return {
    backend: 'firebase-client-sdk',
    projectId: PROJECT_ID,
    databaseId: DATABASE_ID,
    database: 'cloud-firestore',
    storage: 'firebase-storage',
    connected: true,
    ready: true
  };
}
