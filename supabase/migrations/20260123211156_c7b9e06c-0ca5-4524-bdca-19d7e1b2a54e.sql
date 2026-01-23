-- Make the bills bucket public so users can preview uploaded bills
UPDATE storage.buckets 
SET public = true 
WHERE id = 'bills';