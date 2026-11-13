alter table public.resources enable row level security;

drop policy if exists "public read resources" on public.resources;
create policy "public read resources"
  on public.resources
  for select
  to anon, authenticated
  using (true);
