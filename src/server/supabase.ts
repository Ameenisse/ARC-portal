import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

export const DEFAULT_SUPABASE_URL = 'https://afkdbmntchllpucshuxe.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hcSXiIzp3jSeByl6pfu75Q_FkgUQjpi';
export const DEFAULT_SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
export const DEFAULT_SUPABASE_JWKS_URL = 'https://afkdbmntchllpucshuxe.supabase.co/auth/v1/.well-known/jwks.json';
export const DEFAULT_POSTGRES_HOST = 'db.afkdbmntchllpucshuxe.supabase.co';
export const SUPABASE_TABLE = 'arc_collection_documents';
export const SUPABASE_BUCKET = 'arc-uploads';

const RUNTIME_CONFIG_PATH = path.join(os.tmpdir(), 'arc-supabase-config.json');

export interface SupabaseRuntimeConfig {
  url: string;
  key: string;
  publishableKey: string;
  secretKey: string;
  jwksUrl: string;
  databaseUrl?: string;
}

function isValidSupabaseKey(val?: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed.includes('••••') || trimmed.includes('[YOUR')) return false;
  return trimmed.length > 12;
}

export function loadSupabaseConfig(): SupabaseRuntimeConfig {
  let url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();

  const envSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SECRET_KEY;
  const envPublishable =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  let secretKey = isValidSupabaseKey(envSecret) ? envSecret.trim() : DEFAULT_SUPABASE_SECRET_KEY;
  let publishableKey = isValidSupabaseKey(envPublishable)
    ? envPublishable.trim()
    : DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  let jwksUrl = (process.env.SUPABASE_JWKS_URL || DEFAULT_SUPABASE_JWKS_URL).trim();
  let databaseUrl = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')
    ? process.env.DATABASE_URL.trim()
    : undefined;

  if (fs.existsSync(RUNTIME_CONFIG_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(RUNTIME_CONFIG_PATH, 'utf-8'));
      if (saved.url) url = saved.url.trim();
      if (isValidSupabaseKey(saved.secretKey)) secretKey = saved.secretKey.trim();
      if (isValidSupabaseKey(saved.publishableKey)) publishableKey = saved.publishableKey.trim();
      if (isValidSupabaseKey(saved.key)) {
        const k = saved.key.trim();
        if (k.startsWith('sb_secret_') || k.includes('service_role')) {
          secretKey = k;
        } else {
          publishableKey = k;
        }
      }
      if (saved.jwksUrl) jwksUrl = saved.jwksUrl.trim();
      if (saved.databaseUrl && !saved.databaseUrl.includes('[YOUR-PASSWORD]')) {
        databaseUrl = saved.databaseUrl.trim();
      }
    } catch (e) {
      console.warn('Failed to parse .supabase-config.json:', e);
    }
  }

  // Use secretKey (sb_secret_...) for backend admin access, or fallback to publishableKey
  const activeKey = secretKey || publishableKey;

  return {
    url,
    key: activeKey,
    publishableKey,
    secretKey,
    jwksUrl,
    databaseUrl
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfig: SupabaseRuntimeConfig = loadSupabaseConfig();

export function getSupabaseClient(): SupabaseClient {
  const cfg = loadSupabaseConfig();
  if (!supabaseInstance || currentConfig.url !== cfg.url || currentConfig.key !== cfg.key) {
    currentConfig = cfg;
    supabaseInstance = createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseInstance;
}

export async function tryAutoCreateSchemaViaPostgres(): Promise<{ executed: boolean; error?: string }> {
  const cfg = loadSupabaseConfig();
  if (!cfg.databaseUrl) {
    return { executed: false };
  }
  const pool = new Pool({
    connectionString: cfg.databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });
  try {
    const sql = getSupabaseSqlScript();
    await pool.query(sql);
    await pool.end();
    return { executed: true };
  } catch (err: any) {
    await pool.end().catch(() => {});
    return { executed: false, error: err.message };
  }
}

export function saveSupabaseConfig(
  url: string,
  key: string,
  extra?: { secretKey?: string; publishableKey?: string; databaseUrl?: string }
): void {
  const cleanUrl = (url || DEFAULT_SUPABASE_URL).trim();
  const cleanKey = (key || DEFAULT_SUPABASE_SECRET_KEY).trim();
  const existing = loadSupabaseConfig();

  const payload = {
    url: cleanUrl,
    key: cleanKey,
    publishableKey: extra?.publishableKey || existing.publishableKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    secretKey: isValidSupabaseKey(extra?.secretKey) ? extra?.secretKey?.trim() : existing.secretKey,
    jwksUrl: existing.jwksUrl || DEFAULT_SUPABASE_JWKS_URL,
    databaseUrl: extra?.databaseUrl || existing.databaseUrl,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(RUNTIME_CONFIG_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  supabaseInstance = null;
}

export function getSupabaseSqlScript(): string {
  try {
    const sqlPath = path.resolve(process.cwd(), 'supabase_schema.sql');
    if (fs.existsSync(sqlPath)) {
      return fs.readFileSync(sqlPath, 'utf-8');
    }
  } catch {}
  return `-- Run in Supabase SQL Editor (${DEFAULT_SUPABASE_URL})
CREATE TABLE IF NOT EXISTS public.arc_collection_documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);
ALTER TABLE public.arc_collection_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to arc_collection_documents"
  ON public.arc_collection_documents FOR ALL
  TO anon, authenticated, service_role
  USING (true) WITH CHECK (true);`;
}
