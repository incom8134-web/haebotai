import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCurrentConsent } from "@/lib/consent";
import { getTool } from "@/lib/tools/registry";
import { buildInputSchema } from "@/lib/tools/runner";
import { REFERENCE_LIMITS, referenceModesFor } from "@/lib/tools/reference";
import { getBusinessProfile } from "@/lib/profile";
import { getUserApiKeys } from "@/lib/api-keys";
import { resolveRequestedProvider } from "@/lib/ai/resolve-provider";
import { runWithApiKey } from "@/lib/tools/generate";
import { understand } from "@/lib/agents/calls";
import { isAgentic } from "@/lib/agents/specs";
import { canUsePlatformKey } from "@/lib/platform-access";
import { intentLimiter, checkRateLimit } from "@/lib/rate-limit";

// Before a run: read the request into an understanding (lib/agents/intent.ts)
// and, only when something critical is missing, up to three questions with
// defaults. The page shows the understanding, asks (or not), and sends the
// understanding and answers with the run. No credits; one fast model call.

export const maxDuration = 30;

export async function POST(request: NextRequest, { params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  const manifest = getTool(toolId);
  if (!manifest || manifest.comingSoon || manifest.retired) return Response.json({ error: "알 수 없는 도구입니다" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!hasCurrentConsent(user.app_metadata)) return Response.json({ error: "서비스 이용 동의가 필요합니다", code: "consent_required" }, { status: 403 });
  const rate = await checkRateLimit(intentLimiter, user.id);
  if (!rate.ok) return Response.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { values?: unknown; provider?: unknown; excludeProfile?: unknown; reference?: { mode?: unknown; text?: unknown; files?: unknown } } | null;
  const parsed = buildInputSchema(manifest.inputs).safeParse(body?.values ?? {});
  if (!parsed.success) return Response.json({ intent: null, questions: [] });
  const resolution = resolveRequestedProvider(manifest.id, body?.provider);
  if (!resolution.ok || !isAgentic(manifest, resolution.provider)) return Response.json({ intent: null, questions: [] });

  // The pasted text and the names of attached files are enough to understand the request.
  const ref = body?.reference;
  const mode = referenceModesFor(manifest.id).find((m) => m.id === ref?.mode) ?? referenceModesFor(manifest.id)[0];
  const refText = typeof ref?.text === "string" ? ref.text.slice(0, REFERENCE_LIMITS.maxTextChars) : "";
  const fileNames = Array.isArray(ref?.files) ? ref.files.map((f) => (f && typeof f === "object" && typeof (f as { name?: unknown }).name === "string" ? (f as { name: string }).name.slice(0, 200) : "")).filter(Boolean).slice(0, 10) : [];
  const values: Record<string, unknown> = { ...parsed.data };
  if (mode && (refText || fileNames.length)) values._reference = { mode, text: refText, documents: [], images: [], fileNames };

  const excluded = new Set(Array.isArray(body?.excludeProfile) ? body.excludeProfile.filter((k): k is string => typeof k === "string") : []);
  const full = await getBusinessProfile();
  const profile = full && excluded.size ? (Object.fromEntries(Object.entries(full).filter(([k]) => !excluded.has(k))) as typeof full) : full;

  const keys = await getUserApiKeys("google", { excludeBroken: true });
  // No own key and not on the team: the run itself will ask for a key, so don't spend the platform's.
  if (!keys.length && !canUsePlatformKey(user.email)) return Response.json({ intent: null, questions: [] });
  try {
    const r = await runWithApiKey("google", user.id, keys, () => understand(manifest, values, profile, [], AbortSignal.timeout(25_000)));
    return Response.json({ intent: r.intent, questions: r.questions });
  } catch {
    return Response.json({ intent: null, questions: [] });
  }
}
