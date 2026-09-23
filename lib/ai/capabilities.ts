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
// OpenAI joined every text tool plus `image`/`brand-model` in Stage 5,
// all at once, once lib/ai/openai.ts was verified end to end (unlike
// Claude, OpenAI genuinely has an image API — gpt-image-1.5 via
// images.generate/edit — so no fake-integration concern there). `grant`
// stays google-only: it's a static placeholder (lib/tools/generate.ts)
// that never reaches any adapter, so listing another provider for it
// would be pure decoration. Never hand-list a provider a tool's
// requirements rule out (checked against PROVIDER_CAPS by
// capabilities.test.ts).
export const TOOL_CAPABILITIES: Record<string, ToolCapability> = {
  money: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 2 / Stage 5
  trend: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 4 / Stage 5
  strategy: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 5
  calendar: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 2 / Stage 5
  prompt: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 1 / Stage 5
  blog: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 1 / Stage 5
  copy: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 5
  keyword: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 2 / Stage 5
  place: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 2 / Stage 5
  image: { providers: ["google", "openai"], default: "google" }, // Stage 5
  logo: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 3 / Stage 5
  "brand-model": { providers: ["google", "openai"], default: "google" }, // Stage 5
  sangsepage: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 3 / Stage 5
  homepage: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 3 / Stage 5
  proposal: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 1 / Stage 5
  presentation: { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 1 / Stage 5
  "business-plan": { providers: ["google", "anthropic", "openai"], default: "google" }, // Stage 2 batch 4 / Stage 5
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
