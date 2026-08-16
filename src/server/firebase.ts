import fs from 'fs';
import path from 'path';

// Load Firebase configuration
let firebaseConfig: {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  oAuthClientId?: string;
} = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'gen-lang-client-0224683648',
  appId: '',
  apiKey: '',
  authDomain: '',
  firestoreDatabaseId: '(default)',
  storageBucket: '',
  messagingSenderId: ''
};

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    firebaseConfig = { ...firebaseConfig, ...parsed };
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
}

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
export const FIREBASE_API_KEY = firebaseConfig.apiKey;
export const FIREBASE_STORAGE_BUCKET = firebaseConfig.storageBucket;

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;

// Helper: Convert JS Value -> Firestore Value representation
export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    // If Date or Firestore timestamp string
    if (val instanceof Date) {
      return { timestampValue: val.toISOString() };
    }
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Helper: Convert Firestore Value -> JS Value
export function fromFirestoreValue(valObj: any): any {
  if (!valObj) return null;
  if ('nullValue' in valObj) return null;
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('timestampValue' in valObj) return valObj.timestampValue;
  if ('arrayValue' in valObj) {
    return (valObj.arrayValue?.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in valObj) {
    const res: Record<string, any> = {};
    const fields = valObj.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export function fromFirestoreDoc<T = any>(doc: any): T | null {
  if (!doc || !doc.fields) return null;
  const data: any = {};
  for (const [key, valObj] of Object.entries(doc.fields)) {
    data[key] = fromFirestoreValue(valObj);
  }
  // Extract ID if not in fields
  if (!data.id && doc.name) {
    const parts = doc.name.split('/');
    data.id = parts[parts.length - 1];
  }
  return data as T;
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      fields[key] = toFirestoreValue(val);
    }
  }
  return fields;
}

// Firestore Database Interface
export class FirestoreClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = FIRESTORE_BASE_URL;
    this.apiKey = FIREBASE_API_KEY;
  }

  private getUrl(path: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  }

  // Get a single document by collection & docId
  async get<T = any>(collection: string, docId: string): Promise<T | null> {
    try {
      const url = this.getUrl(`/${collection}/${encodeURIComponent(docId)}`);
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Firestore GET ${collection}/${docId} error (${res.status}): ${errText}`);
      }
      const data = await res.json();
      return fromFirestoreDoc<T>(data);
    } catch (err: any) {
      console.error(`Firestore get error [${collection}/${docId}]:`, err.message);
      throw err;
    }
  }

  // Set / Upsert a document with a specific docId
  async set<T = any>(collection: string, docId: string, data: Partial<T>): Promise<T> {
    try {
      const url = this.getUrl(`/${collection}/${encodeURIComponent(docId)}`);
      const payload = {
        fields: toFirestoreFields(data)
      };
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Firestore SET ${collection}/${docId} error (${res.status}): ${errText}`);
      }
      const savedDoc = await res.json();
      return fromFirestoreDoc<T>(savedDoc) || ({ ...data, id: docId } as T);
    } catch (err: any) {
      console.error(`Firestore set error [${collection}/${docId}]:`, err.message);
      throw err;
    }
  }

  // Delete a document
  async delete(collection: string, docId: string): Promise<boolean> {
    try {
      const url = this.getUrl(`/${collection}/${encodeURIComponent(docId)}`);
      const res = await fetch(url, { method: 'DELETE' });
      if (res.status === 404) return true;
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Firestore DELETE ${collection}/${docId} error (${res.status}): ${errText}`);
      }
      return true;
    } catch (err: any) {
      console.error(`Firestore delete error [${collection}/${docId}]:`, err.message);
      throw err;
    }
  }

  // List all documents in a collection (using runQuery)
  async list<T = any>(collection: string): Promise<T[]> {
    return this.query<T>(collection);
  }

  // Run a structured query on a collection
  async query<T = any>(collection: string, options: {
    where?: Array<{ field: string; op: 'EQUAL' | 'NOT_EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'ARRAY_CONTAINS'; value: any }>;
    orderBy?: Array<{ field: string; direction?: 'ASCENDING' | 'DESCENDING' }>;
    limit?: number;
  } = {}): Promise<T[]> {
    try {
      const url = this.getUrl(':runQuery');
      const structuredQuery: any = {
        from: [{ collectionId: collection }]
      };

      if (options.where && options.where.length > 0) {
        if (options.where.length === 1) {
          const filter = options.where[0];
          structuredQuery.where = {
            fieldFilter: {
              field: { fieldPath: filter.field },
              op: filter.op,
              value: toFirestoreValue(filter.value)
            }
          };
        } else {
          structuredQuery.where = {
            compositeFilter: {
              op: 'AND',
              filters: options.where.map(f => ({
                fieldFilter: {
                  field: { fieldPath: f.field },
                  op: f.op,
                  value: toFirestoreValue(f.value)
                }
              }))
            }
          };
        }
      }

      if (options.orderBy && options.orderBy.length > 0) {
        structuredQuery.orderBy = options.orderBy.map(o => ({
          field: { fieldPath: o.field },
          direction: o.direction || 'ASCENDING'
        }));
      }

      if (options.limit) {
        structuredQuery.limit = options.limit;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Firestore QUERY ${collection} error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const results: T[] = [];
      for (const item of data) {
        if (item.document) {
          const parsed = fromFirestoreDoc<T>(item.document);
          if (parsed) results.push(parsed);
        }
      }
      return results;
    } catch (err: any) {
      console.error(`Firestore query error [${collection}]:`, err.message);
      // Fallback to in-memory filter if complex index is not yet built
      const all = await this.list<T>(collection);
      let filtered = all;
      if (options.where) {
        filtered = filtered.filter((item: any) => {
          return options.where!.every(w => {
            if (w.op === 'EQUAL') return item[w.field] === w.value;
            if (w.op === 'NOT_EQUAL') return item[w.field] !== w.value;
            return true;
          });
        });
      }
      if (options.limit) {
        filtered = filtered.slice(0, options.limit);
      }
      return filtered;
    }
  }

  // Health check for Cloud Firestore
  async checkHealth(): Promise<{ connected: boolean; projectId: string; databaseId: string; error?: string }> {
    try {
      const pingDocId = 'health_check_ping';
      await this.set('system', pingDocId, { ping: true, checkedAt: new Date().toISOString() });
      await this.delete('system', pingDocId);
      return {
        connected: true,
        projectId: FIREBASE_PROJECT_ID,
        databaseId: FIRESTORE_DATABASE_ID
      };
    } catch (err: any) {
      return {
        connected: false,
        projectId: FIREBASE_PROJECT_ID,
        databaseId: FIRESTORE_DATABASE_ID,
        error: err.message
      };
    }
  }
}

export const firestore = new FirestoreClient();
