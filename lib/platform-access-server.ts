import "server-only";
import { getSiteSettings } from "@/lib/admin-ops-server";
import { canUsePlatformKey } from "@/lib/platform-access";

/** Whether this member is a host (lib/platform-access.ts): Vercel env or the /admin/hosts list. */
export async function isHost(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (canUsePlatformKey(email)) return true;
  return canUsePlatformKey(email, {}, (await getSiteSettings()).hostEmails);
}
