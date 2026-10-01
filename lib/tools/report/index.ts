import { brandDnaReport } from "./brand-dna.ts";
import { contentTransformerReport } from "./content-transformer.ts";
import { hookLabReport } from "./hook-lab.ts";
import { meetingActionReport } from "./meeting-action.ts";
import { marketDeskReport } from "./market-desk.ts";
import { competitorLensReport } from "./competitor-lens.ts";
import { personaMapperReport } from "./persona-mapper.ts";
import { insightMinerReport } from "./insight-miner.ts";
import { sopBuilderReport } from "./sop-builder.ts";
import { businessPlanReport } from "./business-plan.ts";
import { calendarReport } from "./calendar.ts";
import { grantReport } from "./grant.ts";
import { ideaRadarReport } from "./idea-radar.ts";
import { marketGapReport } from "./market-gap.ts";
import { mvpBlueprintReport } from "./mvp-blueprint.ts";
import { offerArchitectReport } from "./offer-architect.ts";
import { revenueMapperReport } from "./revenue-mapper.ts";
import { keywordReport } from "./keyword.ts";
import { moneyReport } from "./money.ts";
import { placeReport } from "./place.ts";
import { proposalReport } from "./proposal.ts";
import { strategyReport } from "./strategy.ts";
import { trendReport } from "./trend.ts";
import type { Report } from "./types.ts";
import { isObj } from "./util.ts";

const BUILDERS: Record<string, (o: Record<string, unknown>, input: Record<string, unknown>) => Report> = {
  "business-plan": businessPlanReport,
  trend: trendReport,
  calendar: calendarReport,
  money: moneyReport,
  keyword: keywordReport,
  place: placeReport,
  proposal: proposalReport,
  strategy: strategyReport,
  grant: grantReport,
  "idea-radar": ideaRadarReport,
  "revenue-mapper": revenueMapperReport,
  "offer-architect": offerArchitectReport,
  "market-gap": marketGapReport,
  "mvp-blueprint": mvpBlueprintReport,
  "brand-dna": brandDnaReport,
  "hook-lab": hookLabReport,
  "content-transformer": contentTransformerReport,
  "sop-builder": sopBuilderReport,
  "meeting-action": meetingActionReport,
  "market-desk": marketDeskReport,
  "competitor-lens": competitorLensReport,
  "persona-mapper": personaMapperReport,
  "insight-miner": insightMinerReport,
};

export const hasReport = (toolId: string) => toolId in BUILDERS;

/** The tool's report, or null for tools that render their output another way. */
export function buildReport(toolId: string, output: unknown, input: unknown = {}): Report | null {
  const build = BUILDERS[toolId];
  if (!build || !isObj(output)) return null;
  try {
    const report = build(output, isObj(input) ? input : {});
    return report.sections.length ? report : null;
  } catch (err) {
    console.error(`report ${toolId} failed`, err);
    return null;
  }
}

export type { Report } from "./types.ts";
