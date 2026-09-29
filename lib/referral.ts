// Referral program constants and pure helpers (the ledger lives in
// supabase/migrations/0014_referrals.sql).

export const REFERRAL = {
  bonus: 100,
  maxRewardedInvites: 10,
  cookie: "ref",
  cookieMaxAgeDays: 30,
} as const;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}
