-- Staff credit adjustments from /admin (refunds, goodwill, corrections).
-- One atomic update so two staff edits can't overwrite each other; the
-- balance never goes below 0. Service role only, like the other money RPCs
-- (0011, 0012, 0022); every call is also written to audit_log by the app.

create or replace function admin_adjust_credits(p_user_id uuid, p_delta int)
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
  update user_credits set balance = greatest(0, balance + p_delta)
    where user_id = p_user_id
    returning balance into v_balance;
  return v_balance;
end;
$$;

revoke all on function admin_adjust_credits(uuid, int) from public, authenticated, anon;
grant execute on function admin_adjust_credits(uuid, int) to service_role;
