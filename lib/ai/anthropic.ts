import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import { markApiKeySlotBroken, type ApiKeyPriority } from "@/lib/api-keys";
import { runWithRotation, type KeyRotationState } from "@/lib/tools/quota-rotation";
import { buildContext, buildSystemInstruction, collectInputImages } from "@/lib/tools/generate-prompt";
import { ANTHROPIC_MODEL, anthropicMaxTokens } from "./models";
import {
  anthropicRetryDelayMs,
  classifyAnthropicError,
  describeFinalAnthropicError,
  describeSearchUnavailable,
  extractSources,
  findWebSearchResultError,
  finalizeStructuredResponse,
  sumUsage,
  toAnthropicImageBlock,
} from "./anthropic-response";
import type { AiAdapter, AiStreamEvent, GenerationResult, TokenUsage } from "./types";

// Claude is own-key only (product decision) — there is no platform
// Anthropic key, so unlike Gemini's getClient() there is no fallback
// client here: no active rotation state is a bug upstream, not a case
// to degrade gracefully from.
//
// Structured output (Phase 3a) and web search (Phase 3b, searchGrounding
// below) are always separate calls — see searchGrounding's own comment.
// Response-parsing logic (error classification, retry delay, citation
// extraction, image block mapping) lives in ./anthropic-response.ts,
// split out so it's unit-testable without Supabase/Next server APIs —
// see that file's tests.

const userKeyStore = new AsyncLocalStorage<KeyRotationState>();

export async function runWithApiKey<T>(userId: string, apiKeys: string[], fn: () => Promise<T>): Promise<T> {
  if (apiKeys.length === 0) return fn(); // defense in depth — the run route already requires a usable key for anthropic
  const state: KeyRotationState = { keys: apiKeys, index: 0 };
  try {
    return await userKeyStore.run(state, () =>
      runWithRotation(state, classifyAnthropicError, fn, {
        getRetryDelayMs: anthropicRetryDelayMs,
        onBrokenKey: (index) => {
          markApiKeySlotBroken(userId, "anthropic", (index + 1) as ApiKeyPriority).catch(() => {});
        },
      }),
    );
  } catch (err) {
    throw describeFinalAnthropicError(err);
  }
}

function getClient(): Anthropic {
  const state = userKeyStore.getStore();
  if (!state) throw new Error("Anthropic API 키가 없습니다 — Claude는 직접 등록한 키로만 실행됩니다");
  return new Anthropic({ apiKey: state.keys[state.index] });
}

async function generateOnce(
  manifest: ToolManifest,
  system: string,
  content: Anthropic.ContentBlockParam[],
  abortSignal: AbortSignal | undefined,
): Promise<Anthropic.Message> {
  const client = getClient();
  // create(), not parse() — see the comment on finalizeStructuredResponse
  // in anthropic-response.ts for why we parse the JSON ourselves.
  // output_config.format still asks the model for schema-shaped JSON.
  return client.messages.create(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: anthropicMaxTokens(manifest.id),
      system,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(manifest.outputSchema) },
    },
    { signal: abortSignal },
  );
}

// Own call, own tool, no output_config.format — mirrors lib/ai/gemini.ts's
// searchGrounding. Web search and structured output are never requested
// in the same call: it keeps this adapter clear of any interaction
// between Anthropic's citations feature and structured outputs, and
// gives the main call a plain findings-and-sources block to cite from,
// exactly like every other provider.
async function searchGrounding(
  manifest: ToolManifest,
  contextText: string,
  abortSignal: AbortSignal | undefined,
): Promise<{ findings: string; sources: Source[]; usage: Anthropic.Usage }> {
  const client = getClient();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: "당신은 사실 조사 보조원입니다. 검색 결과에 있는 사실만 한국어로 요약하세요.",
        messages: [
          {
            role: "user",
            content: `"${manifest.name_ko}" 요청에 필요한 최신 사실 정보를 웹 검색으로 조사하세요. 찾은 핵심 사실과 수치를 근거와 함께 한국어로 요약하세요.\n\n${contextText}`,
          },
        ],
        tools: [{ type: "web_search_20260318", name: "web_search" }],
      },
      { signal: abortSignal },
    );
  } catch (err) {
    // Org has web search disabled entirely: a top-level 400 before any
    // content comes back — never proceed without sources.
    throw describeSearchUnavailable(err);
  }

  const searchError = findWebSearchResultError(response.content);
  if (searchError) throw describeSearchUnavailable(searchError);

  const findings = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { findings, sources: extractSources(response.content), usage: response.usage };
}

const RETRY_NOTE = "이전 응답이 요구된 JSON 스키마 형식과 맞지 않았습니다. 스키마에 정확히 맞는 JSON만 다시 출력하세요.";

async function* generateStructured(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
): AsyncGenerator<AiStreamEvent, void, void> {
  const contextText = buildContext(manifest, input, profile);
  const inputImages = collectInputImages(manifest, input);
  const system = buildSystemInstruction(manifest);

  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let sources: Source[] = [];
  let groundingBlock = "";
  if (manifest.grounding.webSearch) {
    const grounded = await searchGrounding(manifest, contextText, abortSignal);
    sources = grounded.sources;
    usage = sumUsage(usage, grounded.usage);
    groundingBlock = `\n\n[검색 근거]\n${grounded.findings || "(검색 결과 없음)"}\n\n[사용 가능한 출처]\n${
      sources.map((s) => `- ${s.title} — ${s.url}`).join("\n") || "(없음)"
    }`;
  }

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: `다음 정보를 바탕으로 결과를 생성하세요.\n\n${contextText}${groundingBlock}` },
    ...inputImages.map(toAnthropicImageBlock),
  ];

  let response = await generateOnce(manifest, system, content, abortSignal);
  usage = sumUsage(usage, response.usage);
  let result = finalizeStructuredResponse(response, manifest.outputSchema);

  if (!result) {
    content.push({ type: "text", text: RETRY_NOTE });
    response = await generateOnce(manifest, system, content, abortSignal);
    usage = sumUsage(usage, response.usage);
    result = finalizeStructuredResponse(response, manifest.outputSchema);
    if (!result) throw new Error("모델 응답이 예상한 형식과 다릅니다");
  }

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  if (text) yield { type: "chunk", text };
  yield { type: "done", result: { output: result.output, sources, usage } };
}

async function generateImages(): Promise<GenerationResult> {
  // Never offered: capabilities.ts only lists anthropic where
  // PROVIDER_CAPS.anthropic.images is satisfied, which it never is for
  // an image tool — no fake integrations (Claude has no image API).
  throw new Error("Claude는 이미지 생성을 지원하지 않습니다");
}

export const anthropicAdapter: AiAdapter = {
  id: "anthropic",
  supportsWebSearch: true,
  supportsImages: false,
  generateStructured,
  generateImages,
};
