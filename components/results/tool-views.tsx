"use client";

import { BrandBoard } from "./brand/brand-board";
import { LogoBoard } from "./brand/logo-board";
import { SalesPageBoard } from "./brand/sales-page-board";
import { SiteBoard } from "./brand/site-board";
import { Storyboard } from "./brand/storyboard";
import { AdBoard } from "./campaign/ad-board";
import { CampaignBoard } from "./campaign/campaign-board";
import { ContentBranches } from "./campaign/content-branches";
import { HookBoard } from "./campaign/hook-board";
import { SeoEditor } from "./campaign/seo-editor";
import { GapMap } from "./discover/gap-map";
import { ActionBoard } from "./operate/action-board";
import { CompetitorMatrix } from "./research/competitor-matrix";
import { InsightBoard } from "./research/insight-board";
import { PersonaMap } from "./research/persona-map";
import { ResearchDesk } from "./research/research-desk";
import { TrendRadar } from "./research/trend-radar";
import { DocCanvas } from "./operate/doc-canvas";
import { OpsBoard } from "./operate/ops-board";
import { ProposalBuilder } from "./operate/proposal-builder";
import { SopFlow } from "./operate/sop-flow";
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
  "hook-lab": { match: (o) => has(o, "hooks"), View: HookBoard },
  "content-transformer": { match: (o) => has(o, "versions"), View: ContentBranches },
  // Strategy runs from before the channel plan fall through to the plain report.
  strategy: { match: (o) => has(o, "channel_plan"), View: CampaignBoard },
  blog: { match: (o) => typeof o.body_markdown === "string", View: SeoEditor },
  copy: { match: (o) => has(o, "angles"), View: AdBoard },
  "sop-builder": { match: (o) => has(o, "steps"), View: SopFlow },
  "meeting-action": { match: (o) => has(o, "actions") || has(o, "decisions"), View: ActionBoard },
  "business-plan": { match: (o) => Boolean(o.sections), View: DocCanvas },
  proposal: { match: (o) => typeof o.executive_summary === "string", View: ProposalBuilder },
  calendar: { match: (o) => has(o, "weeks"), View: OpsBoard },
  "market-desk": { match: (o) => has(o, "questions"), View: ResearchDesk },
  "competitor-lens": { match: (o) => has(o, "competitors"), View: CompetitorMatrix },
  "persona-mapper": { match: (o) => has(o, "personas"), View: PersonaMap },
  "insight-miner": { match: (o) => has(o, "themes"), View: InsightBoard },
  // Trend runs from before signals carried an origin keep the plain report.
  trend: { match: (o) => Array.isArray(o.signals) && (o.signals as { origin?: unknown }[]).some((s) => typeof s?.origin === "string"), View: TrendRadar },
  presentation: { match: (o) => has(o, "slides") && (o.slides as { headline?: unknown }[]).some((s) => typeof s?.headline === "string"), View: Storyboard },
};
