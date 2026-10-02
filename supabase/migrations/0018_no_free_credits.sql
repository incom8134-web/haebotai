-- Members bring their own API key; nobody is granted credits any more
-- (lib/site/access.ts). New credit rows start at 0 instead of the 500
-- sign-up grant (0013). Existing balances are left as they are: they no
-- longer buy runs on the platform key (lib/platform-access.ts), so they
-- cost us nothing.
alter table user_credits alter column balance set default 0;
