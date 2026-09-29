import { BUSINESS } from "./site/business.ts";

// Sign-up consent (만 14세 이상 + 이용약관·개인정보 처리방침), recorded on the
// account's user_metadata so it travels in the session JWT: the proxy can
// check it on every protected request without a database round trip.

export const CONSENT_TERMS_VERSION = BUSINESS.effectiveDate;

export interface Consent {
  age14: true;
  terms: true;
  termsVersion: string;
  at: string;
}

export function hasConsent(userMetadata: unknown): boolean {
  const consent = (userMetadata as { consent?: Partial<Consent> } | null | undefined)?.consent;
  return consent?.age14 === true && consent?.terms === true && typeof consent.termsVersion === "string";
}

/** Same-site relative path, else the Studio. */
export function safeNext(raw: string | null | undefined): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/studio";
}
