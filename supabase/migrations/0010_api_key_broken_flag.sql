-- A key slot the rotation classifier found invalid/revoked (401/403) is
-- flagged here so the Account -> API key UI can show it as broken
-- (UI lands in Phase 5; this just stores the fact). Cleared when the
-- user re-saves that slot (lib/actions/api-keys.ts).
alter table user_api_keys add column broken boolean not null default false;
