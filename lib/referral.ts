// Referral program constants and pure helpers (the ledger lives in
// supabase/migrations/0014_referrals.sql and 0017). An invite is claimed
// at sign-up and pays out after the new member's first successful run.

import { REFERRAL_CREDITS } from "./site/access.ts";

export const REFERRAL = {
  /** Credits for the new member (none while referral credits are off: lib/site/access.ts). */
  refereeBonus: REFERRAL_CREDITS ? 100 : 0,
  /** Credits for the member who invited them. */
  referrerBonus: REFERRAL_CREDITS ? 200 : 0,
  maxRewardedInvites: 10,
  cookie: "ref",
  cookieMaxAgeDays: 30,
} as const;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}
