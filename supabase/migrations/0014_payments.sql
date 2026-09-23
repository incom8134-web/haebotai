-- Stage 6: Pro payments via Toss Payments, one-time charge per period
-- (true 자동결제/billing needs a separate risk review + contract with
-- Toss — not something available on signup, so this isn't silent
-- recurring billing yet). Every row here is money moving in the real
-- world: never client-writable, matching the 0011 lockdown pattern —
-- the pending row is created server-side at checkout start, and only
-- the Toss success/fail webhook routes (via the service-role client)
-- ever update it afterward.
create table payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  order_id     text not null unique,
  payment_key  text,
  amount       int not null,
  plan         text not null default 'pro' check (plan in ('pro')),
  status       text not null default 'pending' check (status in ('pending', 'done', 'failed', 'canceled')),
  fail_reason  text,
  raw          jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table payments enable row level security;
grant select on payments to authenticated;
create policy "payments_select_own" on payments for select using (user_id = auth.uid());

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

create index payments_user_created on payments (user_id, created_at desc);
