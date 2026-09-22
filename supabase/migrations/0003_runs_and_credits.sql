-- HAEBOT_A_TOOLS_SPEC.md §3.2 / §3.4 / T2 — run history + credit ledger.
-- `generations` (BUILD_SPEC §5) already logs cost per call; this adds the
-- columns needed to also serve as the per-run history row, persisted
-- BEFORE the model call so a dropped connection still leaves a real row.

alter table generations
  add column tool_id text,
  add column input jsonb,
  add column output jsonb,
  add column status text not null default 'pending'
    check (status in ('pending', 'streaming', 'done', 'cancelled', 'error')),
  add column credits_reserved int,
  add column credits_used int,
  add column error text;

create policy "generations_update_own" on generations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ponytail: 100 free credits on first read, no purchase flow yet —
-- upgrade path is a real billing table once payments land.
create table user_credits (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    int not null default 100,
  updated_at timestamptz not null default now()
);

alter table user_credits enable row level security;
grant usage on schema public to authenticated;
grant select, insert, update on user_credits to authenticated;

create policy "user_credits_select_own" on user_credits
  for select using (user_id = auth.uid());
create policy "user_credits_insert_own" on user_credits
  for insert with check (user_id = auth.uid());
create policy "user_credits_update_own" on user_credits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger user_credits_set_updated_at
  before update on user_credits
  for each row execute function set_updated_at();

-- Atomic reserve/refund — a plain select-then-update from app code races
-- two concurrent runs against the same balance. These run the check and
-- the write in one statement instead.
create or replace function reserve_credits(p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  insert into user_credits (user_id) values (auth.uid())
  on conflict (user_id) do nothing;

  update user_credits
    set balance = balance - p_amount
    where user_id = auth.uid() and balance >= p_amount
    returning balance into v_balance;

  if v_balance is null then
    raise exception 'insufficient_credits';
  end if;

  return v_balance;
end;
$$;

create or replace function refund_credits(p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  update user_credits
    set balance = balance + p_amount
    where user_id = auth.uid()
    returning balance into v_balance;
  return v_balance;
end;
$$;

grant execute on function reserve_credits(int) to authenticated;
grant execute on function refund_credits(int) to authenticated;
