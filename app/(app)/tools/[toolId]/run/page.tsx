import { notFound, permanentRedirect, redirect } from "next/navigation";
import { redirectFor } from "@/lib/tools/catalog";
import { ToolRunner } from "@/components/tool-runner";
import { getTool } from "@/lib/tools/registry";
import { DEFAULT_TOOL_CAPABILITY, getToolCapability } from "@/lib/ai/capabilities";
import { getBusinessProfile } from "@/lib/profile";
import { getApiKeyStatus } from "@/lib/api-keys";
import { getMembership } from "@/lib/membership";
import { getBalance } from "@/lib/credits";
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
  searchParams: Promise<{ fromRun?: string; pick?: string; brief?: string; preset?: string }>;
}) {
  const { toolId: requested } = await params;
  const query = new URLSearchParams(Object.entries(await searchParams).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  const qs = query ? `?${query}` : "";
  const moved = redirectFor(requested);
  if (moved !== null) permanentRedirect(moved ? `/tools/${moved}/run${qs}` : "/tools");
  const tool = getTool(requested);
  if (!tool || tool.retired) notFound();
  if (tool.slug && tool.slug !== requested) permanentRedirect(`/tools/${tool.slug}/run${qs}`);
  // Not runnable yet — the overview page explains, so send pinned links,
  // flows and old bookmarks there instead of a form that can only fail.
  if (tool.comingSoon) redirect(`/tools/${requested}`);
  // Everything below works with the engine id (what runs store).
  const toolId = tool.id;

  const [profile, { fromRun, pick, brief, preset }, keyStatus, membership, balance] = await Promise.all([
    getBusinessProfile(),
    searchParams,
    getApiKeyStatus(),
    getMembership(),
    getBalance(),
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

  let chainedFrom: { runId: string; toolId: string; output: unknown; pick?: number } | null = null;
  if (fromRun) {
    const supabase = await createClient();
    const { data } = await supabase.from("generations").select("tool_id, output").eq("id", fromRun).maybeSingle();
    if (data?.tool_id && data.output) {
      const index = Number(pick);
      chainedFrom = { runId: fromRun, toolId: data.tool_id, output: data.output, ...(Number.isInteger(index) && index >= 0 ? { pick: index } : {}) };
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
      balance={balance}
    />
  );
}
