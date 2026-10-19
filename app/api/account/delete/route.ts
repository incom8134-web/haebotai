import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountDeleteLimiter, checkRateLimit } from "@/lib/rate-limit";
import { deleteAccountData } from "@/lib/account-delete";

// Self-serve account deletion (회원 탈퇴): what's deleted and what the law
// requires us to keep is in lib/account-delete.ts.

const CONFIRM_WORD = "탈퇴";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const rate = await checkRateLimit(accountDeleteLimiter, user.id);
  if (!rate.ok) {
    return Response.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const body = (await request.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== CONFIRM_WORD) return Response.json({ error: `확인을 위해 '${CONFIRM_WORD}'를 입력해 주세요` }, { status: 400 });

  const admin = createAdminClient();
  const uid = user.id;

  try {
    await deleteAccountData(uid, admin);
  } catch (err) {
    console.error("account delete failed", uid, err);
    return Response.json({ error: "탈퇴를 끝내지 못했습니다. 고객센터로 알려 주시면 바로 처리해 드릴게요." }, { status: 500 });
  }

  await supabase.auth.signOut().catch(() => {});
  return Response.json({ ok: true });
}
