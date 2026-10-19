-- Staff tools in /admin (lib/admin-ops-server.ts). Every table here is
-- read and written only by the server with the service-role client:
-- members get what concerns them through server code, never directly, so
-- RLS is on with no policies and anon/authenticated have no grants.

-- One-click notices from staff to a member ("please check your API key").
-- Shown as a banner in the member's app until they dismiss it.
create table if not exists member_notices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'custom',
  title       text not null,
  body        text not null default '',
  link        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists member_notices_user_unread on member_notices (user_id, created_at desc) where read_at is null;

-- Site-wide banners and patch notes written in /admin (the code's
-- lib/site/patch-notes.ts stays as the history before this table).
create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('banner', 'patch')),
  level       text not null default 'info' check (level in ('info', 'warning', 'success')),
  title_ko    text not null,
  title_en    text not null default '',
  body_ko     text not null default '',
  body_en     text not null default '',
  version     text,
  link        text,
  published   boolean not null default false,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists announcements_live on announcements (kind, published, created_at desc);

-- Switches staff flip without a deploy: maintenance mode and paused tools.
create table if not exists site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table member_notices enable row level security;
alter table announcements enable row level security;
alter table site_settings enable row level security;
revoke all on member_notices, announcements, site_settings from anon, authenticated;
grant select, insert, update, delete on member_notices, announcements, site_settings to service_role;
