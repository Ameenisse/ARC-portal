import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getSupabaseClient,
  loadSupabaseConfig,
  tryAutoCreateSchemaViaPostgres,
  SUPABASE_TABLE,
  SUPABASE_BUCKET,
  DEFAULT_SUPABASE_URL
} from './supabase.ts';

dotenv.config();

export const PROJECT_ID = DEFAULT_SUPABASE_URL;
export const DATABASE_ID = SUPABASE_TABLE;

const LOCAL_CACHE_PATH = path.join(os.tmpdir(), 'arc-supabase-local-cache.json');

// Local disk-backed memory store used ONLY if the Supabase SQL table has not been created yet,
// ensuring 0% Firebase dependency and immediate persistence until the SQL script is run in Supabase.
let localMemoryStore: Record<string, Record<string, any>> = {};
try {
  if (fs.existsSync(LOCAL_CACHE_PATH)) {
    localMemoryStore = JSON.parse(fs.readFileSync(LOCAL_CACHE_PATH, 'utf-8'));
  }
} catch {
  localMemoryStore = {};
}

function saveLocalMemoryStore() {
  try {
    fs.writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(localMemoryStore, null, 2), 'utf-8');
  } catch {}
}

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
  return {
    provider: 'supabase',
    supabaseUrl: cfg.url || DEFAULT_SUPABASE_URL,
    hasSupabaseKey: true,
    supabaseConnected: supabaseReadyState.connected,
    supabaseSchemaReady: supabaseReadyState.schemaReady,
    lastError: supabaseReadyState.lastError,
    activeEngine: supabaseReadyState.schemaReady ? 'supabase-postgresql' : 'supabase-pending-sql-table'
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
  const supabase = getSupabaseClient();

  try {
    let { error } = await supabase
      .from(SUPABASE_TABLE)
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        (error.message && error.message.toLowerCase().includes('does not exist')) ||
        (error.message && error.message.toLowerCase().includes('schema cache'));

      // If DATABASE_URL with password is set, automatically run the SQL schema script!
      if (isMissingTable && cfg.databaseUrl) {
        const autoRes = await tryAutoCreateSchemaViaPostgres();
        if (autoRes.executed) {
          const retry = await supabase
            .from(SUPABASE_TABLE)
            .select('id', { count: 'exact', head: true })
            .limit(1);
          error = retry.error;
        }
      }
    }

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
          ? `Connected to Supabase (${url}), awaiting table creation. Run supabase_schema.sql in Supabase SQL Editor.`
          : `Supabase Error (${error.code || 'ERR'}): ${error.message}`
      };

      return {
        connected: supabaseReadyState.connected,
        schemaReady: false,
        error: supabaseReadyState.lastError,
        url,
        hasKey: true
      };
    }

    const wasNotReady = !supabaseReadyState.schemaReady;
    supabaseReadyState = {
      connected: true,
      schemaReady: true,
      lastCheckedAt: Date.now(),
      lastError: undefined
    };

    // Sync any cached local bootstrap documents into Supabase once table is ready
    if (wasNotReady && Object.keys(localMemoryStore).length > 0) {
      try {
        const rows: Array<{ collection: string; id: string; data: any; updated_at: string }> = [];
        const nowIso = new Date().toISOString();
        for (const [col, docs] of Object.entries(localMemoryStore)) {
          for (const [docId, docData] of Object.entries(docs)) {
            rows.push({ collection: col, id: docId, data: docData, updated_at: nowIso });
          }
        }
        if (rows.length > 0) {
          await supabase.from(SUPABASE_TABLE).upsert(rows, { onConflict: 'collection,id' });
        }
      } catch {}
    }

    return {
      connected: true,
      schemaReady: true,
      url,
      hasKey: true
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
      hasKey: true
    };
  }
}

export function getDatabaseMetadata() {
  const info = getActiveBackendInfo();
  return {
    backend: 'supabase-js',
    database: 'supabase-postgresql',
    projectId: info.supabaseUrl,
    databaseId: SUPABASE_TABLE,
    storageBucket: SUPABASE_BUCKET,
    supabaseUrl: info.supabaseUrl,
    hasSupabaseKey: true,
    supabaseConnected: info.supabaseConnected,
    supabaseSchemaReady: info.supabaseSchemaReady,
    activeEngine: info.activeEngine,
    lastError: info.lastError
  };
}

class DocRefWrapper {
  constructor(public collectionName: string, public id: string) {}

  async get() {
    const supabase = getSupabaseClient();
    if (supabaseReadyState.schemaReady) {
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

    const col = localMemoryStore[this.collectionName] || {};
    const item = col[this.id];
    return {
      exists: item !== undefined,
      id: this.id,
      data: () => (item !== undefined ? item : undefined)
    };
  }

  async set(data: any, options?: { merge?: boolean }) {
    const cleaned = stripUndefined(data);
    if (!localMemoryStore[this.collectionName]) {
      localMemoryStore[this.collectionName] = {};
    }
    const existingLocal = localMemoryStore[this.collectionName][this.id];
    const mergedLocal = options?.merge && existingLocal ? { ...existingLocal, ...cleaned } : cleaned;
    localMemoryStore[this.collectionName][this.id] = mergedLocal;
    saveLocalMemoryStore();

    const supabase = getSupabaseClient();
    if (supabaseReadyState.schemaReady) {
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
  }

  async update(data: any) {
    await this.set(data, { merge: true });
  }

  async delete() {
    if (localMemoryStore[this.collectionName]) {
      delete localMemoryStore[this.collectionName][this.id];
      saveLocalMemoryStore();
    }

    const supabase = getSupabaseClient();
    if (supabaseReadyState.schemaReady) {
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
      `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
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
    if (supabaseReadyState.schemaReady) {
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

    const col = localMemoryStore[this.name] || {};
    const docs = Object.entries(col).map(([docId, docData]) => ({
      id: docId,
      exists: true,
      data: () => docData,
      ref: new DocRefWrapper(this.name, docId)
    }));
    return {
      empty: docs.length === 0,
      size: docs.length,
      docs
    };
  }
}

class BatchWrapper {
  private upserts: Map<string, { collection: string; id: string; data: any; merge?: boolean }> = new Map();
  private deletes: Map<string, { collection: string; id: string }> = new Map();

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
  }

  update(ref: DocRefWrapper, data: any) {
    this.set(ref, data, { merge: true });
  }

  delete(ref: DocRefWrapper) {
    const key = `${ref.collectionName}::${ref.id}`;
    this.upserts.delete(key);
    this.deletes.set(key, { collection: ref.collectionName, id: ref.id });
  }

  async commit() {
    for (const item of this.upserts.values()) {
      if (!localMemoryStore[item.collection]) localMemoryStore[item.collection] = {};
      const prev = localMemoryStore[item.collection][item.id];
      localMemoryStore[item.collection][item.id] = item.merge && prev ? { ...prev, ...item.data } : item.data;
    }
    for (const del of this.deletes.values()) {
      if (localMemoryStore[del.collection]) {
        delete localMemoryStore[del.collection][del.id];
      }
    }
    saveLocalMemoryStore();

    const supabase = getSupabaseClient();
    if (supabaseReadyState.schemaReady) {
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
          supabaseReadyState.lastError = error.message;
        }
      }

      if (this.deletes.size > 0) {
        for (const del of this.deletes.values()) {
          const { error } = await supabase
            .from(SUPABASE_TABLE)
            .delete()
            .eq('collection', del.collection)
            .eq('id', del.id);
          if (error) {
            supabaseReadyState.lastError = error.message;
          }
        }
      }
    }
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

// Supabase Auth token verifier (replaces Firebase Admin Auth)
export const adminAuth = {
  async verifyIdToken(token: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw new Error(error?.message || 'Invalid Supabase Auth token');
    }
    const u = data.user;
    return {
      uid: u.id,
      email: u.email || '',
      name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Customer',
      picture: u.user_metadata?.avatar_url || u.user_metadata?.picture || ''
    };
  }
};

// Supabase Storage bucket wrapper (replaces Firebase Storage)
export const bucket = {
  get name() {
    return SUPABASE_BUCKET;
  },
  file(storagePath: string) {
    return {
      async save(buffer: Buffer, options?: { metadata?: { contentType?: string }; resumable?: boolean }) {
        const supabase = getSupabaseClient();
        const contentType = options?.metadata?.contentType || 'application/octet-stream';
        const { error } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(storagePath, buffer, {
            contentType,
            upsert: true
          });
        if (error) {
          throw new Error(error.message);
        }
      },
      async makePublic() {
        // 'arc-uploads' bucket is public by policy
      },
      getPublicUrl(): string {
        const supabase = getSupabaseClient();
        const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
        return data?.publicUrl || '';
      }
    };
  }
};
