import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteSettings } from "@/lib/admin-ops-server";
import { catalogTool, toolSlug } from "@/lib/tools/catalog";

// Sample results on the landing page: share links staff featured in
// /admin/settings (site_settings "showcase"). Each card opens the shared
// result; a revoked link or a deleted result simply drops out.

export interface ShowcaseItem {
  token: string;
  slug: string;
  title: string | null;
  note: string;
}

export async function listShowcase(): Promise<ShowcaseItem[]> {
  const { showcase } = await getSiteSettings();
  if (!showcase.length) return [];
  const admin = createAdminClient();
  const { data: shares } = await admin.from("run_shares").select("token, run_id").in("token", showcase.map((s) => s.token)).is("revoked_at", null);
  if (!shares?.length) return [];
  const { data: runs } = await admin.from("generations").select("id, tool_id, title, status").in("id", shares.map((s) => s.run_id));
  const runOf = new Map((runs ?? []).filter((r) => r.status === "done" && r.tool_id && catalogTool(r.tool_id)).map((r) => [r.id, r]));
  const runByToken = new Map(shares.map((s) => [s.token, runOf.get(s.run_id)]));
  return showcase.flatMap((s) => {
    const run = runByToken.get(s.token);
    return run ? [{ token: s.token, slug: toolSlug(run.tool_id as string), title: (run.title as string | null) ?? null, note: s.note }] : [];
  });
}
