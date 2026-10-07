import { z } from "zod";

// Each slide picks a layout and carries the data that layout needs, so
// the deck isn't a stack of bullet slides: a big number, a real chart
// (bar / line / donut from numbers in the brief or the reference
// material, or a labeled estimate), a table, a side-by-side comparison,
// a process, a quote, a full-bleed photo or a single statement. The
// web preview, the .pptx and the PDF all lay the slide out from these.
const SLIDE_LAYOUTS = ["points", "big_number", "chart", "table", "comparison", "process", "quote", "photo", "statement"] as const;

const slideSchema = z.object({
  layout: z.enum(SLIDE_LAYOUTS),
  headline: z.string(),
  points: z.array(z.string()),
  visual: z.string(),
  speaker_notes: z.string(),
  stat: z.object({ value: z.string(), label: z.string(), context: z.string() }).optional(),
  chart: z
    .object({
      kind: z.enum(["bar", "line", "donut"]),
      unit: z.string(),
      categories: z.array(z.string()),
      series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })),
      source: z.enum(["input", "estimate"]),
      takeaway: z.string(),
    })
    .optional(),
  table: z.object({ header: z.array(z.string()), rows: z.array(z.array(z.string())) }).optional(),
  compare: z.object({ left_title: z.string(), left_points: z.array(z.string()), right_title: z.string(), right_points: z.array(z.string()) }).optional(),
  steps: z.array(z.object({ title: z.string(), text: z.string() })).optional(),
  quote: z.object({ text: z.string(), source: z.string() }).optional(),
});

const outputSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  storyline: z.string(),
  slides: z.array(slideSchema),
  closing_ask: z.string(),
});

export default outputSchema;
