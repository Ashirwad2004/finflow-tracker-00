-- Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   TEXT,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewed', 'approved', 'declined', 'completed')),
  notes        TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_submitted ON public.feature_requests(submitted_at DESC);

-- Trigger to update updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.feature_requests;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.feature_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS to restrict public access, allowing only service role (Python backend)
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;