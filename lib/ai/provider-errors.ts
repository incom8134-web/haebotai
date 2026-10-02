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

/** A readable message for a provider failure; null when the error is ours and already readable. */
export function providerErrorMessage(err: unknown, opts: { ownKey?: boolean } = {}): string | null {
  const status = statusOf(err);
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
