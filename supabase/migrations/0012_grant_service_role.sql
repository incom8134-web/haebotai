-- Every write in this app goes through the service-role client
-- (lib/supabase/admin.ts) as of 0011 — but this project's service_role
-- never had the baseline table/sequence/function grants Supabase
-- normally sets up automatically for every new project. RLS bypass
-- (service_role's BYPASSRLS attribute) and table-level GRANTs are two
-- separate things in Postgres; missing the latter means "permission
-- denied for table X" on literally every table, regardless of RLS.
--
-- Confirmed missing project-wide, not table-specific: a direct
-- service_role SELECT failed identically on generations, user_credits,
-- user_api_keys, brands, and memberships before this migration.
--
-- Grants only — this changes nothing about what authenticated/anon can
-- do; RLS policies and the authenticated/anon grants from every prior
-- migration are untouched.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- So a table created by a future migration doesn't silently repeat this
-- same failure.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
