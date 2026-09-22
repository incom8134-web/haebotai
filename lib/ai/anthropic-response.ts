import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import type { RotationAction } from "../tools/quota-rotation.ts";
import type { Source } from "../tools/registry/shared.ts";

// Pure response-handling logic for the Anthropic adapter (lib/ai/anthropic.ts),
// split out so it's testable without pulling in Supabase or Next's
// server-only APIs — same reason lib/tools/generate-prompt.ts is split
// from lib/tools/generate.ts.

export interface AnthropicTokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

// Real accounts occasionally report an exhausted balance as a 400
// invalid_request_error ("Your credit balance is too low to access the
// Claude API...") rather than the documented 402 billing_error — both
// mean the same thing: this key's account is out of money, move on.
const CREDIT_BALANCE_MESSAGE = /credit balance/i;

// Anthropic's own error classification (verified against
// platform.claude.com/docs, 2026-09-22 — shared/error-codes.md in the
// claude-api skill): 429 rate_limit_error and 529 overloaded_error are
// transient — wait, then retry the SAME key once before giving up on it;
// 402 billing_error (and the 400 credit-balance variant above) means
// this key's account is out of money — move on immediately; 401
// authentication_error / 403 permission_error mean the key itself is
// bad — move on and flag the slot. Everything else (400, 404, network)
// is not rotatable.
export function classifyAnthropicError(err: unknown): RotationAction {
  if (!(err instanceof Anthropic.APIError)) return "fail";
  switch (err.status) {
    case 429:
    case 529:
      return "retry-same";
    case 402:
      return "next-key";
    case 400:
      return typeof err.message === "string" && CREDIT_BALANCE_MESSAGE.test(err.message) ? "next-key" : "fail";
    case 401:
    case 403:
      return "next-key-mark-broken";
    default:
      return "fail";
  }
}

const DEFAULT_RETRY_DELAY_MS = 1500;
const MAX_RETRY_DELAY_MS = 5000;

/** Delay before a same-key retry on a 429/529 — the provider's own retry-after header if present, else ~1.5s, capped at 5s. */
export function anthropicRetryDelayMs(err: unknown): number {
  const header = err instanceof Anthropic.APIError ? err.headers?.get?.("retry-after") : null;
  const seconds = header ? Number(header) : NaN;
  const ms = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_RETRY_DELAY_MS;
  return Math.min(ms, MAX_RETRY_DELAY_MS);
}

/** Once rotation gives up, turn an auth failure into a message that names the actual fix instead of a bare "invalid key". */
export function describeFinalAnthropicError(err: unknown): Error {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 403) {
      return new Error("이 Claude API 키에 모델 접근 권한이 없습니다 — Anthropic 콘솔에서 이 키의 모델 접근 권한을 확인해주세요.");
    }
    if (err.status === 401) {
      return new Error("Claude API 키가 유효하지 않습니다 — 등록한 키가 맞는지 확인해주세요.");
    }
  }
  return err instanceof Error ? err : new Error(String(err));
}

export interface AnthropicImage {
  mimeType: string;
  data: string;
}

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function toAnthropicImageBlock(img: AnthropicImage): Anthropic.ImageBlockParam {
  if (!SUPPORTED_IMAGE_TYPES.has(img.mimeType)) {
    throw new Error(`Claude는 ${img.mimeType} 형식의 이미지를 지원하지 않습니다 (jpeg/png/gif/webp만 가능)`);
  }
  return {
    type: "image",
    source: { type: "base64", media_type: img.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: img.data },
  };
}

/** Web search citations only — the one citation type Claude ever attaches automatically (see Phase 3b). */
export function extractSources(content: readonly Anthropic.ContentBlock[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const block of content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const citation of block.citations) {
      if (citation.type !== "web_search_result_location") continue;
      if (seen.has(citation.url)) continue;
      seen.add(citation.url);
      let domain: string | undefined;
      try {
        domain = new URL(citation.url).hostname;
      } catch {
        // malformed URL from the model — keep the source, skip the domain
      }
      sources.push({ url: citation.url, title: citation.title ?? citation.url, domain });
    }
  }
  return sources;
}

function assertUsableStopReason(response: Pick<Anthropic.Message, "stop_reason">): void {
  if (response.stop_reason === "max_tokens") {
    throw new Error("응답이 최대 토큰 한도에 도달해 완성되지 못했습니다 — 다시 시도해주세요");
  }
  if (response.stop_reason === "refusal") {
    throw new Error("모델이 이 요청을 처리할 수 없다고 판단했습니다");
  }
}

export interface StructuredResponseLike {
  stop_reason: Anthropic.Message["stop_reason"];
  content: Anthropic.Message["content"];
}

// Parses and validates ourselves — deliberately NOT using
// client.messages.parse()/zodOutputFormat's own .parse(), which THROWS
// on invalid JSON or a schema mismatch (verified in
// node_modules/@anthropic-ai/sdk/helpers/zod.js) instead of reporting
// it back. That throw would (a) escape as a plain AnthropicError the
// rotation classifier can't distinguish from a real API failure — misfiring
// "fail" and aborting rotation entirely for what's just a bad model
// response — and (b) happen before we ever see stop_reason, so a
// max_tokens truncation (invalid/incomplete JSON) could get misread as
// "ask the model to retry" instead of the hard failure it must be. Doing
// the parse here means stop_reason is always checked first, and a parse
// or validation failure always cleanly signals "retry" via the return
// value — never a throw, never bypassing the max_tokens/refusal guard.
//
// Null return means "ask the model to try again" (see RETRY_NOTE in
// anthropic.ts); throws only on an unrecoverable stop reason.
export function finalizeStructuredResponse(
  response: StructuredResponseLike,
  schema: z.ZodType,
): { output: unknown; sources: Source[] } | null {
  assertUsableStopReason(response);

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const result = schema.safeParse(parsed);
  if (!result.success) return null;

  return { output: result.data, sources: extractSources(response.content) };
}

export function sumUsage(a: AnthropicTokenUsage, b: Anthropic.Usage): AnthropicTokenUsage {
  return { inputTokens: (a.inputTokens ?? 0) + b.input_tokens, outputTokens: (a.outputTokens ?? 0) + b.output_tokens };
}

// --- Phase 3b: web search ---

/** A search that ran but failed comes back as an in-band error block (HTTP 200), not a thrown exception — verified against platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool, 2026-09-22. */
export function findWebSearchResultError(content: readonly Anthropic.ContentBlock[]): Anthropic.WebSearchToolResultError | null {
  for (const block of content) {
    if (block.type === "web_search_tool_result" && !Array.isArray(block.content)) {
      return block.content;
    }
  }
  return null;
}

const WEB_SEARCH_DISABLED_MESSAGE = /web search/i;

/**
 * Web search can fail two ways: an in-band error block (rate limited,
 * max_uses exceeded, ...) or — when an org has disabled it entirely — a
 * top-level 400 before any content comes back at all. Both must fail the
 * run clearly; grounding.webSearch tools never proceed without sources.
 */
export function describeSearchUnavailable(reason: unknown): Error {
  if (reason && typeof reason === "object" && "error_code" in reason) {
    return new Error(`웹 검색에 실패했습니다 (${String((reason as { error_code: unknown }).error_code)}) — 잠시 후 다시 시도해주세요.`);
  }
  if (reason instanceof Anthropic.APIError && reason.status === 400 && WEB_SEARCH_DISABLED_MESSAGE.test(reason.message)) {
    return new Error("이 Anthropic 계정에서는 웹 검색이 꺼져 있습니다 — Claude 콘솔의 웹 검색 설정을 확인해주세요.");
  }
  const detail = reason instanceof Error ? reason.message : String(reason);
  return new Error(`웹 검색을 사용할 수 없습니다 — 잠시 후 다시 시도해주세요. (${detail})`);
}
