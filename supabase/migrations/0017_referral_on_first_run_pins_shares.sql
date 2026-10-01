-- Three things the library and growth work needs (docs: competitor
-- teardown P0/P1):
--
-- 1. Referral credits pay out after the invited member's FIRST successful
--    run, not at sign-up: an invite is claimed at consent (status
--    'pending') and paid by pay_referral() when a run finishes. Rows from
--    0014 were paid at sign-up and stay 'paid'. Amounts can differ per
--    side (referee_bonus / referrer_bonus).
-- 2. generations.pinned — a member's starred results in the library.
-- 3. run_shares — read-only public links to one finished result. Members
--    read their own rows; links are created and revoked through the
--    service role (app/api/runs/[runId]/share) after an ownership check.

-- 1 · Referral: pending until the first successful run -------------------

alter table referral_redemptions add column if not exists status text not null default 'paid';
alter table referral_redemptions add column if not exists referee_bonus int;
alter table referral_redemptions add column if not exists referrer_bonus int;
alter table referral_redemptions add column if not exists paid_at timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'referral_redemptions_status_check') then
    alter table referral_redemptions add constraint referral_redemptions_status_check check (status in ('pending', 'paid'));
  end if;
end;
$$;

-- 'ok' | 'invalid' | 'self' | 'not_new' | 'already'. Records the invite
-- without paying; only accounts created within the last 7 days, once.
create or replace function claim_referral(p_referee_id uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_created timestamptz;
begin
  select user_id into v_referrer from referral_codes where code = upper(p_code);
  if v_referrer is null then
    return 'invalid';
  end if;
  if v_referrer = p_referee_id then
    return 'self';
  end if;
  select created_at into v_created from auth.users where id = p_referee_id;
  if v_created is null or v_created < now() - interval '7 days' then
    return 'not_new';
  end if;
  begin
    insert into referral_redemptions (referee_id, referrer_id, referrer_rewarded, bonus, status)
    values (p_referee_id, v_referrer, false, 0, 'pending');
  exception when unique_violation then
    return 'already';
  end;
  return 'ok';
end;
$$;

-- 'paid' | 'none'. Called after every successful run; only the first one
-- for a pending invite pays. The inviter is paid while under
-- p_max_per_referrer rewarded invites (serialized per inviter).
create or replace function pay_referral(p_referee_id uuid, p_referee_bonus int, p_referrer_bonus int, p_max_per_referrer int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_rewarded int;
  v_reward_referrer boolean;
begin
  select referrer_id into v_referrer from referral_redemptions where referee_id = p_referee_id and status = 'pending';
  if v_referrer is null then
    return 'none';
  end if;
  perform pg_advisory_xact_lock(hashtext('referral:' || v_referrer::text));

  select count(*) into v_rewarded from referral_redemptions where referrer_id = v_referrer and referrer_rewarded;
  v_reward_referrer := v_rewarded < p_max_per_referrer;

  update referral_redemptions
     set status = 'paid',
         paid_at = now(),
         referrer_rewarded = v_reward_referrer,
         bonus = p_referee_bonus,
         referee_bonus = p_referee_bonus,
         referrer_bonus = case when v_reward_referrer then p_referrer_bonus else 0 end
   where referee_id = p_referee_id and status = 'pending';
  if not found then
    return 'none'; -- a concurrent run paid it
  end if;

  insert into user_credits (user_id) values (p_referee_id) on conflict (user_id) do nothing;
  update user_credits set balance = balance + p_referee_bonus where user_id = p_referee_id;
  if v_reward_referrer then
    insert into user_credits (user_id) values (v_referrer) on conflict (user_id) do nothing;
    update user_credits set balance = balance + p_referrer_bonus where user_id = v_referrer;
  end if;
  return 'paid';
end;
$$;

revoke all on function claim_referral(uuid, text) from public, authenticated, anon;
revoke all on function pay_referral(uuid, int, int, int) from public, authenticated, anon;
grant execute on function claim_referral(uuid, text) to service_role;
grant execute on function pay_referral(uuid, int, int, int) to service_role;

-- 2 · Library favourites -------------------------------------------------

alter table generations add column if not exists pinned boolean not null default false;
create index if not exists generations_user_pinned on generations (user_id, created_at desc) where pinned;

-- 3 · Public share links -------------------------------------------------

create table if not exists run_shares (
  token      text primary key check (token ~ '^[A-Za-z0-9_-]{22,64}$'),
  run_id     uuid not null references generations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- At most one live link per result.
create unique index if not exists run_shares_live_per_run on run_shares (run_id) where revoked_at is null;
create index if not exists run_shares_user on run_shares (user_id);

alter table run_shares enable row level security;
revoke insert, update, delete on run_shares from authenticated, anon;
revoke select on run_shares from anon;
grant select on run_shares to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'run_shares' and policyname = 'run_shares_select_own') then
    create policy "run_shares_select_own" on run_shares for select using (user_id = auth.uid());
  end if;
end;
$$;
