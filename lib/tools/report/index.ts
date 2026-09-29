import { businessPlanReport } from "./business-plan.ts";
import { calendarReport } from "./calendar.ts";
import { grantReport } from "./grant.ts";
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
