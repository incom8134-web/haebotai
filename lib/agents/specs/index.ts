import "server-only";
import type { ProviderId } from "@/lib/ai/types";
import type { ToolManifest } from "@/lib/tools/types";
import type { AgentSpec } from "../types";
import { genericSpec } from "./generic";
import { homepageSpec } from "./homepage";
import { legacySpec } from "./legacy";
import { logoSpec, photoSpec } from "./visual";

// Which agent works on a run. Every tool on Gemini (the platform engine and
// members' own Gemini keys) gets its agent; other engines keep the one-shot
// pipeline until their adapters expose the same steps.

const NO_AGENT = new Set(["grant"]);

export function agentFor(manifest: ToolManifest, provider: ProviderId): AgentSpec {
  if (provider !== "google" || NO_AGENT.has(manifest.id)) return legacySpec(manifest.id);
  if (manifest.id === "homepage") return homepageSpec();
  if (manifest.id === "logo") return logoSpec();
  if (manifest.id === "image" || manifest.id === "brand-model") return photoSpec(manifest.id);
  return genericSpec(manifest.id);
}

/** Whether a run on this tool/engine goes through the agent layers (intent questions, strategy, critic). */
export function isAgentic(manifest: ToolManifest, provider: ProviderId): boolean {
  return provider === "google" && !NO_AGENT.has(manifest.id);
}
