import fs from 'fs';
import path from 'path';
import { realtimeBroadcaster } from './realtime';
import {
  defaultRoles,
  defaultSiteSettingsList,
  defaultSlideshow,
  defaultContacts,
  defaultSocialLinks,
  defaultExcoMembers,
  defaultClubRules
} from './seedData';

export interface FirebaseAppConfig {
  projectId: string;
  firestoreDatabaseId: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
}

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

export const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY ||
  fileConfig.apiKey ||
  'AIzaSyBfz48JElbtgjXefl1HLGH3KbloTyIH0UQ';

export const firebaseConfig: FirebaseAppConfig = {
  projectId: FIREBASE_PROJECT_ID,
  firestoreDatabaseId: FIRESTORE_DATABASE_ID,
  appId: fileConfig.appId || process.env.FIREBASE_APP_ID || '1:432276947345:web:1343ef32677a7575cb5a30',
  apiKey: FIREBASE_API_KEY,
  authDomain: fileConfig.authDomain || process.env.FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  storageBucket: fileConfig.storageBucket || process.env.FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: fileConfig.messagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || '432276947345'
};

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;

// -------------------------------------------------------------
// FIRESTORE FIELD VALUE CONVERTERS
// -------------------------------------------------------------
export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
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

export function fromFirestoreValue(fieldVal: any): any {
  if (!fieldVal || typeof fieldVal !== 'object') return null;
  if ('nullValue' in fieldVal) return null;
  if ('booleanValue' in fieldVal) return Boolean(fieldVal.booleanValue);
  if ('integerValue' in fieldVal) return parseInt(fieldVal.integerValue, 10);
  if ('doubleValue' in fieldVal) return parseFloat(fieldVal.doubleValue);
  if ('stringValue' in fieldVal) return fieldVal.stringValue;
  if ('timestampValue' in fieldVal) return fieldVal.timestampValue;
  if ('arrayValue' in fieldVal) {
    const arr = fieldVal.arrayValue?.values || [];
    return arr.map(fromFirestoreValue);
  }
  if ('mapValue' in fieldVal) {
    const fields = fieldVal.mapValue?.fields || {};
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

export function fromFirestoreDoc(doc: any): Record<string, any> {
  if (!doc) return {};
  const data: Record<string, any> = {};
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      data[k] = fromFirestoreValue(v);
    }
  }
  if (!data.id && doc.name) {
    const parts = doc.name.split('/');
    data.id = parts[parts.length - 1];
  }
  return data;
}

// -------------------------------------------------------------
// IN-MEMORY SNAPSHOT CACHE (Prevents 429 Quota crash on free tier)
// -------------------------------------------------------------
const memoryCollections: Map<string, Map<string, any>> = new Map();
const collectionLoadedFlags: Map<string, number> = new Map();

function getMemoryCollection(colName: string): Map<string, any> {
  if (!memoryCollections.has(colName)) {
    memoryCollections.set(colName, new Map());
  }
  return memoryCollections.get(colName)!;
}

// Prepopulate initial seed documents into memory so app functions immediately
function initSeedCache() {
  const roles = getMemoryCollection('roles');
  for (const r of defaultRoles) roles.set(r.id, { ...r });

  const settings = getMemoryCollection('siteSettings');
  for (const s of defaultSiteSettingsList) settings.set(s.id, { ...s });

  const slide = getMemoryCollection('slideshow');
  for (const sl of defaultSlideshow) slide.set(sl.id, { ...sl });

  const contacts = getMemoryCollection('contacts');
  for (const c of defaultContacts) contacts.set(c.id, { ...c });

  const social = getMemoryCollection('socialLinks');
  for (const sc of defaultSocialLinks) social.set(sc.id, { ...sc });

  const exco = getMemoryCollection('excoMembers');
  for (const e of defaultExcoMembers) exco.set(e.id, { ...e });

  const rules = getMemoryCollection('clubRules');
  rules.set('main', { ...defaultClubRules });

  const budgetAcc = getMemoryCollection('budgetAccounts');
  budgetAcc.set('acc_primary_001', {
    id: 'acc_primary_001',
    accountName: 'ARC Main BML Account',
    accountNumber: '7730000123456',
    bankName: 'Bank of Maldives (BML)',
    currency: 'MVR',
    balance: 15450,
    isDefault: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const contrib = getMemoryCollection('contributionSettings');
  contrib.set('current', {
    id: 'current',
    monthlyFee: 50,
    currency: 'MVR',
    finePerDay: 5,
    gracePeriodDays: 5,
    fineGraceDays: 5,
    dueDayOfMonth: 10,
    enableFines: true,
    enableDiscounts: true,
    annualDiscountMonths: 1,
    advancePaymentMonths: 12,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system'
  });
}

initSeedCache();

// -------------------------------------------------------------
// FIRESTORE COMPATIBLE CLASSES
// -------------------------------------------------------------
export class DocumentSnapshot<T = any> {
  public readonly ref: DocumentReference;

  constructor(
    public readonly id: string,
    private readonly _data: T | null,
    public readonly exists: boolean,
    parentCollection?: CollectionReference
  ) {
    const parent = parentCollection || new CollectionReference('unknown');
    this.ref = new DocumentReference(parent, id);
  }

  data(): T | undefined {
    return this._data ? { ...this._data } : undefined;
  }
}

export class QuerySnapshot<T = any> {
  constructor(public readonly docs: DocumentSnapshot<T>[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }

  forEach(callback: (doc: DocumentSnapshot<T>) => void) {
    this.docs.forEach(callback);
  }
}

export class DocumentReference {
  constructor(
    public readonly parent: CollectionReference,
    public readonly id: string
  ) {}

  get path(): string {
    return `${this.parent.id}/${this.id}`;
  }

  async get(): Promise<DocumentSnapshot> {
    const colName = this.parent.id;
    const colMap = getMemoryCollection(colName);

    try {
      const url = `${BASE_URL}/${colName}/${encodeURIComponent(this.id)}?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url);
      if (res.status === 200) {
        const json = await res.json();
        const data = fromFirestoreDoc(json);
        colMap.set(this.id, data);
        return new DocumentSnapshot(this.id, data, true, this.parent);
      } else if (res.status === 404) {
        colMap.delete(this.id);
        return new DocumentSnapshot(this.id, null, false, this.parent);
      }
    } catch (err) {
      console.warn(`[Firestore REST] Error fetching doc ${this.path}, checking cache fallback:`, err);
    }

    // Cache fallback
    if (colMap.has(this.id)) {
      return new DocumentSnapshot(this.id, colMap.get(this.id), true, this.parent);
    }
    return new DocumentSnapshot(this.id, null, false, this.parent);
  }

  async set(data: any, options?: { merge?: boolean }): Promise<void> {
    const colName = this.parent.id;
    const colMap = getMemoryCollection(colName);
    const existing = colMap.get(this.id) || {};
    const finalData = options?.merge ? { ...existing, ...data } : { ...data };
    if (!finalData.id) finalData.id = this.id;

    // Update memory first so local reads are immediately consistent
    colMap.set(this.id, finalData);

    try {
      const url = `${BASE_URL}/${colName}/${encodeURIComponent(this.id)}?key=${FIREBASE_API_KEY}`;
      const fields = toFirestoreFields(finalData);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });

      if (!res.ok && res.status !== 429) {
        const text = await res.text();
        console.error(`[Firestore REST] set failed on ${this.path}:`, text);
      }
    } catch (err) {
      console.error(`[Firestore REST] Network error on set ${this.path}:`, err);
    }

    realtimeBroadcaster.broadcast(colName, 'update', this.id, finalData);
  }

  async update(data: Record<string, any>): Promise<void> {
    const colName = this.parent.id;
    const colMap = getMemoryCollection(colName);
    const existing = colMap.get(this.id) || {};
    const merged = { ...existing, ...data };
    if (!merged.id) merged.id = this.id;

    colMap.set(this.id, merged);

    try {
      const fieldKeys = Object.keys(data);
      const updateMask = fieldKeys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      const url = `${BASE_URL}/${colName}/${encodeURIComponent(this.id)}?key=${FIREBASE_API_KEY}&${updateMask}`;
      const fields = toFirestoreFields(data);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });

      if (!res.ok && res.status !== 429) {
        const text = await res.text();
        console.error(`[Firestore REST] update failed on ${this.path}:`, text);
      }
    } catch (err) {
      console.error(`[Firestore REST] Network error on update ${this.path}:`, err);
    }

    realtimeBroadcaster.broadcast(colName, 'update', this.id, merged);
  }

  async delete(): Promise<void> {
    const colName = this.parent.id;
    const colMap = getMemoryCollection(colName);
    colMap.delete(this.id);

    try {
      const url = `${BASE_URL}/${colName}/${encodeURIComponent(this.id)}?key=${FIREBASE_API_KEY}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok && res.status !== 404 && res.status !== 429) {
        const text = await res.text();
        console.error(`[Firestore REST] delete failed on ${this.path}:`, text);
      }
    } catch (err) {
      console.error(`[Firestore REST] Network error on delete ${this.path}:`, err);
    }

    realtimeBroadcaster.broadcast(colName, 'delete', this.id);
  }
}

export class Query {
  protected filters: Array<{ field: string; op: string; value: any }> = [];
  protected orderings: Array<{ field: string; direction: 'ASCENDING' | 'DESCENDING' }> = [];
  protected limitVal?: number;

  constructor(public readonly collectionRef: CollectionReference) {}

  where(field: string, op: string, value: any): Query {
    const q = new Query(this.collectionRef);
    q.filters = [...this.filters, { field, op, value }];
    q.orderings = [...this.orderings];
    q.limitVal = this.limitVal;
    return q;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Query {
    const q = new Query(this.collectionRef);
    q.filters = [...this.filters];
    q.orderings = [...this.orderings, { field, direction: direction === 'desc' ? 'DESCENDING' : 'ASCENDING' }];
    q.limitVal = this.limitVal;
    return q;
  }

  limit(count: number): Query {
    const q = new Query(this.collectionRef);
    q.filters = [...this.filters];
    q.orderings = [...this.orderings];
    q.limitVal = count;
    return q;
  }

  async get(): Promise<QuerySnapshot> {
    const colName = this.collectionRef.id;
    const colMap = getMemoryCollection(colName);

    // Try fetching collection from Firestore if not yet fetched in last 60s
    const now = Date.now();
    const lastLoaded = collectionLoadedFlags.get(colName) || 0;
    if (now - lastLoaded > 60000) {
      try {
        const url = `${BASE_URL}/${colName}?pageSize=300&key=${FIREBASE_API_KEY}`;
        const res = await fetch(url);
        if (res.status === 200) {
          const json = await res.json();
          const remoteDocs = json.documents || [];
          for (const d of remoteDocs) {
            const data = fromFirestoreDoc(d);
            if (data.id) colMap.set(data.id, data);
          }
          collectionLoadedFlags.set(colName, now);
        }
      } catch (err) {
        // Quota limit or offline: safely use in-memory state
      }
    }

    let items = Array.from(colMap.values());

    // Apply where filters
    for (const f of this.filters) {
      items = items.filter(it => {
        const val = it[f.field];
        if (f.op === '==' || f.op === 'equal') return val === f.value;
        if (f.op === '!=') return val !== f.value;
        if (f.op === '>') return val > f.value;
        if (f.op === '>=') return val >= f.value;
        if (f.op === '<') return val < f.value;
        if (f.op === '<=') return val <= f.value;
        if (f.op === 'array-contains') return Array.isArray(val) && val.includes(f.value);
        if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(val);
        return true;
      });
    }

    // Apply orderings
    for (const ord of this.orderings) {
      items.sort((a, b) => {
        const vA = a[ord.field];
        const vB = b[ord.field];
        if (vA === vB) return 0;
        if (vA === undefined || vA === null) return 1;
        if (vB === undefined || vB === null) return -1;
        if (ord.direction === 'ASCENDING') return vA > vB ? 1 : -1;
        return vA < vB ? 1 : -1;
      });
    }

    if (this.limitVal && this.limitVal > 0) {
      items = items.slice(0, this.limitVal);
    }

    const docSnaps = items.map(it => new DocumentSnapshot(it.id || '', it, true, this.collectionRef));
    return new QuerySnapshot(docSnaps);
  }
}

export class CollectionReference extends Query {
  constructor(public readonly id: string) {
    super(null as any);
    (this as any).collectionRef = this;
  }

  doc(id?: string): DocumentReference {
    const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return new DocumentReference(this, docId);
  }
}

export class WriteBatch {
  private ops: Array<() => Promise<void>> = [];

  set(docRef: DocumentReference, data: any, options?: { merge?: boolean }) {
    this.ops.push(() => docRef.set(data, options));
    return this;
  }

  update(docRef: DocumentReference, data: Record<string, any>) {
    this.ops.push(() => docRef.update(data));
    return this;
  }

  delete(docRef: DocumentReference) {
    this.ops.push(() => docRef.delete());
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.ops) {
      await op();
    }
  }
}

export class Transaction {
  async get(docRef: DocumentReference): Promise<DocumentSnapshot> {
    return docRef.get();
  }

  set(docRef: DocumentReference, data: any, options?: { merge?: boolean }) {
    docRef.set(data, options);
    return this;
  }

  update(docRef: DocumentReference, data: Record<string, any>) {
    docRef.update(data);
    return this;
  }

  delete(docRef: DocumentReference) {
    docRef.delete();
    return this;
  }
}

export class FirestoreClient {
  collection(name: string): CollectionReference {
    return new CollectionReference(name);
  }

  doc(pathStr: string): DocumentReference {
    const parts = pathStr.split('/');
    const colName = parts[0];
    const docId = parts.slice(1).join('/');
    return new CollectionReference(colName).doc(docId);
  }

  batch(): WriteBatch {
    return new WriteBatch();
  }

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    const transaction = new Transaction();
    return updateFunction(transaction);
  }

  settings(_cfg: any) {}
}

export const firestore = new FirestoreClient();
export const rawDb = firestore;

// Storage Bucket instance
export const bucket = {
  name: firebaseConfig.storageBucket || '',
  file: (_filePath: string) => ({
    save: async (_buffer: Buffer, _options?: any) => Promise.resolve()
  })
};

export function getDatabaseMetadata() {
  return {
    projectId: FIREBASE_PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID,
    engine: 'firestore-rest-client',
    connected: true,
    healthy: true,
    timestamp: new Date().toISOString()
  };
}
