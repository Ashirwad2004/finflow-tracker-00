-- ALTER store_salesmen to add salesman_password column
ALTER TABLE public.store_salesmen 
ADD COLUMN IF NOT EXISTS salesman_password TEXT NOT NULL;
