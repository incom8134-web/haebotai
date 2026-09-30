import { z } from "zod";

// 수익 구조 지도: who pays for what, how often and at what price — drawn as
// a flow from customer segments to revenue streams, a value ladder from the
// first small purchase to the premium tier, and a unit-economics frame the
// page computes from (price, variable cost, acquisition cost, repeat rate).
const outputSchema = z.object({
  business_summary: z.string(),
  segments: z.array(z.object({ id: z.string(), name: z.string(), pays_for: z.string(), willingness: z.enum(["low", "medium", "high"]) })).min(1).max(4),
  streams: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["one_time", "subscription", "service", "usage", "commission", "licensing", "advertising"]),
        segment_ids: z.array(z.string()),
        what_they_get: z.string(),
        price_model: z.string(),
        price_low_krw: z.number(),
        price_high_krw: z.number(),
        frequency: z.string(),
        role: z.enum(["core", "upsell", "recurring", "experimental"]),
        effort: z.number().min(1).max(5),
        weeks_to_first_revenue: z.number(),
        margin_note: z.string(),
      }),
    )
    .min(3)
    .max(8),
  ladder: z.array(z.object({ step: z.string(), offer: z.string(), price_krw: z.number(), purpose: z.string() })).min(3).max(5),
  unit_economics: z.object({
    price_krw: z.number(),
    variable_cost_krw: z.number(),
    acquisition_cost_krw: z.number(),
    purchases_per_year: z.number(),
    retention_years: z.number(),
    notes: z.array(z.string()),
  }),
  recommended_mix: z.object({ start_with: z.string(), add_next: z.string(), avoid_for_now: z.array(z.string()), reason: z.string() }),
  assumptions: z.array(z.string()),
});

export default outputSchema;
