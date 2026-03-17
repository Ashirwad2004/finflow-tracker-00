-- ============================================================
-- FinFlow: Book a Demo — Supabase SQL Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mimremmiwehqzrxthdgn/sql
-- ============================================================

-- 1. Demo Requests table
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        TEXT NOT NULL,
  name         TEXT,
  status       TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'called', 'converted', 'spam')),
  notes        TEXT,
  ip_hash      TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_demo_requests_status
  ON public.demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_submitted
  ON public.demo_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_ip
  ON public.demo_requests(ip_hash);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.demo_requests;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.demo_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Rate-limiting / Cooldown table
CREATE TABLE IF NOT EXISTS public.demo_cooldowns (
  phone    TEXT PRIMARY KEY,
  last_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row Level Security
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_cooldowns ENABLE ROW LEVEL SECURITY;

-- Public (anon): can INSERT demo requests
CREATE POLICY "public_insert_demo"
  ON public.demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated (admin): can SELECT all requests
CREATE POLICY "auth_select_demo"
  ON public.demo_requests FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated (admin): can UPDATE status/notes
CREATE POLICY "auth_update_demo"
  ON public.demo_requests FOR UPDATE
  TO authenticated
  USING (true);

-- Cooldown: public read/write (keyed by phone)
CREATE POLICY "public_cooldown_rw"
  ON public.demo_cooldowns FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);