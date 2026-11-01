// How members get AI. One switch, so a model can come back without
// hunting through the app: every surface that grants, sells or explains
// credits, plans or API keys checks it.
//
//   "saas" (product decision, 2026-10-29): paid plans on the platform's
//     Gemini key. Plus and Pro buy monthly credits, and subscribers can top
//     up. Free accounts run every tool on their own Gemini API key, billed
//     to their own Google account (FREE_OWN_KEY, 2026-11-01); a Plus or Pro
//     member's saved key is never used. The student plan and referral
//     credits are switched off — their code stays (student verification)
//     so they can be turned back on.
//   "own-key" (2026-10, before SaaS): members bring their own API key;
//     no credits are sold or granted. The team runs on the platform key.
export type AccessModel = "saas" | "own-key";
export const ACCESS_MODEL = "saas" as AccessModel;

/** Members bring their own API key; nothing is sold. */
export const OWN_KEY_ONLY = ACCESS_MODEL === "own-key";
/** Paid plans on the platform key. */
export const SAAS = ACCESS_MODEL === "saas";
/** SaaS mode: Free accounts run on their own Gemini key; Plus and Pro stay on credits. */
export const FREE_OWN_KEY = SAAS;
/** Members may add their own AI API keys (own-key mode, or Free accounts in SaaS mode). */
export const MEMBER_API_KEYS = !SAAS || FREE_OWN_KEY;
/** Providers members can add keys for. SaaS runs on Gemini only. */
export const MEMBER_KEY_PROVIDERS: readonly ("google" | "anthropic")[] = SAAS ? ["google"] : ["google", "anthropic"];
/** Student plan and verification (off in SaaS mode). */
export const STUDENT_PLAN = false;
/** Referral sign-up bonuses (off: free accounts get no credits). */
export const REFERRAL_CREDITS = false;
