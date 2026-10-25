CREATE TABLE IF NOT EXISTS public.user_feedback (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name      TEXT NOT NULL,
  business_name    TEXT NOT NULL,
  business_type    TEXT,
  city             TEXT,
  state            TEXT,
  rating           INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category         TEXT NOT NULL DEFAULT 'pos'
                     CHECK (category IN ('pos', 'inventory', 'gst', 'khata', 'general')),
  highlight_figure TEXT,
  highlight_label  TEXT,
  feedback_text    TEXT NOT NULL,
  recommend        BOOLEAN NOT NULL DEFAULT true,
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  is_featured      BOOLEAN NOT NULL DEFAULT true,
  helpful_count    INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'approved'
                     CHECK (status IN ('pending', 'approved', 'declined')),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_phone    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimize queries by status and timestamp
CREATE INDEX IF NOT EXISTS idx_user_feedback_status_created
  ON public.user_feedback(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_category_status
  ON public.user_feedback(category, status);

-- Enable Row Level Security
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public read of approved feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_feedback' AND policyname = 'public_read_approved_feedback'
  ) THEN
    CREATE POLICY public_read_approved_feedback ON public.user_feedback
      FOR SELECT
      TO public
      USING (status = 'approved');
  END IF;
END $$;

-- Allow public insertion of reviews (status defaults to approved or can be moderated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_feedback' AND policyname = 'public_insert_feedback'
  ) THEN
    CREATE POLICY public_insert_feedback ON public.user_feedback
      FOR INSERT
      TO public
      WITH CHECK (
        length(trim(author_name)) >= 2 AND
        length(trim(business_name)) >= 2 AND
        length(trim(feedback_text)) >= 10 AND
        rating >= 1 AND rating <= 5
      );
  END IF;
END $$;

-- Remove the placeholder reviews that earlier revisions of this migration
-- seeded. The reviews wall shows only what real merchants submit, so these
-- fixed ids are purged wherever they were already applied.
DELETE FROM public.user_feedback
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006'
);
