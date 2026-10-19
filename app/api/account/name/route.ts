import { createClient } from "@/lib/supabase/server";
import { normalizeName, NAME_MAX } from "@/lib/member-name";
import { saveMemberName } from "@/lib/member-name-server";
import { limitSensitive } from "@/lib/rate-limit";

// Saves the member's name (lib/member-name.ts) — the step on
// /auth/consent for members who agreed before the name was required, and
// later changes from the account page. The client refreshes its session
// afterwards so the gate sees the name at once.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const limited = await limitSensitive("name", user.id);
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = normalizeName(body?.name);
  if (!name) return Response.json({ error: `이름을 1~${NAME_MAX}자로 적어 주세요` }, { status: 400 });

  try {
    await saveMemberName(user.id, name);
  } catch (err) {
    console.error("name save failed", user.id, err);
    return Response.json({ error: "이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  await supabase.auth.refreshSession().catch(() => null);
  return Response.json({ ok: true, name });
}
