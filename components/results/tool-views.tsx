"use client";

import dynamic from "next/dynamic";

// Each view loads on its own: a result page downloads only the view it
// shows, not all 25 (they stay server-rendered — dynamic() keeps SSR).
const BrandBoard = dynamic(() => import("./brand/brand-board").then((m) => m.BrandBoard));
const LogoBoard = dynamic(() => import("./brand/logo-board").then((m) => m.LogoBoard));
const SalesPageBoard = dynamic(() => import("./brand/sales-page-board").then((m) => m.SalesPageBoard));
const SiteBoard = dynamic(() => import("./brand/site-board").then((m) => m.SiteBoard));
const Storyboard = dynamic(() => import("./brand/storyboard").then((m) => m.Storyboard));
const AdBoard = dynamic(() => import("./campaign/ad-board").then((m) => m.AdBoard));
const CampaignBoard = dynamic(() => import("./campaign/campaign-board").then((m) => m.CampaignBoard));
const ContentBranches = dynamic(() => import("./campaign/content-branches").then((m) => m.ContentBranches));
const HookBoard = dynamic(() => import("./campaign/hook-board").then((m) => m.HookBoard));
const SeoEditor = dynamic(() => import("./campaign/seo-editor").then((m) => m.SeoEditor));
const GapMap = dynamic(() => import("./discover/gap-map").then((m) => m.GapMap));
const ActionBoard = dynamic(() => import("./operate/action-board").then((m) => m.ActionBoard));
const CompetitorMatrix = dynamic(() => import("./research/competitor-matrix").then((m) => m.CompetitorMatrix));
const InsightBoard = dynamic(() => import("./research/insight-board").then((m) => m.InsightBoard));
const PersonaMap = dynamic(() => import("./research/persona-map").then((m) => m.PersonaMap));
const ResearchDesk = dynamic(() => import("./research/research-desk").then((m) => m.ResearchDesk));
const TrendRadar = dynamic(() => import("./research/trend-radar").then((m) => m.TrendRadar));
const DocCanvas = dynamic(() => import("./operate/doc-canvas").then((m) => m.DocCanvas));
const OpsBoard = dynamic(() => import("./operate/ops-board").then((m) => m.OpsBoard));
const ProposalBuilder = dynamic(() => import("./operate/proposal-builder").then((m) => m.ProposalBuilder));
const SopFlow = dynamic(() => import("./operate/sop-flow").then((m) => m.SopFlow));
const IdeaBoard = dynamic(() => import("./discover/idea-board").then((m) => m.IdeaBoard));
const MvpBoard = dynamic(() => import("./discover/mvp-board").then((m) => m.MvpBoard));
const OfferBlocks = dynamic(() => import("./discover/offer-blocks").then((m) => m.OfferBlocks));
const RevenueMap = dynamic(() => import("./discover/revenue-map").then((m) => m.RevenueMap));


// Each tool's own result view, keyed by engine id. `match` guards against
// runs saved in an older shape, which fall back to the generic renderers
// in components/run-result.tsx. Exports use lib/tools/report instead.

interface ViewProps {
  output: Record<string, unknown>;
  input?: Record<string, unknown>;
  runId?: string;
}

const has = (o: Record<string, unknown>, key: string) => Array.isArray(o[key]) && (o[key] as unknown[]).length > 0;

export const TOOL_VIEWS: Record<string, { match: (o: Record<string, unknown>) => boolean; View: React.ComponentType<ViewProps> }> = {
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
  // A document-agent proposal (output.document) reads as a document with its outline; older ones keep the section builder.
  proposal: { match: (o) => Boolean(o.document) || typeof o.executive_summary === "string", View: (p) => (p.output.document ? <DocCanvas {...p} toolId="proposal" /> : <ProposalBuilder {...p} />) },
  calendar: { match: (o) => has(o, "weeks"), View: OpsBoard },
  "market-desk": { match: (o) => has(o, "questions"), View: ResearchDesk },
  "competitor-lens": { match: (o) => has(o, "competitors"), View: CompetitorMatrix },
  "persona-mapper": { match: (o) => has(o, "personas"), View: PersonaMap },
  "insight-miner": { match: (o) => has(o, "themes"), View: InsightBoard },
  // Trend runs from before signals carried an origin keep the plain report.
  trend: { match: (o) => Array.isArray(o.signals) && (o.signals as { origin?: unknown }[]).some((s) => typeof s?.origin === "string"), View: TrendRadar },
  presentation: { match: (o) => has(o, "slides") && (o.slides as { headline?: unknown }[]).some((s) => typeof s?.headline === "string"), View: Storyboard },
};
