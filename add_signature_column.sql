alter table profiles 
add column if not exists signature_url text;

-- Create storage bucket for business assets if it doesn't exist
insert into storage.buckets (id, name, public)
values ('business_assets', 'business_assets', true)
on conflict (id) do nothing;

-- Allow public access to business_assets
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'business_assets' );

-- Allow authenticated users to upload to business_assets
create policy "Authenticated users can upload"
on storage.objects for insert
with check ( bucket_id = 'business_assets' and auth.role() = 'authenticated' );

-- Allow users to update their own assets (simple policy)
create policy "Authenticated users can update"
on storage.objects for update
with check ( bucket_id = 'business_assets' and auth.role() = 'authenticated' );
