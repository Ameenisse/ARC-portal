import admin from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp } from 'firebase/app';
import {
  initializeFirestore as initializeClientFirestore,
  collection as clientCollection,
  doc as clientDoc,
  getDoc as clientGetDoc,
  getDocs as clientGetDocs,
  setDoc as clientSetDoc,
  deleteDoc as clientDeleteDoc,
  writeBatch as clientWriteBatch
} from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  getSupabaseClient,
  loadSupabaseConfig,
  SUPABASE_TABLE,
  SUPABASE_BUCKET,
  DEFAULT_SUPABASE_URL
} from './supabase.ts';

dotenv.config();

export const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0224683648';
export const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6';
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.firebasestorage.app`;

// Read configuration from firebase-applet-config.json
let firebaseConfig: any = {
  projectId: PROJECT_ID,
  firestoreDatabaseId: DATABASE_ID,
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${PROJECT_ID}.firebaseapp.com`,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || ''
};

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    firebaseConfig = { ...firebaseConfig, ...fileConfig };
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

// Initialize Firebase Client SDK as fallback when Supabase key is not yet configured
const clientApp = initializeClientApp(firebaseConfig, 'server-client-fallback');
const clientDb = initializeClientFirestore(
  clientApp,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId || DATABASE_ID
);

// Initialize Firebase Admin SDK for Storage fallback
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId || PROJECT_ID,
        storageBucket: firebaseConfig.storageBucket || STORAGE_BUCKET
      });
    } else {
      admin.initializeApp({
        projectId: firebaseConfig.projectId || PROJECT_ID,
        storageBucket: firebaseConfig.storageBucket || STORAGE_BUCKET
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export const adminFirestore = getAdminFirestore(admin.app(), DATABASE_ID);
export const adminStorageBucket = admin.storage().bucket(firebaseConfig.storageBucket || STORAGE_BUCKET);
export const adminAuth = admin.auth();

// Helper to strip undefined values recursively
function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const res: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      res[k] = stripUndefined(v);
    }
  }
  return res;
}

let supabaseReadyState: {
  connected: boolean;
  schemaReady: boolean;
  lastCheckedAt: number;
  lastError?: string;
} = {
  connected: false,
  schemaReady: false,
  lastCheckedAt: 0
};

export function getActiveBackendInfo() {
  const cfg = loadSupabaseConfig();
  const hasKey = Boolean(cfg.key && cfg.key.trim().length > 10);
  return {
    provider: 'supabase',
    supabaseUrl: cfg.url || DEFAULT_SUPABASE_URL,
    hasSupabaseKey: hasKey,
    supabaseConnected: supabaseReadyState.connected,
    supabaseSchemaReady: supabaseReadyState.schemaReady,
    lastError: supabaseReadyState.lastError,
    activeEngine: hasKey && supabaseReadyState.schemaReady ? 'supabase-postgres' : 'fallback-firestore'
  };
}

export async function verifySupabaseConnection(): Promise<{
  connected: boolean;
  schemaReady: boolean;
  error?: string;
  url: string;
  hasKey: boolean;
}> {
  const cfg = loadSupabaseConfig();
  const url = cfg.url || DEFAULT_SUPABASE_URL;
  const hasKey = Boolean(cfg.key && cfg.key.trim().length > 10);

  if (!hasKey) {
    supabaseReadyState = {
      connected: false,
      schemaReady: false,
      lastCheckedAt: Date.now(),
      lastError: 'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY. Add it in Settings -> Database or .env.'
    };
    return {
      connected: false,
      schemaReady: false,
      error: supabaseReadyState.lastError,
      url,
      hasKey: false
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      connected: false,
      schemaReady: false,
      error: 'Supabase client could not be initialized.',
      url,
      hasKey
    };
  }

  try {
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        (error.message && error.message.toLowerCase().includes('does not exist')) ||
        (error.message && error.message.toLowerCase().includes('schema cache'));

      supabaseReadyState = {
        connected: !error.message?.toLowerCase().includes('invalid api key') && !error.message?.toLowerCase().includes('jwt'),
        schemaReady: false,
        lastCheckedAt: Date.now(),
        lastError: isMissingTable
          ? `Connected to ${url}, but table "${SUPABASE_TABLE}" is not created yet. Run the provided SQL script in Supabase SQL Editor.`
          : `Supabase Error (${error.code || 'ERR'}): ${error.message}`
      };

      return {
        connected: supabaseReadyState.connected,
        schemaReady: false,
        error: supabaseReadyState.lastError,
        url,
        hasKey
      };
    }

    supabaseReadyState = {
      connected: true,
      schemaReady: true,
      lastCheckedAt: Date.now(),
      lastError: undefined
    };

    return {
      connected: true,
      schemaReady: true,
      url,
      hasKey
    };
  } catch (err: any) {
    supabaseReadyState = {
      connected: false,
      schemaReady: false,
      lastCheckedAt: Date.now(),
      lastError: err.message || 'Network error connecting to Supabase'
    };
    return {
      connected: false,
      schemaReady: false,
      error: supabaseReadyState.lastError,
      url,
      hasKey
    };
  }
}

export function getDatabaseMetadata() {
  const info = getActiveBackendInfo();
  return {
    backend: info.activeEngine === 'supabase-postgres' ? 'supabase-js' : 'supabase-js (awaiting key/schema)',
    database: 'supabase-postgresql',
    projectId: info.supabaseUrl,
    databaseId: SUPABASE_TABLE,
    storageBucket: SUPABASE_BUCKET,
    supabaseUrl: info.supabaseUrl,
    hasSupabaseKey: info.hasSupabaseKey,
    supabaseConnected: info.supabaseConnected,
    supabaseSchemaReady: info.supabaseSchemaReady,
    activeEngine: info.activeEngine,
    lastError: info.lastError
  };
}

class DocRefWrapper {
  constructor(public collectionName: string, public id: string) {}

  private get clientRef() {
    return clientDoc(clientDb, this.collectionName, this.id);
  }

  async get() {
    const supabase = getSupabaseClient();
    if (supabase && supabaseReadyState.schemaReady) {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('id, data')
        .eq('collection', this.collectionName)
        .eq('id', this.id)
        .maybeSingle();

      if (!error) {
        supabaseReadyState.connected = true;
        supabaseReadyState.schemaReady = true;
        return {
          exists: Boolean(data),
          id: this.id,
          data: () => (data ? (data.data as any) : undefined)
        };
      }
      supabaseReadyState.lastError = error.message;
    }

    const snap = await clientGetDoc(this.clientRef);
    return {
      exists: snap.exists(),
      id: snap.id,
      data: () => snap.data()
    };
  }

  async set(data: any, options?: { merge?: boolean }) {
    const cleaned = stripUndefined(data);
    const supabase = getSupabaseClient();
    if (supabase && supabaseReadyState.schemaReady) {
      let payload = cleaned;
      if (options?.merge) {
        const existing = await this.get();
        if (existing.exists) {
          payload = { ...(existing.data() || {}), ...cleaned };
        }
      }
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert(
          {
            collection: this.collectionName,
            id: this.id,
            data: payload,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'collection,id' }
        );

      if (!error) {
        supabaseReadyState.connected = true;
        supabaseReadyState.schemaReady = true;
        return;
      }
      supabaseReadyState.lastError = error.message;
    }

    if (options) {
      await clientSetDoc(this.clientRef, cleaned, options);
    } else {
      await clientSetDoc(this.clientRef, cleaned);
    }
  }

  async update(data: any) {
    const cleaned = stripUndefined(data);
    const supabase = getSupabaseClient();
    if (supabase && supabaseReadyState.schemaReady) {
      const existing = await this.get();
      const merged = { ...(existing.exists ? existing.data() : {}), ...cleaned };
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert(
          {
            collection: this.collectionName,
            id: this.id,
            data: merged,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'collection,id' }
        );

      if (!error) {
        supabaseReadyState.connected = true;
        supabaseReadyState.schemaReady = true;
        return;
      }
      supabaseReadyState.lastError = error.message;
    }

    await clientSetDoc(this.clientRef, cleaned, { merge: true });
  }

  async delete() {
    const supabase = getSupabaseClient();
    if (supabase && supabaseReadyState.schemaReady) {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .delete()
        .eq('collection', this.collectionName)
        .eq('id', this.id);

      if (!error) {
        supabaseReadyState.connected = true;
        supabaseReadyState.schemaReady = true;
        return;
      }
      supabaseReadyState.lastError = error.message;
    }

    await clientDeleteDoc(this.clientRef);
  }
}

interface QueryFilter {
  field: string;
  op: string;
  value: any;
}

class QueryWrapper {
  private filters: QueryFilter[] = [];
  private orderBys: Array<{ field: string; dir: 'asc' | 'desc' }> = [];
  private limitCount?: number;

  constructor(public collectionName: string, filters: QueryFilter[] = []) {
    this.filters = [...filters];
  }

  where(field: string, op: string, value: any) {
    const next = new QueryWrapper(this.collectionName, [...this.filters, { field, op, value }]);
    next.orderBys = [...this.orderBys];
    next.limitCount = this.limitCount;
    return next;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    const next = new QueryWrapper(this.collectionName, this.filters);
    next.orderBys = [...this.orderBys, { field, dir }];
    next.limitCount = this.limitCount;
    return next;
  }

  limit(n: number) {
    const next = new QueryWrapper(this.collectionName, this.filters);
    next.orderBys = [...this.orderBys];
    next.limitCount = n;
    return next;
  }

  private applyFiltersAndSort(docs: Array<{ id: string; exists: boolean; data: () => any; ref: DocRefWrapper }>) {
    let filtered = docs.filter(d => {
      const item = d.data() || {};
      return this.filters.every(f => {
        const val = item[f.field];
        switch (f.op) {
          case '==':
            return val === f.value;
          case '!=':
            return val !== f.value;
          case '>':
            return val > f.value;
          case '>=':
            return val >= f.value;
          case '<':
            return val < f.value;
          case '<=':
            return val <= f.value;
          case 'in':
            return Array.isArray(f.value) && f.value.includes(val);
          case 'array-contains':
            return Array.isArray(val) && val.includes(f.value);
          default:
            return true;
        }
      });
    });

    if (this.orderBys.length > 0) {
      filtered.sort((a, b) => {
        const da = a.data() || {};
        const db = b.data() || {};
        for (const ob of this.orderBys) {
          const va = da[ob.field];
          const vb = db[ob.field];
          if (va === vb) continue;
          const cmp = va > vb ? 1 : -1;
          return ob.dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    if (typeof this.limitCount === 'number' && this.limitCount > 0) {
      filtered = filtered.slice(0, this.limitCount);
    }

    return {
      empty: filtered.length === 0,
      size: filtered.length,
      docs: filtered
    };
  }

  async get() {
    const colSnap = await new CollectionRefWrapper(this.collectionName).get();
    return this.applyFiltersAndSort(colSnap.docs);
  }
}

class CollectionRefWrapper {
  constructor(public name: string) {}

  doc(id?: string) {
    const docId =
      id ||
      clientDoc(clientCollection(clientDb, this.name)).id ||
      `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return new DocRefWrapper(this.name, docId);
  }

  where(field: string, op: string, value: any) {
    return new QueryWrapper(this.name, [{ field, op, value }]);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new QueryWrapper(this.name).orderBy(field, dir);
  }

  limit(n: number) {
    return new QueryWrapper(this.name).limit(n);
  }

  async get() {
    const supabase = getSupabaseClient();
    if (supabase && supabaseReadyState.schemaReady) {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('id, data')
        .eq('collection', this.name);

      if (!error && Array.isArray(data)) {
        supabaseReadyState.connected = true;
        supabaseReadyState.schemaReady = true;
        const docs = data.map((row: any) => ({
          id: row.id,
          exists: true,
          data: () => row.data,
          ref: new DocRefWrapper(this.name, row.id)
        }));
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs
        };
      }
      if (error) {
        supabaseReadyState.lastError = error.message;
      }
    }

    const snap = await clientGetDocs(clientCollection(clientDb, this.name));
    const docs = snap.docs.map(d => ({
      id: d.id,
      exists: true,
      data: () => d.data(),
      ref: new DocRefWrapper(this.name, d.id)
    }));
    return {
      empty: snap.empty,
      size: snap.size,
      docs
    };
  }
}

class BatchWrapper {
  private upserts: Map<string, { collection: string; id: string; data: any; merge?: boolean }> = new Map();
  private deletes: Map<string, { collection: string; id: string }> = new Map();
  private clientBatch = clientWriteBatch(clientDb);

  set(ref: DocRefWrapper, data: any, options?: { merge?: boolean }) {
    const cleaned = stripUndefined(data);
    const key = `${ref.collectionName}::${ref.id}`;
    this.deletes.delete(key);
    this.upserts.set(key, {
      collection: ref.collectionName,
      id: ref.id,
      data: cleaned,
      merge: options?.merge
    });

    const cRef = clientDoc(clientDb, ref.collectionName, ref.id);
    if (options) {
      this.clientBatch.set(cRef, cleaned, options);
    } else {
      this.clientBatch.set(cRef, cleaned);
    }
  }

  update(ref: DocRefWrapper, data: any) {
    this.set(ref, data, { merge: true });
  }

  delete(ref: DocRefWrapper) {
    const key = `${ref.collectionName}::${ref.id}`;
    this.upserts.delete(key);
    this.deletes.set(key, { collection: ref.collectionName, id: ref.id });

    const cRef = clientDoc(clientDb, ref.collectionName, ref.id);
    this.clientBatch.delete(cRef);
  }

  async commit() {
    const supabase = getSupabaseClient();
    if (supabase && supabaseReadyState.schemaReady) {
      let ok = true;

      if (this.upserts.size > 0) {
        const rowsToUpsert: Array<{ collection: string; id: string; data: any; updated_at: string }> = [];
        const nowIso = new Date().toISOString();

        for (const item of this.upserts.values()) {
          let finalData = item.data;
          if (item.merge) {
            const existing = await new DocRefWrapper(item.collection, item.id).get();
            if (existing.exists) {
              finalData = { ...(existing.data() || {}), ...item.data };
            }
          }
          rowsToUpsert.push({
            collection: item.collection,
            id: item.id,
            data: finalData,
            updated_at: nowIso
          });
        }

        const { error } = await supabase
          .from(SUPABASE_TABLE)
          .upsert(rowsToUpsert, { onConflict: 'collection,id' });

        if (error) {
          ok = false;
          supabaseReadyState.lastError = error.message;
        }
      }

      if (ok && this.deletes.size > 0) {
        for (const del of this.deletes.values()) {
          const { error } = await supabase
            .from(SUPABASE_TABLE)
            .delete()
            .eq('collection', del.collection)
            .eq('id', del.id);
          if (error) {
            ok = false;
            supabaseReadyState.lastError = error.message;
          }
        }
      }

      if (ok) {
        supabaseReadyState.connected = true;
        supabaseReadyState.schemaReady = true;
        return;
      }
    }

    await this.clientBatch.commit();
  }
}

export const firestore = {
  collection(name: string) {
    return new CollectionRefWrapper(name);
  },
  batch() {
    return new BatchWrapper();
  },
  async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    const tx = {
      async get(refOrQuery: DocRefWrapper | CollectionRefWrapper | QueryWrapper) {
        return refOrQuery.get();
      },
      set(ref: DocRefWrapper, data: any, options?: { merge?: boolean }) {
        this._ops.push(() => ref.set(data, options));
      },
      update(ref: DocRefWrapper, data: any) {
        this._ops.push(() => ref.update(data));
      },
      delete(ref: DocRefWrapper) {
        this._ops.push(() => ref.delete());
      },
      _ops: [] as Array<() => Promise<void>>
    };
    const result = await updateFunction(tx);
    for (const op of tx._ops) {
      await op();
    }
    return result;
  }
};

// Storage bucket wrapper that uses Supabase Storage ('arc-uploads') when available,
// with automatic fallback to Firebase Storage / local file serving
export const bucket = {
  get name() {
    const supabase = getSupabaseClient();
    return supabase ? SUPABASE_BUCKET : adminStorageBucket.name;
  },
  file(storagePath: string) {
    return {
      async save(buffer: Buffer, options?: { metadata?: { contentType?: string } }) {
        const supabase = getSupabaseClient();
        if (supabase) {
          const contentType = options?.metadata?.contentType || 'application/octet-stream';
          const { error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(storagePath, buffer, {
              contentType,
              upsert: true
            });
          if (!error) return;
        }
        await adminStorageBucket.file(storagePath).save(buffer, options);
      },
      async makePublic() {
        const supabase = getSupabaseClient();
        if (supabase) return; // 'arc-uploads' bucket is public by SQL policy
        await adminStorageBucket.file(storagePath).makePublic();
      },
      getPublicUrl(): string {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
          if (data?.publicUrl) return data.publicUrl;
        }
        return `https://storage.googleapis.com/${adminStorageBucket.name}/${storagePath}`;
      }
    };
  }
};
