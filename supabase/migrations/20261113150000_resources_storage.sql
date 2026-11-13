insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do update set public = true;

drop policy if exists "public resources objects" on storage.objects;
create policy "public resources objects"
  on storage.objects
  for all
  to anon, authenticated
  using (bucket_id = 'resources')
  with check (bucket_id = 'resources');
