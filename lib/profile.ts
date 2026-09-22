"use server";

import { createClient } from "@/lib/supabase/server";
import type { BusinessProfile } from "@/lib/tools/types";

// HAEBOT_A_TOOLS_SPEC.md §3.3 — set once, read by every tool. `brands` is
// already the one-per-user profile row (BUILD_SPEC §5); §0002 migration
// adds the fields this type needs. Column names stay as `brands` already
// had them (name, logo_path) — mapped here rather than renamed.

interface BrandRow {
  id: string;
  name: string;
  tone: string[];
  voice_examples: string[];
  logo_path: string | null;
  industry: string | null;
  business_stage: BusinessProfile["business_stage"] | null;
  target_customer: string | null;
  brand_colors: string[];
  region: string | null;
  weekly_hours: number | null;
  budget_band: string | null;
}

function toProfile(row: BrandRow): BusinessProfile {
  return {
    brand_name: row.name,
    industry: row.industry ?? "",
    business_stage: row.business_stage ?? "idea",
    target_customer: row.target_customer ?? "",
    tone: row.tone,
    voice_examples: row.voice_examples,
    brand_colors: row.brand_colors,
    logo_asset_id: row.logo_path ?? undefined,
    region: row.region ?? undefined,
    weekly_hours: row.weekly_hours ?? undefined,
    budget_band: row.budget_band ?? undefined,
  };
}

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("brands").select("*").eq("user_id", user.id).maybeSingle();
  return data ? toProfile(data as BrandRow) : null;
}

export async function upsertBusinessProfile(patch: Partial<BusinessProfile>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다" };

  const row: Record<string, unknown> = {};
  if (patch.brand_name !== undefined) row.name = patch.brand_name;
  if (patch.industry !== undefined) row.industry = patch.industry;
  if (patch.business_stage !== undefined) row.business_stage = patch.business_stage;
  if (patch.target_customer !== undefined) row.target_customer = patch.target_customer;
  if (patch.tone !== undefined) row.tone = patch.tone;
  if (patch.voice_examples !== undefined) row.voice_examples = patch.voice_examples;
  if (patch.brand_colors !== undefined) row.brand_colors = patch.brand_colors;
  if (patch.logo_asset_id !== undefined) row.logo_path = patch.logo_asset_id;
  if (patch.region !== undefined) row.region = patch.region;
  if (patch.weekly_hours !== undefined) row.weekly_hours = patch.weekly_hours;
  if (patch.budget_band !== undefined) row.budget_band = patch.budget_band;

  const { data: existing } = await supabase.from("brands").select("id").eq("user_id", user.id).maybeSingle();

  const { error } = existing
    ? await supabase.from("brands").update(row).eq("id", existing.id)
    : await supabase.from("brands").insert({ user_id: user.id, name: "", ...row });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
