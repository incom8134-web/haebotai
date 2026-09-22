import { notFound } from "next/navigation";
import { ToolRunner } from "@/components/tool-runner";
import { getTool } from "@/lib/tools/registry";
import { DEFAULT_TOOL_CAPABILITY, getToolCapability } from "@/lib/ai/capabilities";
import { getBusinessProfile } from "@/lib/profile";
import { getApiKeyStatus } from "@/lib/api-keys";
import { getMembership } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import type { ProviderId } from "@/lib/ai/types";

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

  const [profile, { fromRun, brief, preset }, keyStatus, membership] = await Promise.all([
    getBusinessProfile(),
    searchParams,
    getApiKeyStatus(),
    getMembership(),
  ]);

  // Which engines this run page actually offers: google is always
  // available; anthropic/openai only when the capability map lists them
  // for this tool AND the user has at least one non-broken key — never
  // offer an engine the run route would just reject (product decision:
  // no silent fallback, so don't dangle an option that can't work).
  const capability = getToolCapability(toolId) ?? DEFAULT_TOOL_CAPABILITY;
  const usable = (p: ProviderId) => keyStatus.providers[p].some((s) => s.connected && !s.broken);
  const availableProviders = capability.providers.filter((p) => p === "google" || usable(p));
  const hasOwnKey = Object.fromEntries(capability.providers.map((p) => [p, usable(p)])) as Partial<Record<ProviderId, boolean>>;

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
      availableProviders={availableProviders}
      supportedProviders={capability.providers}
      defaultProvider={capability.default}
      hasOwnKey={hasOwnKey}
      isStudent={membership.plan === "student"}
    />
  );
}
