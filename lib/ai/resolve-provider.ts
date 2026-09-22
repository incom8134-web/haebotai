import { z } from "zod";
import { getToolCapability } from "./capabilities.ts";
import { PROVIDER_LABEL, type ProviderId } from "./types.ts";

// Pure decision logic for engine selection, pulled out of the run route
// so it's unit-testable without mocking Supabase/credits/rate-limit. The
// route still owns the actual I/O (getUserApiKeys, membership).

export const providerSchema = z.enum(["google", "anthropic", "openai"]);

export type ProviderResolution = { ok: true; provider: ProviderId } | { ok: false; error: string };

/**
 * google is always allowed. anthropic/openai only if this tool's
 * capability entry offers them — never a silent Gemini fallback
 * (product decision): an unsupported request is a 400, not a downgrade.
 */
export function resolveRequestedProvider(toolId: string, requestedProvider: unknown): ProviderResolution {
  const capability = getToolCapability(toolId) ?? { providers: ["google" as const], default: "google" as const };
  if (requestedProvider === undefined) return { ok: true, provider: capability.default };

  const parsed = providerSchema.safeParse(requestedProvider);
  if (!parsed.success) return { ok: false, error: "알 수 없는 엔진입니다" };

  const provider = parsed.data;
  if (provider !== "google" && !capability.providers.includes(provider)) {
    return { ok: false, error: `이 도구는 ${PROVIDER_LABEL[provider]} 엔진을 지원하지 않습니다` };
  }
  return { ok: true, provider };
}

export interface KeyAvailability {
  /** Any key registered for this provider, broken or not. */
  hasAnyKey: boolean;
  /** At least one non-broken, non-exhausted key ready to try. */
  hasUsableKey: boolean;
}

/**
 * Claude/ChatGPT are own-key only — no usable key for that provider
 * means no run, not a Gemini fallback. Distinguishes "never registered a
 * key" from "registered one, but every slot is broken or exhausted" so
 * the message points at the actual problem.
 */
export function ownKeyRequiredError(provider: ProviderId, keys: KeyAvailability): string | null {
  if (provider === "google" || keys.hasUsableKey) return null;
  if (keys.hasAnyKey) {
    return `등록된 ${PROVIDER_LABEL[provider]} 키를 모두 사용할 수 없습니다 (한도 초과 또는 인증 실패) — /account/api-key 에서 확인해주세요`;
  }
  return `${PROVIDER_LABEL[provider]} API 키를 먼저 등록해주세요 → /account/api-key`;
}

/**
 * Own key (any provider) or student plan (google only) → 0 credits.
 * Claude/ChatGPT are always 0 — the user pays the provider directly,
 * never the platform (product decision).
 */
export function resolveCost(provider: ProviderId, hasOwnKey: boolean, isStudent: boolean, estimatedCredits: number): number {
  if (provider !== "google") return 0;
  return hasOwnKey || isStudent ? 0 : estimatedCredits;
}
