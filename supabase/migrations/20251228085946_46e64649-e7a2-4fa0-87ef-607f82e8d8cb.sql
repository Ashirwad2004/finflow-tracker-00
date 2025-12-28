-- Create lent_money table
CREATE TABLE public.lent_money (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  person_name TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lent_money ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lent money" 
ON public.lent_money 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lent money" 
ON public.lent_money 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lent money" 
ON public.lent_money 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lent money" 
ON public.lent_money 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lent_money_updated_at
BEFORE UPDATE ON public.lent_money
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();