import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCurrentConsent } from "@/lib/consent";
import { getTool } from "@/lib/tools/registry";
import { getOutputSchema } from "@/lib/tools/schemas";
import { buildContext, buildSystemInstruction } from "@/lib/tools/generate-prompt";
import { zodToJsonSchema } from "@/lib/ai/schema";
import { getClient, runWithApiKey } from "@/lib/ai/gemini";
import { getUserApiKeys } from "@/lib/api-keys";
import { getMembership } from "@/lib/membership";
import { resolveCost } from "@/lib/ai/resolve-provider";
import { reserveCredits, releaseUnattachedReservation, settleGenerationCredits } from "@/lib/credits";
import { runLimiter, checkRateLimit } from "@/lib/rate-limit";
import { checkSpend } from "@/lib/spend-guard";
import { regenerateCost, regeneratableSections, versionTitle } from "@/lib/projects/regenerate";
import { writeRunFacts } from "@/lib/projects/server";

// Rewrite one part of a finished result (POST { section, instruction }).
// The model gets the original input, the whole current result (so the
// new part stays consistent) and the member's instruction, and answers
// against that part's own schema. The result is a new run whose parent is
// this one — the original stays as it was, so versions can be compared.

export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!hasCurrentConsent(user.app_metadata)) return Response.json({ error: "서비스 이용 동의가 필요합니다", code: "consent_required" }, { status: 403 });
  const rate = await checkRateLimit(runLimiter, user.id);
  if (!rate.ok) return Response.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { section?: unknown; instruction?: unknown };
  const section = typeof body.section === "string" ? body.section : "";
  const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 500) : "";
  if (!instruction) return Response.json({ error: "어떻게 바꿀지 적어 주세요" }, { status: 400 });

  const { data: run } = await supabase
    .from("generations")
    .select("id, tool_id, status, input, output, sources, project_id, title")
    .eq("id", runId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!run || run.status !== "done" || !run.tool_id) return Response.json({ error: "결과를 찾을 수 없습니다" }, { status: 404 });
  const manifest = getTool(run.tool_id);
  const schema = getOutputSchema(run.tool_id);
  const shape = (schema as unknown as { shape?: Record<string, z.ZodType> } | undefined)?.shape;
  if (!manifest || manifest.retired || !shape || !shape[section] || !regeneratableSections(run.tool_id, run.output).includes(section)) {
    return Response.json({ error: "이 부분은 따로 다시 만들 수 없어요" }, { status: 400 });
  }

  const [keys, membership] = await Promise.all([getUserApiKeys("google", { excludeBroken: true }), getMembership()]);
  const cost = resolveCost("google", keys.length > 0, membership.plan === "student", regenerateCost(manifest.estimatedCredits));
  const usesPlatformKey = keys.length === 0;
  const spend = await checkSpend(user.id, usesPlatformKey ? regenerateCost(manifest.estimatedCredits) : 0, usesPlatformKey);
  if (!spend.ok) return Response.json({ error: spend.message }, { status: 429 });
  const reservation = cost > 0 ? await reserveCredits(user.id, cost) : ({ ok: true } as const);
  if (!reservation.ok) {
    const insufficient = reservation.error.includes("insufficient_credits");
    return Response.json({ error: insufficient ? "크레딧이 부족합니다" : "크레딧 확인 실패" }, { status: insufficient ? 402 : 500 });
  }

  const output = run.output as Record<string, unknown>;
  const input = Object.fromEntries(Object.entries((run.input ?? {}) as Record<string, unknown>).filter(([k]) => !k.startsWith("_")));
  const current = Object.fromEntries(Object.entries(output).filter(([k]) => !["agent", "_agent", "request_brief", "creative_direction"].includes(k)));
  const partSchema = z.object({ [section]: shape[section] });

  const call = async () => {
    const res = await getClient().models.generateContent({
      model: manifest.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                `[원래 요청]\n${buildContext(manifest, input, null)}`,
                `[현재 결과 전체]\n${JSON.stringify(current).slice(0, 40_000)}`,
                `[다시 쓸 부분] ${section}`,
                `[요청한 변경] ${instruction}`,
                "규칙: 이 부분만 다시 쓰고, 결과의 다른 부분과 모순되지 않게 하세요. 원래 요청과 현재 결과에 없는 사실(가격, 수치, 후기, 이름)을 새로 지어내지 마세요. 응답은 이 부분 하나만 담은 JSON입니다.",
              ].join("\n\n"),
            },
          ],
        },
      ],
      config: {
        systemInstruction: buildSystemInstruction(manifest),
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(partSchema),
        maxOutputTokens: 16_384,
      },
    });
    const parsed = partSchema.safeParse(JSON.parse(res.text ?? ""));
    if (!parsed.success) throw new Error("새 결과가 형식에 맞지 않았습니다");
    return { value: (parsed.data as Record<string, unknown>)[section], usage: res.usageMetadata };
  };

  let result: Awaited<ReturnType<typeof call>>;
  try {
    result = keys.length ? await runWithApiKey(keys, call) : await call();
  } catch (err) {
    if (cost > 0) await releaseUnattachedReservation(user.id, cost);
    console.warn("regenerate failed", (err as Error).message);
    return Response.json({ error: "다시 만들지 못했어요. 크레딧은 돌려드렸어요." }, { status: 502 });
  }

  const nextOutput = { ...output, [section]: result.value, agent: { ...((output.agent as object) ?? {}), regenerated: { section, instruction } } };
  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("generations")
    .insert({
      user_id: user.id,
      kind: "generate",
      tool_id: run.tool_id,
      input: run.input,
      output: nextOutput,
      sources: run.sources ?? [],
      status: "done",
      credits_reserved: cost,
      provider: "google",
      parent_run_id: run.id,
      project_id: run.project_id,
      title: versionTitle(run.title),
      input_tokens: result.usage?.promptTokenCount ?? null,
      output_tokens: result.usage?.candidatesTokenCount ?? null,
    })
    .select("id")
    .single();
  if (error || !created) {
    if (cost > 0) await releaseUnattachedReservation(user.id, cost);
    return Response.json({ error: "새 버전을 저장하지 못했습니다" }, { status: 500 });
  }
  if (cost > 0) await settleGenerationCredits(created.id, cost);
  await writeRunFacts(admin, { runId: created.id, userId: user.id, toolId: run.tool_id, input, output: nextOutput });
  return Response.json({ runId: created.id });
}
