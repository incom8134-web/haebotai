import assert from "node:assert";
import { test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  anthropicRetryDelayMs,
  classifyAnthropicError,
  describeFinalAnthropicError,
  describeSearchUnavailable,
  extractSources,
  finalizeStructuredResponse,
  findWebSearchResultError,
  sumUsage,
  toAnthropicImageBlock,
  type AnthropicTokenUsage,
} from "./anthropic-response.ts";

// --- classifyAnthropicError: fixtures are real Anthropic.APIError
// instances (not raw JSON), matching what the SDK actually throws.
// Status codes and categories verified against platform.claude.com/docs
// (shared/error-codes.md in the claude-api skill), 2026-09-22.

function apiError(status: number, message = "test", headers = new Headers()) {
  // APIError.makeMessage() prefers error.message over the bare message
  // arg when `error` is a truthy object — pass it inside `error` too, so
  // `err.message` actually contains the text (matches how the SDK
  // builds these from a real `{error: {message: "..."}}` response body).
  return new Anthropic.APIError(status, { message }, message, headers);
}

test("classifyAnthropicError: 429 rate_limit_error and 529 overloaded_error are retry-same", () => {
  assert.equal(classifyAnthropicError(apiError(429)), "retry-same");
  assert.equal(classifyAnthropicError(apiError(529)), "retry-same");
});

test("classifyAnthropicError: 402 billing_error is next-key", () => {
  assert.equal(classifyAnthropicError(apiError(402)), "next-key");
});

test("classifyAnthropicError: 400 exhausted-credit-balance message is next-key, not fail", () => {
  // Real Anthropic behavior: an exhausted balance sometimes comes back
  // as a 400 invalid_request_error, not the documented 402 billing_error.
  const msg = "Your credit balance is too low to access the Claude API. Please go to Plans & Billing to upgrade or purchase credits.";
  assert.equal(classifyAnthropicError(apiError(400, msg)), "next-key");
});

test("classifyAnthropicError: an ordinary 400 (not about credit balance) is fail", () => {
  assert.equal(classifyAnthropicError(apiError(400, "messages: roles must alternate")), "fail");
});

test("classifyAnthropicError: 401 authentication_error and 403 permission_error are next-key-mark-broken", () => {
  assert.equal(classifyAnthropicError(apiError(401)), "next-key-mark-broken");
  assert.equal(classifyAnthropicError(apiError(403)), "next-key-mark-broken");
});

test("classifyAnthropicError: 404/500 and non-API errors are fail (not rotatable)", () => {
  assert.equal(classifyAnthropicError(apiError(404)), "fail");
  assert.equal(classifyAnthropicError(apiError(500)), "fail");
  assert.equal(classifyAnthropicError(new Error("network blip")), "fail");
  assert.equal(classifyAnthropicError("not even an error"), "fail");
});

// --- anthropicRetryDelayMs: retry-after header if present, else ~1.5s, capped at 5s ---

test("anthropicRetryDelayMs: uses the retry-after header (seconds) when present", () => {
  assert.equal(anthropicRetryDelayMs(apiError(429, "test", new Headers({ "retry-after": "3" }))), 3000);
});

test("anthropicRetryDelayMs: defaults to 1500ms with no header", () => {
  assert.equal(anthropicRetryDelayMs(apiError(429)), 1500);
});

test("anthropicRetryDelayMs: caps at 5000ms even if the header asks for longer", () => {
  assert.equal(anthropicRetryDelayMs(apiError(429, "test", new Headers({ "retry-after": "30" }))), 5000);
});

test("anthropicRetryDelayMs: non-API errors fall back to the default", () => {
  assert.equal(anthropicRetryDelayMs(new Error("boom")), 1500);
});

// --- describeFinalAnthropicError: only 401/403 get a rewritten message ---

test("describeFinalAnthropicError: 403 names model access/permissions, not just 'invalid key'", () => {
  const described = describeFinalAnthropicError(apiError(403));
  assert.match(described.message, /권한/);
  assert.match(described.message, /확인/);
});

test("describeFinalAnthropicError: 401 says the key itself is bad", () => {
  const described = describeFinalAnthropicError(apiError(401));
  assert.match(described.message, /유효하지 않습니다/);
});

test("describeFinalAnthropicError: anything else passes through unchanged", () => {
  const original = apiError(402, "insufficient funds");
  assert.equal(describeFinalAnthropicError(original), original);
});

// --- finalizeStructuredResponse ---

const schema = z.object({ angles: z.array(z.string()) });
const textBlock = (text: string) => [{ type: "text" as const, text, citations: null }] as unknown as Anthropic.Message["content"];

test("finalizeStructuredResponse: max_tokens is a failed run, checked before any parse attempt", () => {
  // Truncated/invalid JSON alongside max_tokens must still throw the
  // max_tokens error, not get misread as "ask the model to retry".
  assert.throws(
    () => finalizeStructuredResponse({ stop_reason: "max_tokens", content: textBlock('{"angles": ["a"') }, schema),
    /최대 토큰/,
  );
});

test("finalizeStructuredResponse: refusal fails clearly", () => {
  assert.throws(() => finalizeStructuredResponse({ stop_reason: "refusal", content: [] }, schema), /처리할 수 없다고 판단/);
});

test("finalizeStructuredResponse: no text block signals retry, not a throw", () => {
  const result = finalizeStructuredResponse({ stop_reason: "end_turn", content: [] }, schema);
  assert.equal(result, null);
});

// Path 1: the model's text isn't valid JSON at all (what
// client.messages.parse()/zodOutputFormat's own .parse() would THROW on
// — verified in node_modules/@anthropic-ai/sdk/helpers/zod.js — must
// instead come back as a retry signal here, since we parse ourselves).
test("finalizeStructuredResponse: invalid JSON text signals retry, not a throw", () => {
  const result = finalizeStructuredResponse({ stop_reason: "end_turn", content: textBlock("not json at all") }, schema);
  assert.equal(result, null);
});

// Path 2: valid JSON that doesn't match the tool's schema — also a
// retry signal, not a throw (same reasoning as path 1).
test("finalizeStructuredResponse: valid JSON failing schema validation signals retry, not a throw", () => {
  const result = finalizeStructuredResponse({ stop_reason: "end_turn", content: textBlock('{"wrong_field": 1}') }, schema);
  assert.equal(result, null);
});

test("finalizeStructuredResponse: valid, schema-matching output passes through with sources extracted", () => {
  const result = finalizeStructuredResponse({ stop_reason: "end_turn", content: textBlock('{"angles": ["a", "b"]}') }, schema);
  assert.deepEqual(result, { output: { angles: ["a", "b"] }, sources: [] });
});

// --- extractSources: citation shape verified against
// platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool,
// 2026-09-22 (the CitationsWebSearchResultLocation fields).

test("extractSources: maps web_search_result_location citations to Source, deduped by url", () => {
  const content = [
    {
      type: "text",
      text: "Claude Shannon was born in 1916",
      citations: [
        {
          type: "web_search_result_location",
          url: "https://en.wikipedia.org/wiki/Claude_Shannon",
          title: "Claude Shannon - Wikipedia",
          encrypted_index: "abc",
          cited_text: "Claude Elwood Shannon...",
        },
        // duplicate url from a second cited sentence — must not double up
        {
          type: "web_search_result_location",
          url: "https://en.wikipedia.org/wiki/Claude_Shannon",
          title: "Claude Shannon - Wikipedia",
          encrypted_index: "def",
          cited_text: "...died in 2001",
        },
      ],
    },
  ] as unknown as Anthropic.ContentBlock[];

  const sources = extractSources(content);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].url, "https://en.wikipedia.org/wiki/Claude_Shannon");
  assert.equal(sources[0].title, "Claude Shannon - Wikipedia");
  assert.equal(sources[0].domain, "en.wikipedia.org");
});

test("extractSources: ignores non-web-search citation types and text blocks without citations", () => {
  const content = [
    { type: "text", text: "plain, no citations", citations: null },
    { type: "text", text: "document-cited", citations: [{ type: "char_location", document_index: 0 }] },
  ] as unknown as Anthropic.ContentBlock[];
  assert.deepEqual(extractSources(content), []);
});

// --- findWebSearchResultError / describeSearchUnavailable (Phase 3b):
// a search that runs but fails comes back as an in-band error block
// (HTTP 200), never a thrown exception — verified against
// platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool,
// 2026-09-22.

test("findWebSearchResultError: finds the error object when web_search_tool_result.content isn't an array", () => {
  const content = [
    { type: "text", text: "searching..." },
    { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } },
  ] as unknown as Anthropic.ContentBlock[];
  const err = findWebSearchResultError(content);
  assert.equal(err?.error_code, "max_uses_exceeded");
});

test("findWebSearchResultError: a successful search (array content) is not an error", () => {
  const content = [
    { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: [{ type: "web_search_result", url: "https://a.com", title: "A" }] },
  ] as unknown as Anthropic.ContentBlock[];
  assert.equal(findWebSearchResultError(content), null);
});

test("findWebSearchResultError: an empty result list (search ran, found nothing) is not an error either", () => {
  const content = [
    { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: [] },
  ] as unknown as Anthropic.ContentBlock[];
  assert.equal(findWebSearchResultError(content), null);
});

test("describeSearchUnavailable: in-band error block names the error code", () => {
  const message = describeSearchUnavailable({ error_code: "max_uses_exceeded" }).message;
  assert.match(message, /max_uses_exceeded/);
});

test("describeSearchUnavailable: org-disabled web search (400 mentioning 'web search') gets a specific message", () => {
  const err = apiError(400, "Web search is not enabled for this organization");
  const message = describeSearchUnavailable(err).message;
  assert.match(message, /꺼져 있습니다/);
});

test("describeSearchUnavailable: anything else still fails clearly, generic fallback", () => {
  const message = describeSearchUnavailable(new Error("fetch failed")).message;
  assert.match(message, /사용할 수 없습니다/);
  assert.match(message, /fetch failed/);
});

// --- toAnthropicImageBlock ---

test("toAnthropicImageBlock: supported types map to a base64 image block", () => {
  const block = toAnthropicImageBlock({ mimeType: "image/png", data: "AAAA" });
  assert.deepEqual(block, { type: "image", source: { type: "base64", media_type: "image/png", data: "AAAA" } });
});

test("toAnthropicImageBlock: rejects a type Claude's API doesn't accept", () => {
  assert.throws(() => toAnthropicImageBlock({ mimeType: "image/heic", data: "AAAA" }), /지원하지 않습니다/);
});

// --- sumUsage: token usage is reported and accumulates across a retry ---

test("sumUsage: accumulates input/output tokens across calls", () => {
  let usage: AnthropicTokenUsage = { inputTokens: 0, outputTokens: 0 };
  usage = sumUsage(usage, { input_tokens: 100, output_tokens: 50 } as Anthropic.Usage);
  usage = sumUsage(usage, { input_tokens: 20, output_tokens: 200 } as Anthropic.Usage);
  assert.deepEqual(usage, { inputTokens: 120, outputTokens: 250 });
});
