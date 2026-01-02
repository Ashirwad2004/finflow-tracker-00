-- Add invite_code column to groups
ALTER TABLE public.groups ADD COLUMN invite_code TEXT UNIQUE;

-- Create function to generate invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-generate invite code on group creation
CREATE OR REPLACE FUNCTION public.set_group_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_invite_code_on_insert
BEFORE INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.set_group_invite_code();

-- Update existing groups with invite codes
UPDATE public.groups SET invite_code = public.generate_invite_code() WHERE invite_code IS NULL;

-- Create security definer function to check group membership (fixes infinite recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Drop old problematic policy
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;

-- Create new policy using security definer function
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

-- Also fix the group_expenses SELECT policy to use the function
DROP POLICY IF EXISTS "Members can view group expenses" ON public.group_expenses;
CREATE POLICY "Members can view group expenses"
ON public.group_expenses FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

-- Fix group_expenses INSERT policy
DROP POLICY IF EXISTS "Members can add group expenses" ON public.group_expenses;
CREATE POLICY "Members can add group expenses"
ON public.group_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_group_member(auth.uid(), group_id));

-- Add policy to allow viewing group by invite code (for joining)
CREATE POLICY "Anyone can view group by invite code"
ON public.groups FOR SELECT
USING (invite_code IS NOT NULL);