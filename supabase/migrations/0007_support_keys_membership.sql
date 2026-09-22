-- Support center, bring-your-own API key, and membership (incl. student
-- verification). Users read/write only their own rows; staff actions
-- (answering tickets, approving students) go through the service role.

-- ── Support tickets ────────────────────────────────────────────────────
create table support_tickets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  kind           text not null check (kind in ('question', 'bug', 'billing', 'feature', 'remote')),
  subject        text not null check (char_length(subject) between 2 and 120),
  body           text not null check (char_length(body) between 5 and 4000),
  contact        text,
  preferred_time text,
  status         text not null default 'open' check (status in ('open', 'answered', 'closed')),
  reply          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table support_tickets enable row level security;
grant select, insert on support_tickets to authenticated;

create policy "support_tickets_select_own" on support_tickets
  for select using (user_id = auth.uid());
create policy "support_tickets_insert_own" on support_tickets
  for insert with check (user_id = auth.uid() and status = 'open' and reply is null);

create trigger support_tickets_set_updated_at
  before update on support_tickets
  for each row execute function set_updated_at();

create index support_tickets_user_created on support_tickets (user_id, created_at desc);

-- ── User API keys (encrypted at rest by the app, AES-256-GCM) ──────────
create table user_api_keys (
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null default 'google' check (provider in ('google')),
  ciphertext  text not null,
  last4       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table user_api_keys enable row level security;
grant select, insert, update, delete on user_api_keys to authenticated;

create policy "user_api_keys_select_own" on user_api_keys for select using (user_id = auth.uid());
create policy "user_api_keys_insert_own" on user_api_keys for insert with check (user_id = auth.uid());
create policy "user_api_keys_update_own" on user_api_keys for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_api_keys_delete_own" on user_api_keys for delete using (user_id = auth.uid());

create trigger user_api_keys_set_updated_at
  before update on user_api_keys
  for each row execute function set_updated_at();

-- ── Membership ─────────────────────────────────────────────────────────
-- Read-only for users. A missing row means the free plan.
create table memberships (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  plan        text not null default 'free' check (plan in ('free', 'pro', 'student')),
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table memberships enable row level security;
grant select on memberships to authenticated;
create policy "memberships_select_own" on memberships for select using (user_id = auth.uid());

create trigger memberships_set_updated_at
  before update on memberships
  for each row execute function set_updated_at();

-- Student verification requests — reviewed by staff, who then upsert
-- memberships(plan = 'student', expires_at = now() + interval '1 year').
create table student_verifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  school_name  text not null check (char_length(school_name) between 2 and 80),
  school_email text,
  note         text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);

alter table student_verifications enable row level security;
grant select, insert on student_verifications to authenticated;
create policy "student_verifications_select_own" on student_verifications for select using (user_id = auth.uid());
create policy "student_verifications_insert_own" on student_verifications
  for insert with check (user_id = auth.uid() and status = 'pending');
