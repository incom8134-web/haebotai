-- Referral credits. Each member gets one invite code; a NEW member who
-- signs up through it gets p_bonus credits, and so does the inviter
-- (inviter rewards capped per p_max_per_referrer to limit farming with
-- throwaway accounts). Same posture as 0011/0012: members can read their
-- own rows; every write goes through SECURITY DEFINER functions that only
-- the service role may call.

create table if not exists referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now()
);

create table if not exists referral_redemptions (
  referee_id       uuid primary key references auth.users(id) on delete cascade,
  referrer_id      uuid not null references auth.users(id) on delete cascade,
  referrer_rewarded boolean not null default false,
  bonus            int not null,
  created_at       timestamptz not null default now()
);

create index if not exists referral_redemptions_referrer on referral_redemptions (referrer_id);

alter table referral_codes enable row level security;
alter table referral_redemptions enable row level security;
revoke insert, update, delete on referral_codes, referral_redemptions from authenticated, anon;
grant select on referral_codes, referral_redemptions to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'referral_codes' and policyname = 'referral_codes_select_own') then
    create policy "referral_codes_select_own" on referral_codes for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'referral_redemptions' and policyname = 'referral_redemptions_select_own') then
    create policy "referral_redemptions_select_own" on referral_redemptions for select using (referrer_id = auth.uid() or referee_id = auth.uid());
  end if;
end;
$$;

-- Returns the member's code, creating one (8 chars, no look-alike 0/O/1/I) on first use.
create or replace function get_or_create_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select code into v_code from referral_codes where user_id = p_user_id;
  if v_code is not null then
    return v_code;
  end if;
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into referral_codes (user_id, code) values (p_user_id, v_code);
      return v_code;
    exception when unique_violation then
      select code into v_code from referral_codes where user_id = p_user_id;
      if v_code is not null then
        return v_code; -- a concurrent call created it
      end if;
      -- otherwise the random code collided; try another
    end;
  end loop;
end;
$$;

-- 'ok' | 'invalid' | 'self' | 'not_new' | 'already'. Only accounts created
-- within the last 7 days can redeem, once.
create or replace function redeem_referral(p_referee_id uuid, p_code text, p_bonus int, p_max_per_referrer int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_created timestamptz;
  v_rewarded int;
  v_reward_referrer boolean;
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

  select count(*) into v_rewarded from referral_redemptions where referrer_id = v_referrer and referrer_rewarded;
  v_reward_referrer := v_rewarded < p_max_per_referrer;

  begin
    insert into referral_redemptions (referee_id, referrer_id, referrer_rewarded, bonus)
    values (p_referee_id, v_referrer, v_reward_referrer, p_bonus);
  exception when unique_violation then
    return 'already';
  end;

  insert into user_credits (user_id) values (p_referee_id) on conflict (user_id) do nothing;
  update user_credits set balance = balance + p_bonus where user_id = p_referee_id;
  if v_reward_referrer then
    insert into user_credits (user_id) values (v_referrer) on conflict (user_id) do nothing;
    update user_credits set balance = balance + p_bonus where user_id = v_referrer;
  end if;
  return 'ok';
end;
$$;

revoke all on function get_or_create_referral_code(uuid) from public, authenticated, anon;
revoke all on function redeem_referral(uuid, text, int, int) from public, authenticated, anon;
grant execute on function get_or_create_referral_code(uuid) to service_role;
grant execute on function redeem_referral(uuid, text, int, int) to service_role;
