-- =============================================================================
-- ARC COMMUNITY PORTAL - SUPABASE POSTGRESQL SCHEMA & STORAGE SETUP
-- Project URL: https://afkdbmntchllpucshuxe.supabase.co
-- Run this entire script in the Supabase SQL Editor
-- =============================================================================

-- 1. Create the main document-store table used by the ARC Portal DB Adapter
--    Every collection (users, members, events, quiz, budget, rentals, etc.)
--    is stored cleanly indexed by (collection, id) with JSONB payload.
CREATE TABLE IF NOT EXISTS public.arc_collection_documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);

-- Indexes for fast collection scans and JSONB field lookups
CREATE INDEX IF NOT EXISTS idx_arc_docs_collection 
  ON public.arc_collection_documents (collection);

CREATE INDEX IF NOT EXISTS idx_arc_docs_updated_at 
  ON public.arc_collection_documents (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_arc_docs_data_gin 
  ON public.arc_collection_documents USING GIN (data);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_arc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_arc_docs_updated_at ON public.arc_collection_documents;
CREATE TRIGGER trg_arc_docs_updated_at
  BEFORE UPDATE ON public.arc_collection_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_arc_updated_at();

-- 2. Enable Row Level Security (RLS) & Policies so both Service Role and Anon Key work
ALTER TABLE public.arc_collection_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to arc_collection_documents" ON public.arc_collection_documents;
CREATE POLICY "Allow full access to arc_collection_documents"
  ON public.arc_collection_documents
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 3. Grant permissions to Supabase roles
GRANT ALL ON TABLE public.arc_collection_documents TO anon, authenticated, service_role;

-- 4. Enable Supabase Realtime for live portal synchronization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'arc_collection_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arc_collection_documents;
  END IF;
END $$;

-- 5. Create Storage Bucket for Uploads (Contribution Slips, Receipts, Slideshow, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('arc-uploads', 'arc-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to arc-uploads" ON storage.objects;
CREATE POLICY "Public Access to arc-uploads"
  ON storage.objects
  FOR ALL
  TO anon, authenticated, service_role
  USING (bucket_id = 'arc-uploads')
  WITH CHECK (bucket_id = 'arc-uploads');
