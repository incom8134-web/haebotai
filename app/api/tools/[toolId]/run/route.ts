import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCurrentConsent } from "@/lib/consent";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTool } from "@/lib/tools/registry";
import type { Source } from "@/lib/tools/registry/shared";
import { buildInputSchema } from "@/lib/tools/runner";
import { buildReference, referenceForStorage } from "@/lib/tools/reference-server";
import { checkGrounding } from "@/lib/tools/grounding";
import { checkToolPolicy, checkOutputSafety } from "@/lib/tools/policy";
import { generateOutput, runWithApiKey } from "@/lib/tools/generate";
import { ownKeyRequiredError, resolveCost, resolveRequestedProvider } from "@/lib/ai/resolve-provider";
import { providerErrorMessage } from "@/lib/ai/provider-errors";
import type { TokenUsage } from "@/lib/ai/types";
import { getUserApiKeys } from "@/lib/api-keys";
import { getMembership } from "@/lib/membership";
import { getBusinessProfile } from "@/lib/profile";
import { reserveCredits, releaseUnattachedReservation, settleGenerationCredits } from "@/lib/credits";
import { runLimiter, checkRateLimit } from "@/lib/rate-limit";
import { checkSpend } from "@/lib/spend-guard";

// generations writes (insert/update) go through the service-role client
// (supabase/migrations/0011 revoked insert/update from authenticated) —
// every call below scopes explicitly by user_id since service_role
// bypasses RLS entirely; that ownership check no longer happens for free.
const admin = createAdminClient();

// Research + draft + editor pass (+ images for some tools) can run past
// a minute; allow up to the Vercel plan maximum.
export const maxDuration = 300;

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const manifest = getTool(toolId);
  if (!manifest) {
    return Response.json({ error: `알 수 없는 도구: ${toolId}` }, { status: 404 });
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

  const rate = await checkRateLimit(runLimiter, user.id);
  if (!rate.ok) {
    return Response.json(
      { error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const { chainedFromRunId, provider: requestedProvider, values, reference: rawReference, excludeProfile } = (body ?? {}) as {
    excludeProfile?: unknown;
    chainedFromRunId?: string;
    provider?: unknown;
    values?: unknown;
    reference?: unknown;
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

  // Pasted text and uploaded files from the "참고 자료" panel: validated
  // and turned into text/parts here; the run row keeps only the text and
  // file names, generation gets the whole bundle as input._reference.
  // Reference files were uploaded straight to the user's own folder of the
  // "inputs" bucket; read them with the user's session (storage RLS) and
  // delete them once read.
  const reference = await buildReference(manifest.id, rawReference, {
    prefix: `${user.id}/`,
    download: async (path) => {
      const { data } = await supabase.storage.from("inputs").download(path);
      return data ? Buffer.from(await data.arrayBuffer()) : null;
    },
    remove: async (paths) => {
      await supabase.storage.from("inputs").remove(paths);
    },
  });
  if (!reference.ok) {
    return Response.json({ error: reference.error }, { status: 400 });
  }
  const generationInput = reference.bundle ? { ...parsedInput.data, _reference: reference.bundle } : parsedInput.data;
  const storedInput = reference.bundle ? { ...parsedInput.data, _reference: referenceForStorage(reference.bundle) } : parsedInput.data;

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

  // Platform-wide ceilings on top of credits (lib/spend-guard-core.ts):
  // kill switch, daily platform AI budget, per-member daily run cap.
  // Student runs are free for the member but still spend our key, so they
  // count toward the platform budget at the tool's credit estimate.
  const usesPlatformKey = provider === "google" && !hasUsableKey;
  const spend = await checkSpend(user.id, usesPlatformKey ? manifest.estimatedCredits : 0, usesPlatformKey);
  if (!spend.ok) {
    return Response.json({ error: spend.message }, { status: 429 });
  }

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
      input: storedInput,
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
  // Profile fields the member removed from this run (the chips above the form).
  const excluded = new Set(Array.isArray(excludeProfile) ? excludeProfile.filter((k): k is string => typeof k === "string").slice(0, 32) : []);
  const fullProfile = await getBusinessProfile();
  const profile = fullProfile && excluded.size ? (Object.fromEntries(Object.entries(fullProfile).filter(([k]) => !excluded.has(k))) as typeof fullProfile) : fullProfile;

  // Local cancel: a client disconnect (request.signal, or the response
  // stream being cancelled) aborts the model call where the runtime
  // reports it. Vercel doesn't reliably report either, so the
  // authoritative cancel is the run row itself — see
  // app/api/runs/[runId]/cancel/route.ts and the conditional `done`
  // update at the end.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  // The platform kills the function at maxDuration without running any
  // cleanup, which would leave the run "streaming" and its credits
  // reserved. Stop a little earlier ourselves so the run fails cleanly
  // and the reservation is refunded.
  let timedOut = false;
  const watchdog = setTimeout(() => {
    timedOut = true;
    abort.abort();
  }, (maxDuration - 15) * 1000);
  const isCancelled = () => abort.signal.aborted && !timedOut;

  // Only a still-running row is failed; a row the cancel endpoint already
  // marked cancelled (and refunded) keeps that status.
  const fail = async (status: string, error: string) => {
    await admin.from("generations").update({ status, error }).eq("id", runId).eq("user_id", user.id).in("status", ["pending", "streaming"]);
    await settleGenerationCredits(runId, 0); // no output produced — refund the full reservation
  };

  const stream = new ReadableStream({
    cancel() {
      clearTimeout(watchdog);
      abort.abort();
    },
    async start(controller) {
      // After a client disconnect the stream is already closed — writing
      // to it throws, and there's nobody left to read it anyway.
      const send = (event: unknown) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          /* client gone */
        }
      };
      const close = () => {
        clearTimeout(watchdog);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      await admin.from("generations").update({ status: "streaming" }).eq("id", runId).eq("user_id", user.id).eq("status", "pending");
      send({ type: "status", status: "streaming", runId });

      let output: unknown;
      let sources: Source[];
      let usage: TokenUsage;
      try {
        const result = await runWithApiKey(provider, user.id, userApiKeys, () =>
          generateOutput(
            manifest,
            generationInput,
            profile,
            abort.signal,
            { supabase, userId: user.id, runId },
            provider,
          ),
        );
        output = result.output;
        sources = result.sources;
        usage = result.usage;
      } catch (err) {
        if (timedOut) {
          const message = "시간이 너무 오래 걸려 중단했습니다. 크레딧은 돌려드렸어요. 분량(슬라이드 수 등)을 줄이거나 잠시 후 다시 시도해 주세요.";
          await fail("error", message);
          send({ type: "error", error: message });
          close();
          return;
        }
        if (isCancelled()) {
          await fail("cancelled", "사용자가 취소했습니다");
          close();
          return;
        }
        const message = providerErrorMessage(err) ?? (err instanceof Error ? err.message : "생성 중 오류가 발생했습니다");
        await fail("error", message);
        send({ type: "error", error: message });
        close();
        return;
      }

      if (isCancelled()) {
        await fail("cancelled", "사용자가 취소했습니다");
        close();
        return;
      }

      const guard = checkGrounding(manifest, sources);
      if (!guard.ok) {
        await fail("error", guard.reason!);
        send({ type: "error", error: guard.reason });
        close();
        return;
      }

      const outputSafety = checkOutputSafety(manifest.id, output, parsedInput.data);
      if (!outputSafety.ok) {
        await fail("error", outputSafety.reason!);
        send({ type: "error", error: outputSafety.reason });
        close();
        return;
      }
      // logo: sanitizeSvg may have stripped unrecognized-but-harmless
      // attributes — store and return that cleaned version, not the
      // model's raw one (the cosmetic typing preview above already
      // streamed the raw text, which is fine; nothing renders it as an
      // image until this point).
      if (outputSafety.output !== undefined) output = outputSafety.output;

      const creditsUsed = cost;
      // Finish only a row that is still streaming: if the cancel endpoint
      // got there first, it already marked the row cancelled and refunded
      // the reservation, so there is nothing to charge or return.
      const { data: finished } = await admin
        .from("generations")
        .update({
          status: "done",
          output,
          sources,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
        })
        .eq("id", runId)
        .eq("user_id", user.id)
        .eq("status", "streaming")
        .select("id");
      if (!finished?.length) {
        // Not "streaming" any more. Cancelled: the cancel route already
        // refunded. Anything else (the pending→streaming update never
        // applied): fail it and refund, and always tell the client — a
        // silent close left its spinner running.
        const { data: row } = await admin.from("generations").select("status").eq("id", runId).maybeSingle();
        if (row?.status === "cancelled") {
          send({ type: "cancelled" });
        } else {
          const { data: failed } = await admin.from("generations").update({ status: "error", error: "결과를 저장하지 못했습니다" }).eq("id", runId).in("status", ["pending", "streaming"]).select("id");
          if (failed?.length) await settleGenerationCredits(runId, 0);
          send({ type: "error", error: "결과를 저장하지 못했습니다. 다시 실행해 주세요. 크레딧은 돌려드렸어요." });
        }
        close();
        return;
      }
      // Settles the ledger and stamps credits_used/credits_settled on the
      // run row itself (idempotent — see settle_generation_credits in
      // supabase/migrations/0011).
      await settleGenerationCredits(runId, creditsUsed);

      send({ type: "done", output, sources, creditsUsed, runId, provider });
      close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
