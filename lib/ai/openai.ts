import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import { markApiKeySlotBroken, type ApiKeyPriority } from "@/lib/api-keys";
import { runWithRotation, type KeyRotationState } from "@/lib/tools/quota-rotation";
import { buildContext, buildSystemInstruction, buildImageSystemInstruction, collectInputImages } from "@/lib/tools/generate-prompt";
import { OPENAI_IMAGE_MODEL, OPENAI_MODEL, maxTokensForTool } from "./models";
import {
  describeFinalOpenAIError,
  describeSearchUnavailable,
  extractSources,
  findFailedWebSearchCall,
  finalizeStructuredResponse,
  openaiRetryDelayMs,
  classifyOpenAIError,
  sumUsage,
  toOpenAIInputImage,
  type OpenAIImage,
} from "./openai-response";
import type { AiAdapter, AiStreamEvent, GenerationResult, ImageStorageContext, TokenUsage } from "./types";

// ChatGPT is own-key only (product decision), same as Claude — no
// platform OpenAI key, so no fallback client here: no active rotation
// state is a bug upstream, not a case to degrade gracefully from.
//
// Structured output and web search are always separate calls — see
// searchGrounding's own comment. Response-parsing logic (error
// classification, retry delay, citation extraction) lives in
// ./openai-response.ts, unit-tested without Supabase/Next server APIs.

const userKeyStore = new AsyncLocalStorage<KeyRotationState>();

export async function runWithApiKey<T>(userId: string, apiKeys: string[], fn: () => Promise<T>): Promise<T> {
  if (apiKeys.length === 0) return fn(); // defense in depth — the run route already requires a usable key for openai
  const state: KeyRotationState = { keys: apiKeys, index: 0 };
  try {
    return await userKeyStore.run(state, () =>
      runWithRotation(state, classifyOpenAIError, fn, {
        getRetryDelayMs: openaiRetryDelayMs,
        onBrokenKey: (index) => {
          markApiKeySlotBroken(userId, "openai", (index + 1) as ApiKeyPriority).catch(() => {});
        },
      }),
    );
  } catch (err) {
    throw describeFinalOpenAIError(err);
  }
}

function getClient(): OpenAI {
  const state = userKeyStore.getStore();
  if (!state) throw new Error("OpenAI API 키가 없습니다 — ChatGPT는 직접 등록한 키로만 실행됩니다");
  return new OpenAI({ apiKey: state.keys[state.index] });
}

async function generateOnce(
  manifest: ToolManifest,
  instructions: string,
  content: OpenAI.Responses.ResponseInputContent[],
  abortSignal: AbortSignal | undefined,
) {
  const client = getClient();
  // .parse() is safe here (unlike Anthropic's, which throws — see the
  // comment on finalizeStructuredResponse in anthropic-response.ts):
  // node_modules/openai/lib/ResponsesParser.js only attempts to parse
  // when status === "completed" and otherwise leaves output_parsed
  // null, never throwing on a truncated or malformed response.
  return client.responses.parse(
    {
      model: OPENAI_MODEL,
      instructions,
      input: [{ role: "user", content }],
      max_output_tokens: maxTokensForTool(manifest.id),
      text: { format: zodTextFormat(manifest.outputSchema, manifest.id.replace(/-/g, "_")) },
    },
    { signal: abortSignal },
  );
}

// Own call, own tool, no text.format — mirrors lib/ai/anthropic.ts's
// searchGrounding. Web search and structured output are never requested
// in the same call, keeping this adapter clear of any interaction
// between the two, and giving the main call a plain findings-and-sources
// block to cite from, exactly like every other provider.
async function searchGrounding(
  manifest: ToolManifest,
  contextText: string,
  abortSignal: AbortSignal | undefined,
): Promise<{ findings: string; sources: Source[]; usage: OpenAI.Responses.ResponseUsage | undefined }> {
  const client = getClient();
  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create(
      {
        model: OPENAI_MODEL,
        instructions: "당신은 사실 조사 보조원입니다. 검색 결과에 있는 사실만 한국어로 요약하세요.",
        input: `"${manifest.name_ko}" 요청에 필요한 최신 사실 정보를 웹 검색으로 조사하세요. 찾은 핵심 사실과 수치를 근거와 함께 한국어로 요약하세요.\n\n${contextText}`,
        tools: [{ type: "web_search" }],
      },
      { signal: abortSignal },
    );
  } catch (err) {
    // Org has web search disabled entirely: a top-level error before any
    // content comes back — never proceed without sources.
    throw describeSearchUnavailable(err);
  }

  const searchError = findFailedWebSearchCall(response.output);
  if (searchError) throw describeSearchUnavailable(searchError);

  return { findings: response.output_text ?? "", sources: extractSources(response.output), usage: response.usage };
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
  const instructions = buildSystemInstruction(manifest);

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

  const content: OpenAI.Responses.ResponseInputContent[] = [
    { type: "input_text", text: `다음 정보를 바탕으로 결과를 생성하세요.\n\n${contextText}${groundingBlock}` },
    ...inputImages.map(toOpenAIInputImage),
  ];

  let response = await generateOnce(manifest, instructions, content, abortSignal);
  usage = sumUsage(usage, response.usage);
  let result = finalizeStructuredResponse(response, manifest.outputSchema);

  if (!result) {
    content.push({ type: "input_text", text: RETRY_NOTE });
    response = await generateOnce(manifest, instructions, content, abortSignal);
    usage = sumUsage(usage, response.usage);
    result = finalizeStructuredResponse(response, manifest.outputSchema);
    if (!result) throw new Error("모델 응답이 예상한 형식과 다릅니다");
  }

  if (response.output_text) yield { type: "chunk", text: response.output_text };
  yield { type: "done", result: { output: result.output, sources, usage } };
}

const REAL_PERSON_CHECK_SCHEMA = z.object({
  contains_real_identifiable_face: z.boolean(),
  reasoning: z.string(),
});

// brand-model's hard guard (registry/brand-model.ts): "refuse uploads
// that are primarily a real person's face." Mirrors
// lib/ai/gemini.ts's containsRealPersonFace — a dedicated pre-check so a
// refusal happens before spending image-generation credits, rather than
// hoping the same call that's generating the image also happens to
// decline.
async function containsRealPersonFace(
  photo: OpenAIImage,
  abortSignal: AbortSignal | undefined,
): Promise<{ isRealPerson: boolean; reasoning: string; usage: TokenUsage }> {
  const client = getClient();
  const res = await client.responses.parse(
    {
      model: OPENAI_MODEL,
      instructions: "당신은 이미지 안전 검토자입니다. 사실만 판단하고 다른 설명은 추가하지 마세요.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "이 사진에 실제로 식별 가능한 특정 인물(유명인이든 일반인이든)의 얼굴이 담겨 있습니까? 제품, 사물, 배경, 손이나 몸의 일부만 보이고 얼굴이 없다면 아니오입니다. 그림·일러스트 캐릭터도 아니오입니다.",
            },
            toOpenAIInputImage(photo),
          ],
        },
      ],
      text: { format: zodTextFormat(REAL_PERSON_CHECK_SCHEMA, "real_person_check") },
    },
    { signal: abortSignal },
  );

  const usage = sumUsage({ inputTokens: 0, outputTokens: 0 }, res.usage);
  if (res.status !== "completed" || !res.output_parsed) {
    return { isRealPerson: true, reasoning: "검토 응답 없음 — 안전을 위해 거부", usage };
  }
  return { isRealPerson: res.output_parsed.contains_real_identifiable_face, reasoning: res.output_parsed.reasoning, usage };
}

const SHOT_COUNT = 4; // matches image.ts's images.length(4); brand-model just uses the first shot

function randomSeed(): string {
  return String(Math.floor(Math.random() * 2 ** 31));
}

async function generateImages(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<GenerationResult> {
  const client = getClient();
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  const inputImages = collectInputImages(manifest, input);

  if (manifest.id === "brand-model") {
    if (inputImages.length === 0) throw new Error("제품 사진을 업로드해주세요");
    const check = await containsRealPersonFace(inputImages[0], abortSignal);
    usage = { inputTokens: (usage.inputTokens ?? 0) + (check.usage.inputTokens ?? 0), outputTokens: (usage.outputTokens ?? 0) + (check.usage.outputTokens ?? 0) };
    if (check.isRealPerson) {
      throw new Error(`실제 인물로 보이는 사진은 사용할 수 없습니다. 제품만 나온 사진으로 다시 업로드해주세요. (${check.reasoning})`);
    }
  }

  const contextText = buildContext(manifest, input, profile);
  const prompt = `${buildImageSystemInstruction(manifest)}\n\n다음 요청에 맞는 이미지를 생성하세요.\n\n${contextText}`;

  let rawImages: OpenAI.Images.Image[];
  if (inputImages.length > 0) {
    const files = await Promise.all(
      inputImages.map((img, i) => toFile(Buffer.from(img.data, "base64"), `input-${i}.${img.mimeType.split("/")[1] ?? "png"}`, { type: img.mimeType })),
    );
    const res = await client.images.edit({ model: OPENAI_IMAGE_MODEL, image: files, prompt, n: SHOT_COUNT }, { signal: abortSignal });
    rawImages = res.data ?? [];
    usage = sumUsage(usage, res.usage);
  } else {
    const res = await client.images.generate({ model: OPENAI_IMAGE_MODEL, prompt, n: SHOT_COUNT }, { signal: abortSignal });
    rawImages = res.data ?? [];
    usage = sumUsage(usage, res.usage);
  }
  if (rawImages.length === 0) throw new Error("이미지를 생성하지 못했습니다");

  const shots = await Promise.all(
    rawImages.map(async (image, i) => {
      if (!image.b64_json) throw new Error("이미지 데이터를 받지 못했습니다");
      const path = `${storage.userId}/${manifest.id}/${storage.runId}/${i}.png`;

      const { error: uploadError } = await storage.supabase.storage
        .from("exports")
        .upload(path, Buffer.from(image.b64_json, "base64"), { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error(`이미지 저장 실패: ${uploadError.message}`);

      // ponytail: 1-year signed URL baked straight into the stored run —
      // same tradeoff as lib/ai/gemini.ts. Upgrade path if that's too
      // short: store `path` instead of a URL and re-sign on read.
      const { data: signed, error: signError } = await storage.supabase.storage
        .from("exports")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signError || !signed) throw new Error(`이미지 URL 생성 실패: ${signError?.message ?? "알 수 없는 오류"}`);

      return { path, url: signed.signedUrl, seed: randomSeed() };
    }),
  );

  if (manifest.id === "brand-model") {
    return {
      output: {
        shots: shots.map((s) => ({ asset_id: s.path, url: s.url })),
        model_seed: shots[0].seed,
        disclosure: "AI 생성 이미지" as const,
      },
      sources: [],
      usage,
    };
  }

  return {
    output: {
      images: shots.map((s) => ({ asset_id: s.path, url: s.url, seed: s.seed })),
      refined_prompt: prompt,
      negative_prompt: "blurry, low quality, watermark, text artifacts",
    },
    sources: [],
    usage,
  };
}

export const openaiAdapter: AiAdapter = {
  id: "openai",
  supportsWebSearch: true,
  supportsImages: true,
  generateStructured,
  generateImages,
};
