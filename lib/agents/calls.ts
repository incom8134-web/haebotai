import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ThinkingLevel, type Part } from "@google/genai";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import { buildContext, formatValue, PROFILE_LABELS, toolLabel } from "@/lib/tools/generate-prompt";
import { DIRECTIONS } from "@/lib/tools/directions";
import { addUsage, getClient, TEXT_MODEL } from "@/lib/ai/gemini";
import { PRO_TEXT_MODEL } from "@/lib/ai/gemini-studio";
import type { TokenUsage } from "@/lib/ai/types";
import { INTENT_SCHEMA, INTENT_SYSTEM, intentBlock, intentPrompt, parseIntent } from "./intent";
import { guideFor } from "./library";
import { budgetProblem, parseStrategy, STRATEGY_SYSTEM, strategyPrompt, strategySchema } from "./strategy";
import { domainFor } from "./space";
import { parsePlanChoice, plannerSchema, PLANNER_SYSTEM, plannerPrompt, type PlanChoice } from "./planner";
import { clip, CRITIC_SYSTEM, CRITIQUE_SCHEMA, criticPrompt, parseCritique } from "./critic";
import { recentLabels, type Fingerprint } from "./diversity";
import type { Critique, Intent, Question, Strategy } from "./types";
import type { Direction } from "@/lib/tools/directions";

// The model calls behind the intent, strategy and critic layers. Each is
// one JSON call against a fixed schema; the pure halves (prompts, schemas,
// validation) live beside them and are tested. They run inside the
// runner's key context (runWithApiKey), so a member's own Gemini key pays
// for them like for the rest of the run.

const ZERO: TokenUsage = { inputTokens: 0, outputTokens: 0 };

async function jsonCall(opts: {
  model: string;
  system: string;
  prompt: string;
  schema: object;
  signal: AbortSignal;
  thinking?: ThinkingLevel;
  timeoutMs?: number;
  parts?: Part[];
  maxOutputTokens?: number;
}): Promise<{ data: unknown; usage: TokenUsage }> {
  const signal = opts.timeoutMs ? AbortSignal.any([opts.signal, AbortSignal.timeout(opts.timeoutMs)]) : opts.signal;
  const res = await getClient().models.generateContent({
    model: opts.model,
    contents: [{ role: "user", parts: [{ text: opts.prompt }, ...(opts.parts ?? [])] }],
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseJsonSchema: opts.schema,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      ...(opts.thinking ? { thinkingConfig: { thinkingLevel: opts.thinking } } : {}),
      abortSignal: signal,
    },
  });
  return { data: JSON.parse(res.text ?? "null"), usage: addUsage(ZERO, res.usageMetadata) };
}

/** Pro first; the fast model when Pro is rate-limited, down or slow — never fails the run for a planning call. */
async function smartCall(opts: Parameters<typeof jsonCall>[0]): Promise<{ data: unknown; usage: TokenUsage }> {
  try {
    return await jsonCall(opts);
  } catch (err) {
    if (opts.signal.aborted) throw err;
    console.warn(`agent call on ${opts.model} failed, using the fast model:`, (err as Error).message);
    return jsonCall({ ...opts, model: TEXT_MODEL, thinking: ThinkingLevel.MEDIUM, timeoutMs: 60_000 });
  }
}

export function profileText(profile: BusinessProfile | null): string {
  if (!profile) return "";
  return (Object.keys(PROFILE_LABELS) as (keyof BusinessProfile)[])
    .filter((k) => k !== "logo_asset_id" && profile[k] !== undefined && profile[k] !== null && profile[k] !== "")
    .map((k) => `- ${PROFILE_LABELS[k]}: ${formatValue(profile[k])}`)
    .join("\n");
}

/** The request as the member wrote it (form, free request, reference text), without the profile. */
export function requestText(manifest: ToolManifest, input: Record<string, unknown>): string {
  const clean = { ...input };
  for (const k of Object.keys(clean)) if (k.startsWith("_") && k !== "_reference") delete clean[k];
  return clip(buildContext(manifest, clean, null), 24_000);
}

export async function understand(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  answers: { question: string; answer: string }[],
  signal: AbortSignal,
): Promise<{ intent: Intent | null; questions: Question[]; usage: TokenUsage }> {
  try {
    const { data, usage } = await jsonCall({
      model: TEXT_MODEL,
      system: INTENT_SYSTEM,
      prompt: intentPrompt({ toolName: toolLabel(manifest), requestText: requestText(manifest, input), profileText: profileText(profile), answers }),
      schema: INTENT_SCHEMA,
      signal,
      thinking: ThinkingLevel.LOW,
      timeoutMs: 25_000,
      maxOutputTokens: 4096,
    });
    const parsed = parseIntent(data);
    return { intent: parsed?.intent ?? null, questions: answers.length ? [] : (parsed?.questions ?? []), usage };
  } catch (err) {
    if (signal.aborted) throw err;
    console.warn("intent skipped:", (err as Error).message);
    return { intent: null, questions: [], usage: ZERO };
  }
}

export async function strategize(opts: {
  manifest: ToolManifest;
  input: Record<string, unknown>;
  intent: Intent | null;
  answers: { question: string; answer: string }[];
  recent: Fingerprint[];
  override: string | null;
  signal: AbortSignal;
  extra?: string;
}): Promise<{ strategy: Strategy | null; direction: Direction | null; usage: TokenUsage }> {
  const guide = guideFor(opts.manifest.id);
  const directions = DIRECTIONS[opts.manifest.id] ?? [];
  const domain = domainFor(opts.manifest.id);
  const started = Date.now();
  const prompt = (retry?: string) =>
    strategyPrompt({
      toolName: toolLabel(opts.manifest),
      guide,
      directions,
      intentText: opts.intent ? intentBlock(opts.intent, opts.answers) : "",
      requestText: requestText(opts.manifest, opts.input),
      recent: recentLabels(opts.recent),
      override: opts.override,
      extra: opts.extra,
      domain,
      recentCoords: opts.recent.map((f) => f.coords).filter((c): c is string[] => Boolean(c?.some(Boolean))),
      retry,
    });
  const schema = strategySchema(guide.approaches.map((a) => a.id), directions.map((d) => d.id), domain);
  const first = await smartCall({ model: PRO_TEXT_MODEL, system: STRATEGY_SYSTEM, prompt: prompt(), schema, signal: opts.signal, thinking: ThinkingLevel.LOW, timeoutMs: 90_000 });
  let usage = first.usage;
  let parsed = parseStrategy(first.data, guide, directions, domain);
  // The creative budget, checked in code: candidates too close in the
  // space, or no honest default named → one retry on the fast model when
  // the stage still has time. The first answer stands if the retry fails.
  const problem = parsed ? budgetProblem(parsed.strategy) : null;
  if (parsed && problem && Date.now() - started < 50_000) {
    try {
      const again = await jsonCall({ model: TEXT_MODEL, system: STRATEGY_SYSTEM, prompt: prompt(problem), schema, signal: opts.signal, thinking: ThinkingLevel.MEDIUM, timeoutMs: 40_000 });
      usage = sumUsage(usage, again.usage);
      const retried = parseStrategy(again.data, guide, directions, domain);
      const fixed = Boolean(retried && !budgetProblem(retried.strategy));
      if (fixed) parsed = retried;
      console.info(`strategy budget retry (${opts.manifest.id}): ${fixed ? "fixed" : "kept the first answer"} — ${problem}`);
    } catch (err) {
      if (opts.signal.aborted) throw err;
      console.warn("strategy retry skipped:", (err as Error).message);
    }
  }
  // The default still won without its own reason: show the rationale as
  // the reason, so the strategy card is honest about it.
  if (parsed) {
    const chosen = parsed.strategy.considered.find((c) => c.name === parsed!.strategy.chosen);
    if (chosen?.isDefault && !parsed.strategy.defaultReason && parsed.strategy.rationale) parsed.strategy.defaultReason = parsed.strategy.rationale;
  }
  return { strategy: parsed?.strategy ?? null, direction: parsed?.direction ?? null, usage };
}

const sumUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
  inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0),
  outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
});

/** The planner (lib/agents/planner.ts): this request's workflow, on the fast model. Null keeps the default plan. */
export async function planWorkflow(opts: {
  manifest: ToolManifest;
  intent: Intent | null;
  answers: { question: string; answer: string }[];
  strategy: Strategy | null;
  signal: AbortSignal;
}): Promise<{ choice: PlanChoice | null; usage: TokenUsage }> {
  const webSearch = Boolean(opts.manifest.grounding.webSearch);
  const s = opts.strategy;
  const strategyText = s
    ? [`[선택한 전략: ${s.chosen}]`, s.rationale, "[설계도]", ...s.blueprint.map((b, i) => `${i + 1}. ${b.part} — ${b.purpose}`), "[완성 기준]", ...s.rubric.map((r) => `- ${r}`)].join("\n")
    : "(전략 없음 — 요청에서 판단)";
  try {
    const { data, usage } = await jsonCall({
      model: TEXT_MODEL,
      system: PLANNER_SYSTEM,
      prompt: plannerPrompt({ toolName: toolLabel(opts.manifest), intentText: opts.intent ? intentBlock(opts.intent, opts.answers) : "", strategyText, webSearch }),
      schema: plannerSchema(webSearch),
      signal: opts.signal,
      thinking: ThinkingLevel.LOW,
      timeoutMs: 30_000,
      maxOutputTokens: 2048,
    });
    return { choice: parsePlanChoice(data, webSearch), usage };
  } catch (err) {
    if (opts.signal.aborted) throw err;
    console.warn("planner skipped:", (err as Error).message);
    return { choice: null, usage: ZERO };
  }
}

export async function critique(opts: {
  manifest: ToolManifest;
  input: Record<string, unknown>;
  profile: BusinessProfile | null;
  research?: string;
  intent: Intent | null;
  answers: { question: string; answer: string }[];
  strategy: Strategy | null;
  draft: string;
  sameness?: string | null;
  focus?: string[];
  avoidDefault?: { name: string; summary: string } | null;
  signal: AbortSignal;
  parts?: Part[];
}): Promise<{ critique: Critique | null; usage: TokenUsage }> {
  try {
    const { data, usage } = await jsonCall({
      model: TEXT_MODEL,
      system: CRITIC_SYSTEM,
      prompt: criticPrompt({
        toolName: toolLabel(opts.manifest),
        intentText: opts.intent ? intentBlock(opts.intent, opts.answers) : requestTextFallback(opts.manifest),
        requestText: [requestText(opts.manifest, opts.input), profileText(opts.profile) ? `[저장된 프로필]\n${profileText(opts.profile)}` : "", opts.research ? `[검색 근거]\n${clip(opts.research, 12_000)}` : ""].filter(Boolean).join("\n\n"),
        strategy: opts.strategy,
        draft: clip(opts.draft),
        sameness: opts.sameness ?? undefined,
        focus: opts.focus,
        avoidDefault: opts.avoidDefault,
      }),
      schema: CRITIQUE_SCHEMA,
      signal: opts.signal,
      thinking: ThinkingLevel.MEDIUM,
      timeoutMs: 75_000,
      parts: opts.parts,
    });
    return { critique: parseCritique(data), usage };
  } catch (err) {
    if (opts.signal.aborted) throw err;
    console.warn("critique skipped:", (err as Error).message);
    return { critique: null, usage: ZERO };
  }
}

function requestTextFallback(manifest: ToolManifest) {
  return `[도구의 목표] ${guideFor(manifest.id).objective}`;
}

/** The member's recent fingerprints for this tool (finished runs only). */
export async function recentFingerprints(db: SupabaseClient, userId: string, toolId: string): Promise<Fingerprint[]> {
  const { data } = await db
    .from("generations")
    .select("fp:output->agent->fingerprint")
    .eq("user_id", userId)
    .eq("tool_id", toolId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(4);
  return ((data ?? []) as { fp: Fingerprint | null }[]).map((r) => r.fp).filter((f): f is Fingerprint => Boolean(f && Array.isArray(f.parts)));
}
