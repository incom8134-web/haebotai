"use client";

import { BrandBoard } from "./brand/brand-board";
import { LogoBoard } from "./brand/logo-board";
import { SalesPageBoard } from "./brand/sales-page-board";
import { SiteBoard } from "./brand/site-board";
import { Storyboard } from "./brand/storyboard";
import { GapMap } from "./discover/gap-map";
import { IdeaBoard } from "./discover/idea-board";
import { MvpBoard } from "./discover/mvp-board";
import { OfferBlocks } from "./discover/offer-blocks";
import { RevenueMap } from "./discover/revenue-map";

// Each tool's own result view, keyed by engine id. `match` guards against
// runs saved in an older shape, which fall back to the generic renderers
// in components/run-result.tsx. Exports use lib/tools/report instead.

export interface ViewProps {
  output: Record<string, unknown>;
  input?: Record<string, unknown>;
  runId?: string;
}

const has = (o: Record<string, unknown>, key: string) => Array.isArray(o[key]) && (o[key] as unknown[]).length > 0;

export const TOOL_VIEWS: Record<string, { match: (o: Record<string, unknown>) => boolean; View: (p: ViewProps) => React.ReactNode }> = {
  "idea-radar": { match: (o) => has(o, "ideas"), View: IdeaBoard },
  "revenue-mapper": { match: (o) => has(o, "streams"), View: RevenueMap },
  "offer-architect": { match: (o) => has(o, "packages") || typeof o.core_promise === "string", View: OfferBlocks },
  "market-gap": { match: (o) => has(o, "needs"), View: GapMap },
  "mvp-blueprint": { match: (o) => has(o, "features"), View: MvpBoard },
  "brand-dna": { match: (o) => has(o, "palette") || Boolean(o.essence), View: BrandBoard },
  logo: { match: (o) => has(o, "concepts") && Boolean((o.concepts as { image?: { url?: string } }[])[0]?.image?.url), View: LogoBoard },
  sangsepage: { match: (o) => has(o, "sections"), View: SalesPageBoard },
  homepage: { match: (o) => typeof o.html === "string", View: SiteBoard },
  presentation: { match: (o) => has(o, "slides") && (o.slides as { headline?: unknown }[]).some((s) => typeof s?.headline === "string"), View: Storyboard },
};
