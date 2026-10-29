-- Staff refunds from /admin/members/[id] (lib/actions/refund.ts). The
-- action cancels the payment at Toss first, then calls refund_order to
-- bring our ledger in line in one transaction.

alter table payments add column if not exists refund_amount int;
alter table payments add column if not exists refunded_at timestamptz;

-- done → canceled, records what was refunded, and takes back what the
-- order granted (activate_order, 0022):
--   credits: p_credits (the order's unused credits; the used ones are
--            what the kept part of the payment paid for), never below 0;
--   days:    p_days off the membership end, for plus / pro orders only
--            (never moved before now(), so the period just ends).
-- Only a done, not-yet-refunded order is touched, so a retried call
-- can't take back twice. Returns false when nothing was changed.
create or replace function refund_order(
  p_order_id text,
  p_refund_amount int,
  p_credits int,
  p_days int,
  p_raw jsonb
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
  if p_refund_amount is null or p_refund_amount <= 0 or p_credits < 0 or p_days < 0 then
    raise exception 'bad_refund_args';
  end if;

  update payments
    set status = 'canceled',
        fail_reason = 'refunded_by_staff',
        refund_amount = p_refund_amount,
        refunded_at = now(),
        raw = coalesce(p_raw, raw)
    where order_id = p_order_id and status = 'done' and refunded_at is null and p_refund_amount <= amount
    returning user_id, plan into v_user_id, v_plan;

  if v_user_id is null then
    return false;
  end if;

  update user_credits set balance = greatest(balance - p_credits, 0) where user_id = v_user_id;

  if v_plan in ('plus', 'pro') and p_days > 0 then
    update memberships
      set expires_at = greatest(expires_at - make_interval(days => p_days), now())
      where user_id = v_user_id and plan in ('plus', 'pro') and expires_at is not null;
  end if;

  return true;
end;
$$;

revoke all on function refund_order(text, int, int, int, jsonb) from public, authenticated, anon;
grant execute on function refund_order(text, int, int, int, jsonb) to service_role;
