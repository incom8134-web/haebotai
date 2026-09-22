-- Phase 2 of the multi-engine rollout: record which engine actually ran
-- each generation (google/anthropic/openai), for the Library run detail
-- and future analytics. Nullable — existing rows predate this column.
alter table generations add column provider text check (provider in ('google', 'anthropic', 'openai'));
