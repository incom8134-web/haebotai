import assert from "node:assert";
import { test } from "node:test";
import OpenAI from "openai";
import { z } from "zod";
import {
  classifyOpenAIError,
  describeFinalOpenAIError,
  describeSearchUnavailable,
  extractSources,
  finalizeStructuredResponse,
  findFailedWebSearchCall,
  openaiRetryDelayMs,
  sumUsage,
  toOpenAIInputImage,
  type OpenAITokenUsage,
} from "./openai-response.ts";

// --- classifyOpenAIError: fixtures are real OpenAI.APIError instances
// (not raw JSON), matching what the SDK actually throws. Status codes
// and the insufficient_quota code verified against the installed SDK's
// error types (node_modules/openai/core/error.d.ts) and OpenAI's
// documented 429 error bodies, 2026-09-23.

function apiError(status: number, opts: { message?: string; code?: string; type?: string } = {}, headers = new Headers()) {
  const message = opts.message ?? "test";
  // APIError.makeMessage() prefers error.message over the bare message
  // arg when `error` is a truthy object — pass it inside `error` too, so
  // `err.message` actually contains the text (matches how the SDK
  // builds these from a real `{error: {...}}` response body).
  return new OpenAI.APIError(status, { message, code: opts.code, type: opts.type }, message, headers);
}

test("classifyOpenAIError: a plain 429 (rate limit, no quota code) is retry-same", () => {
  assert.equal(classifyOpenAIError(apiError(429)), "retry-same");
  assert.equal(classifyOpenAIError(apiError(429, { code: "rate_limit_exceeded" })), "retry-same");
});

test("classifyOpenAIError: 429 with insufficient_quota code/type is next-key, not retry-same", () => {
  assert.equal(classifyOpenAIError(apiError(429, { code: "insufficient_quota" })), "next-key");
  assert.equal(classifyOpenAIError(apiError(429, { type: "insufficient_quota" })), "next-key");
});

test("classifyOpenAIError: 401 and 403 are next-key-mark-broken", () => {
  assert.equal(classifyOpenAIError(apiError(401)), "next-key-mark-broken");
  assert.equal(classifyOpenAIError(apiError(403)), "next-key-mark-broken");
});

test("classifyOpenAIError: 400/404/500 and non-API errors are fail (not rotatable)", () => {
  assert.equal(classifyOpenAIError(apiError(400)), "fail");
  assert.equal(classifyOpenAIError(apiError(404)), "fail");
  assert.equal(classifyOpenAIError(apiError(500)), "fail");
  assert.equal(classifyOpenAIError(new Error("network blip")), "fail");
  assert.equal(classifyOpenAIError("not even an error"), "fail");
});

// --- openaiRetryDelayMs: retry-after header if present, else ~1.5s, capped at 5s ---

test("openaiRetryDelayMs: uses the retry-after header (seconds) when present", () => {
  assert.equal(openaiRetryDelayMs(apiError(429, {}, new Headers({ "retry-after": "3" }))), 3000);
});

test("openaiRetryDelayMs: defaults to 1500ms with no header", () => {
  assert.equal(openaiRetryDelayMs(apiError(429)), 1500);
});

test("openaiRetryDelayMs: caps at 5000ms even if the header asks for longer", () => {
  assert.equal(openaiRetryDelayMs(apiError(429, {}, new Headers({ "retry-after": "30" }))), 5000);
});

test("openaiRetryDelayMs: non-API errors fall back to the default", () => {
  assert.equal(openaiRetryDelayMs(new Error("boom")), 1500);
});

// --- describeFinalOpenAIError: only 401/403 get a rewritten message ---

test("describeFinalOpenAIError: 403 names model access/permissions, not just 'invalid key'", () => {
  const described = describeFinalOpenAIError(apiError(403));
  assert.match(described.message, /권한/);
  assert.match(described.message, /확인/);
});

test("describeFinalOpenAIError: 401 says the key itself is bad", () => {
  const described = describeFinalOpenAIError(apiError(401));
  assert.match(described.message, /유효하지 않습니다/);
});

test("describeFinalOpenAIError: anything else passes through unchanged", () => {
  const original = apiError(429, { code: "insufficient_quota" });
  assert.equal(describeFinalOpenAIError(original), original);
});

// --- finalizeStructuredResponse ---

const schema = z.object({ angles: z.array(z.string()) });

test("finalizeStructuredResponse: a failed response throws with the provider's own error message", () => {
  assert.throws(
    () => finalizeStructuredResponse({ status: "failed", error: { message: "server error" }, output: [] }, schema),
    /생성 실패.*server error/,
  );
});

test("finalizeStructuredResponse: incomplete due to max_output_tokens throws clearly", () => {
  assert.throws(
    () => finalizeStructuredResponse({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }, schema),
    /최대 토큰/,
  );
});

test("finalizeStructuredResponse: incomplete due to content_filter throws clearly", () => {
  assert.throws(
    () => finalizeStructuredResponse({ status: "incomplete", incomplete_details: { reason: "content_filter" }, output: [] }, schema),
    /처리할 수 없다고 판단/,
  );
});

test("finalizeStructuredResponse: no output_parsed signals retry, not a throw", () => {
  const result = finalizeStructuredResponse({ status: "completed", output_parsed: null, output: [] }, schema);
  assert.equal(result, null);
});

// The SDK's own .parse() never throws on a schema mismatch (unlike
// Anthropic's), but a defense-in-depth re-validation still matters —
// output_parsed could in principle satisfy the JSON Schema OpenAI saw
// (a looser projection) without satisfying every zod refinement.
test("finalizeStructuredResponse: output_parsed failing our own schema validation signals retry, not a throw", () => {
  const result = finalizeStructuredResponse({ status: "completed", output_parsed: { wrong_field: 1 }, output: [] }, schema);
  assert.equal(result, null);
});

test("finalizeStructuredResponse: valid, schema-matching output passes through with sources extracted", () => {
  const result = finalizeStructuredResponse({ status: "completed", output_parsed: { angles: ["a", "b"] }, output: [] }, schema);
  assert.deepEqual(result, { output: { angles: ["a", "b"] }, sources: [] });
});

// --- extractSources: url_citation annotation shape verified against
// node_modules/openai/resources/responses/responses.d.ts, 2026-09-23.

test("extractSources: maps url_citation annotations to Source, deduped by url", () => {
  const output = [
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "Claude Shannon was born in 1916",
          annotations: [
            { type: "url_citation", url: "https://en.wikipedia.org/wiki/Claude_Shannon", title: "Claude Shannon - Wikipedia", start_index: 0, end_index: 1 },
            // duplicate url from a second cited sentence — must not double up
            { type: "url_citation", url: "https://en.wikipedia.org/wiki/Claude_Shannon", title: "Claude Shannon - Wikipedia", start_index: 2, end_index: 3 },
          ],
        },
      ],
    },
  ] as unknown as OpenAI.Responses.ResponseOutputItem[];

  const sources = extractSources(output);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].url, "https://en.wikipedia.org/wiki/Claude_Shannon");
  assert.equal(sources[0].title, "Claude Shannon - Wikipedia");
  assert.equal(sources[0].domain, "en.wikipedia.org");
});

test("extractSources: ignores non-message output items and text without annotations", () => {
  const output = [
    { type: "web_search_call", id: "1", status: "completed", action: { type: "search", query: "x" } },
    { type: "message", content: [{ type: "output_text", text: "plain, no citations", annotations: [] }] },
  ] as unknown as OpenAI.Responses.ResponseOutputItem[];
  assert.deepEqual(extractSources(output), []);
});

// --- findFailedWebSearchCall / describeSearchUnavailable: a search that
// runs but fails comes back as an in-band status on the output item,
// never a thrown exception.

test("findFailedWebSearchCall: finds a web_search_call item with status failed", () => {
  const output = [
    { type: "web_search_call", id: "1", status: "failed", action: { type: "search", query: "x" } },
  ] as unknown as OpenAI.Responses.ResponseOutputItem[];
  const found = findFailedWebSearchCall(output);
  assert.equal(found?.status, "failed");
});

test("findFailedWebSearchCall: a completed search is not an error", () => {
  const output = [
    { type: "web_search_call", id: "1", status: "completed", action: { type: "search", query: "x" } },
  ] as unknown as OpenAI.Responses.ResponseOutputItem[];
  assert.equal(findFailedWebSearchCall(output), null);
});

test("describeSearchUnavailable: an API error names the underlying message", () => {
  const err = apiError(400, { message: "web search is not enabled" });
  const message = describeSearchUnavailable(err).message;
  assert.match(message, /web search is not enabled/);
});

test("describeSearchUnavailable: anything else still fails clearly, generic fallback", () => {
  const message = describeSearchUnavailable({ status: "failed" }).message;
  assert.match(message, /웹 검색에 실패했습니다/);
});

// --- toOpenAIInputImage ---

test("toOpenAIInputImage: builds a data-URL input_image content item", () => {
  const block = toOpenAIInputImage({ mimeType: "image/png", data: "AAAA" });
  assert.deepEqual(block, { type: "input_image", detail: "auto", image_url: "data:image/png;base64,AAAA" });
});

// --- sumUsage: token usage is reported and accumulates across a retry ---

test("sumUsage: accumulates input/output tokens across calls", () => {
  let usage: OpenAITokenUsage = { inputTokens: 0, outputTokens: 0 };
  usage = sumUsage(usage, { input_tokens: 100, output_tokens: 50 });
  usage = sumUsage(usage, { input_tokens: 20, output_tokens: 200 });
  assert.deepEqual(usage, { inputTokens: 120, outputTokens: 250 });
});

test("sumUsage: missing usage (e.g. an image call with no usage field) adds zero", () => {
  let usage: OpenAITokenUsage = { inputTokens: 10, outputTokens: 5 };
  usage = sumUsage(usage, undefined);
  assert.deepEqual(usage, { inputTokens: 10, outputTokens: 5 });
});
