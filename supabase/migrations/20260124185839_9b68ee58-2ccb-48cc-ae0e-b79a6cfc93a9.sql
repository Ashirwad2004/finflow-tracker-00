-- Create sales table (Invoices)
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text CHECK (status IN ('paid', 'pending', 'cancelled')) DEFAULT 'pending',
  payment_method text CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bill_number text,
  vendor_name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
  date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  attachment_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Policies for sales
CREATE POLICY "Users can view their own sales"
  ON public.sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON public.sales FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for purchases
CREATE POLICY "Users can view their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
  ON public.purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchases"
  ON public.purchases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchases"
  ON public.purchases FOR DELETE
  USING (auth.uid() = user_id);