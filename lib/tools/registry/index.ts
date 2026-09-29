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

// Every tool also takes a free-form request, written in the user's own
// words, that overrides the tool's default approach (lib/tools/
// generate-prompt.ts puts it first in priority). Presets help; they
// never limit what someone can ask for.
export const FREE_REQUEST_ID = "free_request";
const withFreeRequest = (m: ToolManifest): ToolManifest =>
  m.inputs.some((f) => f.id === FREE_REQUEST_ID)
    ? m
    : { ...m, inputs: [...m.inputs, { kind: "textarea", id: FREE_REQUEST_ID, label: "원하는 대로 자유롭게 요청", rows: 3, max: 2000 }] };

const registry = new Map<string, ToolManifest>(
  [money, trend, strategy, calendar, prompt, blog, copy, keyword, place, image, logo, brandModel, sangsepage, homepage, proposal, presentation, businessPlan, grant].map(
    (m) => [m.id, withFreeRequest(m)],
  ),
);

export function registerTool(manifest: ToolManifest) {
  registry.set(manifest.id, withFreeRequest(manifest));
}

export function getTool(id: string): ToolManifest | undefined {
  return registry.get(id);
}

export function listTools(): ToolManifest[] {
  return [...registry.values()];
}
