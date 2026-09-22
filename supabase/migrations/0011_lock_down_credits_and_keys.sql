-- Security fix (see the security review in this repo's history).
--
-- user_credits and generations were writable directly by any
-- authenticated user through Supabase's auto-exposed REST API: RLS only
-- restricted WHICH row a user could touch, never what value they wrote.
-- A user could PATCH their own user_credits.balance to any number, or
-- call refund_credits(p_amount) directly with an arbitrary amount — both
-- completely bypass the app's credit logic. user_api_keys had the same
-- row-scoped-but-value-unrestricted shape, plus SELECT on `ciphertext`,
-- a column the client should never see at all.
--
-- Fix: application code becomes the ONLY writer for all of these, via a
-- service-role client (lib/supabase/admin.ts) that never leaves the
-- server. authenticated/anon lose direct table writes (and, for
-- user_api_keys, all direct access including select) and RPC execute;
-- everything now routes through SECURITY DEFINER functions that take the
-- user/run id as an explicit parameter — auth.uid() is not populated
-- under a service-role connection, and these are never a bare, run-
-- unlinked amount a caller could inflate.

-- ---------------------------------------------------------------------
-- 1) user_credits: select-only for authenticated, matching the pattern
--    memberships already used correctly. No direct table writes, ever.
-- ---------------------------------------------------------------------
revoke insert, update on user_credits from authenticated;

drop function if exists reserve_credits(int);
drop function if exists refund_credits(int);

-- auth.uid() isn't set under the service-role connection this now runs
-- under, so the already-authenticated caller (the run route) supplies
-- the user id explicitly instead.
create or replace function reserve_credits(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  insert into user_credits (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update user_credits
    set balance = balance - p_amount
    where user_id = p_user_id and balance >= p_amount
    returning balance into v_balance;

  if v_balance is null then
    raise exception 'insufficient_credits';
  end if;

  return v_balance;
end;
$$;

-- Narrow escape hatch for exactly one case: reserve_credits succeeded
-- but the generations row it was reserved for failed to insert, so
-- there is no run to settle against. Every other refund goes through
-- settle_generation_credits below, tied to a real run id — this is not
-- a general-purpose refund endpoint and the app must never call it with
-- anything but the exact amount it just reserved moments earlier.
create or replace function release_credit_reservation(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  update user_credits
    set balance = balance + greatest(p_amount, 0)
    where user_id = p_user_id
    returning balance into v_balance;
  return v_balance;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) Settlement bound to a real reservation, idempotent: reads
--    credits_reserved from the run row itself (written server-side at
--    reservation time, never client-suppliable), refunds reserved -
--    used (clamped so used > reserved can't invert the sign), and marks
--    the run settled so a duplicate call is a no-op instead of a second
--    refund.
-- ---------------------------------------------------------------------
alter table generations add column credits_settled boolean not null default false;

create or replace function settle_generation_credits(p_run_id uuid, p_credits_used int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reserved int;
  v_settled boolean;
  v_used int;
  v_refund int;
  v_balance int;
begin
  select user_id, coalesce(credits_reserved, 0), credits_settled
    into v_user_id, v_reserved, v_settled
    from generations
    where id = p_run_id
    for update;

  if v_user_id is null then
    raise exception 'run_not_found';
  end if;

  if v_settled then
    select balance into v_balance from user_credits where user_id = v_user_id;
    return v_balance;
  end if;

  v_used := least(greatest(p_credits_used, 0), v_reserved);
  v_refund := v_reserved - v_used;

  update generations set credits_used = v_used, credits_settled = true where id = p_run_id;

  if v_refund > 0 then
    update user_credits set balance = balance + v_refund where user_id = v_user_id returning balance into v_balance;
  else
    select balance into v_balance from user_credits where user_id = v_user_id;
  end if;

  return v_balance;
end;
$$;

revoke all on function reserve_credits(uuid, int) from public, authenticated, anon;
revoke all on function release_credit_reservation(uuid, int) from public, authenticated, anon;
revoke all on function settle_generation_credits(uuid, int) from public, authenticated, anon;
grant execute on function reserve_credits(uuid, int) to service_role;
grant execute on function release_credit_reservation(uuid, int) to service_role;
grant execute on function settle_generation_credits(uuid, int) to service_role;

-- ---------------------------------------------------------------------
-- 3) generations: select + delete-own stay (users can still see and
--    clear their own history); insert/update move server-side, where
--    the run route now enforces user_id ownership explicitly in code
--    (service_role bypasses RLS, so that check no longer happens for
--    free).
-- ---------------------------------------------------------------------
revoke insert, update on generations from authenticated;

-- ---------------------------------------------------------------------
-- 4) user_api_keys: no direct client access at all, not even select —
--    `ciphertext` must never reach a browser. A security-definer view
--    (bypasses the table grant it's built on, same idea as the SECURITY
--    DEFINER functions above) exposes only the non-secret columns,
--    filtered to the caller's own rows.
-- ---------------------------------------------------------------------
revoke select, insert, update, delete on user_api_keys from authenticated;

create view user_api_key_status
  with (security_invoker = false) as
  select provider, priority, last4, broken, updated_at
  from user_api_keys
  where user_id = auth.uid();

grant select on user_api_key_status to authenticated;
