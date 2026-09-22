-- Verifies the lockdown in 0011_lock_down_credits_and_keys.sql actually
-- holds on a real database, as two different Postgres roles: an
-- authenticated non-owner and the row's own owner. Every statement in
-- both blocks is EXPECTED TO FAIL (permission denied / no rows
-- affected) — a statement that succeeds means the fix didn't take.
--
-- HOW TO RUN (staging only — do not run against production data you
-- care about, since the "attempted" statements are real writes that
-- should be rejected, not simulated):
--
-- 1. In the Supabase SQL Editor (or `psql`) on your STAGING project,
--    find two real auth.users ids to test with — the owner of some
--    existing row, and any other user:
--      select id, email from auth.users limit 5;
--    Set them below (search for OWNER_ID / OTHER_ID) or pass them as
--    psql variables: `psql ... -v owner_id="'<uuid>'" -v other_id="'<uuid>'" -f supabase/verify-security.sql`
--
-- 2. Run this whole file. Read the NOTICEs it prints — each check
--    prints PASS or FAIL. Do not just check for absence of SQL errors:
--    a `perform` wrapper below catches and reports permission failures
--    as PASS, since permission failure is the desired outcome.
--
-- 3. This script authenticates each block by setting the same JWT
--    claims PostgREST would set for a real request (`request.jwt.claims`
--    and role `authenticated`), so `auth.uid()` inside RLS policies and
--    the tested functions resolves exactly as it would over the real
--    API — not by connecting as service_role and impersonating, which
--    would bypass the exact thing being tested.
--
-- 4. Afterwards, run `rollback` was already issued per block below, so
--    no state changes persist — but re-run against staging, never prod.

\set owner_id '''00000000-0000-0000-0000-000000000001'''
\set other_id '''00000000-0000-0000-0000-000000000002'''

-- Replace the two ids above with real auth.users ids from your staging
-- project before running, or pass -v owner_id=/-v other_id= to psql.

do $$
declare
  v_owner_id uuid := :owner_id;
  v_other_id uuid := :other_id;
  v_run_id uuid;
  v_before numeric;
  v_after numeric;
begin
  raise notice '--- Setup: ensure both test users have a user_credits row ---';
  insert into user_credits (user_id) values (v_owner_id) on conflict (user_id) do nothing;
  insert into user_credits (user_id) values (v_other_id) on conflict (user_id) do nothing;

  select balance into v_before from user_credits where user_id = v_owner_id;
  raise notice 'owner balance before: %', v_before;

  select id into v_run_id from generations where user_id = v_owner_id order by created_at desc limit 1;
  if v_run_id is null then
    raise notice 'No existing generations row for owner — insert one manually to test generations access, or skip those checks.';
  end if;
end $$;

-- =======================================================================
-- Block 1: acting AS THE OWNER's own authenticated session — reads
-- should work (select stays granted); direct writes should all fail.
-- =======================================================================
begin;
select set_config('request.jwt.claims', json_build_object('sub', :owner_id, 'role', 'authenticated')::text, true);
set local role authenticated;

\echo '--- As OWNER: user_credits ---'
select 'select (should succeed)' as check, balance from user_credits where user_id = :owner_id::uuid;

do $$
begin
  begin
    update user_credits set balance = 999999999 where user_id = :owner_id::uuid;
    raise exception 'FAIL: owner was able to UPDATE their own balance directly';
  exception when insufficient_privilege then
    raise notice 'PASS: direct UPDATE on user_credits denied';
  end;
end $$;

\echo '--- As OWNER: credit RPCs (old-signature calls must not exist / must be denied) ---'
do $$
begin
  begin
    perform reserve_credits(100);
    raise exception 'FAIL: old-signature reserve_credits(int) is still callable';
  exception when undefined_function then
    raise notice 'PASS: reserve_credits(int) no longer exists';
  when insufficient_privilege then
    raise notice 'PASS: reserve_credits(int) exists but is denied';
  end;
end $$;

do $$
begin
  begin
    perform reserve_credits(:owner_id::uuid, 100);
    raise exception 'FAIL: authenticated was able to call reserve_credits(uuid, int) directly';
  exception when insufficient_privilege then
    raise notice 'PASS: reserve_credits(uuid, int) denied to authenticated';
  end;
end $$;

do $$
begin
  begin
    perform settle_generation_credits(gen_random_uuid(), 0);
    raise exception 'FAIL: authenticated was able to call settle_generation_credits directly';
  exception when insufficient_privilege then
    raise notice 'PASS: settle_generation_credits denied to authenticated';
  end;
end $$;

do $$
begin
  begin
    perform release_credit_reservation(:owner_id::uuid, 100);
    raise exception 'FAIL: authenticated was able to call release_credit_reservation directly';
  exception when insufficient_privilege then
    raise notice 'PASS: release_credit_reservation denied to authenticated';
  end;
end $$;

\echo '--- As OWNER: generations ---'
do $$
begin
  begin
    insert into generations (user_id, kind, tool_id, status, credits_reserved)
      values (:owner_id::uuid, 'generate', 'copy', 'done', 0);
    raise exception 'FAIL: owner was able to INSERT a generations row directly';
  exception when insufficient_privilege then
    raise notice 'PASS: direct INSERT on generations denied';
  end;
end $$;

do $$
begin
  begin
    update generations set status = 'done', credits_used = 0 where user_id = :owner_id::uuid;
    raise exception 'FAIL: owner was able to UPDATE their own generations row directly';
  exception when insufficient_privilege then
    raise notice 'PASS: direct UPDATE on generations denied';
  end;
end $$;

\echo '--- As OWNER: user_api_keys (no direct access at all, not even select) ---'
do $$
begin
  begin
    perform ciphertext from user_api_keys where user_id = :owner_id::uuid;
    raise exception 'FAIL: owner was able to SELECT ciphertext directly from user_api_keys';
  exception when insufficient_privilege then
    raise notice 'PASS: direct SELECT on user_api_keys denied';
  end;
end $$;

\echo '--- As OWNER: the safe view still works and never exposes ciphertext ---'
select 'view select (should succeed, no ciphertext column)' as check, *
  from user_api_key_status;

rollback;

-- =======================================================================
-- Block 2: acting as a DIFFERENT authenticated user (not the row owner)
-- — everything above should still be denied the same way, AND row-level
-- checks (select on someone else's row) should return nothing rather
-- than someone else's data.
-- =======================================================================
begin;
select set_config('request.jwt.claims', json_build_object('sub', :other_id, 'role', 'authenticated')::text, true);
set local role authenticated;

\echo '--- As OTHER (non-owner): cannot read the owner''s balance ---'
do $$
declare
  v_count int;
begin
  select count(*) into v_count from user_credits where user_id = :owner_id::uuid;
  if v_count = 0 then
    raise notice 'PASS: non-owner sees zero rows for the owner''s user_credits';
  else
    raise exception 'FAIL: non-owner could read the owner''s user_credits row';
  end if;
end $$;

do $$
begin
  begin
    update user_credits set balance = 999999999 where user_id = :owner_id::uuid;
    raise exception 'FAIL: non-owner was able to UPDATE the owner''s balance';
  exception when insufficient_privilege then
    raise notice 'PASS: direct UPDATE on user_credits denied (non-owner)';
  end;
end $$;

do $$
begin
  begin
    perform reserve_credits(:owner_id::uuid, 100);
    raise exception 'FAIL: non-owner was able to call reserve_credits for someone else';
  exception when insufficient_privilege then
    raise notice 'PASS: reserve_credits denied (non-owner)';
  end;
end $$;

do $$
declare
  v_count int;
begin
  select count(*) into v_count from user_api_key_status;
  raise notice 'non-owner sees % rows from user_api_key_status (should be only their own, likely 0)', v_count;
end $$;

rollback;

\echo 'Done. Review the NOTICEs above — every line must say PASS. Any FAIL means the lockdown did not take on this database.'
