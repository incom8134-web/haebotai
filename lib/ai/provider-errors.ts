// Provider SDK errors (e.g. @google/genai's ApiError) carry the raw
// upstream JSON as their message — `{"error":{"code":429,...}}` — which
// used to reach the user verbatim. Map the transient/quota cases to a
// plain Korean message (translated for display in
// client-error-messages.ts); anything else keeps its original message.

function statusOf(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number") return status;
  const message = err instanceof Error ? err.message : "";
  const match = /"code"\s*:\s*(\d{3})/.exec(message);
  return match ? Number(match[1]) : undefined;
}

/** Gemini: 503 (overloaded) is worth one same-key retry; 429 (quota) moves to the next key. */
export function classifyGeminiError(err: unknown): "retry-same" | "next-key" | "fail" {
  const status = statusOf(err);
  if (status === 429) return "next-key";
  if (status === 503) return "retry-same";
  return "fail";
}

/**
 * The provider refused the key itself: revoked or invalid key, API
 * disabled, or the Google Cloud billing account in arrears ("dunning").
 * Retrying won't help; someone has to fix the key or the billing.
 */
export function isAccessDenied(err: unknown): boolean {
  const status = statusOf(err);
  const message = err instanceof Error ? err.message : "";
  return status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|dunning|billing/i.test(message);
}

/**
 * Google answers a free-tier key (no billing on its project) with a 429
 * whose quota is 0 for models the free tier doesn't include: the Pro
 * text model and the image models (ai.google.dev/gemini-api/docs/pricing).
 * Not a rate limit: waiting never helps; a free model or billing does.
 */
export function freeTierBlocked(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return statusOf(err) === 429 && /free_tier/i.test(message) && /limit:\s*0\b/.test(message);
}

/** A free-tier key used up today's requests for one model (each model has its own daily quota). */
export function freeTierDailyQuotaHit(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return statusOf(err) === 429 && /free_tier/i.test(message) && /PerDay/.test(message) && !freeTierBlocked(err);
}

/** Google is overloaded (503, or 529 elsewhere): worth waiting and trying again. */
export function isOverloaded(err: unknown): boolean {
  const status = statusOf(err);
  return status === 503 || status === 529;
}

/** Seconds Google asks us to wait before retrying a 429 ("Please retry in 23.4s" / "retryDelay": "23s"), or null. */
export function retryAfterSeconds(err: unknown): number | null {
  if (statusOf(err) !== 429) return null;
  const message = err instanceof Error ? err.message : "";
  const match = /retry in ([\d.]+)s/i.exec(message) ?? /"retryDelay"\s*:\s*"([\d.]+)s"/.exec(message);
  return match ? Number(match[1]) : null;
}

/** A readable message for a provider failure; null when the error is ours and already readable. */
export function providerErrorMessage(err: unknown, opts: { ownKey?: boolean } = {}): string | null {
  const status = statusOf(err);
  if (freeTierBlocked(err)) return "무료 Gemini 키로는 이미지를 만들 수 없습니다 — Google AI Studio에서 결제를 켠 키를 등록해주세요";
  if (status === 429) return "AI 엔진 사용 한도를 초과했습니다 — 잠시 후 다시 시도해주세요";
  if (status === 503 || status === 529) return "AI 엔진 요청이 많아 지금은 응답할 수 없습니다 — 잠시 후 다시 시도해주세요";
  if (isAccessDenied(err)) {
    return opts.ownKey
      ? "등록한 API 키가 거부되었습니다 — 계정 → 내 API 키에서 키와 결제 상태를 확인해주세요"
      : "AI 엔진을 지금 사용할 수 없습니다 — 운영팀에 알렸어요. 잠시 후 다시 시도해주세요";
  }
  // Any other raw upstream JSON never reaches the member verbatim.
  const message = err instanceof Error ? err.message : "";
  if (status !== undefined || /^\s*\{\s*"error"/.test(message)) return "AI 엔진에서 오류가 발생했습니다 — 잠시 후 다시 시도해주세요";
  return null;
}
