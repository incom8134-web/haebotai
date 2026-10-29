// Who may run a tool, on which key, for how many credits. Pure (tested),
// shared by the run, regenerate and intent routes.
//
// SaaS mode (lib/site/access.ts): members run on the platform's Gemini
// key and pay in credits; that needs an active Plus or Pro. Free
// accounts can browse but not run. Members' own keys aren't used. The
// team runs free on the platform key for testing.
// Own-key mode: the earlier rules (own key required, 0 credits).

export type RunAccess =
  | { ok: true; cost: number; ownKey: boolean }
  | { ok: false; status: number; code: "plan_required" | "engine_unavailable" | "own_key_required"; error: string };

export interface RunAccessInput {
  saas: boolean;
  provider: "google" | "anthropic";
  team: boolean;
  plan: string;
  estimatedCredits: number;
  /** Own-key mode only. */
  ownKeyError?: string | null;
  hasUsableKey?: boolean;
}

export const PLAN_REQUIRED_MESSAGE = "도구 실행은 플러스 플랜부터 할 수 있어요 — 멤버십에서 플랜을 골라 주세요";

export function decideRunAccess(i: RunAccessInput): RunAccess {
  if (i.saas) {
    if (i.provider !== "google") return { ok: false, status: 400, code: "engine_unavailable", error: "지금은 Gemini 엔진만 제공해요" };
    if (i.team) return { ok: true, cost: 0, ownKey: false };
    if (i.plan !== "plus" && i.plan !== "pro") return { ok: false, status: 402, code: "plan_required", error: PLAN_REQUIRED_MESSAGE };
    return { ok: true, cost: i.estimatedCredits, ownKey: false };
  }
  if (i.ownKeyError) return { ok: false, status: 400, code: "own_key_required", error: i.ownKeyError };
  // Members pay their provider directly; the team uses the platform key. Nothing is charged.
  return { ok: true, cost: 0, ownKey: !!i.hasUsableKey };
}
