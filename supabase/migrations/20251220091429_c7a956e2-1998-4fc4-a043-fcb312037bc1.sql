-- Create split_bills table
CREATE TABLE public.split_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create split_bill_participants table
CREATE TABLE public.split_bill_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  split_bill_id UUID NOT NULL REFERENCES public.split_bills(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on split_bills
ALTER TABLE public.split_bills ENABLE ROW LEVEL SECURITY;

-- Enable RLS on split_bill_participants
ALTER TABLE public.split_bill_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for split_bills
CREATE POLICY "Users can view their own split bills" 
ON public.split_bills 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own split bills" 
ON public.split_bills 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own split bills" 
ON public.split_bills 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own split bills" 
ON public.split_bills 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for split_bill_participants (based on parent split_bill ownership)
CREATE POLICY "Users can view participants of their split bills" 
ON public.split_bill_participants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.split_bills 
  WHERE id = split_bill_id AND user_id = auth.uid()
));

CREATE POLICY "Users can add participants to their split bills" 
ON public.split_bill_participants 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.split_bills 
  WHERE id = split_bill_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update participants of their split bills" 
ON public.split_bill_participants 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.split_bills 
  WHERE id = split_bill_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete participants from their split bills" 
ON public.split_bill_participants 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.split_bills 
  WHERE id = split_bill_id AND user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_split_bills_updated_at
BEFORE UPDATE ON public.split_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();