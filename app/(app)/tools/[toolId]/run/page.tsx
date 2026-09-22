import { notFound } from "next/navigation";
import { ToolRunner } from "@/components/tool-runner";
import { getTool } from "@/lib/tools/registry";
import { getBusinessProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

// HAEBOT_A_TOOLS_SPEC.md §5.2 / Part 6 T4 — tool page anatomy: header,
// profile chips, form (seeded from a chained run when ?fromRun is
// present, from a Studio brief via ?brief=, or from a tool-home preset via
// ?preset=), run, streaming result. The manifest (icon component, zod
// schema) isn't serializable across the server/client boundary, so only
// plain-data props are passed down; ToolRunner reads the manifest itself
// from the registry module.

export default async function ToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ fromRun?: string; brief?: string; preset?: string }>;
}) {
  const { toolId } = await params;
  if (!getTool(toolId)) notFound();

  const [profile, { fromRun, brief, preset }] = await Promise.all([getBusinessProfile(), searchParams]);

  let chainedFrom: { runId: string; toolId: string; output: unknown } | null = null;
  if (fromRun) {
    const supabase = await createClient();
    const { data } = await supabase.from("generations").select("tool_id, output").eq("id", fromRun).maybeSingle();
    if (data?.tool_id && data.output) {
      chainedFrom = { runId: fromRun, toolId: data.tool_id, output: data.output };
    }
  }

  return (
    <ToolRunner
      toolId={toolId}
      profile={profile}
      chainedFrom={chainedFrom}
      initialBrief={chainedFrom ? undefined : brief}
      initialPreset={chainedFrom || preset === undefined ? undefined : Number(preset)}
    />
  );
}
