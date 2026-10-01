import type { z } from "zod";
import blogSchema from "./blog";
import brandModelSchema from "./brand-model";
import businessPlanSchema from "./business-plan";
import calendarSchema from "./calendar";
import copySchema from "./copy";
import grantSchema from "./grant";
import homepageSchema from "./homepage";
import imageSchema from "./image";
import keywordSchema from "./keyword";
import logoSchema from "./logo";
import moneySchema from "./money";
import placeSchema from "./place";
import presentationSchema from "./presentation";
import promptSchema from "./prompt";
import proposalSchema from "./proposal";
import sangsepageSchema from "./sangsepage";
import strategySchema from "./strategy";
import trendSchema from "./trend";
import ideaRadarSchema from "./idea-radar";
import revenueMapperSchema from "./revenue-mapper";
import offerArchitectSchema from "./offer-architect";
import marketGapSchema from "./market-gap";
import mvpBlueprintSchema from "./mvp-blueprint";
import brandDnaSchema from "./brand-dna";
import hookLabSchema from "./hook-lab";
import contentTransformerSchema from "./content-transformer";
import sopBuilderSchema from "./sop-builder";
import meetingActionSchema from "./meeting-action";
import marketDeskSchema from "./market-desk";
import competitorLensSchema from "./competitor-lens";
import personaMapperSchema from "./persona-mapper";
import insightMinerSchema from "./insight-miner";

// Each tool's output schema (zod), kept out of lib/tools/registry so the
// registry — imported by the app shell, Studio, tool pages and the ⌘K
// palette on the client — carries no zod. Only server code (generation,
// validation, export, ordering) imports this.
const OUTPUT_SCHEMAS: Record<string, z.ZodType> = {
  "idea-radar": ideaRadarSchema,
  "revenue-mapper": revenueMapperSchema,
  "offer-architect": offerArchitectSchema,
  "market-gap": marketGapSchema,
  "mvp-blueprint": mvpBlueprintSchema,
  "brand-dna": brandDnaSchema,
  "hook-lab": hookLabSchema,
  "content-transformer": contentTransformerSchema,
  "sop-builder": sopBuilderSchema,
  "meeting-action": meetingActionSchema,
  "market-desk": marketDeskSchema,
  "competitor-lens": competitorLensSchema,
  "persona-mapper": personaMapperSchema,
  "insight-miner": insightMinerSchema,
  "blog": blogSchema,
  "brand-model": brandModelSchema,
  "business-plan": businessPlanSchema,
  "calendar": calendarSchema,
  "copy": copySchema,
  "grant": grantSchema,
  "homepage": homepageSchema,
  "image": imageSchema,
  "keyword": keywordSchema,
  "logo": logoSchema,
  "money": moneySchema,
  "place": placeSchema,
  "presentation": presentationSchema,
  "prompt": promptSchema,
  "proposal": proposalSchema,
  "sangsepage": sangsepageSchema,
  "strategy": strategySchema,
  "trend": trendSchema,
};

export function getOutputSchema(toolId: string): z.ZodType | undefined {
  return OUTPUT_SCHEMAS[toolId];
}

/** For code paths that only run for real tools (generation, export). */
export function outputSchemaFor(toolId: string): z.ZodType {
  const schema = OUTPUT_SCHEMAS[toolId];
  if (!schema) throw new Error(`알 수 없는 도구: ${toolId}`);
  return schema;
}
