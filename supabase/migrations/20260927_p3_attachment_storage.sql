-- Package 05: keep supporting-exam binary files in a private Supabase Storage bucket.
-- Database rows continue to hold only attachment metadata and the local attachment ID.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'rekammedisku-attachments',
  'rekammedisku-attachments',
  false,
  2097152
)
on conflict (id) do nothing;

drop policy if exists "RekamMedisku attachment read" on storage.objects;
create policy "RekamMedisku attachment read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rekammedisku-attachments'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "RekamMedisku attachment upload" on storage.objects;
create policy "RekamMedisku attachment upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rekammedisku-attachments'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "RekamMedisku attachment update" on storage.objects;
create policy "RekamMedisku attachment update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'rekammedisku-attachments'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'rekammedisku-attachments'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
);

drop policy if exists "RekamMedisku attachment delete" on storage.objects;
create policy "RekamMedisku attachment delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rekammedisku-attachments'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
);
