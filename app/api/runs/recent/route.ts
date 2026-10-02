import { createClient } from "@/lib/supabase/server";

// The member's latest results for the ⌘K palette: starred first, then
// newest. Only what the palette shows.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ runs: [] }, { status: 401 });
  const query = (cols: string, pinnedFirst: boolean) => {
    let q = supabase.from("generations").select(cols).eq("user_id", user.id).eq("status", "done").not("tool_id", "is", null);
    if (pinnedFirst) q = q.order("pinned", { ascending: false });
    return q.order("created_at", { ascending: false }).limit(30);
  };
  let { data, error } = await query("id, tool_id, title, created_at, pinned", true);
  if (error) ({ data, error } = await query("id, tool_id, title, created_at", false));
  if (error) ({ data, error } = await query("id, tool_id, created_at", false));
  return Response.json({ runs: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
