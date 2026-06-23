-- CREATE ORDER RETURNS TABLE
CREATE TABLE IF NOT EXISTS public.order_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anonymous role (storefront users) and authenticated role
GRANT SELECT, INSERT ON public.order_returns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_returns TO authenticated;

-- RLS Policies
-- Allow anyone (storefront visitors) to submit a return request
CREATE POLICY "Public can insert returns" 
ON public.order_returns FOR INSERT 
WITH CHECK (true);

-- Allow anyone to view returns (storefront needs to see return status for their orders)
CREATE POLICY "Public can view returns" 
ON public.order_returns FOR SELECT 
USING (true);

-- Allow store owners to view returns for their store
CREATE POLICY "Store owners can view returns"
ON public.order_returns FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.online_orders
    WHERE online_orders.id = order_returns.order_id AND online_orders.store_id = auth.uid()
));

-- Allow store owners to update returns (approve/reject)
CREATE POLICY "Store owners can update returns"
ON public.order_returns FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.online_orders
    WHERE online_orders.id = order_returns.order_id AND online_orders.store_id = auth.uid()
));

-- CREATE BUCKET FOR RETURN IMAGES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'return-images',
    'return-images',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for return images bucket
DROP POLICY IF EXISTS "Anyone can upload return images" ON storage.objects;
CREATE POLICY "Anyone can upload return images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'return-images');

DROP POLICY IF EXISTS "Anyone can view return images" ON storage.objects;
CREATE POLICY "Anyone can view return images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'return-images');
