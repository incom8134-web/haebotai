-- SaaS plans (lib/site/access.ts, lib/payments/pro.ts): Plus and Pro are
-- 30-day passes with monthly credits, and a subscriber can top up.
-- Members no longer bring their own API key; free accounts browse only.
--
-- Existing rows are left as they are ('student' stays a valid value so
-- old rows don't break the constraint; the app treats it as free).

alter table memberships drop constraint if exists memberships_plan_check;
alter table memberships add constraint memberships_plan_check check (plan in ('free', 'plus', 'pro', 'student'));

alter table payments drop constraint if exists payments_plan_check;
alter table payments add constraint payments_plan_check check (plan in ('plus', 'pro', 'topup'));

-- Finishes any order in one transaction: pending → done, then by the
-- order's own plan:
--   plus / pro: membership set to that plan (a running Pro isn't lowered
--               by buying Plus) and extended by p_days, stacking on a
--               running paid period;
--   topup:      no membership change.
-- p_credits are added either way. Only a still-pending order is touched,
-- so a replayed redirect, webhook or double submit can't grant twice.
create or replace function activate_order(
  p_order_id text,
  p_payment_key text,
  p_method text,
  p_approved_at timestamptz,
  p_raw jsonb,
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
  v_plan text;
begin
  update payments
    set status = 'done', payment_key = p_payment_key, method = p_method, approved_at = p_approved_at, raw = p_raw
    where order_id = p_order_id and status = 'pending'
    returning user_id, plan into v_user_id, v_plan;

  if v_user_id is null then
    return false; -- unknown or already finished order: nothing granted
  end if;

  if v_plan in ('plus', 'pro') and p_days > 0 then
    insert into memberships (user_id, plan, expires_at)
    values (v_user_id, v_plan, now() + make_interval(days => p_days))
    on conflict (user_id) do update
      set plan = case
            when memberships.plan = 'pro' and memberships.expires_at > now() and v_plan = 'plus' then 'pro'
            else v_plan
          end,
          expires_at = greatest(
            case when memberships.plan in ('plus', 'pro') then memberships.expires_at end,
            now()
          ) + make_interval(days => p_days);
  end if;

  insert into user_credits (user_id) values (v_user_id)
  on conflict (user_id) do nothing;
  update user_credits set balance = balance + p_credits where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function activate_order(text, text, text, timestamptz, jsonb, int, int) from public, authenticated, anon;
grant execute on function activate_order(text, text, text, timestamptz, jsonb, int, int) to service_role;
