-- =============================================================================
-- ARC COMMUNITY PORTAL - SUPABASE POSTGRESQL COMPLETE DATABASE SCHEMA
-- Project URL: https://afkdbmntchllpucshuxe.supabase.co
-- Host: db.afkdbmntchllpucshuxe.supabase.co | Port: 5432 | DB: postgres | User: postgres
-- Run this entire script in the Supabase SQL Editor
-- =============================================================================

-- 1. Create the main document-store table used by the ARC Portal DB Adapter
CREATE TABLE IF NOT EXISTS public.arc_collection_documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_arc_docs_collection 
  ON public.arc_collection_documents (collection);

CREATE INDEX IF NOT EXISTS idx_arc_docs_updated_at 
  ON public.arc_collection_documents (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_arc_docs_data_gin 
  ON public.arc_collection_documents USING GIN (data);

-- Auto-update timestamp trigger function
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

-- Enable RLS & Policies for arc_collection_documents
ALTER TABLE public.arc_collection_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to arc_collection_documents" ON public.arc_collection_documents;
CREATE POLICY "Allow full access to arc_collection_documents"
  ON public.arc_collection_documents
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.arc_collection_documents TO anon, authenticated, service_role;

-- 2. Create individual SQL Views for all 45 ARC Portal Collections so you can
--    inspect and query every module table directly in Supabase Table Editor!
DO $$
DECLARE
  col_name TEXT;
  collections TEXT[] := ARRAY[
    'system',
    'counters',
    'users',
    'sessions',
    'roles',
    'clubMembers',
    'siteSettings',
    'slideshow',
    'contacts',
    'socialLinks',
    'excoMembers',
    'events',
    'eventItems',
    'meetingItems',
    'quizQuestions',
    'quizSubmissions',
    'quizWinners',
    'quizPrizes',
    'quizSponsors',
    'masterIneligibleParticipants',
    'auditLogs',
    'inboxMessages',
    'appNotifications',
    'clubRules',
    'budgetAccounts',
    'incomeRecords',
    'expenseRecords',
    'accountTransfers',
    'contributionSettings',
    'memberContributions',
    'contributionPaymentRequests',
    'budgetAllocations',
    'presidentialDirectives',
    'officialCirculars',
    'userPerformance',
    'invoices',
    'healthAwareness',
    'rental_items',
    'rental_units',
    'rental_customers',
    'rental_bookings',
    'rental_payments',
    'rental_handovers',
    'rental_returns',
    'rental_stock_movements',
    'rental_settings'
  ];
BEGIN
  FOREACH col_name IN ARRAY collections
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.%I AS SELECT id, data, updated_at FROM public.arc_collection_documents WHERE collection = %L;',
      'v_' || lower(col_name),
      col_name
    );
  END LOOP;
END $$;

-- 3. Enable Supabase Realtime on arc_collection_documents
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

-- 4. Create Supabase Storage Bucket for Uploads (Contribution Slips, Receipts, Slideshow, etc.)
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
