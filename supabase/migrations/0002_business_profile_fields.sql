-- HAEBOT_A_TOOLS_SPEC.md §3.3 — Business Profile. `brands` is already the
-- one-per-user profile row (BUILD_SPEC §5); this adds the fields every
-- tool manifest's `usesProfile` reads, additive only, no renames.

alter table brands
  add column industry text,
  add column business_stage text check (business_stage in ('idea','pre_launch','under_1y','1_3y','over_3y')),
  add column target_customer text,
  add column brand_colors text[] not null default '{}',
  add column region text,
  add column weekly_hours int,
  add column budget_band text;
