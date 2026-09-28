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

export function providerErrorMessage(err: unknown): string | null {
  const status = statusOf(err);
  if (status === 429) return "AI 엔진 사용 한도를 초과했습니다 — 잠시 후 다시 시도해주세요";
  if (status === 503 || status === 529) return "AI 엔진 요청이 많아 지금은 응답할 수 없습니다 — 잠시 후 다시 시도해주세요";
  return null;
}
