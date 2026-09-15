-- Fix new user signup & email confirmation database triggers
-- 1. Fix ambiguous column reference 'normalized_email' in claim_verified_email_trial
-- 2. Restore handle_new_user to properly initialize profiles, user_settings, onboarding_status, and subscription_status

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Profile
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  -- 2. Settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Onboarding
  INSERT INTO public.onboarding_status (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 4. Subscription (Default free plan on creation)
  INSERT INTO public.subscription_status (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
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
  v_inserted_claims INTEGER := 0;
  v_normalized_email TEXT;
BEGIN
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_normalized_email := lower(trim(NEW.email));

  -- Insert claim record avoiding ambiguous column shadowing
  INSERT INTO public.trial_claims (normalized_email, user_id)
  VALUES (v_normalized_email, NEW.id)
  ON CONFLICT (normalized_email) DO NOTHING;

  GET DIAGNOSTICS v_inserted_claims = ROW_COUNT;

  -- Grant 15-day trial only if this is the first time this email is claimed
  IF v_inserted_claims = 1 THEN
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in claim_verified_email_trial: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure triggers are properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_trial ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_trial
  AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_verified_email_trial();

-- Grant permissions to roles executing or touched by triggers
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_verified_email_trial() TO anon, authenticated, service_role;
GRANT ALL ON public.trial_claims TO service_role, postgres;
GRANT ALL ON public.profiles TO service_role, postgres;
GRANT ALL ON public.user_settings TO service_role, postgres;
GRANT ALL ON public.onboarding_status TO service_role, postgres;
GRANT ALL ON public.subscription_status TO service_role, postgres;
