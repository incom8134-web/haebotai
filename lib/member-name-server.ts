import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Server side of lib/member-name.ts: the name goes in app_metadata
// (service role only), merged so consent and other keys stay.

type Admin = ReturnType<typeof createAdminClient>;

export async function saveMemberName(userId: string, name: string, admin: Admin = createAdminClient()) {
  const { data, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !data.user) throw new Error(`name: ${getErr?.message ?? "no user"}`);
  if (data.user.app_metadata?.name === name) return;
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...(data.user.app_metadata ?? {}), name } });
  if (error) throw new Error(`name: ${error.message}`);
}
