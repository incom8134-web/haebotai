-- Phase 4 (docs/redesign-plan.md §4.3–4.4): projects, project memory and
-- result versions.
--
-- projects: a member's businesses or initiatives. Written by the member
--   directly (own rows only) — no credits involved.
-- project_facts: what the project knows (target customer, positioning,
--   palette…), one value per key. Filled by finished runs (server, service
--   role) and edited by the member.
-- generations: which project a run belongs to, a member-given title, and
--   parent_run_id for versions (a partial regeneration is a new run whose
--   parent is the run it revised). generations stays insert/update-revoked
--   for members (0011); these columns are written by server routes that
--   check ownership in code.

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_user_updated on projects (user_id, updated_at desc);

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

grant select, insert, update, delete on projects to authenticated;
alter table projects enable row level security;
drop policy if exists "projects_select_own" on projects;
drop policy if exists "projects_insert_own" on projects;
drop policy if exists "projects_update_own" on projects;
drop policy if exists "projects_delete_own" on projects;
create policy "projects_select_own" on projects for select using (user_id = auth.uid());
create policy "projects_insert_own" on projects for insert with check (user_id = auth.uid());
create policy "projects_update_own" on projects for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "projects_delete_own" on projects for delete using (user_id = auth.uid());

create table if not exists project_facts (
  project_id    uuid not null references projects(id) on delete cascade,
  key           text not null check (key ~ '^[a-z_]{2,40}$'),
  value         text not null check (char_length(value) between 1 and 2000),
  source_run_id uuid references generations(id) on delete set null,
  source_tool   text,
  updated_at    timestamptz not null default now(),
  primary key (project_id, key)
);

grant select, insert, update, delete on project_facts to authenticated;
alter table project_facts enable row level security;
drop policy if exists "project_facts_own" on project_facts;
create policy "project_facts_own" on project_facts for all
  using (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()));

alter table generations
  add column if not exists project_id uuid references projects(id) on delete set null,
  add column if not exists title text check (title is null or char_length(title) <= 120),
  add column if not exists parent_run_id uuid references generations(id) on delete set null;
create index if not exists generations_project on generations (project_id, created_at desc) where project_id is not null;
create index if not exists generations_parent on generations (parent_run_id) where parent_run_id is not null;
