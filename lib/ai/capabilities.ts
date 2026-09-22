import type { ProviderId } from "./types.ts";

// Intrinsic capability of each provider's adapter. Claude has no
// image-generation API — a tool that needs images may never list
// "anthropic" here (non-negotiable: no fake integrations). Enforced by
// capabilities.test.ts against the table below.
export const PROVIDER_CAPS: Record<ProviderId, { webSearch: boolean; images: boolean }> = {
  google: { webSearch: true, images: true },
  anthropic: { webSearch: true, images: false },
  openai: { webSearch: true, images: true },
};

export interface ToolCapability {
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
// `image`/`brand-model` stay google-only — Claude has no image API, no
// fake integrations. `grant` stays google-only too: it's a static
// placeholder (lib/tools/generate.ts) that never reaches any adapter, so
// listing another provider for it would be pure decoration. OpenAI joins
// the same way in Stage 5. Never hand-list a provider a tool's
// requirements rule out (checked against PROVIDER_CAPS by
// capabilities.test.ts).
export const TOOL_CAPABILITIES: Record<string, ToolCapability> = {
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
  logo: { providers: ["google", "anthropic"], default: "google" }, // Stage 2 batch 3
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
