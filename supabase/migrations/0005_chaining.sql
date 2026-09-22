-- HAEBOT_A_TOOLS_SPEC.md Part 2 §② / Part 6 T4 — typed output→input
-- chaining. Records which prior run (if any) seeded this one, so a run
-- created via "이어서 만들기" is traceable, not just visually seeded.

alter table generations
  add column chained_from uuid references generations(id) on delete set null;
