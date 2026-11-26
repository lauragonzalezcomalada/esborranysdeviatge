alter table public.collections
  add column if not exists parent_id uuid;

alter table public.collections
  drop constraint if exists collections_parent_id_fkey;

alter table public.collections
  add constraint collections_parent_id_fkey
  foreign key (parent_id) references public.collections (id)
  on delete cascade;

alter table public.collections
  drop constraint if exists collections_parent_not_self;

alter table public.collections
  add constraint collections_parent_not_self
  check (parent_id is null or parent_id <> id);

create index if not exists collections_parent_id_idx
  on public.collections (parent_id);
