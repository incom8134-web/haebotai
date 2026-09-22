-- RLS audit: every table already has row level security enabled with
-- own-row-only policies (brands, inputs, facts, posts, generations,
-- user_credits, storage.objects — see 0001_init.sql / 0003). The one gap:
-- generations has select/insert/update-own but no delete-own, so a user
-- can't clear their own run history via the API. This closes that.
--
-- user_credits deliberately does NOT get a delete-own policy: it's a
-- 1-row-per-user balance ledger, and reserve_credits() does
-- `insert ... on conflict (user_id) do nothing` before debiting — a user
-- deleting their own balance row would let that insert re-create it at
-- the default 100 balance, i.e. free unlimited credits. Not adding
-- delete there is the correct security posture, not an oversight.

create policy "generations_delete_own" on generations
  for delete using (user_id = auth.uid());
