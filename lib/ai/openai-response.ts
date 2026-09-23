import OpenAI from "openai";
import type { z } from "zod";
import type { RotationAction } from "../tools/quota-rotation.ts";
import type { Source } from "../tools/registry/shared.ts";

// Pure response-handling logic for the OpenAI adapter (lib/ai/openai.ts),
// split out so it's testable without pulling in Supabase or Next's
// server-only APIs — same split as lib/ai/anthropic-response.ts.

export interface OpenAITokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

// Verified against the installed `openai` SDK's error types
// (node_modules/openai/core/error.d.ts) and OpenAI's documented 429
// error bodies, 2026-09-23: a 429 is either a transient rate limit
// (wait, retry the SAME key) or an exhausted quota/billing balance
// (`error.code`/`error.type` === "insufficient_quota" — move on
// immediately, this key's account is out of money). 401/403 mean the
// key itself is bad — move on and flag the slot. Everything else (400,
// 404, network) is not rotatable.
const QUOTA_EXHAUSTED_CODE = "insufficient_quota";

export function classifyOpenAIError(err: unknown): RotationAction {
  if (!(err instanceof OpenAI.APIError)) return "fail";
  switch (err.status) {
    case 429:
      return err.code === QUOTA_EXHAUSTED_CODE || err.type === QUOTA_EXHAUSTED_CODE ? "next-key" : "retry-same";
    case 401:
    case 403:
      return "next-key-mark-broken";
    default:
      return "fail";
  }
}

const DEFAULT_RETRY_DELAY_MS = 1500;
const MAX_RETRY_DELAY_MS = 5000;

/** Delay before a same-key retry on a plain rate limit — the provider's own retry-after header if present, else ~1.5s, capped at 5s. */
export function openaiRetryDelayMs(err: unknown): number {
  const header = err instanceof OpenAI.APIError ? err.headers?.get?.("retry-after") : null;
  const seconds = header ? Number(header) : NaN;
  const ms = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_RETRY_DELAY_MS;
  return Math.min(ms, MAX_RETRY_DELAY_MS);
}

/** Once rotation gives up, turn an auth failure into a message that names the actual fix instead of a bare "invalid key". */
export function describeFinalOpenAIError(err: unknown): Error {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 403) {
      return new Error("이 ChatGPT API 키에 모델 접근 권한이 없습니다 — OpenAI 콘솔에서 이 키의 모델 접근 권한을 확인해주세요.");
    }
    if (err.status === 401) {
      return new Error("ChatGPT API 키가 유효하지 않습니다 — 등록한 키가 맞는지 확인해주세요.");
    }
  }
  return err instanceof Error ? err : new Error(String(err));
}

export interface OpenAIImage {
  mimeType: string;
  data: string;
}

/** Responses API vision input — a data URL is the documented way to send an inline (non-uploaded) image. */
export function toOpenAIInputImage(img: OpenAIImage): OpenAI.Responses.ResponseInputImage {
  return { type: "input_image", detail: "auto", image_url: `data:${img.mimeType};base64,${img.data}` };
}

/** Web search citations — the one annotation type the Responses API attaches automatically for web_search results. */
export function extractSources(output: readonly OpenAI.Responses.ResponseOutputItem[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const item of output) {
    if (item.type !== "message") continue;
    for (const content of item.content) {
      if (content.type !== "output_text" || !content.annotations) continue;
      for (const annotation of content.annotations) {
        if (annotation.type !== "url_citation") continue;
        if (seen.has(annotation.url)) continue;
        seen.add(annotation.url);
        let domain: string | undefined;
        try {
          domain = new URL(annotation.url).hostname;
        } catch {
          // malformed URL from the model — keep the source, skip the domain
        }
        sources.push({ url: annotation.url, title: annotation.title || annotation.url, domain });
      }
    }
  }
  return sources;
}

function assertUsableStatus(response: {
  status?: string;
  incomplete_details?: { reason?: string | null } | null;
  error?: { message?: string | null } | null;
}): void {
  if (response.status === "failed") {
    throw new Error(response.error?.message ? `생성 실패: ${response.error.message}` : "생성에 실패했습니다");
  }
  if (response.status === "incomplete") {
    if (response.incomplete_details?.reason === "content_filter") {
      throw new Error("모델이 이 요청을 처리할 수 없다고 판단했습니다");
    }
    throw new Error("응답이 최대 토큰 한도에 도달해 완성되지 못했습니다 — 다시 시도해주세요");
  }
}

export interface StructuredResponseLike {
  status?: string;
  incomplete_details?: { reason?: string | null } | null;
  error?: { message?: string | null } | null;
  output_parsed?: unknown;
  output: readonly OpenAI.Responses.ResponseOutputItem[];
}

// client.responses.parse()'s own parser (node_modules/openai/lib/
// ResponsesParser.js) already checks status === "completed" before
// attempting to parse and never throws on a schema mismatch — unlike
// Anthropic's zodOutputFormat().parse(), which throws (see the comment
// on finalizeStructuredResponse in anthropic-response.ts). We still
// check the status ourselves first (max_output_tokens/content_filter
// must be a hard failure, not a silent null) and re-validate
// output_parsed against our own schema for defense in depth.
//
// Null return means "ask the model to try again"; throws only on an
// unrecoverable status.
export function finalizeStructuredResponse(
  response: StructuredResponseLike,
  schema: z.ZodType,
): { output: unknown; sources: Source[] } | null {
  assertUsableStatus(response);

  if (response.output_parsed === undefined || response.output_parsed === null) return null;
  const result = schema.safeParse(response.output_parsed);
  if (!result.success) return null;

  return { output: result.data, sources: extractSources(response.output) };
}

export function sumUsage(a: OpenAITokenUsage, b: { input_tokens?: number; output_tokens?: number } | undefined): OpenAITokenUsage {
  return { inputTokens: (a.inputTokens ?? 0) + (b?.input_tokens ?? 0), outputTokens: (a.outputTokens ?? 0) + (b?.output_tokens ?? 0) };
}

/** A search call that ran but failed comes back as an in-band status on the output item, not a thrown exception. */
export function findFailedWebSearchCall(output: readonly OpenAI.Responses.ResponseOutputItem[]): OpenAI.Responses.ResponseFunctionWebSearch | null {
  for (const item of output) {
    if (item.type === "web_search_call" && item.status === "failed") return item;
  }
  return null;
}

/**
 * Web search can fail two ways: an in-band failed status on the
 * web_search_call output item, or — when an org has disabled it
 * entirely — a top-level APIError before any content comes back at
 * all. Both must fail the run clearly; grounding.webSearch tools never
 * proceed without sources.
 */
export function describeSearchUnavailable(reason: unknown): Error {
  if (reason instanceof OpenAI.APIError) {
    return new Error(`웹 검색을 사용할 수 없습니다 — 잠시 후 다시 시도해주세요. (${reason.message})`);
  }
  return new Error("웹 검색에 실패했습니다 — 잠시 후 다시 시도해주세요.");
}
