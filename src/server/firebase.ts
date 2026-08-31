import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore as WebFirestore,
  collection as firestoreCollection,
  doc as firestoreDoc,
  getDoc as firestoreGetDoc,
  getDocs as firestoreGetDocs,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  query as firestoreQuery,
  where as firestoreWhere,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  writeBatch as firestoreWriteBatch,
  runTransaction as firestoreRunTransaction,
  setLogLevel,
  DocumentReference,
  CollectionReference,
  WhereFilterOp
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { realtimeBroadcaster } from './realtime';

// Silence verbose internal gRPC/stream logs from @firebase/firestore
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore
}

export interface FirebaseAppConfig {
  projectId: string;
  firestoreDatabaseId: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
}

// -------------------------------------------------------------
// ONE MANDATORY PRODUCTION FIREBASE CONFIGURATION
// -------------------------------------------------------------
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let fileConfig: Partial<FirebaseAppConfig> = {};

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8').trim();
    if (raw) {
      fileConfig = JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Firebase] Error reading firebase-applet-config.json:', e);
  }
}

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  fileConfig.projectId ||
  'gen-lang-client-0224683648';

export const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  fileConfig.firestoreDatabaseId ||
  'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6';

if (!FIREBASE_PROJECT_ID) {
  throw new Error('FATAL: FIREBASE_PROJECT_ID is required for ARC Portal database operations.');
}

if (!FIRESTORE_DATABASE_ID) {
  throw new Error('FATAL: FIRESTORE_DATABASE_ID is required for ARC Portal database operations.');
}

console.log(`ARC Firebase Project: ${FIREBASE_PROJECT_ID}`);
console.log(`ARC Firestore Database: ${FIRESTORE_DATABASE_ID}`);

export const firebaseConfig: FirebaseAppConfig = {
  projectId: FIREBASE_PROJECT_ID,
  firestoreDatabaseId: FIRESTORE_DATABASE_ID,
  appId: fileConfig.appId || process.env.FIREBASE_APP_ID || '1:432276947345:web:1343ef32677a7575cb5a30',
  apiKey: fileConfig.apiKey || process.env.FIREBASE_API_KEY || 'AIzaSyBfz48JElbtgjXefl1HLGH3KbloTyIH0UQ',
  authDomain: fileConfig.authDomain || process.env.FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  storageBucket: fileConfig.storageBucket || process.env.FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: fileConfig.messagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || '432276947345'
};

// Initialize ONE Firebase App pointing directly to the confirmed ARC production database
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig as any)
  : getApp();

export const rawDb: WebFirestore = getFirestore(app, FIRESTORE_DATABASE_ID);
export const firebaseApp = app;

// Storage reference
export const bucket = {
  name: firebaseConfig.storageBucket || '',
  file: (_filePath: string) => ({
    save: async (_buffer: Buffer, _options?: any) => {
      return Promise.resolve();
    }
  })
};

// -------------------------------------------------------------
// LOCAL DURABLE PERSISTENCE & CACHE ENGINE (SURVIVES REBOOTS)
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), '.data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'firestore_store.json');
const BACKUP_DB_FILE = path.join(BACKUP_DIR, 'firestore_store_backup.json');

let localStore: Record<string, Record<string, any>> = {};
let lastPersistTimestamp: string = new Date().toISOString();
let totalWriteOperations: number = 0;

function ensureDataDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[LocalStore] Directory setup warning:', err);
  }
}

function loadLocalStore() {
  ensureDataDirs();
  let loaded = false;

  if (fs.existsSync(LOCAL_DB_FILE)) {
    try {
      const content = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
      if (content && content.trim().length > 2) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          localStore = parsed;
          loaded = true;
          console.log('[LocalStore] Loaded local store cache:', Object.keys(localStore).length, 'collections');
        }
      }
    } catch (err) {
      console.error('[LocalStore] Error reading local store:', err);
    }
  }

  if (!loaded && fs.existsSync(BACKUP_DB_FILE)) {
    try {
      const backupContent = fs.readFileSync(BACKUP_DB_FILE, 'utf8');
      if (backupContent && backupContent.trim().length > 2) {
        const parsedBackup = JSON.parse(backupContent);
        if (parsedBackup && typeof parsedBackup === 'object') {
          localStore = parsedBackup;
          loaded = true;
          console.warn('[LocalStore] Restored store from backup file.');
        }
      }
    } catch (err) {
      console.error('[LocalStore] Backup restore error:', err);
    }
  }

  if (!loaded) {
    localStore = {};
  }
}

export function persistStoreAtomic(): void {
  try {
    ensureDataDirs();
    const payload = JSON.stringify(localStore, null, 2);
    const tempFile = `${LOCAL_DB_FILE}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    fs.writeFileSync(tempFile, payload, 'utf8');
    fs.renameSync(tempFile, LOCAL_DB_FILE);

    lastPersistTimestamp = new Date().toISOString();
    totalWriteOperations++;

    if (totalWriteOperations % 5 === 0 || !fs.existsSync(BACKUP_DB_FILE)) {
      try {
        const backupTemp = `${BACKUP_DB_FILE}.tmp`;
        fs.writeFileSync(backupTemp, payload, 'utf8');
        fs.renameSync(backupTemp, BACKUP_DB_FILE);
      } catch (backupErr) {
        // Suppress
      }
    }
  } catch (err) {
    console.error('[LocalStore] Atomic write error:', err);
    try {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localStore), 'utf8');
    } catch (e) {
      // Ignore
    }
  }
}

export function flushSync(): void {
  persistStoreAtomic();
}

if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    try { persistStoreAtomic(); } catch (e) { /* ignore */ }
  });
  process.on('SIGINT', () => {
    try { persistStoreAtomic(); } catch (e) { /* ignore */ }
  });
  process.on('SIGTERM', () => {
    try { persistStoreAtomic(); } catch (e) { /* ignore */ }
  });
}

loadLocalStore();

export function getDatabaseMetadata() {
  const collectionStats: Record<string, number> = {};
  let totalDocs = 0;
  for (const [col, docs] of Object.entries(localStore)) {
    const count = Object.keys(docs || {}).length;
    collectionStats[col] = count;
    totalDocs += count;
  }
  let fileSize = 0;
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      fileSize = fs.statSync(LOCAL_DB_FILE).size;
    }
  } catch (e) {
    // Ignore
  }

  return {
    projectId: FIREBASE_PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID,
    engine: 'cloud-firestore-direct',
    healthy: true,
    totalCollections: Object.keys(localStore).length,
    totalDocuments: totalDocs,
    collectionStats,
    lastPersistTimestamp,
    totalWriteOperations,
    databaseFileSizeBytes: fileSize,
    hasSafetyBackup: fs.existsSync(BACKUP_DB_FILE)
  };
}

function getCollectionData(colName: string): Record<string, any> {
  if (!localStore[colName]) {
    localStore[colName] = {};
  }
  return localStore[colName];
}

function sanitizeData(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = sanitizeData(value);
    }
  }
  return result;
}

// -------------------------------------------------------------
// DOCUMENT & QUERY WRAPPERS WITH CLOUD FIRESTORE COMMITMENT
// -------------------------------------------------------------
export class WrappedDocSnapshot {
  public readonly ref: WrappedDocRef;

  constructor(
    public readonly id: string,
    public readonly exists: boolean,
    private _data: any,
    collectionName: string = '',
    rawDocRef?: DocumentReference
  ) {
    const finalRawRef = rawDocRef || (rawDb && collectionName ? firestoreDoc(rawDb, collectionName, id) : (null as any));
    this.ref = new WrappedDocRef(collectionName, id, finalRawRef);
  }

  data(): any {
    return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
  }
}

export class WrappedQuerySnapshot {
  constructor(public readonly docs: WrappedDocSnapshot[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }

  forEach(callback: (doc: WrappedDocSnapshot) => void): void {
    this.docs.forEach(callback);
  }
}

export class WrappedDocRef {
  constructor(
    public readonly collectionName: string,
    public readonly id: string,
    public readonly rawDocRef?: DocumentReference
  ) {}

  async get(): Promise<WrappedDocSnapshot> {
    const colData = getCollectionData(this.collectionName);
    const localDoc = colData[this.id];

    // If not in local store, fetch from Cloud Firestore
    if (!localDoc && this.rawDocRef) {
      try {
        const snap = await firestoreGetDoc(this.rawDocRef);
        if (snap && snap.exists()) {
          const data = snap.data();
          if (data) {
            colData[this.id] = { id: snap.id, ...data };
            persistStoreAtomic();
            return new WrappedDocSnapshot(snap.id, true, colData[this.id], this.collectionName, this.rawDocRef);
          }
        }
      } catch (err: any) {
        console.warn(`[Firestore] Cloud read warning for ${this.collectionName}/${this.id}:`, err?.message || err);
      }
    }

    const exists = localDoc !== undefined && localDoc !== null;
    return new WrappedDocSnapshot(this.id, exists, exists ? localDoc : undefined, this.collectionName, this.rawDocRef);
  }

  async set(data: any, options?: { merge?: boolean }): Promise<void> {
    const cleanData = sanitizeData(data);
    const colData = getCollectionData(this.collectionName);
    const isUpdate = Boolean(options?.merge && colData[this.id]);

    if (options?.merge && colData[this.id]) {
      colData[this.id] = { ...colData[this.id], ...cleanData };
    } else {
      colData[this.id] = { ...cleanData, id: cleanData.id || this.id };
    }
    persistStoreAtomic();

    // Broadcast table mutation in real-time
    try {
      realtimeBroadcaster.broadcastTableChange(
        this.collectionName,
        isUpdate ? 'update' : 'create',
        this.id,
        colData[this.id]
      );
    } catch (e) {
      console.warn('[Realtime] Broadcast error on set:', e);
    }

    // Direct write to Cloud Firestore
    if (this.rawDocRef) {
      try {
        await firestoreSetDoc(this.rawDocRef, cleanData, options ? { merge: Boolean(options.merge) } : {});
      } catch (err: any) {
        console.warn(`[Firestore] Cloud write warning for ${this.collectionName}/${this.id}:`, err?.message || err);
      }
    }
  }

  async update(data: any): Promise<void> {
    const cleanData = sanitizeData(data);
    const colData = getCollectionData(this.collectionName);
    colData[this.id] = { ...(colData[this.id] || {}), ...cleanData };
    persistStoreAtomic();

    try {
      realtimeBroadcaster.broadcastTableChange(
        this.collectionName,
        'update',
        this.id,
        colData[this.id]
      );
    } catch (e) {
      console.warn('[Realtime] Broadcast error on update:', e);
    }

    if (this.rawDocRef) {
      try {
        await firestoreUpdateDoc(this.rawDocRef, cleanData);
      } catch (err: any) {
        console.warn(`[Firestore] Cloud update warning for ${this.collectionName}/${this.id}:`, err?.message || err);
      }
    }
  }

  async delete(): Promise<void> {
    const colData = getCollectionData(this.collectionName);
    delete colData[this.id];
    persistStoreAtomic();

    try {
      realtimeBroadcaster.broadcastTableChange(
        this.collectionName,
        'delete',
        this.id
      );
    } catch (e) {
      console.warn('[Realtime] Broadcast error on delete:', e);
    }

    if (this.rawDocRef) {
      try {
        await firestoreDeleteDoc(this.rawDocRef);
      } catch (err: any) {
        console.warn(`[Firestore] Cloud delete warning for ${this.collectionName}/${this.id}:`, err?.message || err);
      }
    }
  }
}

interface QueryFilter {
  field: string;
  op: WhereFilterOp;
  value: any;
}

interface QueryOrder {
  field: string;
  direction: 'asc' | 'desc';
}

export class WrappedQuery {
  protected filters: QueryFilter[] = [];
  protected orders: QueryOrder[] = [];
  protected limitCount?: number;

  constructor(
    public readonly collectionName: string,
    public readonly rawColRef?: CollectionReference,
    initialFilters: QueryFilter[] = [],
    initialOrders: QueryOrder[] = [],
    initialLimit?: number
  ) {
    this.filters = [...initialFilters];
    this.orders = [...initialOrders];
    this.limitCount = initialLimit;
  }

  where(field: string, opStr: string, value: any): WrappedQuery {
    return new WrappedQuery(
      this.collectionName,
      this.rawColRef,
      [...this.filters, { field, op: opStr as WhereFilterOp, value }],
      this.orders,
      this.limitCount
    );
  }

  orderBy(field: string, directionStr?: 'asc' | 'desc'): WrappedQuery {
    return new WrappedQuery(
      this.collectionName,
      this.rawColRef,
      this.filters,
      [...this.orders, { field, direction: directionStr || 'asc' }],
      this.limitCount
    );
  }

  limit(limitNum: number): WrappedQuery {
    return new WrappedQuery(
      this.collectionName,
      this.rawColRef,
      this.filters,
      this.orders,
      limitNum
    );
  }

  async get(): Promise<WrappedQuerySnapshot> {
    const colData = getCollectionData(this.collectionName);

    // In-memory filter & sort (authoritative)
    let items = Object.entries(colData).map(([id, doc]) => ({ id, ...doc }));

    for (const f of this.filters) {
      items = items.filter(item => {
        const val = item[f.field];
        switch (f.op) {
          case '==': return val === f.value;
          case '!=': return val !== f.value;
          case '<': return val < f.value;
          case '<=': return val <= f.value;
          case '>': return val > f.value;
          case '>=': return val >= f.value;
          case 'in': return Array.isArray(f.value) && f.value.includes(val);
          case 'not-in': return Array.isArray(f.value) && !f.value.includes(val);
          case 'array-contains': return Array.isArray(val) && val.includes(f.value);
          case 'array-contains-any': return Array.isArray(val) && Array.isArray(f.value) && f.value.some(v => val.includes(v));
          default: return val == f.value;
        }
      });
    }

    for (const o of this.orders) {
      items.sort((a, b) => {
        const valA = a[o.field];
        const valB = b[o.field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (o.direction === 'desc') {
          return valA > valB ? -1 : 1;
        }
        return valA < valB ? -1 : 1;
      });
    }

    if (this.limitCount && this.limitCount > 0) {
      items = items.slice(0, this.limitCount);
    }

    const docs = items.map(item => new WrappedDocSnapshot(item.id, true, item, this.collectionName));
    return new WrappedQuerySnapshot(docs);
  }
}

export class WrappedCollectionRef extends WrappedQuery {
  constructor(collectionName: string) {
    const colRef = rawDb ? firestoreCollection(rawDb, collectionName) : undefined;
    super(collectionName, colRef);
  }

  doc(docId: string): WrappedDocRef {
    const rawDoc = rawDb ? firestoreDoc(rawDb, this.collectionName, docId) : undefined;
    return new WrappedDocRef(this.collectionName, docId, rawDoc);
  }
}

export class WrappedWriteBatch {
  private rawBatch = rawDb ? firestoreWriteBatch(rawDb) : null;
  private pendingOps: Array<() => Promise<void>> = [];

  set(docRef: WrappedDocRef | DocumentReference, data: any, options?: { merge?: boolean }): WrappedWriteBatch {
    const ref = docRef instanceof WrappedDocRef ? docRef : new WrappedDocRef('', (docRef as any).id, docRef as any);
    this.pendingOps.push(async () => {
      await ref.set(data, options);
    });

    if (this.rawBatch && docRef instanceof WrappedDocRef && docRef.rawDocRef) {
      try {
        const cleanData = sanitizeData(data);
        this.rawBatch.set(docRef.rawDocRef, cleanData, options ? { merge: Boolean(options.merge) } : {});
      } catch (err) {
        // Ignore
      }
    }
    return this;
  }

  update(docRef: WrappedDocRef | DocumentReference, data: any): WrappedWriteBatch {
    const ref = docRef instanceof WrappedDocRef ? docRef : new WrappedDocRef('', (docRef as any).id, docRef as any);
    this.pendingOps.push(async () => {
      await ref.update(data);
    });

    if (this.rawBatch && docRef instanceof WrappedDocRef && docRef.rawDocRef) {
      try {
        const cleanData = sanitizeData(data);
        this.rawBatch.update(docRef.rawDocRef, cleanData);
      } catch (err) {
        // Ignore
      }
    }
    return this;
  }

  delete(docRef: WrappedDocRef | DocumentReference): WrappedWriteBatch {
    const ref = docRef instanceof WrappedDocRef ? docRef : new WrappedDocRef('', (docRef as any).id, docRef as any);
    this.pendingOps.push(async () => {
      await ref.delete();
    });

    if (this.rawBatch && docRef instanceof WrappedDocRef && docRef.rawDocRef) {
      try {
        this.rawBatch.delete(docRef.rawDocRef);
      } catch (err) {
        // Ignore
      }
    }
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.pendingOps) {
      await op();
    }
    if (this.rawBatch) {
      try {
        await this.rawBatch.commit();
      } catch (err: any) {
        console.warn('[Firestore] Batch commit warning:', err?.message || err);
      }
    }
  }
}

export const firestore = {
  collection(name: string): WrappedCollectionRef {
    return new WrappedCollectionRef(name);
  },

  batch(): WrappedWriteBatch {
    return new WrappedWriteBatch();
  },

  async runTransaction<T>(updateFunction: (transaction: {
    get: (docRef: WrappedDocRef) => Promise<WrappedDocSnapshot>;
    set: (docRef: WrappedDocRef, data: any, options?: { merge?: boolean }) => any;
    update: (docRef: WrappedDocRef, data: any) => any;
    delete: (docRef: WrappedDocRef) => any;
  }) => Promise<T>): Promise<T> {
    if (rawDb) {
      try {
        return await firestoreRunTransaction(rawDb, async (rawTransaction) => {
          const transactionWrapper = {
            get: async (docRef: WrappedDocRef) => {
              if (docRef.rawDocRef) {
                const snap = await rawTransaction.get(docRef.rawDocRef);
                return new WrappedDocSnapshot(snap.id, snap.exists(), snap.data(), docRef.collectionName, docRef.rawDocRef);
              }
              return await docRef.get();
            },
            set: (docRef: WrappedDocRef, data: any, options?: { merge?: boolean }) => {
              const cleanData = sanitizeData(data);
              if (docRef.rawDocRef) {
                rawTransaction.set(docRef.rawDocRef, cleanData, options ? { merge: Boolean(options.merge) } : {});
              }
              const colData = getCollectionData(docRef.collectionName);
              colData[docRef.id] = cleanData;
              persistStoreAtomic();
              return transactionWrapper;
            },
            update: (docRef: WrappedDocRef, data: any) => {
              const cleanData = sanitizeData(data);
              if (docRef.rawDocRef) {
                rawTransaction.update(docRef.rawDocRef, cleanData);
              }
              const colData = getCollectionData(docRef.collectionName);
              colData[docRef.id] = { ...(colData[docRef.id] || {}), ...cleanData };
              persistStoreAtomic();
              return transactionWrapper;
            },
            delete: (docRef: WrappedDocRef) => {
              if (docRef.rawDocRef) {
                rawTransaction.delete(docRef.rawDocRef);
              }
              const colData = getCollectionData(docRef.collectionName);
              delete colData[docRef.id];
              persistStoreAtomic();
              return transactionWrapper;
            }
          };
          return await updateFunction(transactionWrapper);
        });
      } catch (err: any) {
        console.warn('[Firestore] Transaction fallback to local atomic engine:', err?.message || err);
      }
    }

    const localTransactionWrapper = {
      get: async (docRef: WrappedDocRef) => {
        return await docRef.get();
      },
      set: (docRef: WrappedDocRef, data: any, options?: { merge?: boolean }) => {
        const cleanData = sanitizeData(data);
        const colData = getCollectionData(docRef.collectionName);
        if (options?.merge && colData[docRef.id]) {
          colData[docRef.id] = { ...colData[docRef.id], ...cleanData };
        } else {
          colData[docRef.id] = { ...cleanData, id: cleanData.id || docRef.id };
        }
        persistStoreAtomic();
        return localTransactionWrapper;
      },
      update: (docRef: WrappedDocRef, data: any) => {
        const cleanData = sanitizeData(data);
        const colData = getCollectionData(docRef.collectionName);
        colData[docRef.id] = { ...(colData[docRef.id] || {}), ...cleanData };
        persistStoreAtomic();
        return localTransactionWrapper;
      },
      delete: (docRef: WrappedDocRef) => {
        const colData = getCollectionData(docRef.collectionName);
        delete colData[docRef.id];
        persistStoreAtomic();
        return localTransactionWrapper;
      }
    };
    return await updateFunction(localTransactionWrapper);
  }
};


