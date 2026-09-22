import { z } from "zod";

// Single source of truth for turning a tool's Zod outputSchema into JSON
// Schema. Every adapter starts from this draft-7 shape and adapts it to
// its own provider's structured-output format from there (e.g. OpenAI's
// strict mode needs `additionalProperties: false` on every object).
export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}
