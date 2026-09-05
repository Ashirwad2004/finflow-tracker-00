-- Persist group settlement payments with member-only access and audit fields.

CREATE TABLE IF NOT EXISTS public.group_settlements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'cancelled')),
    paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CHECK (from_user_id <> to_user_id)
);

ALTER TABLE public.group_settlements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_settlements_group_id
ON public.group_settlements(group_id, created_at DESC);

DROP POLICY IF EXISTS "Group members can view settlements" ON public.group_settlements;
CREATE POLICY "Group members can view settlements"
ON public.group_settlements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_settlements.group_id
      AND gm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Group members can record settlements" ON public.group_settlements;
CREATE POLICY "Group members can record settlements"
ON public.group_settlements FOR INSERT
WITH CHECK (
  paid_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.group_members payer
    WHERE payer.group_id = group_settlements.group_id
      AND payer.user_id = group_settlements.from_user_id
  )
  AND EXISTS (
    SELECT 1 FROM public.group_members recipient
    WHERE recipient.group_id = group_settlements.group_id
      AND recipient.user_id = group_settlements.to_user_id
  )
  AND EXISTS (
    SELECT 1 FROM public.group_members actor
    WHERE actor.group_id = group_settlements.group_id
      AND actor.user_id = auth.uid()
  )
);

REVOKE UPDATE, DELETE ON public.group_settlements FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'group_settlements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_settlements;
  END IF;
END;
$$;