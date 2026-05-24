-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.online_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, refunded
    payment_method TEXT, -- card, upi, netbanking, wallet
    gateway TEXT NOT NULL, -- mock, stripe, razorpay
    gateway_order_id TEXT, -- stripe payment intent ID or razorpay order ID
    gateway_payment_id TEXT, -- stripe charge ID or razorpay payment ID
    payment_method_details JSONB DEFAULT '{}'::jsonb, -- card brand/last4, UPI VPA, bank, wallet details
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
    gateway_refund_id TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment audit logs table
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- order_created, payment_success, payment_failed, refund_initiated, refund_success
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for Store Owners (auth.uid() = user_id)
-- Payments
DROP POLICY IF EXISTS "Store owners can view their payments" ON public.payments;
CREATE POLICY "Store owners can view their payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- Refunds
DROP POLICY IF EXISTS "Store owners can view their refunds" ON public.refunds;
CREATE POLICY "Store owners can view their refunds"
ON public.refunds FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.payments
    WHERE payments.id = refunds.payment_id AND payments.user_id = auth.uid()
));

-- Audit Logs
DROP POLICY IF EXISTS "Store owners can view their payment audit logs" ON public.payment_audit_logs;
CREATE POLICY "Store owners can view their payment audit logs"
ON public.payment_audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- Invoices
DROP POLICY IF EXISTS "Store owners can view their invoices" ON public.invoices;
CREATE POLICY "Store owners can view their invoices"
ON public.invoices FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.payments
    WHERE payments.id = invoices.payment_id AND payments.user_id = auth.uid()
));

-- Allow public to select their own order payment status (for tracking order screens)
DROP POLICY IF EXISTS "Public can view their order payment status" ON public.payments;
CREATE POLICY "Public can view their order payment status"
ON public.payments FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.online_orders
    WHERE online_orders.id = payments.order_id
));

-- Allow public to select their invoice if linked to order
DROP POLICY IF EXISTS "Public can view their invoices" ON public.invoices;
CREATE POLICY "Public can view their invoices"
ON public.invoices FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.payments
    JOIN public.online_orders ON online_orders.id = payments.order_id
    WHERE payments.id = invoices.payment_id
));