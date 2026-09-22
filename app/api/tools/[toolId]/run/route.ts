import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTool } from "@/lib/tools/registry";
import type { Source } from "@/lib/tools/registry/shared";
import { buildInputSchema } from "@/lib/tools/runner";
import { checkGrounding } from "@/lib/tools/grounding";
import { checkToolPolicy, checkOutputSafety } from "@/lib/tools/policy";
import { generateOutput, runWithApiKey } from "@/lib/tools/generate";
import { ownKeyRequiredError, resolveCost, resolveRequestedProvider } from "@/lib/ai/resolve-provider";
import type { TokenUsage } from "@/lib/ai/types";
import { getUserApiKeys } from "@/lib/api-keys";
import { getMembership } from "@/lib/membership";
import { getBusinessProfile } from "@/lib/profile";
import { reserveCredits, releaseUnattachedReservation, settleGenerationCredits } from "@/lib/credits";
import { runLimiter, checkRateLimit } from "@/lib/rate-limit";

// generations writes (insert/update) go through the service-role client
// (supabase/migrations/0011 revoked insert/update from authenticated) —
// every call below scopes explicitly by user_id since service_role
// bypasses RLS entirely; that ownership check no longer happens for free.
const admin = createAdminClient();

// HAEBOT_A_TOOLS_SPEC.md §3.2 / T2 — one code path for every tool:
// validate → reserve credits → persist the run row → stream → settle.
// The run row is written before generation starts, so a dropped
// connection still leaves a real result in history (§Part 6, T2).
//
// Real generation (lib/tools/generate.ts) runs for every tool, including
// `image`/`brand-model` — those upload to the `exports` storage bucket.

function encodeEvent(event: unknown) {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

// The streamed "typing" preview is cosmetic — a multi-hundred-KB base64
// image/HTML data URI (sangsepage, homepage, image, logo, brand-model)
// would take forever to stream 12 chars at a time. Collapse those for
// the preview only; the `done` event still carries the real output.
function previewText(output: unknown): string {
  return JSON.stringify(output, null, 2).replace(
    /data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi,
    (m) => `data:...(${Math.round(m.length / 1024)}KB)`,
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const manifest = getTool(toolId);
  if (!manifest) {
    return Response.json({ error: `알 수 없는 도구: ${toolId}` }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const rate = await checkRateLimit(runLimiter, user.id);
  if (!rate.ok) {
    return Response.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const { chainedFromRunId, provider: requestedProvider, values } = (body ?? {}) as {
    chainedFromRunId?: string;
    provider?: unknown;
    values?: unknown;
  };
  const parsedInput = buildInputSchema(manifest.inputs).safeParse(values ?? {});
  if (!parsedInput.success) {
    return Response.json(
      { error: parsedInput.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") },
      { status: 400 },
    );
  }

  // Engine selection (§Phase 2): google is always allowed; anthropic/
  // openai only if this tool's capability entry offers them AND the user
  // has at least one key for that provider — never a silent Gemini
  // fallback (product decision).
  const providerResolution = resolveRequestedProvider(manifest.id, requestedProvider);
  if (!providerResolution.ok) {
    return Response.json({ error: providerResolution.error }, { status: 400 });
  }
  const { provider } = providerResolution;

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

  // Own API key(s) → the user pays the provider directly; student plan
  // (google only) → unlimited. Either way nothing is reserved, and the
  // run records 0 credits. Multiple keys (priority 1-3) are tried in
  // order inside runWithApiKey below, switching past any that hit a
  // quota error. A slot the rotation classifier already flagged broken
  // (401/403) is excluded here rather than retried every run — Claude/
  // ChatGPT are own-key only (product decision): no platform key, always
  // 0 credits, never a silent Gemini fallback.
  const [userApiKeys, membership] = await Promise.all([getUserApiKeys(provider, { excludeBroken: true }), getMembership()]);
  const hasUsableKey = userApiKeys.length > 0;
  // Only spend a second query distinguishing "never registered" from
  // "registered but all broken" when it's actually needed for the message.
  let hasAnyKey = hasUsableKey;
  if (!hasUsableKey && provider !== "google") {
    hasAnyKey = (await getUserApiKeys(provider)).length > 0;
  }
  const keyError = ownKeyRequiredError(provider, { hasAnyKey, hasUsableKey });
  if (keyError) {
    return Response.json({ error: keyError }, { status: 400 });
  }
  const cost = resolveCost(provider, hasUsableKey, membership.plan === "student", manifest.estimatedCredits);

  const reservation = cost > 0 ? await reserveCredits(user.id, cost) : ({ ok: true } as const);
  if (!reservation.ok) {
    const insufficient = reservation.error.includes("insufficient_credits");
    return Response.json(
      { error: insufficient ? "크레딧이 부족합니다" : `크레딧 확인 실패: ${reservation.error}` },
      { status: insufficient ? 402 : 500 },
    );
  }

  const { data: run, error: insertError } = await admin
    .from("generations")
    .insert({
      user_id: user.id,
      kind: "generate",
      tool_id: manifest.id,
      input: parsedInput.data,
      status: "pending",
      credits_reserved: cost,
      chained_from: chainedFrom,
      provider,
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
  const profile = await getBusinessProfile();

  let cancelled = false;
  request.signal.addEventListener("abort", () => {
    cancelled = true;
  });

  const fail = async (status: string, error: string) => {
    await admin.from("generations").update({ status, error }).eq("id", runId).eq("user_id", user.id);
    await settleGenerationCredits(runId, 0); // no output produced — refund the full reservation
  };

  const stream = new ReadableStream({
    async start(controller) {
      await admin.from("generations").update({ status: "streaming" }).eq("id", runId).eq("user_id", user.id);
      controller.enqueue(encodeEvent({ type: "status", status: "streaming" }));

      let output: unknown;
      let sources: Source[];
      let usage: TokenUsage;
      try {
        const result = await runWithApiKey(provider, user.id, userApiKeys, () =>
          generateOutput(
            manifest,
            parsedInput.data,
            profile,
            request.signal,
            { supabase, userId: user.id, runId },
            provider,
          ),
        );
        output = result.output;
        sources = result.sources;
        usage = result.usage;
      } catch (err) {
        if (cancelled) {
          await fail("cancelled", "사용자가 취소했습니다");
          controller.close();
          return;
        }
        const message = err instanceof Error ? err.message : "생성 중 오류가 발생했습니다";
        await fail("error", message);
        controller.enqueue(encodeEvent({ type: "error", error: message }));
        controller.close();
        return;
      }

      if (cancelled) {
        await fail("cancelled", "사용자가 취소했습니다");
        controller.close();
        return;
      }

      const text = previewText(output);
      for (let i = 0; i < text.length; i += 12) {
        if (cancelled) break;
        controller.enqueue(encodeEvent({ type: "chunk", text: text.slice(i, i + 12) }));
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      if (cancelled) {
        await fail("cancelled", "사용자가 취소했습니다");
        controller.close();
        return;
      }

      const guard = checkGrounding(manifest, sources);
      if (!guard.ok) {
        await fail("error", guard.reason!);
        controller.enqueue(encodeEvent({ type: "error", error: guard.reason }));
        controller.close();
        return;
      }

      const outputSafety = checkOutputSafety(manifest.id, output);
      if (!outputSafety.ok) {
        await fail("error", outputSafety.reason!);
        controller.enqueue(encodeEvent({ type: "error", error: outputSafety.reason }));
        controller.close();
        return;
      }
      // logo: sanitizeSvg may have stripped unrecognized-but-harmless
      // attributes — store and return that cleaned version, not the
      // model's raw one (the cosmetic typing preview above already
      // streamed the raw text, which is fine; nothing renders it as an
      // image until this point).
      if (outputSafety.output !== undefined) output = outputSafety.output;

      const creditsUsed = cost;
      // Settles the ledger and stamps credits_used/credits_settled on the
      // run row itself (idempotent — see settle_generation_credits in
      // supabase/migrations/0011); everything else about the row is a
      // separate update since it isn't a credits concern.
      await settleGenerationCredits(runId, creditsUsed);
      await admin
        .from("generations")
        .update({
          status: "done",
          output,
          sources,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
        })
        .eq("id", runId)
        .eq("user_id", user.id);

      controller.enqueue(encodeEvent({ type: "done", output, sources, creditsUsed, runId, provider }));
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
