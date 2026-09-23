-- Stage 6: admin screen. Every staff action (answering a ticket,
-- approving/rejecting a student verification) writes one row here via
-- the service-role client — never client-writable, matching the
-- lockdown pattern in 0011. RLS is enabled with no policies as defense
-- in depth even though nothing here is ever granted to authenticated/anon.
create table audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references auth.users(id) on delete set null,
  action         text not null,
  target_table   text not null,
  target_id      text not null,
  detail         jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

alter table audit_log enable row level security;

create index audit_log_created_at on audit_log (created_at desc);
