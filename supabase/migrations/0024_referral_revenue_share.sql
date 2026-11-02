-- Referral revenue share (lib/referral.ts REVENUE_SHARE — keep the numbers
-- here in sync; lib/referral.test.ts checks them).
--
-- A member who invited a friend (referral_redemptions, 0014/0017) earns
-- 20% of the VAT-excluded amount of every plan or top-up that friend pays
-- for in the first 90 days after joining through the invite. Each share
-- is held 7 days (the refund window) before it can be withdrawn; a
-- refund in that time cancels it, and a partial refund shrinks it. A
-- refund after payout leaves the wallet negative until later earnings
-- cover it.
--
-- Money is paid in cash: members register a bank account and their
-- resident registration number (required for 원천징수 and the
-- 지급명세서, 소득세법), both encrypted by the app before they reach the
-- database. Staff transfer the money and mark the payout paid in /admin.
--
-- Same posture as 0011/0012/0022: members read their own rows; every
-- write goes through the service role.

-- 1 · Commissions ----------------------------------------------------------

create table if not exists referral_commissions (
  id            uuid primary key default gen_random_uuid(),
  order_id      text not null unique references payments(order_id) on delete cascade,
  referrer_id   uuid not null references auth.users(id) on delete cascade,
  buyer_id      uuid not null references auth.users(id) on delete cascade,
  order_amount  int not null,
  base_amount   int not null,              -- order amount without 10% VAT
  rate          numeric(5, 4) not null,
  commission    int not null check (commission >= 0),
  status        text not null default 'pending' check (status in ('pending', 'canceled')),
  available_at  timestamptz not null,      -- withdrawable from this moment (end of the hold)
  canceled_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists referral_commissions_referrer on referral_commissions (referrer_id, created_at desc);

-- 2 · Payout accounts (sealed by the app: AES-256-GCM, lib/crypto/secret-box.ts) --

create table if not exists referral_payout_accounts (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  holder_name    text not null,
  bank_name      text not null,
  account_sealed text not null,
  account_last4  text not null,
  rrn_sealed     text not null,
  agreed_at      timestamptz not null,
  updated_at     timestamptz not null default now()
);

-- 3 · Payouts ---------------------------------------------------------------

create table if not exists referral_payouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  gross         int not null check (gross > 0),
  tax           int not null check (tax >= 0),
  net           int not null check (net >= 0),
  status        text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  bank_snapshot jsonb not null,            -- holder, bank, last4 at request time
  note          text,
  requested_at  timestamptz not null default now(),
  processed_at  timestamptz,
  processed_by  uuid references auth.users(id) on delete set null
);

create index if not exists referral_payouts_user on referral_payouts (user_id, requested_at desc);
create index if not exists referral_payouts_open on referral_payouts (status) where status = 'requested';

alter table referral_commissions enable row level security;
alter table referral_payout_accounts enable row level security;
alter table referral_payouts enable row level security;
revoke all on referral_commissions, referral_payout_accounts, referral_payouts from anon, authenticated;
grant select on referral_commissions, referral_payouts to authenticated;
grant select, insert, update, delete on referral_commissions, referral_payout_accounts, referral_payouts to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'referral_commissions' and policyname = 'referral_commissions_select_own') then
    create policy "referral_commissions_select_own" on referral_commissions for select using (referrer_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'referral_payouts' and policyname = 'referral_payouts_select_own') then
    create policy "referral_payouts_select_own" on referral_payouts for select using (user_id = auth.uid());
  end if;
end;
$$;

-- 4 · Earn on a paid order, cancel on a refunded one -----------------------

create or replace function referral_commission_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_claimed timestamptz;
  v_base int;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    select referrer_id, created_at into v_referrer, v_claimed
      from referral_redemptions where referee_id = new.user_id;
    -- Only within 90 days of joining through the invite, never for oneself.
    if v_referrer is not null and v_referrer <> new.user_id and now() <= v_claimed + interval '90 days' then
      v_base := floor(new.amount / 1.1);
      insert into referral_commissions (order_id, referrer_id, buyer_id, order_amount, base_amount, rate, commission, available_at)
      values (new.order_id, v_referrer, new.user_id, new.amount, v_base, 0.20, floor(v_base * 0.20), now() + interval '7 days')
      on conflict (order_id) do nothing;
    end if;
  elsif new.status = 'canceled' and old.status = 'done' then
    update referral_commissions set status = 'canceled', canceled_at = now()
      where order_id = new.order_id and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_referral_commission on payments;
create trigger payments_referral_commission
  after update of status on payments
  for each row execute function referral_commission_on_payment();

-- A partial refund (Toss PARTIAL_CANCELED): the share follows what's left.
create or replace function shrink_referral_commission(p_order_id text, p_remaining int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update referral_commissions
     set base_amount = floor(greatest(p_remaining, 0) / 1.1),
         commission = floor(floor(greatest(p_remaining, 0) / 1.1) * rate)
   where order_id = p_order_id and status = 'pending' and p_remaining < order_amount;
end;
$$;

-- 5 · Wallet and payout request ---------------------------------------------

-- Withdrawable = shares past their hold − payouts requested or paid.
create or replace function referral_wallet(p_user_id uuid)
returns table (pending int, available int, requested int, paid int)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(commission) from referral_commissions where referrer_id = p_user_id and status = 'pending' and available_at > now()), 0)::int,
    (coalesce((select sum(commission) from referral_commissions where referrer_id = p_user_id and status = 'pending' and available_at <= now()), 0)
      - coalesce((select sum(gross) from referral_payouts where user_id = p_user_id and status in ('requested', 'paid')), 0))::int,
    coalesce((select sum(gross) from referral_payouts where user_id = p_user_id and status = 'requested'), 0)::int,
    coalesce((select sum(gross) from referral_payouts where user_id = p_user_id and status = 'paid'), 0)::int;
$$;

-- 'ok' | 'no_account' | 'open_request' | 'too_small'. Requests the whole
-- withdrawable balance; tax withheld at p_tax_rate, cut to 10 won.
create or replace function request_referral_payout(p_user_id uuid, p_min int, p_tax_rate numeric)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account referral_payout_accounts%rowtype;
  v_available int;
  v_tax int;
begin
  perform pg_advisory_xact_lock(hashtext('referral_payout:' || p_user_id::text));
  select * into v_account from referral_payout_accounts where user_id = p_user_id;
  if not found then
    return 'no_account';
  end if;
  if exists (select 1 from referral_payouts where user_id = p_user_id and status = 'requested') then
    return 'open_request';
  end if;
  select available into v_available from referral_wallet(p_user_id);
  if v_available < p_min then
    return 'too_small';
  end if;
  v_tax := floor(v_available * p_tax_rate / 10) * 10;
  insert into referral_payouts (user_id, gross, tax, net, bank_snapshot)
  values (p_user_id, v_available, v_tax, v_available - v_tax,
          jsonb_build_object('holder', v_account.holder_name, 'bank', v_account.bank_name, 'last4', v_account.account_last4));
  return 'ok';
end;
$$;

revoke all on function referral_commission_on_payment() from public, authenticated, anon;
revoke all on function shrink_referral_commission(text, int) from public, authenticated, anon;
revoke all on function referral_wallet(uuid) from public, authenticated, anon;
revoke all on function request_referral_payout(uuid, int, numeric) from public, authenticated, anon;
grant execute on function shrink_referral_commission(text, int) to service_role;
grant execute on function referral_wallet(uuid) to service_role;
grant execute on function request_referral_payout(uuid, int, numeric) to service_role;
