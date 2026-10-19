import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Account deletion (회원 탈퇴) — shared by the member's own request
// (app/api/account/delete) and staff in /admin. Deletes everything
// personal — results, business profile, API keys, remaining credits,
// projects, student verification, every stored file — and then soft-deletes the
// login: Supabase removes the email and sign-in identities (the person
// can sign up again as a new member) but keeps the user row, so the
// records the law requires us to keep stay intact: payments and
// memberships (계약·결제 기록, 5년) and support tickets (불만·분쟁 처리
// 기록, 3년). See lib/site/legal.ts (개인정보 처리방침 — 보유 기간).

const BUCKETS = ["inputs", "exports", "logos", "consents"];

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

/** Deletes a member's data and login. Throws on the first failure. */
export async function deleteAccountData(uid: string, admin: Admin = createAdminClient()): Promise<void> {
  for (const bucket of BUCKETS) {
    const paths = await listAll(admin, bucket, uid);
    for (let i = 0; i < paths.length; i += 500) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 500));
      if (error) throw new Error(`${bucket}: ${error.message}`);
    }
  }
  // brands cascades to inputs, facts and posts; projects to project_facts.
  // The login below is only soft-deleted, so "on delete cascade" from
  // auth.users never fires — every table with personal data is listed.
  for (const table of ["generations", "projects", "brands", "user_api_keys", "user_credits", "student_verifications"]) {
    const { error } = await admin.from(table).delete().eq("user_id", uid);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  // Optional table (migration 0014) — its absence must not block deletion.
  await admin.from("referral_codes").delete().eq("user_id", uid);
  const { error } = await admin.auth.admin.deleteUser(uid, true);
  if (error) throw new Error(`auth: ${error.message}`);
}
