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

/**
 * Revenue share (migration 0024 holds the same numbers in SQL — the
 * trigger computes the share; lib/referral.test.ts checks they agree).
 * A referrer earns `rate` of the VAT-excluded amount of each purchase
 * their friend makes within `windowDays` of joining, withdrawable after
 * `holdDays` (the refund window). Cash payouts withhold `withholdingRate`
 * (사업소득 3.3% — confirm the income type with the company's tax adviser).
 */
export const REVENUE_SHARE = {
  rate: 0.2,
  windowDays: 90,
  holdDays: 7,
  /** Smallest payout a member can request, in won. */
  minPayout: 10_000,
  withholdingRate: 0.033,
} as const;

/** The referrer's share of one payment (VAT-included won), as the SQL trigger computes it. */
export function commissionFor(amount: number): { base: number; commission: number } {
  const base = Math.floor(amount / 1.1);
  return { base, commission: Math.floor(base * REVENUE_SHARE.rate) };
}

/** Tax withheld from a payout, cut to 10 won, and what reaches the bank account. */
export function payoutSplit(gross: number): { tax: number; net: number } {
  const tax = Math.floor((gross * REVENUE_SHARE.withholdingRate) / 10) * 10;
  return { tax, net: gross - tax };
}

/** A Korean resident registration number: 13 digits (dash optional) with a plausible birth date and 7th digit, or null. (Numbers issued since Oct 2020 have no check digit, so none is checked.) */
export function normalizeRrn(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/[\s-]/g, "");
  if (!/^\d{13}$/.test(digits)) return null;
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31 || !"12345678".includes(digits[6])) return null;
  return digits;
}

/** A bank account number as digits (dashes and spaces dropped), 10–16 digits, or null. */
export function normalizeAccountNumber(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/[\s-]/g, "");
  return /^\d{10,16}$/.test(digits) ? digits : null;
}

/** Banks offered in the payout form (KFTC member names, short form). */
export const PAYOUT_BANKS = ["KB국민은행", "신한은행", "우리은행", "하나은행", "NH농협은행", "IBK기업은행", "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행", "한국씨티은행", "부산은행", "경남은행", "대구은행(iM뱅크)", "광주은행", "전북은행", "제주은행", "수협은행", "새마을금고", "신협", "우체국"] as const;
