import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountDeleteLimiter, checkRateLimit } from "@/lib/rate-limit";

// Self-serve account deletion (회원 탈퇴). Deletes everything personal —
// results, business profile, API keys, remaining credits, student
// verification, every stored file — and then soft-deletes the login:
// Supabase removes the email and sign-in identities (the person can sign
// up again as a new member) but keeps the user row, so the records the
// law requires us to keep stay intact: payments and memberships
// (계약·결제 기록, 5년) and support tickets (불만·분쟁 처리 기록, 3년).
// See lib/site/legal.ts (개인정보 처리방침 — 보유 기간).

const CONFIRM_WORD = "탈퇴";
const BUCKETS = ["inputs", "exports", "logos"];

type Admin = ReturnType<typeof createAdminClient>;

/** Every object under the user's folder in a bucket (folders are listed recursively). */
async function listAll(admin: Admin, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error || !data?.length) break;
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      // Folders come back without an id.
      if (item.id) out.push(path);
      else out.push(...(await listAll(admin, bucket, path)));
    }
    if (data.length < 1000) break;
  }
  return out;
}

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
    for (const bucket of BUCKETS) {
      const paths = await listAll(admin, bucket, uid);
      for (let i = 0; i < paths.length; i += 500) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 500));
        if (error) throw new Error(`${bucket}: ${error.message}`);
      }
    }
    // brands cascades to inputs, facts and posts.
    for (const table of ["generations", "brands", "user_api_keys", "user_credits", "student_verifications"]) {
      const { error } = await admin.from(table).delete().eq("user_id", uid);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    const { error } = await admin.auth.admin.deleteUser(uid, true);
    if (error) throw new Error(`auth: ${error.message}`);
  } catch (err) {
    console.error("account delete failed", uid, err);
    return Response.json({ error: "탈퇴를 끝내지 못했습니다. 고객센터로 알려 주시면 바로 처리해 드릴게요." }, { status: 500 });
  }

  await supabase.auth.signOut().catch(() => {});
  return Response.json({ ok: true });
}
