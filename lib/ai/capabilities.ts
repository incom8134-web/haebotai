import type { ProviderId } from "./types.ts";

// Intrinsic capability of each provider's adapter. Claude has no
// image-generation API — a tool that needs images may never list
// "anthropic" here (non-negotiable: no fake integrations). Enforced by
// capabilities.test.ts against the table below.
export const PROVIDER_CAPS: Record<ProviderId, { webSearch: boolean; images: boolean }> = {
  google: { webSearch: true, images: true },
  anthropic: { webSearch: true, images: false },
};

interface ToolCapability {
  /** Providers currently offered for this tool, in display order. */
  providers: ProviderId[];
  /** Always "google" — Gemini is the platform engine (product decision). */
  default: ProviderId;
}

// One entry per tool id (lib/tools/registry/*.ts). Every tool starts
// google-only. Anthropic was added text-tool by text-tool as each was
// verified: 3a = `copy` (structured output alone), 3b = `strategy`
// (+ web search + citations), Stage 2 = every other text tool, in four
// batches, once both were confirmed working end to end on staging.
// `image`/`brand-model`/`logo` stay google-only — Claude has no image API, no
// fake integrations. `grant` stays google-only too: it's a static
// placeholder (lib/tools/generate.ts) that never reaches any adapter, so
// listing another provider for it would be pure decoration. Never hand-list a provider a tool's
// requirements rule out (checked against PROVIDER_CAPS by
// capabilities.test.ts).
export const TOOL_CAPABILITIES: Record<string, ToolCapability> = {
  "idea-radar": { providers: ["google"], default: "google" }, // new in 2.0 — google-only until verified on Claude
  "revenue-mapper": { providers: ["google"], default: "google" },
  "offer-architect": { providers: ["google"], default: "google" },
  "market-gap": { providers: ["google"], default: "google" },
  "mvp-blueprint": { providers: ["google"], default: "google" },
  "brand-dna": { providers: ["google"], default: "google" },
  "hook-lab": { providers: ["google"], default: "google" },
  "content-transformer": { providers: ["google"], default: "google" },
  "sop-builder": { providers: ["google"], default: "google" },
  "meeting-action": { providers: ["google"], default: "google" },
  "market-desk": { providers: ["google"], default: "google" },
  "competitor-lens": { providers: ["google"], default: "google" },
  "persona-mapper": { providers: ["google"], default: "google" },
  "insight-miner": { providers: ["google"], default: "google" },
  money: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 2
  trend: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 4
  strategy: { providers: ["google", "anthropic"], default: "google" },
  calendar: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 2
  prompt: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 1
  blog: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 1
  copy: { providers: ["google", "anthropic"], default: "google" },
  keyword: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 2
  place: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 2
  image: { providers: ["google"], default: "google" },
  logo: { providers: ["google"], default: "google" }, // symbols are drawn by the image model
  "brand-model": { providers: ["google"], default: "google" },
  sangsepage: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 3
  homepage: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 3
  proposal: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 1
  presentation: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 1
  "business-plan": { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 4
  grant: { providers: ["google"], default: "google" },
};

export function getToolCapability(toolId: string): ToolCapability | undefined {
  return TOOL_CAPABILITIES[toolId];
}

// Tools with no TOOL_CAPABILITIES entry get this — google-only, since
// that's the one engine that never needs an own key. Shared by the run
// route (resolve-provider.ts) and the run page so client and server can
// never disagree about what an uncapped tool offers.
export const DEFAULT_TOOL_CAPABILITY: ToolCapability = { providers: ["google"], default: "google" };
