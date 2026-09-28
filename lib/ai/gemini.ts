import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { GoogleGenAI } from "@google/genai";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import { runWithRotation, type KeyRotationState } from "@/lib/tools/quota-rotation";
import {
  type ImagePart,
  buildContext,
  buildSystemInstruction,
  buildImageSystemInstruction,
  collectInputImages,
} from "@/lib/tools/generate-prompt";
import { classifyGeminiError } from "./provider-errors";
import { zodToJsonSchema } from "./schema";
import type { AiAdapter, AiStreamEvent, GenerationResult, ImageStorageContext, TokenUsage } from "./types";

// Moved from lib/tools/generate.ts verbatim (rotation, search grounding,
// image generation) — this is the Gemini half of the provider-neutral
// contract in ./types. generate.ts is now a thin dispatcher.

// Platform client (shared) plus per-request clients for users who brought
// their own key(s). The run route wraps generation in runWithApiKey();
// every helper below just calls getClient() and picks up the right one
// without threading a key through each signature.
//
// When the user registered more than one key (priority 1-3), a 429 from
// the current key retries the whole generation once per remaining key,
// in priority order — simplest thing that works given generation is a
// handful of sequential/parallel calls, not a single request to pin a
// retry to.
let client: GoogleGenAI | undefined;
const userKeyStore = new AsyncLocalStorage<KeyRotationState>();

// A 503 ("high demand") is transient — retry the same key once after a
// short wait. The platform key (no user keys) gets that retry too, as a
// one-key rotation outside userKeyStore so getClient() still uses it.
const RETRY_OPTIONS = { getRetryDelayMs: () => 2000 };

export async function runWithApiKey<T>(apiKeys: string[], fn: () => Promise<T>): Promise<T> {
  if (apiKeys.length === 0) return runWithRotation({ keys: ["platform"], index: 0 }, classifyGeminiError, fn, RETRY_OPTIONS);
  const state: KeyRotationState = { keys: apiKeys, index: 0 };
  return userKeyStore.run(state, () => runWithRotation(state, classifyGeminiError, fn, RETRY_OPTIONS));
}

function getClient(): GoogleGenAI {
  const state = userKeyStore.getStore();
  if (state) return new GoogleGenAI({ apiKey: state.keys[state.index] });
  if (!client) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GENAI_API_KEY가 설정되지 않았습니다");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function addUsage(a: TokenUsage, b: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined): TokenUsage {
  return {
    inputTokens: (a.inputTokens ?? 0) + (b?.promptTokenCount ?? 0),
    outputTokens: (a.outputTokens ?? 0) + (b?.candidatesTokenCount ?? 0),
  };
}

async function searchGrounding(
  manifest: ToolManifest,
  contextText: string,
  abortSignal: AbortSignal | undefined,
): Promise<{ findings: string; sources: Source[]; usage: TokenUsage }> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `"${manifest.name_ko}" 요청에 필요한 최신 사실 정보를 웹 검색으로 조사하세요. 찾은 핵심 사실과 수치를 근거와 함께 한국어로 요약하세요.\n\n${contextText}`,
    config: { tools: [{ googleSearch: {} }], abortSignal },
  });

  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const chunk of chunks) {
    const web = chunk.web;
    if (!web?.uri || seen.has(web.uri)) continue;
    seen.add(web.uri);
    sources.push({ url: web.uri, title: web.title ?? web.uri, domain: web.domain });
  }

  return { findings: res.text ?? "", sources, usage: addUsage({ inputTokens: 0, outputTokens: 0 }, res.usageMetadata) };
}

const REAL_PERSON_CHECK_SCHEMA = {
  type: "object",
  properties: {
    contains_real_identifiable_face: { type: "boolean" },
    reasoning: { type: "string" },
  },
  required: ["contains_real_identifiable_face", "reasoning"],
} as const;

// brand-model's hard guard (registry/brand-model.ts): "refuse uploads
// that are primarily a real person's face." The manifest has no
// free-text field to pattern-match like place's fake-review check, so
// this can't be honestly enforced without an actual vision call — a
// dedicated pre-check, not just a system-prompt instruction on the main
// generation call, so a refusal happens before spending image-generation
// credits rather than hoping the same call that's generating the image
// also happens to decline.
async function containsRealPersonFace(
  photo: ImagePart,
  abortSignal: AbortSignal | undefined,
): Promise<{ isRealPerson: boolean; reasoning: string; usage: TokenUsage }> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "이 사진에 실제로 식별 가능한 특정 인물(유명인이든 일반인이든)의 얼굴이 담겨 있습니까? 제품, 사물, 배경, 손이나 몸의 일부만 보이고 얼굴이 없다면 아니오입니다. 그림·일러스트 캐릭터도 아니오입니다.",
          },
          { inlineData: photo },
        ],
      },
    ],
    config: {
      systemInstruction: "당신은 이미지 안전 검토자입니다. 사실만 판단하고 다른 설명은 추가하지 마세요.",
      responseMimeType: "application/json",
      responseJsonSchema: REAL_PERSON_CHECK_SCHEMA,
      abortSignal,
    },
  });

  const usage = addUsage({ inputTokens: 0, outputTokens: 0 }, res.usageMetadata);
  const text = res.text;
  if (!text) return { isRealPerson: true, reasoning: "검토 응답 없음 — 안전을 위해 거부", usage };
  try {
    const parsed = JSON.parse(text) as { contains_real_identifiable_face: boolean; reasoning: string };
    return { isRealPerson: parsed.contains_real_identifiable_face, reasoning: parsed.reasoning, usage };
  } catch {
    return { isRealPerson: true, reasoning: "검토 응답 해석 실패 — 안전을 위해 거부", usage };
  }
}

async function generateOneImage(
  manifest: ToolManifest,
  parts: ({ text: string } | { inlineData: ImagePart })[],
  seed: number,
  abortSignal: AbortSignal | undefined,
): Promise<{ image: ImagePart; usage: TokenUsage }> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: manifest.model,
    contents: [{ role: "user", parts }],
    config: { systemInstruction: buildImageSystemInstruction(manifest), seed, abortSignal },
  });

  const imagePart = (res.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const reason = res.candidates?.[0]?.finishReason;
    throw new Error(
      res.text ? `이미지를 생성하지 못했습니다: ${res.text}` : `이미지를 생성하지 못했습니다${reason ? ` (${reason})` : ""}`,
    );
  }
  return {
    image: { mimeType: imagePart.inlineData.mimeType ?? "image/png", data: imagePart.inlineData.data },
    usage: addUsage({ inputTokens: 0, outputTokens: 0 }, res.usageMetadata),
  };
}

async function generateImages(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<GenerationResult> {
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  const inputImages = collectInputImages(manifest, input);
  if (manifest.id === "brand-model") {
    if (inputImages.length === 0) throw new Error("제품 사진을 업로드해주세요");
    const check = await containsRealPersonFace(inputImages[0], abortSignal);
    usage = addUsage(usage, { promptTokenCount: check.usage.inputTokens ?? 0, candidatesTokenCount: check.usage.outputTokens ?? 0 });
    if (check.isRealPerson) {
      throw new Error(
        `실제 인물로 보이는 사진은 사용할 수 없습니다. 제품만 나온 사진으로 다시 업로드해주세요. (${check.reasoning})`,
      );
    }
  }

  const contextText = buildContext(manifest, input, profile);
  const basePrompt = `다음 요청에 맞는 이미지를 생성하세요.\n\n${contextText}`;
  const parts: ({ text: string } | { inlineData: ImagePart })[] = [
    { text: basePrompt },
    ...inputImages.map((img) => ({ inlineData: img })),
  ];

  const shots = await Promise.all(
    Array.from({ length: 4 }, async (_, i) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const { image, usage: shotUsage } = await generateOneImage(manifest, parts, seed, abortSignal);
      usage = addUsage(usage, { promptTokenCount: shotUsage.inputTokens ?? 0, candidatesTokenCount: shotUsage.outputTokens ?? 0 });
      const ext = image.mimeType.includes("png") ? "png" : image.mimeType.includes("webp") ? "webp" : "jpg";
      const path = `${storage.userId}/${manifest.id}/${storage.runId}/${i}.${ext}`;

      const { error: uploadError } = await storage.supabase.storage
        .from("exports")
        .upload(path, Buffer.from(image.data, "base64"), { contentType: image.mimeType, upsert: true });
      if (uploadError) throw new Error(`이미지 저장 실패: ${uploadError.message}`);

      // ponytail: 1-year signed URL baked straight into the stored run —
      // simplest thing that works for v1. Upgrade path if that's too
      // short: store `path` instead of a URL and re-sign on read.
      const { data: signed, error: signError } = await storage.supabase.storage
        .from("exports")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signError || !signed) throw new Error(`이미지 URL 생성 실패: ${signError?.message ?? "알 수 없는 오류"}`);

      return { path, url: signed.signedUrl, seed };
    }),
  );

  if (manifest.id === "brand-model") {
    return {
      output: {
        shots: shots.map((s) => ({ asset_id: s.path, url: s.url })),
        model_seed: String(shots[0].seed),
        disclosure: "AI 생성 이미지" as const,
      },
      sources: [],
      usage,
    };
  }

  return {
    output: {
      images: shots.map((s) => ({ asset_id: s.path, url: s.url, seed: String(s.seed) })),
      refined_prompt: basePrompt,
      negative_prompt: "blurry, low quality, watermark, text artifacts",
    },
    sources: [],
    usage,
  };
}

async function* generateStructured(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
): AsyncGenerator<AiStreamEvent, void, void> {
  const ai = getClient();
  const contextText = buildContext(manifest, input, profile);
  const inputImages = collectInputImages(manifest, input);

  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let sources: Source[] = [];
  let groundingBlock = "";
  if (manifest.grounding.webSearch) {
    const grounded = await searchGrounding(manifest, contextText, abortSignal);
    sources = grounded.sources;
    usage = addUsage(usage, { promptTokenCount: grounded.usage.inputTokens ?? 0, candidatesTokenCount: grounded.usage.outputTokens ?? 0 });
    groundingBlock = `\n\n[검색 근거]\n${grounded.findings || "(검색 결과 없음)"}\n\n[사용 가능한 출처]\n${
      sources.map((s) => `- ${s.title} — ${s.url}`).join("\n") || "(없음)"
    }`;
  }

  const jsonSchema = zodToJsonSchema(manifest.outputSchema);

  const parts: ({ text: string } | { inlineData: ImagePart })[] = [
    { text: `다음 정보를 바탕으로 결과를 생성하세요.\n\n${contextText}${groundingBlock}` },
    ...inputImages.map((img) => ({ inlineData: img })),
  ];

  const res = await ai.models.generateContent({
    model: manifest.model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: buildSystemInstruction(manifest),
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      abortSignal,
    },
  });
  usage = addUsage(usage, res.usageMetadata);

  const text = res.text;
  if (!text) throw new Error("모델이 빈 응답을 반환했습니다");
  yield { type: "chunk", text };

  let output: unknown;
  try {
    output = JSON.parse(text);
  } catch {
    throw new Error("모델 응답을 JSON으로 해석하지 못했습니다");
  }

  const parsed = manifest.outputSchema.safeParse(output);
  if (!parsed.success) {
    throw new Error(`모델 응답이 예상한 형식과 다릅니다: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }

  yield { type: "done", result: { output: parsed.data, sources, usage } };
}

export const geminiAdapter: AiAdapter = {
  id: "google",
  supportsWebSearch: true,
  supportsImages: true,
  generateStructured,
  generateImages,
};
