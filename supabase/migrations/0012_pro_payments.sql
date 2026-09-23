-- Pro plan purchase via Toss Payments (결제위젯, one-time 30-day pass).
--
-- `payments` is the order ledger: the server inserts a `pending` row with
-- the amount BEFORE the payment widget opens, and the confirm route
-- checks Toss's redirect against that row (never against the client's
-- amount). Users can read their own rows; every write goes through the
-- service role, same posture as 0011.
--
-- activate_pro() finishes an order in one transaction: pending → done,
-- Pro membership extended by p_days, p_credits added to the balance.
-- It only acts on a still-pending row, so a replayed success redirect or
-- a double-submitted confirm can't grant twice.

create table payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  order_id      text not null unique check (order_id ~ '^[A-Za-z0-9_-]{6,64}$'),
  plan          text not null check (plan in ('pro')),
  amount        int not null check (amount > 0),
  status        text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  payment_key   text,
  method        text,
  failure       text,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index payments_user_created on payments (user_id, created_at desc);

alter table payments enable row level security;
grant select on payments to authenticated;
create policy "payments_select_own" on payments for select using (user_id = auth.uid());

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

create or replace function activate_pro(
  p_order_id text,
  p_payment_key text,
  p_method text,
  p_approved_at timestamptz,
  p_days int,
  p_credits int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  update payments
    set status = 'done', payment_key = p_payment_key, method = p_method, approved_at = p_approved_at
    where order_id = p_order_id and status = 'pending'
    returning user_id into v_user_id;

  if v_user_id is null then
    return false; -- unknown or already finished order: nothing granted
  end if;

  -- Extend from the later of now and a still-running Pro period, so
  -- renewing early never loses days.
  insert into memberships (user_id, plan, expires_at)
  values (v_user_id, 'pro', now() + make_interval(days => p_days))
  on conflict (user_id) do update
    set plan = 'pro',
        expires_at = greatest(
          case when memberships.plan = 'pro' then memberships.expires_at end,
          now()
        ) + make_interval(days => p_days);

  insert into user_credits (user_id) values (v_user_id)
  on conflict (user_id) do nothing;
  update user_credits set balance = balance + p_credits where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function activate_pro(text, text, text, timestamptz, int, int) from public, authenticated, anon;
grant execute on function activate_pro(text, text, text, timestamptz, int, int) to service_role;
