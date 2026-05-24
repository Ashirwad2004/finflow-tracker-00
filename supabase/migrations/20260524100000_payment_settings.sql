-- Add payment configuration columns to profiles table
-- Allows shopkeepers to configure their own payment credentials

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
  ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT FALSE;

-- Comment on columns for clarity
COMMENT ON COLUMN public.profiles.upi_id IS 'Shopkeeper UPI VPA address for receiving QR payments (e.g. shop@upi)';
COMMENT ON COLUMN public.profiles.payment_gateway IS 'Active payment gateway: mock, razorpay, or stripe';
COMMENT ON COLUMN public.profiles.razorpay_key_id IS 'Razorpay Key ID for checkout integration';
COMMENT ON COLUMN public.profiles.stripe_publishable_key IS 'Stripe Publishable Key for Elements integration';
COMMENT ON COLUMN public.profiles.online_payment_enabled IS 'Whether online payments are enabled for this store';