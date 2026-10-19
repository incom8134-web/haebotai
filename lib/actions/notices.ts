"use server";

import { getCurrentUser } from "@/lib/supabase/user";
import { dismissNotice } from "@/lib/admin-ops-server";

/** A member closes a notice staff sent them (only their own: the id is matched with the session's user). */
export async function dismissMemberNotice(noticeId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || typeof noticeId !== "string" || !/^[0-9a-f-]{36}$/i.test(noticeId)) return;
  await dismissNotice(user.id, noticeId);
}
