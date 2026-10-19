-- Supabase linter 0011 (function_search_path_mutable): pin the trigger
-- function's search_path so it can't be steered by a caller's settings.
-- It only calls now(), which lives in pg_catalog (always searched), so an
-- empty path changes nothing about what it does.
alter function public.set_updated_at() set search_path = '';
