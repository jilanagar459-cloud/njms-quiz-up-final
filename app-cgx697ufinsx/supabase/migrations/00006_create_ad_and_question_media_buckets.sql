
-- Bucket for advertisement images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ad-images', 'ad-images', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do nothing;

-- Bucket for question media (photos + videos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-media', 'question-media', true, 104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/ogg','video/quicktime']
)
on conflict (id) do nothing;

-- RLS: admins can upload/delete ad images
create policy "Admin upload ad images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ad-images' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin delete ad images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ad-images' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Public read ad images" on storage.objects
  for select using (bucket_id = 'ad-images');

-- RLS: admins can upload/delete question media
create policy "Admin upload question media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'question-media' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin delete question media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'question-media' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Public read question media" on storage.objects
  for select using (bucket_id = 'question-media');
