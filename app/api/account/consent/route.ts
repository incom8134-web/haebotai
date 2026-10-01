import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL } from "@/lib/referral";
import { claimReferral } from "@/lib/referral-server";
import { consentOf, nextConsentState, parseConsentInput } from "@/lib/consent";
import { appendConsentLog, requestMeta, saveConsentState } from "@/lib/consent-server";
import { limitSensitive } from "@/lib/rate-limit";

// Records the sign-up consents from /auth/consent: every required item
// must be checked; marketing email is optional. The client refreshes its
// session afterwards so the new state is in the JWT the gate reads.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const limited = await limitSensitive("consent", user.id);
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = parseConsentInput(body);
  if (!parsed.ok) return Response.json({ error: "필수 항목에 모두 동의해야 서비스를 이용할 수 있어요", missing: parsed.missing }, { status: 400 });

  const now = new Date().toISOString();
  const state = nextConsentState(consentOf(user.app_metadata), parsed.value, now);
  try {
    await appendConsentLog(user.id, { at: now, kind: "signup_consent", v: state.v, items: { ...parsed.value }, ...requestMeta(request) });
    await saveConsentState(user.id, state);
  } catch (err) {
    console.error("consent save failed", user.id, err);
    return Response.json({ error: "동의 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  // A fresh session token that carries the new consent (cookies set on
  // this response), so the next page load passes the gate at once.
  await supabase.auth.refreshSession().catch(() => null);

  // Everyone passes through here once, so this is where an invite is
  // claimed — from the link's cookie or a code typed on the consent page.
  // It pays out after their first successful run (lib/agents/runner.ts);
  // the SQL only accepts accounts younger than 7 days.
  const jar = await cookies();
  const typed = typeof body?.referralCode === "string" ? body.referralCode : undefined;
  const ref = typed || jar.get(REFERRAL.cookie)?.value;
  let referral: string | undefined;
  if (ref) {
    referral = await claimReferral(user.id, ref).catch((err: unknown) => {
      console.warn("referral claim failed", err);
      return "unavailable" as const;
    });
    jar.delete(REFERRAL.cookie);
  }
  return Response.json({ ok: true, referral });
}
