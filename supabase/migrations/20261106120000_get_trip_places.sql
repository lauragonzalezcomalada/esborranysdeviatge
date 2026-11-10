alter table public.places
  add column if not exists longitude double precision,
  add column if not exists latitude double precision;

create or replace function public.get_trip_places(p_trip_id uuid)
returns setof public.places
language sql
stable
security invoker
as $$
  select *
  from public.places
  where trip_id = p_trip_id
  order by order_weight asc, created_at asc;
$$;

grant execute on function public.get_trip_places(uuid) to anon, authenticated;

alter table public.trips enable row level security;
alter table public.places enable row level security;

drop policy if exists "public trips" on public.trips;
create policy "public trips"
  on public.trips
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "public places" on public.places;
create policy "public places"
  on public.places
  for all
  to anon, authenticated
  using (true)
  with check (true);
