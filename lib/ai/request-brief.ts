import "server-only";
import { ThinkingLevel } from "@google/genai";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import { buildContext, formatValue, PROFILE_LABELS, toolLabel } from "@/lib/tools/generate-prompt";
import { DIRECTIONS } from "@/lib/tools/directions";
import { BRIEF_SYSTEM, briefPrompt, briefSchema, parseBrief, type RequestBrief } from "@/lib/tools/request-brief";
import { addUsage, getClient, TEXT_MODEL } from "./gemini";
import type { TokenUsage } from "./types";

// The request-analysis call (lib/tools/request-brief.ts): one fast JSON
// call before generation. It must never block a run — on any failure or
// after a few seconds the run continues without it (the prompts still
// tell the model to follow the request's tone).

const TIMEOUT_MS = 12_000;

export async function analyzeRequest(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  recentIds: string[],
  abortSignal: AbortSignal | undefined,
): Promise<{ brief: RequestBrief | null; usage: TokenUsage }> {
  const directions = DIRECTIONS[manifest.id] ?? [];
  const profileText = profile
    ? (Object.keys(PROFILE_LABELS) as (keyof BusinessProfile)[])
        .filter((k) => k !== "logo_asset_id" && profile[k] !== undefined && profile[k] !== null && profile[k] !== "")
        .map((k) => `- ${PROFILE_LABELS[k]}: ${formatValue(profile[k])}`)
        .join("\n")
    : "";
  const prompt = briefPrompt({ toolName: toolLabel(manifest), requestText: buildContext(manifest, input, null), profileText, directions, recentIds });
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = abortSignal ? AbortSignal.any([abortSignal, timeout]) : timeout;
  try {
    const res = await getClient().models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: BRIEF_SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: briefSchema(directions.map((d) => d.id)),
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
      },
    });
    const usage = addUsage({ inputTokens: 0, outputTokens: 0 }, res.usageMetadata);
    return { brief: parseBrief(JSON.parse(res.text ?? "null"), directions), usage };
  } catch (err) {
    if (abortSignal?.aborted) throw err;
    console.warn("request brief skipped:", (err as Error).message);
    return { brief: null, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
