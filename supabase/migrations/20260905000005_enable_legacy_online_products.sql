-- Products created before online listing support may have a NULL flag.
-- Preserve explicit false values, but make legacy NULL products visible online.
UPDATE public.products
SET is_listed_online = true
WHERE is_listed_online IS NULL;

ALTER TABLE public.products
ALTER COLUMN is_listed_online SET DEFAULT true;
