-- BUILD_SPEC §5 — core schema. RLS on every table.

-- brands: one per user in v1, table supports many for v2
create table brands (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  tone          text[] not null default '{}',
  voice_examples text[] not null default '{}',
  accent_color  text,
  logo_path     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- inputs: the raw thing the user brought
create table inputs (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete cascade,
  kind        text not null check (kind in ('image','url','notes')),
  storage_path text,
  source_url  text,
  raw_text    text,
  created_at  timestamptz not null default now()
);

-- facts: extracted, addressable, user-editable
create table facts (
  id          uuid primary key default gen_random_uuid(),
  input_id    uuid not null references inputs(id) on delete cascade,
  ref         text not null,
  label       text not null,
  value       text not null,
  confidence  real,
  edited_by_user boolean not null default false,
  unique (input_id, ref)
);

-- posts: a generated + composed output
create table posts (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  input_id      uuid not null references inputs(id) on delete cascade,
  headline      text not null,
  caption       text not null,
  hashtags      text[] not null default '{}',
  grounded_in   text[] not null default '{}',
  composition   jsonb not null default '{}',
  export_path   text,
  status        text not null default 'draft' check (status in ('draft','exported')),
  created_at    timestamptz not null default now()
);

-- generations: cost + rate-limit ledger
create table generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('extract','generate','render')),
  input_tokens int,
  output_tokens int,
  latency_ms   int,
  cost_usd     numeric(10,6),
  created_at   timestamptz not null default now()
);

-- updated_at bookkeeping for brands
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger brands_set_updated_at
  before update on brands
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: every table scoped to auth.uid() via brands.user_id
-- ---------------------------------------------------------------------

alter table brands enable row level security;
alter table inputs enable row level security;
alter table facts enable row level security;
alter table posts enable row level security;
alter table generations enable row level security;

-- RLS policies restrict rows, but Postgres also requires table-level
-- grants — tables created via raw SQL don't inherit the dashboard's
-- default grants the way tables created through the Table Editor do.
grant usage on schema public to authenticated;
grant select, insert, update, delete on brands, inputs, facts, posts, generations to authenticated;

create policy "brands_select_own" on brands
  for select using (user_id = auth.uid());
create policy "brands_insert_own" on brands
  for insert with check (user_id = auth.uid());
create policy "brands_update_own" on brands
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "brands_delete_own" on brands
  for delete using (user_id = auth.uid());

create policy "inputs_select_own" on inputs
  for select using (
    exists (select 1 from brands where brands.id = inputs.brand_id and brands.user_id = auth.uid())
  );
create policy "inputs_insert_own" on inputs
  for insert with check (
    exists (select 1 from brands where brands.id = inputs.brand_id and brands.user_id = auth.uid())
  );
create policy "inputs_update_own" on inputs
  for update using (
    exists (select 1 from brands where brands.id = inputs.brand_id and brands.user_id = auth.uid())
  );
create policy "inputs_delete_own" on inputs
  for delete using (
    exists (select 1 from brands where brands.id = inputs.brand_id and brands.user_id = auth.uid())
  );

create policy "facts_select_own" on facts
  for select using (
    exists (
      select 1 from inputs join brands on brands.id = inputs.brand_id
      where inputs.id = facts.input_id and brands.user_id = auth.uid()
    )
  );
create policy "facts_insert_own" on facts
  for insert with check (
    exists (
      select 1 from inputs join brands on brands.id = inputs.brand_id
      where inputs.id = facts.input_id and brands.user_id = auth.uid()
    )
  );
create policy "facts_update_own" on facts
  for update using (
    exists (
      select 1 from inputs join brands on brands.id = inputs.brand_id
      where inputs.id = facts.input_id and brands.user_id = auth.uid()
    )
  );
create policy "facts_delete_own" on facts
  for delete using (
    exists (
      select 1 from inputs join brands on brands.id = inputs.brand_id
      where inputs.id = facts.input_id and brands.user_id = auth.uid()
    )
  );

create policy "posts_select_own" on posts
  for select using (
    exists (select 1 from brands where brands.id = posts.brand_id and brands.user_id = auth.uid())
  );
create policy "posts_insert_own" on posts
  for insert with check (
    exists (select 1 from brands where brands.id = posts.brand_id and brands.user_id = auth.uid())
  );
create policy "posts_update_own" on posts
  for update using (
    exists (select 1 from brands where brands.id = posts.brand_id and brands.user_id = auth.uid())
  );
create policy "posts_delete_own" on posts
  for delete using (
    exists (select 1 from brands where brands.id = posts.brand_id and brands.user_id = auth.uid())
  );

create policy "generations_select_own" on generations
  for select using (user_id = auth.uid());
create policy "generations_insert_own" on generations
  for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage: private buckets, one folder per user (path prefix = auth.uid())
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('inputs', 'inputs', false), ('exports', 'exports', false), ('logos', 'logos', false)
on conflict (id) do nothing;

create policy "storage_own_folder_select" on storage.objects
  for select using (
    bucket_id in ('inputs', 'exports', 'logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_own_folder_insert" on storage.objects
  for insert with check (
    bucket_id in ('inputs', 'exports', 'logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_own_folder_update" on storage.objects
  for update using (
    bucket_id in ('inputs', 'exports', 'logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "storage_own_folder_delete" on storage.objects
  for delete using (
    bucket_id in ('inputs', 'exports', 'logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
