import type { ToolManifest } from "../types";
import { money } from "./money";
import { trend } from "./trend";
import { calendar } from "./calendar";
import { prompt } from "./prompt";
import { blog } from "./blog";
import { keyword } from "./keyword";
import { place } from "./place";
import { image } from "./image";
import { logo } from "./logo";
import { brandModel } from "./brand-model";
import { sangsepage } from "./sangsepage";
import { homepage } from "./homepage";
import { proposal } from "./proposal";
import { businessPlan } from "./business-plan";
import { grant } from "./grant";
import { strategy } from "./strategy";
import { copy } from "./copy";
import { presentation } from "./presentation";

// HAEBOT_A_TOOLS_SPEC.md §3.1 / §4 — the tool registry. Every tool is a
// manifest here, not a deployment; adding a tool means adding a file in
// this directory and listing it below.

const registry = new Map<string, ToolManifest>(
  [money, trend, strategy, calendar, prompt, blog, copy, keyword, place, image, logo, brandModel, sangsepage, homepage, proposal, presentation, businessPlan, grant].map(
    (m) => [m.id, m],
  ),
);

export function registerTool(manifest: ToolManifest) {
  registry.set(manifest.id, manifest);
}

export function getTool(id: string): ToolManifest | undefined {
  return registry.get(id);
}

export function listTools(): ToolManifest[] {
  return [...registry.values()];
}
