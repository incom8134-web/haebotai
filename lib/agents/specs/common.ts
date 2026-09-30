import "server-only";
import { critique, recentFingerprints, strategize, understand } from "../calls";
import { intentToBrief } from "../intent";
import { fingerprintOf, samenessNote, type Fingerprint } from "../diversity";
import type { AgentRunState, Critique, Stage, StageContext } from "../types";
import type { Direction } from "@/lib/tools/directions";

// Stages every agent shares: understand the request, choose a strategy,
// and the critic. Agent-specific stages (draft, build, revise, render)
// live in the agent's own spec.

/** The directives every generation call gets on top of the form values. */
export function directives(state: AgentRunState, input: Record<string, unknown>): Record<string, unknown> {
  const direction = (state.work.direction as Direction | null | undefined) ?? null;
  const out: Record<string, unknown> = { ...input };
  if (state.intent) {
    out._brief = intentToBrief(state.intent, direction, state.strategy?.rationale ?? "");
    out._intent = { intent: state.intent, answers: state.answers };
  }
  if (state.strategy) out._strategy = state.strategy;
  return out;
}

export const understandStage = (next: string): Stage => ({
  id: "understand",
  label: { ko: "요청 이해", en: "Understanding the request" },
  maxSeconds: 30,
  async run(ctx) {
    const { state } = ctx;
    if (!state.intent) {
      const r = await understand(ctx.manifest, ctx.input, state.profile, state.answers, ctx.signal);
      ctx.addUsage(r.usage);
      state.intent = r.intent;
    }
    // A request about another business: the saved profile stays out of every later step.
    if (state.intent && !state.intent.usesProfile) state.profile = null;
    if (state.intent) {
      ctx.emit({ kind: "intent", stage: "understand", status: "done", label: { ko: "이해한 요청", en: "Understood" }, detail: { ko: state.intent.summary, en: state.intent.summary } });
    }
    return { next };
  },
});

export const strategizeStage = (next: string, extra?: (ctx: StageContext) => string | undefined): Stage => ({
  id: "strategize",
  label: { ko: "전략 선택", en: "Choosing a strategy" },
  maxSeconds: 100,
  // Without a strategy the agent still works from the request (like before).
  optional: { skipTo: next },
  async run(ctx) {
    const { state } = ctx;
    const recent = await recentFingerprints(ctx.storage.supabase, state.userId, state.toolId).catch(() => [] as Fingerprint[]);
    state.work.recent = recent;
    const r = await strategize({
      manifest: ctx.manifest,
      input: ctx.input,
      intent: state.intent,
      answers: state.answers,
      recent,
      override: state.strategyOverride,
      signal: ctx.signal,
      extra: extra?.(ctx),
    });
    ctx.addUsage(r.usage);
    if (!r.strategy) throw new Error("전략을 정하지 못했습니다");
    state.strategy = r.strategy;
    state.work.direction = r.direction;
    ctx.emit({
      kind: "strategy",
      stage: "strategize",
      status: "done",
      label: { ko: `전략: ${r.strategy.chosen}`, en: `Strategy: ${r.strategy.chosen}` },
      detail: { ko: `${r.strategy.considered.length}가지 접근을 비교했어요`, en: `Compared ${r.strategy.considered.length} approaches` },
    });
    return { next };
  },
});

/** Runs the critic on a draft; records the critique and the event. */
export async function runCritic(ctx: StageContext, draft: string, round: number): Promise<Critique | null> {
  const { state } = ctx;
  const fp = fingerprintOf(state.strategy, (state.work.direction as Direction | null | undefined)?.id);
  const r = await critique({
    manifest: ctx.manifest,
    input: ctx.input,
    profile: state.profile,
    research: (state.work.research as { findings?: string } | undefined)?.findings,
    intent: state.intent,
    answers: state.answers,
    strategy: state.strategy,
    draft,
    sameness: round === 0 ? samenessNote(fp, (state.work.recent as Fingerprint[] | undefined) ?? []) : null,
    signal: ctx.signal,
  });
  ctx.addUsage(r.usage);
  if (!r.critique) return null;
  const c = r.critique;
  const list = (state.work.critiques as Critique[] | undefined) ?? [];
  list.push(c);
  state.work.critiques = list;
  const high = c.issues.filter((i) => i.severity === "high").length;
  ctx.emit({
    kind: "critique",
    stage: "critique",
    status: "done",
    label: { ko: `검토 ${round + 1}차: ${c.score}점`, en: `Review ${round + 1}: ${c.score}/100` },
    detail: c.verdict === "pass"
      ? { ko: "기준을 충족했어요", en: "Meets the bar" }
      : { ko: `고칠 점 ${c.issues.length}개${high ? ` (중요 ${high}개)` : ""}`, en: `${c.issues.length} issues${high ? ` (${high} major)` : ""}` },
  });
  return c;
}
