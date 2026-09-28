-- Sign-up grant raised from 100 to 500 credits. The credit row is
-- created lazily with the column default (reserve_credits and
-- get_or_create paths insert just the user_id), so the default is the
-- grant. Existing balances are left as they are.
alter table user_credits alter column balance set default 500;
