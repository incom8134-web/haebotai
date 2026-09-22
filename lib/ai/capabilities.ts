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
// google-only. Phase 3 adds "anthropic" to text tools one at a time:
// 3a = `copy` (no web search — verifies structured output alone), 3b =
// `strategy` (adds web search + citations), then the rest once both are
// verified end to end. Phase 4 does the same for "openai", plus adds it
// to `image`/`brand-model` once the OpenAI image adapter ships and is
// verified. Never hand-list a provider a tool's requirements rule out
// (checked against PROVIDER_CAPS by capabilities.test.ts).
export const TOOL_CAPABILITIES: Record<string, ToolCapability> = {
  money: { providers: ["google"], default: "google" },
  trend: { providers: ["google"], default: "google" },
  strategy: { providers: ["google", "anthropic"], default: "google" },
  calendar: { providers: ["google"], default: "google" },
  prompt: { providers: ["google"], default: "google" },
  blog: { providers: ["google"], default: "google" },
  copy: { providers: ["google", "anthropic"], default: "google" },
  keyword: { providers: ["google"], default: "google" },
  place: { providers: ["google"], default: "google" },
  image: { providers: ["google"], default: "google" },
  logo: { providers: ["google"], default: "google" },
  "brand-model": { providers: ["google"], default: "google" },
  sangsepage: { providers: ["google"], default: "google" },
  homepage: { providers: ["google"], default: "google" },
  proposal: { providers: ["google"], default: "google" },
  presentation: { providers: ["google"], default: "google" },
  "business-plan": { providers: ["google"], default: "google" },
  grant: { providers: ["google"], default: "google" },
};

export function getToolCapability(toolId: string): ToolCapability | undefined {
  return TOOL_CAPABILITIES[toolId];
}
