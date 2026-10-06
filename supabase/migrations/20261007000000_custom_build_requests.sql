-- Custom build requests from the landing page
--
-- The landing page's "custom work" section takes requests from visitors who are
-- not signed in, so a row can carry no user_id and must carry its own contact
-- details instead.
--
-- SELF-SUFFICIENT BY DESIGN. feature_requests was introduced in
-- 20260627161500_create_feature_requests.sql, whose timestamp predates
-- migrations already applied, so on a database where it was inserted out of
-- order it may never have run -- and ALTERing a table that does not exist
-- aborts the whole script. Every statement here is idempotent.

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

CREATE INDEX IF NOT EXISTS idx_feature_requests_status
  ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_submitted
  ON public.feature_requests(submitted_at DESC);

-- RLS with no policy for `authenticated`: only the service role (the Python
-- backend) reads or writes this table. The public intake endpoint is
-- unauthenticated, so letting the anon role insert directly would hand anyone
-- an unmetered write.
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Contact and classification for anonymous requests
-- ---------------------------------------------------------------------------

-- A signed-in request is reachable through user_id; a landing-page request is
-- only reachable through what the visitor typed, so these are the whole lead.
ALTER TABLE public.feature_requests
  ADD COLUMN IF NOT EXISTS contact_name TEXT;

ALTER TABLE public.feature_requests
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE public.feature_requests
  ADD COLUMN IF NOT EXISTS business_name TEXT;

-- What kind of work is being asked for, so the queue can be triaged without
-- reading every description.
ALTER TABLE public.feature_requests
  ADD COLUMN IF NOT EXISTS build_type TEXT;

-- Where the request came in from. Defaults to 'app' so existing rows, which
-- were all submitted from inside the product, stay correctly labelled.
ALTER TABLE public.feature_requests
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app';

-- Added as a separate statement so the constraint applies to the column above
-- whether it was just created or already existed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_requests_source_check'
  ) THEN
    ALTER TABLE public.feature_requests
      ADD CONSTRAINT feature_requests_source_check
      CHECK (source IN ('app', 'landing'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_requests_build_type_check'
  ) THEN
    ALTER TABLE public.feature_requests
      ADD CONSTRAINT feature_requests_build_type_check
      CHECK (build_type IS NULL OR build_type IN ('feature', 'report', 'integration', 'custom_app'));
  END IF;
END $$;

-- The admin queue filters the landing-page leads out of the in-app backlog.
CREATE INDEX IF NOT EXISTS idx_feature_requests_source_submitted
  ON public.feature_requests(source, submitted_at DESC);
