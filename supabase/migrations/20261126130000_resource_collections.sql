create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  trip_id uuid not null references public.trips (id) on delete cascade
);

create index if not exists collections_trip_id_idx
  on public.collections (trip_id);

alter table public.resources
  add column if not exists collection_id uuid;

alter table public.resources
  drop constraint if exists resources_collection_id_fkey;

alter table public.resources
  add constraint resources_collection_id_fkey
  foreign key (collection_id) references public.collections (id)
  on delete set null;

create index if not exists resources_collection_id_idx
  on public.resources (collection_id);

alter table public.collections enable row level security;

drop policy if exists "anon read collections" on public.collections;
create policy "anon read collections"
  on public.collections
  for select
  to anon
  using (true);

drop policy if exists "authenticated crud collections" on public.collections;
create policy "authenticated crud collections"
  on public.collections
  for all
  to authenticated
  using (true)
  with check (true);

grant select on public.collections to anon, authenticated;
grant insert, update, delete on public.collections to authenticated;
