-- BYOK: Claude and OpenAI join Google, and each provider gets up to 3
-- priority-ordered keys (tried in order, auto-switching past a key whose
-- quota is exhausted). Existing google rows default to priority 1.
alter table user_api_keys drop constraint user_api_keys_provider_check;
alter table user_api_keys add constraint user_api_keys_provider_check check (provider in ('google', 'anthropic', 'openai'));

alter table user_api_keys add column priority smallint not null default 1 check (priority between 1 and 3);

alter table user_api_keys drop constraint user_api_keys_pkey;
alter table user_api_keys add primary key (user_id, provider, priority);
