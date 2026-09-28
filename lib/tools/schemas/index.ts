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

// Each tool's output schema (zod), kept out of lib/tools/registry so the
// registry — imported by the app shell, Studio, tool pages and the ⌘K
// palette on the client — carries no zod. Only server code (generation,
// validation, export, ordering) imports this.
const OUTPUT_SCHEMAS: Record<string, z.ZodType> = {
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
