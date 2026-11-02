-- Refunds take back what the order granted (lib/payments/reconcile.ts).
--
-- Until now a refund at Toss only marked the order canceled (and, since
-- 0024, canceled the inviter's share): the buyer kept the plan days and
-- the credits. revoke_order takes them back in proportion to the amount
-- refunded, once per won: payments.refunded_amount records how much has
-- been handled, so a replayed webhook, the daily job and a second
-- partial refund each take back only what is new.
--
--   credits: balance − credits × refunded / amount, never below 0 (credits
--            already spent can't be returned);
--   days:    plan end − days × refunded / amount, never before now; a
--            plan that ends now falls back to free.
--
-- Also: tax invoice (세금계산서) requests from members, handled by staff
-- in /admin/payments, and two indexes for the admin revenue page.

alter table payments add column if not exists refunded_amount int not null default 0;

create or replace function revoke_order(p_order_id text, p_remaining int, p_days int, p_credits int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay payments%rowtype;
  v_new int;
  v_credits int;
  v_days numeric;
begin
  select * into v_pay from payments where order_id = p_order_id and status = 'done' for update;
  if not found then
    return null;
  end if;
  v_new := (v_pay.amount - greatest(p_remaining, 0)) - v_pay.refunded_amount;
  if v_new <= 0 then
    return null; -- nothing new refunded
  end if;

  v_credits := floor(p_credits::numeric * v_new / v_pay.amount);
  v_days := p_days::numeric * v_new / v_pay.amount;

  update user_credits set balance = greatest(0, balance - v_credits) where user_id = v_pay.user_id;

  if v_pay.plan in ('plus', 'pro') and v_days > 0 then
    update memberships
       set expires_at = greatest(now(), expires_at - make_interval(secs => v_days * 86400))
     where user_id = v_pay.user_id and plan in ('plus', 'pro') and expires_at is not null;
    update memberships set plan = 'free', expires_at = null
     where user_id = v_pay.user_id and plan in ('plus', 'pro') and expires_at <= now();
  end if;

  update payments
     set refunded_amount = refunded_amount + v_new,
         status = case when p_remaining <= 0 then 'canceled' else status end,
         fail_reason = case when p_remaining <= 0 then 'refunded' else fail_reason end
   where order_id = p_order_id;

  -- A partial refund shrinks the inviter's share (0024); a full one cancels
  -- it through the payments trigger above.
  if p_remaining > 0 then
    perform shrink_referral_commission(p_order_id, p_remaining);
  end if;

  return jsonb_build_object('refunded', v_new, 'credits', v_credits, 'days', round(v_days, 2), 'user_id', v_pay.user_id);
end;
$$;

revoke all on function revoke_order(text, int, int, int) from public, authenticated, anon;
grant execute on function revoke_order(text, int, int, int) to service_role;

-- Tax invoice requests ------------------------------------------------------

create table if not exists tax_invoice_requests (
  id            uuid primary key default gen_random_uuid(),
  order_id      text not null unique references payments(order_id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  business_no   text not null,             -- 사업자등록번호, digits only
  company       text not null,
  ceo_name      text not null,
  email         text not null,             -- where the invoice is sent
  status        text not null default 'requested' check (status in ('requested', 'issued', 'rejected')),
  note          text,
  created_at    timestamptz not null default now(),
  processed_at  timestamptz,
  processed_by  uuid references auth.users(id) on delete set null
);

create index if not exists tax_invoice_requests_open on tax_invoice_requests (status) where status = 'requested';

alter table tax_invoice_requests enable row level security;
revoke all on tax_invoice_requests from anon, authenticated;
grant select on tax_invoice_requests to authenticated;
grant select, insert, update, delete on tax_invoice_requests to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'tax_invoice_requests' and policyname = 'tax_invoice_requests_select_own') then
    create policy "tax_invoice_requests_select_own" on tax_invoice_requests for select using (user_id = auth.uid());
  end if;
end;
$$;

-- Admin revenue page ----------------------------------------------------------

create index if not exists payments_status_approved on payments (status, approved_at desc);
