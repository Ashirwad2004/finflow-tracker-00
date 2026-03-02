-- Create the parties table
CREATE TABLE IF NOT EXISTS public.parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('customer', 'vendor', 'both')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_parties_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parties_updated_at
    BEFORE UPDATE ON public.parties
    FOR EACH ROW
    EXECUTE FUNCTION update_parties_updated_at_column();

-- Enable RLS
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own parties"
    ON public.parties FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parties"
    ON public.parties FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parties"
    ON public.parties FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parties"
    ON public.parties FOR DELETE
    USING (auth.uid() = user_id);

-- Create Index for faster searching
CREATE INDEX IF NOT EXISTS parties_user_id_idx ON public.parties(user_id);
CREATE INDEX IF NOT EXISTS parties_name_idx ON public.parties(name);
