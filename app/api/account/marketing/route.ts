import { createClient } from "@/lib/supabase/server";
import { requestMeta, setMarketing } from "@/lib/consent-server";
import { limitSensitive } from "@/lib/rate-limit";

// Marketing email on/off from the account page (정보통신망법 §50: the
// member can withdraw consent at any time, as easily as they gave it).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const limited = await limitSensitive("marketing", user.id);
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as { optIn?: unknown } | null;
  if (typeof body?.optIn !== "boolean") return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });
  try {
    await setMarketing(user.id, body.optIn, body.optIn ? "marketing_opt_in" : "marketing_opt_out", requestMeta(request));
  } catch (err) {
    console.error("marketing toggle failed", user.id, err);
    return Response.json({ error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  return Response.json({ ok: true, marketing: body.optIn, at: new Date().toISOString() });
}
