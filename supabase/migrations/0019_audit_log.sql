-- Staff actions taken in /admin (lib/admin.ts logAdminAction): who did
-- what to which row. Written only by the service-role client; members
-- have no access at all.
create table if not exists audit_log (
  id             bigint generated always as identity primary key,
  actor_user_id  uuid references auth.users(id) on delete set null,
  action         text not null,
  target_table   text not null,
  target_id      text not null,
  detail         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

alter table audit_log enable row level security;
revoke all on audit_log from anon, authenticated;
grant select, insert on audit_log to service_role;

create index if not exists audit_log_created on audit_log (created_at desc);
