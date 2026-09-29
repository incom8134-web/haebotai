-- Upload limits on every bucket (a runaway or abusive client can't fill
-- storage or run up bandwidth with huge files), and the private
-- "consents" bucket that keeps the written consent record
-- (lib/consent-server.ts). Already applied to production through the
-- Storage API on 2026-09-29; this file keeps the setup reproducible.
--
-- "consents" deliberately has no storage.objects policies: members can't
-- read or change their own record; only the service role writes it.

insert into storage.buckets (id, name, public, file_size_limit)
values ('consents', 'consents', false, 1048576)
on conflict (id) do nothing;

update storage.buckets set public = false, file_size_limit = 31457280 where id = 'inputs';
update storage.buckets set public = false, file_size_limit = 26214400, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'] where id = 'exports';
update storage.buckets set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] where id = 'logos';
update storage.buckets set public = false, file_size_limit = 1048576 where id = 'consents';
