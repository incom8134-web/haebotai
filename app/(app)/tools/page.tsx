import { ToolsView } from "@/components/tools/tools-view";
import type { CategoryId } from "@/lib/tools/types";
import { CATEGORY_ORDER as CATEGORIES } from "@/lib/tools/catalog";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { titled } from "@/lib/site/meta";

export const generateMetadata = titled("도구", "Tools");

// "Recently used" comes from the member's own run history (tool ids as
// stored on runs), newest first, one entry per tool.
async function recentTools(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select("tool_id")
    .eq("user_id", user.id)
    .not("tool_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);
  return [...new Set((data ?? []).map((r) => r.tool_id as string))];
}

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [{ category }, recent] = await Promise.all([searchParams, recentTools()]);
  return <ToolsView initialCategory={CATEGORIES.includes(category as CategoryId) ? (category as CategoryId) : "all"} recent={recent} />;
}
