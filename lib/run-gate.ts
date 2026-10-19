import "server-only";
import { runBlock } from "@/lib/admin-ops";
import { getSiteSettings } from "@/lib/admin-ops-server";
import { isStaffEmail } from "@/lib/admin";
import { catalogTool } from "@/lib/tools/catalog";

// Maintenance mode and paused tools (/admin/settings), checked by every
// route that starts AI work: run, intent and regenerate. Staff still get
// through so they can test a fix before reopening. The answer is a 503
// with the message members see, which the run screen shows as is.

/** A 503 response when this tool can't run right now, else null. */
export async function runGate(toolIdOrEngine: string, email: string | null | undefined): Promise<Response | null> {
  const slug = catalogTool(toolIdOrEngine)?.slug ?? toolIdOrEngine;
  const block = runBlock(await getSiteSettings(), slug, isStaffEmail(email));
  if (!block.blocked) return null;
  return Response.json({ error: block.message, code: block.reason === "maintenance" ? "maintenance" : "tool_paused" }, { status: 503, headers: { "Retry-After": "600" } });
}
