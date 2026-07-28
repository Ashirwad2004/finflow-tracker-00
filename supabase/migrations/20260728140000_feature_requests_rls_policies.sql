-- Migration: 20260728140000_feature_requests_rls_policies.sql
-- Description: Adds RLS policies to public.feature_requests allowing authenticated users to create requests, and admins to view and manage all feature requests.

-- 1. Allow authenticated users to submit feature requests
DROP POLICY IF EXISTS "Users can create feature requests" ON public.feature_requests;
CREATE POLICY "Users can create feature requests"
    ON public.feature_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. Allow admins and request owners to view feature requests
DROP POLICY IF EXISTS "Admins can view all feature requests" ON public.feature_requests;
CREATE POLICY "Admins can view all feature requests"
    ON public.feature_requests FOR SELECT
    USING (
        (SELECT COALESCE(is_admin, false) FROM public.profiles WHERE user_id = auth.uid()) = true
        OR auth.uid() = user_id
    );

-- 3. Allow admins to update feature requests (status and developer notes)
DROP POLICY IF EXISTS "Admins can update feature requests" ON public.feature_requests;
CREATE POLICY "Admins can update feature requests"
    ON public.feature_requests FOR UPDATE
    USING (
        (SELECT COALESCE(is_admin, false) FROM public.profiles WHERE user_id = auth.uid()) = true
    );
