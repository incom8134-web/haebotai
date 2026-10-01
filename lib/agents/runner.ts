import "server-only";
import { getTool } from "@/lib/tools/registry";
import { checkGrounding } from "@/lib/tools/grounding";
import { checkOutputSafety } from "@/lib/tools/policy";
import { buildReference, referencePaths } from "@/lib/tools/reference-server";
import { runWithApiKey } from "@/lib/tools/generate";
import { providerErrorMessage } from "@/lib/ai/provider-errors";
import { getUserApiKeysFor } from "@/lib/api-keys";
import { settleGenerationCredits } from "@/lib/credits";
import { writeRunFacts } from "@/lib/projects/server";
import type { TokenUsage } from "@/lib/ai/types";
import { agentDb, failRun, loadRun, pushEvent, runStatus, saveState } from "./store";
import { MAX_INVOCATIONS, requestContinuation } from "./handoff";
import { agentFor } from "./specs";
import { runMeta } from "./meta";
import type { AgentRunState, StageContext } from "./types";

// The orchestrator (docs/ai-architecture-proposal.md §3.1). One call works
// on a run for the rest of this function invocation: it runs the agent's
// stages in order, saving the state after each, and when the next stage
// won't fit in the time left it saves and hands off to a fresh
// invocation (lib/agents/handoff.ts). A run therefore isn't bound by one
// function's time limit — each stage is.
//
// Credits were reserved when the run was created; they are charged when
// the run finishes and refunded when it fails or is cancelled. Cancel is
// the run row's status (app/api/runs/[runId]/cancel), polled here.

/** The platform's limit per invocation (route maxDuration). */
export const INVOCATION_SECONDS = 300;
/** Stop this long before the platform would, so state is always saved. */
const SAFETY_SECONDS = 15;

const TIMEOUT_MESSAGE = "시간이 너무 오래 걸려 중단했습니다. 크레딧은 돌려드렸어요. 분량을 줄이거나 잠시 후 다시 시도해 주세요.";

export async function runAgent(runId: string, startedAt: number): Promise<void> {
  const db = agentDb();
  const row = await loadRun(db, runId);
  if (!row || (row.status !== "pending" && row.status !== "streaming")) return;
  const state = row.output?._agent;
  const manifest = getTool(row.tool_id);
  if (!state || !manifest) {
    await failRun(db, runId, "error", "실행 상태를 찾지 못했습니다. 크레딧은 돌려드렸어요.");
    return;
  }
  state.runId = runId;
  state.invocations += 1;
  if (state.invocations > MAX_INVOCATIONS) {
    await failRun(db, runId, "error", TIMEOUT_MESSAGE);
    await cleanup(db, state);
    return;
  }

  const deadlineAt = startedAt + (INVOCATION_SECONDS - SAFETY_SECONDS) * 1000;
  const secondsLeft = () => (deadlineAt - Date.now()) / 1000;
  const cancel = new AbortController();
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(() => deadline.abort(), Math.max(0, deadlineAt - Date.now()));
  // The cancel route only flips the row's status; notice it within seconds.
  const poll = setInterval(() => {
    runStatus(db, runId)
      .then((s) => {
        if (s !== "pending" && s !== "streaming") cancel.abort();
      })
      .catch(() => {});
  }, 4000);
  const signal = AbortSignal.any([cancel.signal, deadline.signal]);
  let handedOff = false;

  try {
    const values = { ...(row.input ?? {}) };
    delete values._reference;
    // The member's own keys are read fresh each invocation; they're never saved with the run.
    const apiKeys = state.ownKey ? await getUserApiKeysFor(state.userId, state.provider, { excludeBroken: true }) : [];
    if (state.ownKey && apiKeys.length === 0) {
      await failRun(db, runId, "error", "등록된 API 키를 사용할 수 없습니다. API 키 관리에서 확인해 주세요.");
      await cleanup(db, state);
      return;
    }
    // "참고 자료" files stay in the member's folder until the run ends, so
    // every invocation can read them again.
    let input: Record<string, unknown> = values;
    if (state.referenceRaw) {
      const ref = await buildReference(manifest.id, state.referenceRaw, {
        prefix: `${state.userId}/`,
        download: async (path) => {
          const { data } = await db.storage.from("inputs").download(path);
          return data ? Buffer.from(await data.arrayBuffer()) : null;
        },
        remove: async () => {},
      });
      if (ref.ok && ref.bundle) input = { ...values, _reference: ref.bundle };
    }

    const spec = agentFor(manifest, state.provider);
    const ctx: StageContext = {
      state,
      manifest,
      input,
      signal,
      secondsLeft,
      emit: (e) => pushEvent(state, e),
      addUsage: (u: TokenUsage) => {
        state.usage = {
          inputTokens: (state.usage.inputTokens ?? 0) + (u.inputTokens ?? 0),
          outputTokens: (state.usage.outputTokens ?? 0) + (u.outputTokens ?? 0),
        };
      },
      storage: { supabase: db, userId: state.userId, runId },
      apiKeys,
    };
    if (!(await saveState(db, state))) return;

    let ranHere = 0;
    for (;;) {
      if (state.stage === "finalize") {
        await finish(state, spec.finalize(state), values);
        return;
      }
      const stage = spec.stages[state.stage];
      if (!stage) {
        await failRun(db, runId, "error", "실행 단계를 찾지 못했습니다. 크레딧은 돌려드렸어요.");
        await cleanup(db, state);
        return;
      }
      // Hand off before a stage that can't finish in the time left.
      if (ranHere > 0 && secondsLeft() < stage.maxSeconds) {
        await handoff(state);
        return;
      }
      pushEvent(state, { kind: "stage", stage: stage.id, status: "start", label: stage.label });
      if (!(await saveState(db, state))) return;

      let next: string;
      try {
        next = (await runWithApiKey(state.provider, state.userId, apiKeys, () => stage.run(ctx))).next;
      } catch (err) {
        if (cancel.signal.aborted) return; // the cancel route already refunded
        if (stage.optional) {
          console.warn(`agent ${manifest.id}: optional stage ${stage.id} skipped`, (err as Error)?.message);
          pushEvent(state, { kind: "stage", stage: stage.id, status: "skipped", label: stage.label });
          state.stage = stage.optional.skipTo;
          ranHere++;
          if (!(await saveState(db, state))) return;
          if (deadline.signal.aborted) {
            await handoff(state);
            return;
          }
          continue;
        }
        if (deadline.signal.aborted) {
          // Out of time mid-stage: retry it once in a fresh invocation.
          const tries = state.retries[stage.id] ?? 0;
          if (tries < 1) {
            state.retries[stage.id] = tries + 1;
            await handoff(state);
            return;
          }
          await failRun(db, runId, "error", TIMEOUT_MESSAGE);
          await cleanup(db, state);
          return;
        }
        console.error(`agent ${manifest.id}: stage ${stage.id} failed`, err);
        const message = providerErrorMessage(err) ?? (err instanceof Error ? err.message : "생성 중 오류가 발생했습니다");
        await failRun(db, runId, "error", message);
        await cleanup(db, state);
        return;
      }
      if (cancel.signal.aborted) return;
      pushEvent(state, { kind: "stage", stage: stage.id, status: "done", label: stage.label });
      state.stagesDone.push(stage.id);
      state.stage = next;
      ranHere++;
      if (!(await saveState(db, state))) return;
    }
  } catch (err) {
    console.error(`agent ${runId}: runner failed`, err);
    await failRun(db, runId, "error", "생성 중 오류가 발생했습니다. 크레딧은 돌려드렸어요.");
    await cleanup(db, state);
  } finally {
    clearTimeout(deadlineTimer);
    clearInterval(poll);
    // Stopped for good (cancelled, failed, done): the uploads go.
    if (!handedOff) {
      const status = await runStatus(db, runId).catch(() => null);
      if (status !== "pending" && status !== "streaming") await cleanup(db, state);
    }
  }

  async function handoff(s: AgentRunState) {
    pushEvent(s, { kind: "handoff", stage: s.stage, status: "done", label: { ko: "이어서 작업", en: "Continuing" } });
    if (!(await saveState(db, s))) return;
    const ok = await requestContinuation(s.origin, s.runId, s.invocations);
    handedOff = ok;
    if (!ok) {
      await failRun(db, s.runId, "error", "작업을 이어가지 못했습니다. 크레딧은 돌려드렸어요. 다시 실행해 주세요.");
      await cleanup(db, s);
    }
  }

  async function finish(s: AgentRunState, result: { output: unknown; sources: AgentRunState["sources"] }, values: Record<string, unknown>) {
    const guard = checkGrounding(manifest!, result.sources);
    if (!guard.ok) {
      await failRun(db, s.runId, "error", guard.reason!);
      await cleanup(db, s);
      return;
    }
    const safety = checkOutputSafety(manifest!.id, result.output, values);
    if (!safety.ok) {
      await failRun(db, s.runId, "error", safety.reason!);
      await cleanup(db, s);
      return;
    }
    const clean = safety.output !== undefined ? safety.output : result.output;
    const output = clean && typeof clean === "object" && !Array.isArray(clean) ? { ...(clean as Record<string, unknown>), agent: runMeta(s) } : clean;
    const { data: finished } = await db
      .from("generations")
      .update({
        status: "done",
        output,
        sources: result.sources,
        input_tokens: s.usage.inputTokens,
        output_tokens: s.usage.outputTokens,
      })
      .eq("id", s.runId)
      .eq("user_id", s.userId)
      .eq("status", "streaming")
      .select("id");
    // Not streaming any more: cancelled (already refunded) or failed elsewhere.
    if (finished?.length) {
      await settleGenerationCredits(s.runId, s.creditsReserved);
      await writeRunFacts(db, { runId: s.runId, userId: s.userId, toolId: manifest!.id, input: values, output: clean });
    }
    await cleanup(db, s);
  }
}

/** Deletes the run's uploaded reference files (read once per invocation while it ran). */
async function cleanup(db: ReturnType<typeof agentDb>, state: AgentRunState) {
  const paths = referencePaths(state.referenceRaw, `${state.userId}/`);
  if (paths.length) await db.storage.from("inputs").remove(paths).then(() => {}, () => {});
}
