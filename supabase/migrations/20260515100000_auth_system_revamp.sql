-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    theme TEXT DEFAULT 'system',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    currency TEXT DEFAULT 'USD',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create onboarding_status table
CREATE TABLE IF NOT EXISTS public.onboarding_status (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    has_completed_profile BOOLEAN DEFAULT FALSE,
    has_seen_tutorial BOOLEAN DEFAULT FALSE,
    has_created_first_expense BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create subscription_status table
CREATE TABLE IF NOT EXISTS public.subscription_status (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own onboarding status" ON public.onboarding_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own onboarding status" ON public.onboarding_status FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert their own onboarding status" ON public.onboarding_status FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscription status" ON public.subscription_status FOR SELECT USING (auth.uid() = user_id);
-- Normally subscription status is updated by webhook (admin/service role), but if users need to update it:
CREATE POLICY "Users can update their own subscription status" ON public.subscription_status FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription status" ON public.subscription_status FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update handle_new_user function to insert into all tables
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

  -- 4. Subscription
  INSERT INTO public.subscription_status (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_onboarding_status_updated_at BEFORE UPDATE ON public.onboarding_status FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_subscription_status_updated_at BEFORE UPDATE ON public.subscription_status FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
