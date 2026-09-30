import type { ToolManifest } from "../types";
import { CATALOG, catalogTool, publicTools, RETIRED, type CatalogTool } from "../catalog";
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
import { ideaRadar } from "./idea-radar";
import { revenueMapper } from "./revenue-mapper";
import { offerArchitect } from "./offer-architect";
import { marketGap } from "./market-gap";
import { mvpBlueprint } from "./mvp-blueprint";

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

// Engines, keyed by their internal id. The public side (slug, name,
// category, promise) comes from lib/tools/catalog.ts and is laid over
// each engine here; the catalog's tools without an engine get a
// "coming soon" manifest so every page can list and explain them.
const ENGINES = [ideaRadar, revenueMapper, offerArchitect, marketGap, mvpBlueprint, money, trend, strategy, calendar, prompt, blog, copy, keyword, place, image, logo, brandModel, sangsepage, homepage, proposal, presentation, businessPlan, grant];

function withCatalog(m: ToolManifest): ToolManifest {
  const c = catalogTool(m.id);
  if (!c) return { ...m, slug: m.id, retired: m.id in RETIRED };
  return { ...m, slug: c.slug, category: c.category, name_ko: c.name.ko, name_en: c.name.en, summary: c.promise.ko };
}

function upcoming(c: CatalogTool): ToolManifest {
  return {
    id: c.slug,
    slug: c.slug,
    category: c.category,
    name_ko: c.name.ko,
    name_en: c.name.en,
    summary: c.promise.ko,
    icon: c.icon,
    inputs: [],
    usesProfile: [],
    outputRenderer: "document",
    grounding: { requireSources: false, webSearch: false, estimateBadge: false },
    model: "gemini-3.1-pro-preview",
    estimatedCredits: 0,
    estimatedSeconds: 0,
    comingSoon: true,
  };
}

const registry = new Map<string, ToolManifest>([
  ...ENGINES.map((m) => [m.id, withFreeRequest(withCatalog(m))] as const),
  ...CATALOG.filter((c) => !c.engine).map((c) => [c.slug, upcoming(c)] as const),
]);
const bySlug = new Map([...registry.values()].map((m) => [m.slug ?? m.id, m]));

export function registerTool(manifest: ToolManifest) {
  const m = withFreeRequest(withCatalog(manifest));
  registry.set(m.id, m);
  bySlug.set(m.slug ?? m.id, m);
}

/** A tool by its engine id (as stored on runs) or its public slug. */
export function getTool(id: string): ToolManifest | undefined {
  return registry.get(id) ?? bySlug.get(id);
}

/** The 25 public tools in catalog order (hidden modes and retired tools excluded). */
export function listTools(): ToolManifest[] {
  return publicTools().map((c) => getTool(c.slug)!);
}

/** Every runnable engine, hidden modes included (for routing and checks). */
export function listEngines(): ToolManifest[] {
  return [...registry.values()].filter((m) => !m.comingSoon && !m.retired);
}
