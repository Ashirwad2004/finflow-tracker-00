-- Migration: 20260718190000_secure_private_buckets.sql
-- Description: Sets bills storage bucket to private and secures it with strict RLS for Signed URLs.

-- 1. Make the bills bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'bills';

-- 2. Drop existing overly permissive select policies on bills if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own bills" ON storage.objects;

-- 3. Create strict policy: Users can only SELECT (to generate Signed URL) their own objects
CREATE POLICY "Users can generate signed URLs for their own bills"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'bills' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Note: The insert/update/delete policies are assumed to already check folder ownership
-- from earlier migrations. This strictly locks down the SELECT/GET access.
