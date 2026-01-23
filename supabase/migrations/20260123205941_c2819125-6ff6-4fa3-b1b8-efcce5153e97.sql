-- Create table for tracking borrowed money (debts)
CREATE TABLE public.borrowed_money (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  amount numeric NOT NULL,
  person_name text NOT NULL,
  description text NULL,
  due_date timestamp with time zone NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  CONSTRAINT borrowed_money_pkey PRIMARY KEY (id),
  CONSTRAINT borrowed_money_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.borrowed_money ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own borrowed money records" ON public.borrowed_money
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own borrowed money records" ON public.borrowed_money
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own borrowed money records" ON public.borrowed_money
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own borrowed money records" ON public.borrowed_money
  FOR DELETE USING (auth.uid() = user_id);