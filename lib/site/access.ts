// How members get AI. One switch, so a model can come back without
// hunting through the app: every surface that grants, sells or explains
// credits, plans or API keys checks it.
//
//   "saas" (product decision, 2026-10-29): paid plans on the platform's
//     Gemini key. Free accounts can browse but not run; Plus and Pro buy
//     monthly credits, and subscribers can top up. Members' own API keys,
//     the student plan and referral credits are switched off — their code
//     stays (lib/api-keys.ts, /account/api-key, student verification) so
//     they can be turned back on.
//   "own-key" (2026-10, before SaaS): members bring their own API key;
//     no credits are sold or granted. The team runs on the platform key.
export type AccessModel = "saas" | "own-key";
export const ACCESS_MODEL = "saas" as AccessModel;

/** Members bring their own API key; nothing is sold. */
export const OWN_KEY_ONLY = ACCESS_MODEL === "own-key";
/** Paid plans on the platform key. */
export const SAAS = ACCESS_MODEL === "saas";
/** Members may add their own AI API keys (hidden in SaaS mode). */
export const MEMBER_API_KEYS = !SAAS;
/** Student plan and verification (off in SaaS mode). */
export const STUDENT_PLAN = false;
/** Referral sign-up bonuses (off: free accounts get no credits). */
export const REFERRAL_CREDITS = false;
