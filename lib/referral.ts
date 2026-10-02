// Referral program constants and pure helpers (the ledger lives in
// supabase/migrations/0014_referrals.sql and 0017). An invite is claimed
// at sign-up and pays out after the new member's first successful run.

import { OWN_KEY_ONLY } from "./site/access.ts";

export const REFERRAL = {
  /** Credits for the new member (none while members bring their own key: lib/site/access.ts). */
  refereeBonus: OWN_KEY_ONLY ? 0 : 100,
  /** Credits for the member who invited them. */
  referrerBonus: OWN_KEY_ONLY ? 0 : 200,
  maxRewardedInvites: 10,
  cookie: "ref",
  cookieMaxAgeDays: 30,
} as const;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}
