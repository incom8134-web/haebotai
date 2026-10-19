// Is a Gemini API key on the free tier or a paid (billing-enabled) one?
// Google has no endpoint that says so, but free keys get no Pro text model
// (ai.google.dev/gemini-api/docs/pricing): a Pro call answers 429 with a
// "free_tier" quota of "limit: 0" (the same signal lib/ai/free-tier.ts
// reacts to during runs). So /admin sends one tiny Pro request
// (lib/actions/admin.ts) and reads the answer here. Pure, so it's tested.

export type KeyTier = "paid" | "free" | "invalid" | "rate_limited" | "unknown";

/** The tier a Pro generateContent answer implies. */
export function tierFromResponse(status: number, body: string): KeyTier {
  if (status >= 200 && status < 300) return "paid";
  if (status === 429) return /free_tier/i.test(body) ? "free" : "rate_limited";
  if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(body)) return "invalid";
  if (status === 401 || status === 403) return "invalid";
  return "unknown";
}
