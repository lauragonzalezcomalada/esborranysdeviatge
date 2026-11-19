create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  trip_id uuid not null references public.trips (id) on delete cascade
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  list_id uuid not null references public.lists (id) on delete cascade,
  selected boolean not null default false
);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

drop policy if exists "anon read lists" on public.lists;
create policy "anon read lists"
  on public.lists
  for select
  to anon
  using (true);

drop policy if exists "authenticated crud lists" on public.lists;
create policy "authenticated crud lists"
  on public.lists
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "anon read list items" on public.list_items;
create policy "anon read list items"
  on public.list_items
  for select
  to anon
  using (true);

drop policy if exists "authenticated crud list items" on public.list_items;
create policy "authenticated crud list items"
  on public.list_items
  for all
  to authenticated
  using (true)
  with check (true);

grant select on public.lists, public.list_items to anon, authenticated;
grant insert, update, delete on public.lists, public.list_items to authenticated;

alter table public.members enable row level security;

drop policy if exists "anon read members" on public.members;
create policy "anon read members"
  on public.members
  for select
  to anon
  using (true);

drop policy if exists "authenticated crud members" on public.members;
create policy "authenticated crud members"
  on public.members
  for all
  to authenticated
  using (true)
  with check (true);

grant select on public.members to anon, authenticated;
grant insert, update, delete on public.members to authenticated;

-- options.member_id is uuid and members.id is bigint, so they cannot be joined.
-- Existing values are null, so the cast drops them.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'options'
      and column_name = 'member_id'
      and udt_name = 'uuid'
  ) then
    alter table public.options drop constraint if exists options_member_id_fkey;
    alter table public.options
      alter column member_id type bigint using null;
  end if;
end $$;

alter table public.options drop constraint if exists options_member_id_fkey;

alter table public.options
  add constraint options_member_id_fkey
  foreign key (member_id) references public.members (id)
  on delete set null;
