-- HAEBOT_A_TOOLS_SPEC.md §5.3 / Part 6 T3 — 출처 panel storage. Sources
-- are a runner-level concept (attached whenever grounding.requireSources
-- is true), not part of each tool's own output schema, so one panel
-- renders them for every tool the same way.

alter table generations add column sources jsonb;
