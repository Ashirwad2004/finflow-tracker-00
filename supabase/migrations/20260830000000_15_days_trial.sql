-- Update handle_new_user function to insert a 15-day trial subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Onboarding
  INSERT INTO public.onboarding_status (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 4. Subscription (Setting default plan as trial for 15 days)
  INSERT INTO public.subscription_status (user_id, plan, status, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    'trial',
    'active',
    now(),
    now() + interval '15 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing free or uninitialized user accounts to the 15-day trial
UPDATE public.subscription_status
SET plan = 'trial',
    status = 'active',
    current_period_start = COALESCE(current_period_start, created_at, now()),
    current_period_end = COALESCE(current_period_end, created_at + interval '15 days', now() + interval '15 days')
WHERE plan = 'free' OR plan IS NULL;