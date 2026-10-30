import { after, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCurrentConsent } from "@/lib/consent";
import { runGate } from "@/lib/run-gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTool } from "@/lib/tools/registry";
import { buildInputSchema, inputErrorMessage } from "@/lib/tools/runner";
import { buildReference, referenceForStorage } from "@/lib/tools/reference-server";
import { checkToolPolicy } from "@/lib/tools/policy";
import { ownKeyRequiredError, resolveRequestedProvider } from "@/lib/ai/resolve-provider";
import { decideRunAccess } from "@/lib/run-access";
import { MEMBER_API_KEYS, SAAS } from "@/lib/site/access";
import { isHost } from "@/lib/platform-access-server";
import { getUserApiKeys } from "@/lib/api-keys";
import { getMembership } from "@/lib/membership";
import { getBusinessProfile } from "@/lib/profile";
import { reserveCredits, releaseUnattachedReservation } from "@/lib/credits";
import { runLimiter, checkRateLimit } from "@/lib/rate-limit";
import { checkSpend } from "@/lib/spend-guard";
import { runAgent } from "@/lib/agents/runner";
import { agentFor } from "@/lib/agents/specs";
import { parseAgentRequest } from "@/lib/agents/request";
import { parseOutputLanguage } from "@/lib/ai/output-language";
import type { AgentRunState } from "@/lib/agents/types";

// generations writes (insert/update) go through the service-role client
// (supabase/migrations/0011 revoked insert/update from authenticated) —
// every call below scopes explicitly by user_id since service_role
// bypasses RLS entirely; that ownership check no longer happens for free.
const admin = createAdminClient();

// The first stages of the run happen in this invocation (after the
// response); allow up to the Vercel plan maximum.
export const maxDuration = 300;

// One code path for every tool: validate → reserve credits → persist the
// run row with its starting agent state → return the run id. The work
// itself is a background job (lib/agents/runner.ts, started with after()
// below, continued across invocations when it needs more time); the page
// follows it through /api/runs/[runId]/events, and a closed tab doesn't
// stop it — the result lands in history.

export async function POST(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
  const startedAt = Date.now();
  const { toolId } = await params;
  const manifest = getTool(toolId);
  if (!manifest) {
    return Response.json({ error: `알 수 없는 도구: ${toolId}` }, { status: 404 });
  }
  if (manifest.retired) {
    return Response.json({ error: "더 이상 제공하지 않는 도구입니다" }, { status: 410 });
  }
  if (manifest.comingSoon) {
    return Response.json({ error: "준비 중인 도구입니다" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (!hasCurrentConsent(user.app_metadata)) {
    return Response.json({ error: "서비스 이용 동의가 필요합니다", code: "consent_required" }, { status: 403 });
  }
  const gated = await runGate(toolId, user.email);
  if (gated) return gated;

  const rate = await checkRateLimit(runLimiter, user.id);
  if (!rate.ok) {
    return Response.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const { chainedFromRunId, provider: requestedProvider, values, reference: rawReference, excludeProfile, projectId } = (body ?? {}) as {
    excludeProfile?: unknown;
    projectId?: unknown;
    chainedFromRunId?: string;
    provider?: unknown;
    values?: unknown;
    reference?: unknown;
  };
  const parsedInput = buildInputSchema(manifest.inputs).safeParse(values ?? {});
  if (!parsedInput.success) {
    return Response.json(
      { error: inputErrorMessage(manifest.inputs, parsedInput.error.issues) },
      { status: 400 },
    );
  }

  // Engine selection (§Phase 2): google is always allowed; anthropic
  // only if this tool's capability entry offers them AND the user
  // has at least one key for that provider — never a silent Gemini
  // fallback (product decision).
  const providerResolution = resolveRequestedProvider(manifest.id, requestedProvider);
  if (!providerResolution.ok) {
    return Response.json({ error: providerResolution.error }, { status: 400 });
  }
  const { provider } = providerResolution;

  // Pasted text and uploaded files from the "참고 자료" panel: validated
  // here; the run row keeps only the text and file names. Reference files
  // were uploaded straight to the user's own folder of the "inputs"
  // bucket (read here with the user's session, storage RLS); the run
  // reads them again in the background and deletes them when it ends.
  const reference = await buildReference(manifest.id, rawReference, {
    prefix: `${user.id}/`,
    download: async (path) => {
      const { data } = await supabase.storage.from("inputs").download(path);
      return data ? Buffer.from(await data.arrayBuffer()) : null;
    },
    // Kept until the run ends: every stage invocation reads them again
    // (lib/agents/runner.ts deletes them when the run stops).
    remove: async () => {},
  });
  if (!reference.ok) {
    return Response.json({ error: reference.error }, { status: 400 });
  }
  // The language the result is written in, chosen on the run page (한국어 / English).
  const outputLang = parseOutputLanguage((body as { outputLang?: unknown } | null)?.outputLang);
  const storedInput = { ...parsedInput.data, ...(reference.bundle ? { _reference: referenceForStorage(reference.bundle) } : {}), _output_lang: outputLang };

  const policy = checkToolPolicy(manifest.id, parsedInput.data);
  if (!policy.ok) {
    return Response.json({ error: policy.reason }, { status: 400 });
  }

  let chainedFrom: string | null = null;
  if (chainedFromRunId) {
    const { data } = await supabase
      .from("generations")
      .select("id")
      .eq("id", chainedFromRunId)
      .eq("user_id", user.id)
      .maybeSingle();
    chainedFrom = data?.id ?? null;
  }

  // The project this run belongs to (its facts are written when it ends).
  let project: string | null = null;
  if (typeof projectId === "string" && projectId) {
    const { data } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
    if (!data) return Response.json({ error: "프로젝트를 찾을 수 없습니다" }, { status: 404 });
    project = data.id;
  }

  // Own-key mode: a member's keys (priority 1-3) are tried in order inside
  // runWithApiKey, switching past any that hit a quota error; slots
  // already flagged broken (401/403) are excluded here.
  // Own keys are only consulted when members may bring one (lib/site/access.ts);
  // in SaaS mode every run uses the platform key and paid-plan credits.
  const [userApiKeys, membership] = await Promise.all([MEMBER_API_KEYS ? getUserApiKeys(provider, { excludeBroken: true }) : Promise.resolve([]), getMembership()]);
  const hasUsableKey = userApiKeys.length > 0;
  // Only spend a second query distinguishing "never registered" from
  // "registered but all broken" when it's actually needed for the message.
  // The team may always use the platform's key, free (lib/platform-access.ts).
  const team = await isHost(user.email);
  let hasAnyKey = hasUsableKey;
  if (MEMBER_API_KEYS && !hasUsableKey) {
    hasAnyKey = (await getUserApiKeys(provider)).length > 0;
  }
  const access = decideRunAccess({
    saas: SAAS,
    provider,
    team,
    plan: membership.plan,
    estimatedCredits: manifest.estimatedCredits,
    ownKeyError: SAAS ? null : ownKeyRequiredError(provider, { hasAnyKey, hasUsableKey }, team),
    hasUsableKey,
  });
  if (!access.ok) {
    return Response.json({ error: access.error, code: access.code }, { status: access.status });
  }
  const cost = access.cost;

  // Platform-wide ceilings on top of credits (lib/spend-guard-core.ts):
  // kill switch, daily platform AI budget, per-member daily run cap.
  const usesPlatformKey = provider === "google" && !hasUsableKey;
  const spend = await checkSpend(user.id, usesPlatformKey ? manifest.estimatedCredits : 0, usesPlatformKey);
  if (!spend.ok) {
    return Response.json({ error: spend.message }, { status: 429 });
  }

  const reservation = cost > 0 ? await reserveCredits(user.id, cost) : ({ ok: true } as const);
  if (!reservation.ok) {
    const insufficient = reservation.error.includes("insufficient_credits");
    return Response.json(
      { error: insufficient ? "크레딧이 부족해요 — 멤버십에서 크레딧을 충전할 수 있어요" : `크레딧 확인 실패: ${reservation.error}`, ...(insufficient ? { code: "insufficient_credits" } : {}) },
      { status: insufficient ? 402 : 500 },
    );
  }

  // Profile fields the member removed from this run (the chips above the form).
  const excluded = new Set(Array.isArray(excludeProfile) ? excludeProfile.filter((k): k is string => typeof k === "string").slice(0, 32) : []);
  const fullProfile = await getBusinessProfile();
  const profile = fullProfile && excluded.size ? (Object.fromEntries(Object.entries(fullProfile).filter(([k]) => !excluded.has(k))) as typeof fullProfile) : fullProfile;

  // The run's starting state (lib/agents/types.ts): the understanding the
  // member already confirmed on the page (intent + answers), if any.
  const agent = parseAgentRequest(body);
  const now = new Date().toISOString();
  const state: AgentRunState = {
    v: 1,
    toolId: manifest.id,
    provider,
    userId: user.id,
    runId: "",
    origin: request.nextUrl.origin,
    ownKey: hasUsableKey,
    referenceRaw: reference.bundle ? rawReference : null,
    profile,
    intent: agent.intent,
    answers: agent.answers,
    strategyOverride: agent.strategyOverride,
    strategy: null,
    stage: agentFor(manifest, provider).firstStage,
    stagesDone: [],
    retries: {},
    work: {},
    usage: { inputTokens: 0, outputTokens: 0 },
    sources: [],
    events: [],
    invocations: 0,
    startedAt: now,
    heartbeatAt: now,
    creditsReserved: cost,
    lang: outputLang,
  };

  const { data: run, error: insertError } = await admin
    .from("generations")
    .insert({
      user_id: user.id,
      kind: "generate",
      tool_id: manifest.id,
      input: storedInput,
      status: "pending",
      credits_reserved: cost,
      chained_from: chainedFrom,
      // Only when set, so runs keep working before migration 0016 is applied.
      ...(project ? { project_id: project } : {}),
      provider,
      output: { _agent: state },
    })
    .select("id")
    .single();

  if (insertError || !run) {
    // No run row exists to settle against — this is the one case
    // release_credit_reservation (not settle_generation_credits) is for.
    await releaseUnattachedReservation(user.id, cost);
    return Response.json({ error: "실행을 시작하지 못했습니다" }, { status: 500 });
  }

  const runId: string = run.id;
  // Work runs as a background job (lib/agents/runner.ts): this request
  // records it and returns; the page follows /api/runs/[runId]/events.
  after(() => runAgent(runId, startedAt));
  return Response.json({ runId, provider });
}
