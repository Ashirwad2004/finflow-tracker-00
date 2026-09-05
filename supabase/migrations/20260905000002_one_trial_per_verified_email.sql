-- Enforce one trial per verified email across deleted and recreated accounts.
-- Email is the strongest identity currently collected by the application.

CREATE TABLE IF NOT EXISTS public.trial_claims (
    normalized_email TEXT PRIMARY KEY,
    user_id UUID,
    claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trial_claims FROM PUBLIC, anon, authenticated;

-- Preserve the historical trial entitlement before changing signup behavior.
INSERT INTO public.trial_claims (normalized_email, user_id, claimed_at)
SELECT lower(trim(u.email)), s.user_id, COALESCE(s.updated_at, s.created_at, now())
FROM public.subscription_status s
JOIN auth.users u ON u.id = s.user_id
WHERE s.plan = 'trial'
  AND u.email IS NOT NULL
ON CONFLICT (normalized_email) DO NOTHING;

-- New accounts start as free. A trial is granted only after email confirmation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.onboarding_status (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.subscription_status (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_verified_email_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_claims INTEGER;
  normalized_email TEXT;
BEGIN
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  normalized_email := lower(trim(NEW.email));

  INSERT INTO public.trial_claims (normalized_email, user_id)
  VALUES (normalized_email, NEW.id)
  ON CONFLICT (normalized_email) DO NOTHING;

  GET DIAGNOSTICS inserted_claims = ROW_COUNT;

  IF inserted_claims = 1 THEN
    INSERT INTO public.subscription_status (
      user_id,
      plan,
      status,
      current_period_start,
      current_period_end
    )
    VALUES (
      NEW.id,
      'trial',
      'active',
      timezone('utc'::text, now()),
      timezone('utc'::text, now()) + interval '15 days'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET plan = 'trial',
        status = 'active',
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = timezone('utc'::text, now())
    WHERE public.subscription_status.plan = 'free';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed_trial ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_trial
AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.claim_verified_email_trial();

-- Ensure a confirmed account that already exists receives one claim only if it
-- has not already used a trial. Existing trial users were seeded above.
INSERT INTO public.trial_claims (normalized_email, user_id)
SELECT lower(trim(u.email)), u.id
FROM auth.users u
JOIN public.subscription_status s ON s.user_id = u.id
WHERE u.email IS NOT NULL
  AND u.email_confirmed_at IS NOT NULL
  AND s.plan = 'trial'
ON CONFLICT (normalized_email) DO NOTHING;
