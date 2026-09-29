// Sign-up consents (개인정보 보호법 §15·§22·§22의2·§28의8, 정보통신망법 §50).
//
// Google sign-in creates the account; before anything else the member
// confirms on /auth/consent, item by item: 만 14세 이상, 이용약관,
// 개인정보 수집·이용, 개인정보 국외 이전 (all required), and marketing
// email (optional, unchecked by default). The current state lives in the
// user's app_metadata — only the service role can write it, so the
// member can't forge it, and it rides in the session JWT, so the gate in
// lib/supabase/middleware.ts needs no database call. Every change is
// also appended to a private log (lib/consent-server.ts) with time, IP
// and browser as the written record.
//
// Bump CONSENT_VERSION when the terms or privacy policy change in a way
// that needs fresh consent; everyone is asked again on their next visit.

export const CONSENT_VERSION = "2026-09-29";

export interface ConsentState {
  /** Version of the terms/privacy policy agreed to. */
  v: string;
  age14_at: string;
  terms_at: string;
  privacy_at: string;
  overseas_at: string;
  marketing: boolean;
  marketing_at: string | null;
}

export const REQUIRED_ITEMS = ["age14", "terms", "privacy", "overseas"] as const;
export type RequiredItem = (typeof REQUIRED_ITEMS)[number];

/** The consent stored in a user's app_metadata (or null). */
export function consentOf(appMetadata: unknown): ConsentState | null {
  const c = (appMetadata as { consent?: Partial<ConsentState> } | null | undefined)?.consent;
  if (!c || typeof c !== "object") return null;
  return c as ConsentState;
}

/** True when every required item was agreed to for the current version. */
export function hasCurrentConsent(appMetadata: unknown): boolean {
  const c = consentOf(appMetadata);
  return !!c && c.v === CONSENT_VERSION && !!c.age14_at && !!c.terms_at && !!c.privacy_at && !!c.overseas_at;
}

export type ConsentInput = Record<RequiredItem, boolean> & { marketing: boolean };

/** Validates a consent submission; every required item must be true. */
export function parseConsentInput(body: unknown): { ok: true; value: ConsentInput } | { ok: false; missing: RequiredItem[] } {
  const b = (body ?? {}) as Record<string, unknown>;
  const missing = REQUIRED_ITEMS.filter((k) => b[k] !== true);
  if (missing.length) return { ok: false, missing };
  return { ok: true, value: { age14: true, terms: true, privacy: true, overseas: true, marketing: b.marketing === true } };
}

/** The new consent state after a submission (keeps the first marketing time if unchanged). */
export function nextConsentState(prev: ConsentState | null, input: ConsentInput, now: string): ConsentState {
  const marketingChanged = !prev || prev.marketing !== input.marketing;
  return {
    v: CONSENT_VERSION,
    age14_at: now,
    terms_at: now,
    privacy_at: now,
    overseas_at: now,
    marketing: input.marketing,
    marketing_at: marketingChanged ? now : (prev?.marketing_at ?? now),
  };
}
