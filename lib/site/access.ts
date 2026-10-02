// How members get AI (product decision, 2026-10): they bring their own
// API key. We give no free credits and sell none — no sign-up grant, no
// referral bonus, no student plan, no Pro credits. The platform's own key
// is the team's, for testing (lib/platform-access.ts).
//
// One switch, so the old model can come back without hunting through the
// app: every credit-granting or credit-selling surface checks it.
export const OWN_KEY_ONLY = true;
