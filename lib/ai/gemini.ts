import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";
import { runWithRotation, type KeyRotationState } from "@/lib/tools/quota-rotation";
import {
  type ImagePart,
  buildContext,
  buildSystemInstruction,
  buildImageSystemInstruction,
  buildResearchPrompt,
  buildReviseInstruction,
  collectInputImages,
  referenceOf,
  referenceParts,
} from "@/lib/tools/generate-prompt";
import { classifyGeminiError } from "./provider-errors";
import { getPlaybook } from "@/lib/tools/playbooks";
import { zodToJsonSchema } from "./schema";
import { renderLogoLockup, type LogoTracking, type LogoWeight } from "@/lib/tools/render/logo";
import type { AiAdapter, AiStreamEvent, GenerationResult, ImageStorageContext, TokenUsage } from "./types";
import { outputSchemaFor } from "@/lib/tools/schemas";

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
// Planning, research, safety checks and the editor pass. Manifests name
// their own model for the main generation.
export const TEXT_MODEL = "gemini-3.8-flash";

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

export function getClient(): GoogleGenAI {
  const state = userKeyStore.getStore();
  if (state) return new GoogleGenAI({ apiKey: state.keys[state.index] });
  if (!client) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GENAI_API_KEY가 설정되지 않았습니다");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export function addUsage(a: TokenUsage, b: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined): TokenUsage {
  return {
    inputTokens: (a.inputTokens ?? 0) + (b?.promptTokenCount ?? 0),
    outputTokens: (a.outputTokens ?? 0) + (b?.candidatesTokenCount ?? 0),
  };
}

export async function searchGrounding(
  manifest: ToolManifest,
  contextText: string,
  abortSignal: AbortSignal | undefined,
): Promise<{ findings: string; sources: Source[]; usage: TokenUsage }> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: buildResearchPrompt(manifest, contextText),
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
    model: TEXT_MODEL,
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

export async function generateOneImage(
  manifest: ToolManifest,
  parts: ({ text: string } | { inlineData: ImagePart })[],
  seed: number,
  abortSignal: AbortSignal | undefined,
  aspectRatio?: AspectRatio,
): Promise<{ image: ImagePart; usage: TokenUsage }> {
  try {
    return await generateImageWith(manifest.model, manifest, parts, seed, abortSignal, aspectRatio);
  } catch (err) {
    // The Pro image model is the default; a refusal or overload there
    // falls back to the fast model once rather than failing the shot.
    if (abortSignal?.aborted || manifest.model === FAST_IMAGE_MODEL) throw err;
    return generateImageWith(FAST_IMAGE_MODEL, manifest, parts, seed, abortSignal, aspectRatio);
  }
}

const FAST_IMAGE_MODEL = "gemini-3.1-flash-image";
export const PRO_IMAGE_MODEL = "gemini-3-pro-image";

async function generateImageWith(
  model: string,
  manifest: ToolManifest,
  parts: ({ text: string } | { inlineData: ImagePart })[],
  seed: number,
  abortSignal: AbortSignal | undefined,
  aspectRatio?: AspectRatio,
): Promise<{ image: ImagePart; usage: TokenUsage }> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: { systemInstruction: buildImageSystemInstruction(manifest), seed, abortSignal, ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}) },
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

// Product-page photos (hero + section shots). Failed shots come back as
// null so the page still renders with whatever did succeed.
export async function generateProductPhotos(
  prompts: { prompt: string; ratio: AspectRatio }[],
  references: ImagePart[],
  abortSignal: AbortSignal | undefined,
): Promise<{ photos: (string | null)[]; usage: TokenUsage }> {
  const photoManifest = { id: "image", name_ko: "해봇 상세페이지", summary: "상세페이지 제품 사진", model: PRO_IMAGE_MODEL } as ToolManifest;
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  const photos = await Promise.all(
    prompts.map(async ({ prompt, ratio }) => {
      try {
        const parts: ({ text: string } | { inlineData: ImagePart })[] = [
          { text: `Commercial product photography for a Korean online-store detail page. ${prompt} Photorealistic, natural soft light, clean styling, appetizing and premium. No text, no logos, no watermark, and no lettering or writing on the product itself.${references.length ? " Keep the product exactly as in the attached reference photo." : ""}` },
          ...references.map((img) => ({ inlineData: img })),
        ];
        const { image, usage: u } = await generateOneImage(photoManifest, parts, Math.floor(Math.random() * 2 ** 31), abortSignal, ratio);
        usage = addUsage(usage, { promptTokenCount: u.inputTokens ?? 0, candidatesTokenCount: u.outputTokens ?? 0 });
        return `data:${image.mimeType};base64,${image.data}`;
      } catch {
        return null;
      }
    }),
  );
  return { photos, usage };
}

// Homepage hero photo, embedded as a data URL so the downloaded HTML is
// self-contained (no signed URL that expires). Called from generate.ts
// after the page itself is written.
export async function generateHeroImage(prompt: string, abortSignal: AbortSignal | undefined): Promise<{ dataUrl: string; usage: TokenUsage }> {
  const heroManifest = { id: "image", name_ko: "해봇 홈페이지", summary: "홈페이지 히어로 사진", model: PRO_IMAGE_MODEL } as ToolManifest;
  const { image, usage } = await generateOneImage(
    heroManifest,
    [{ text: `Website hero photograph, wide banner composition with calm negative space on one side for a headline. ${prompt} Photorealistic, natural light, high detail. No text, no logos, no watermark.` }],
    Math.floor(Math.random() * 2 ** 31),
    abortSignal,
    "16:9",
  );
  return { dataUrl: `data:${image.mimeType};base64,${image.data}`, usage };
}

export type AspectRatio = "1:1" | "4:5" | "16:9" | "9:16" | "3:4" | "4:3";

// What each image preset is for — the shot planner's art direction.
const PRESET_GUIDE: Record<string, string> = {
  studio: "쇼핑몰 대표 이미지용 제품 스튜디오컷. 깔끔한 배경, 제품이 주인공, 질감과 디테일이 선명하게.",
  packaging: "포장·패키지를 보여주는 컷. 선물 받는 순간, 포장을 여는 장면, 패키지 디테일.",
  "3d_render": "제품을 스타일라이즈드 3D 렌더로 표현한 광고 비주얼. 부드러운 조명, 미니멀한 무대.",
  landing_ui: "홈페이지 히어로 배너용. 한쪽에 헤드라인을 올릴 여백이 넉넉한 와이드 구도.",
  ad_banner: "SNS·배너 광고 소재. 스크롤을 멈추게 하는 강한 구도와 색, 카피를 올릴 여백(글자는 넣지 않음).",
  background: "상세페이지·SNS 배경으로 쓸 분위기 컷. 제품 없이 브랜드 무드, 질감, 공간.",
};

const SHOT_PLAN_SCHEMA = {
  type: "object",
  properties: {
    shots: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "컷 이름 (예: 45도 대표컷)" },
          purpose: { type: "string", description: "이 컷을 어디에 어떻게 쓰면 좋은지 한 문장" },
          prompt: {
            type: "string",
            description:
              "Image-model prompt in English: subject, camera angle and lens, lighting direction and quality, background and surface, props, color palette, mood, composition. Photorealistic unless the preset says otherwise. No text, logos or watermarks.",
          },
        },
        required: ["name", "purpose", "prompt"],
      },
    },
    model_description: { type: "string", description: "brand-model only: one consistent English description of the model (age range, style, hair, outfit) used in every shot" },
  },
  required: ["shots"],
} as const;

// Plan four clearly different shots like a photo director (angle, light,
// props, use) instead of sending the same one-line request four times.
async function planShots(
  manifest: ToolManifest,
  contextText: string,
  inputImages: ImagePart[],
  abortSignal: AbortSignal | undefined,
): Promise<{ shots: { name: string; purpose: string; prompt: string }[]; modelDescription: string; usage: TokenUsage }> {
  const ai = getClient();
  const preset = /용도 프리셋: (\S+)/.exec(contextText)?.[1];
  const guide = manifest.id === "brand-model"
    ? "브랜드 룩북·광고용 모델 컷 4장. 네 컷 모두 같은 모델(같은 얼굴·헤어·의상 톤)이 제품을 들고, 착용하고, 사용하는 서로 다른 장면. 제품이 항상 또렷하게 보여야 합니다."
    : (preset && PRESET_GUIDE[preset]) || PRESET_GUIDE.studio;
  const res = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: `다음 요청으로 광고 사진 4컷을 기획하세요. 용도: ${guide}\n네 컷은 앵글·거리·조명·배경·소품 중 최소 두 가지가 서로 달라야 하며, 모두 실제 광고에 쓸 수 있는 완성도여야 합니다. 첨부 이미지가 있으면 그 제품의 모양·색·라벨을 그대로 유지하세요.\n\n${contextText}` },
          ...inputImages.map((img) => ({ inlineData: img })),
        ],
      },
    ],
    config: {
      systemInstruction: buildImageSystemInstruction(manifest).split("\n")[0] + "\n당신은 촬영 콘티를 짜는 포토 디렉터입니다. 응답은 지정된 JSON만.",
      responseMimeType: "application/json",
      responseJsonSchema: SHOT_PLAN_SCHEMA,
      abortSignal,
    },
  });
  const plan = JSON.parse(res.text ?? "") as { shots: { name: string; purpose: string; prompt: string }[]; model_description?: string };
  if (!plan.shots?.length) throw new Error("촬영 계획을 만들지 못했습니다");
  return { shots: plan.shots.slice(0, 4), modelDescription: plan.model_description ?? "", usage: addUsage({ inputTokens: 0, outputTokens: 0 }, res.usageMetadata) };
}

const LOGO_PLAN_SCHEMA = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "콘셉트 이름 (예: 달빛 한 조각)" },
          concept_rationale: { type: "string", description: "이 로고가 브랜드의 무엇을, 왜 이렇게 표현하는지 3~4문장" },
          symbol: { type: "string", description: "심볼의 형태를 한국어로 구체적으로 설명" },
          image_prompt: {
            type: "string",
            description:
              "Image-model prompt in English describing ONLY the symbol mark: subject, shapes, composition, style, colors. Never ask for any text, letters or words, except a single Latin initial when the style is an initial monogram.",
          },
          color_hex: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
          font_weight: { type: "string", enum: ["regular", "bold", "extrabold", "black"] },
          letter_spacing: { type: "string", enum: ["tight", "normal", "wide"] },
          usage_notes: { type: "string", description: "간판, 포장, SNS 프로필 등 실제 사용 시 주의점과 팁" },
        },
        required: ["name", "concept_rationale", "symbol", "image_prompt", "color_hex", "font_weight", "letter_spacing", "usage_notes"],
      },
    },
  },
  required: ["concepts"],
} as const;

interface LogoPlan {
  name: string;
  concept_rationale: string;
  symbol: string;
  image_prompt: string;
  color_hex: string[];
  font_weight: LogoWeight;
  letter_spacing: LogoTracking;
  usage_notes: string;
}

// Plan four distinct directions with the text model, draw each symbol
// with the image model, typeset the name beside it (render/logo.ts).
async function generateLogo(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<GenerationResult> {
  const ai = getClient();
  const brandName = String(input.brand_name ?? profile?.brand_name ?? "").trim();
  if (!brandName) throw new Error("브랜드명을 입력해주세요");
  const contextText = buildContext(manifest, input, profile);
  // "참고 자료" images: the planner sees them; for a refresh, every new
  // symbol is also drawn from the old logo so it stays recognizable.
  const refs = referenceParts(input, { documents: false });
  const refresh = referenceOf(input)?.mode.id === "refresh" && refs.length > 0;

  const planRes = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: `다음 브랜드의 로고 콘셉트 4가지를 기획하세요. 네 가지는 조형 방식이 서로 확실히 달라야 합니다(예: 구상 심볼, 기하학 추상 마크, 엠블럼/배지, 이니셜 모노그램 — 선택한 스타일을 중심으로 변주). 브랜드명 글자는 서버가 따로 조판하므로, 심볼 이미지에는 글자를 넣지 않습니다.\n\n${contextText}` },
          ...refs.map((img) => ({ inlineData: img })),
        ],
      },
    ],
    config: {
      systemInstruction: buildSystemInstruction(manifest),
      responseMimeType: "application/json",
      responseJsonSchema: LOGO_PLAN_SCHEMA,
      abortSignal,
    },
  });
  let usage = addUsage({ inputTokens: 0, outputTokens: 0 }, planRes.usageMetadata);
  let plans: LogoPlan[];
  try {
    plans = (JSON.parse(planRes.text ?? "") as { concepts: LogoPlan[] }).concepts.slice(0, 4);
  } catch {
    throw new Error("로고 콘셉트를 만들지 못했습니다");
  }
  if (plans.length < 4) throw new Error("로고 콘셉트를 만들지 못했습니다");

  const upload = async (path: string, bytes: Buffer, contentType = "image/png") => {
    const { error } = await storage.supabase.storage.from("exports").upload(path, bytes, { contentType, upsert: true });
    if (error) throw new Error(`이미지 저장 실패: ${error.message}`);
    const { data: signed, error: signError } = await storage.supabase.storage.from("exports").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signError || !signed) throw new Error(`이미지 URL 생성 실패: ${signError?.message ?? "알 수 없는 오류"}`);
    return { url: signed.signedUrl, asset_id: path };
  };

  const concepts = await Promise.all(
    plans.map(async (plan, i) => {
      const colors = plan.color_hex.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
      const prompt = [
        `Professional brand logo symbol for "${brandName}" (${String(profile?.industry ?? "")}).`,
        plan.image_prompt,
        `Flat vector logo mark, bold simple shapes, crisp edges, ${colors.length ? `solid colors ${colors.join(", ")}` : "2-3 solid colors"}, centered on a pure white background with generous padding.`,
        "Must read clearly at 32px as an app icon. The mark fills about 70% of the square canvas. No faces or eyes on objects unless the concept is a mascot. No text, no words, no letters (except a single Latin initial if the concept is a monogram), no mockup, no photo, no 3D render, no drop shadow, no gradient background, no border frame.",
      ].join(" ");
      const seed = Math.floor(Math.random() * 2 ** 31);
      // Square, so the mark fills the lockup instead of floating in a 16:9 frame.
      const parts: ({ text: string } | { inlineData: ImagePart })[] = refresh
        ? [{ text: `${prompt} Evolve the attached existing logo: keep its recognizable core idea, simplify and modernize it; do not copy it unchanged.` }, { inlineData: refs[0] }]
        : [{ text: prompt }];
      const { image, usage: shotUsage } = await generateOneImage(manifest, parts, seed, abortSignal, "1:1");
      usage = addUsage(usage, { promptTokenCount: shotUsage.inputTokens ?? 0, candidatesTokenCount: shotUsage.outputTokens ?? 0 });

      const lockup = await renderLogoLockup({
        symbol: image,
        brandName,
        color: colors[0] ?? "#16181A",
        weight: plan.font_weight,
        tracking: plan.letter_spacing,
      });
      const base = `${storage.userId}/${manifest.id}/${storage.runId}/${i}`;
      const [lockupRef, symbolRef] = await Promise.all([
        upload(`${base}-lockup.png`, lockup),
        upload(`${base}-symbol.${image.mimeType.includes("png") ? "png" : "jpg"}`, Buffer.from(image.data, "base64"), image.mimeType),
      ]);
      return {
        name: plan.name,
        concept_rationale: plan.concept_rationale,
        symbol: plan.symbol,
        color_spec: { hex: colors },
        type_spec: { family: "Pretendard", weight: plan.font_weight, tracking: plan.letter_spacing },
        usage_notes: plan.usage_notes,
        image: lockupRef,
        symbol_image: symbolRef,
      };
    }),
  );

  return { output: { concepts, mockups: [] }, sources: [], usage };
}

async function generateImages(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
): Promise<GenerationResult> {
  if (manifest.id === "logo") return generateLogo(manifest, input, profile, abortSignal, storage);

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

  // "참고 자료" images guide the look. The planner sees them for both
  // tools; only product shots get them as a style reference — lookbook
  // references stay with the planner so no real person's likeness
  // reaches the image model.
  const styleRefs = referenceParts(input, { documents: false });
  const contextText = buildContext(manifest, input, profile);
  const plan = await planShots(manifest, contextText, [...inputImages, ...styleRefs], abortSignal);
  usage = addUsage(usage, { promptTokenCount: plan.usage.inputTokens ?? 0, candidatesTokenCount: plan.usage.outputTokens ?? 0 });
  const ratio = (["1:1", "4:5", "16:9", "9:16"] as const).find((r) => r === input.ratio) ?? (manifest.id === "brand-model" ? "3:4" : "1:1");

  const shots = await Promise.all(
    plan.shots.map(async (shot, i) => {
      const seed = Math.floor(Math.random() * 2 ** 31);
      const text = [shot.prompt, plan.modelDescription && `Model (same person in every shot): ${plan.modelDescription}.`, inputImages.length ? "Keep the product exactly as in the attached reference photo." : ""]
        .filter(Boolean)
        .join(" ");
      const shotRefs = manifest.id === "image" ? styleRefs : [];
      const styleNote = shotRefs.length ? " Match the lighting, color grade, background and composition style of the style-reference image(s) attached after the product; do not copy their subject." : "";
      const parts: ({ text: string } | { inlineData: ImagePart })[] = [{ text: text + styleNote }, ...inputImages.map((img) => ({ inlineData: img })), ...shotRefs.map((img) => ({ inlineData: img }))];
      const { image, usage: shotUsage } = await generateOneImage(manifest, parts, seed, abortSignal, ratio);
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

      return { path, url: signed.signedUrl, seed, name: shot.name, purpose: shot.purpose, prompt: shot.prompt };
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
      images: shots.map((s) => ({ asset_id: s.path, url: s.url, seed: String(s.seed), name: s.name, purpose: s.purpose })),
      refined_prompt: shots.map((s, i) => `${i + 1}. ${s.prompt}`).join("\n"),
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
  // The tool's own image fields plus the "참고 자료" images and PDFs.
  const inputImages = [...collectInputImages(manifest, input), ...referenceParts(input, { documents: true })];

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

  const jsonSchema = zodToJsonSchema(outputSchemaFor(manifest.id));

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
      // Long documents (a full homepage, a 90-day strategy) must not be
      // cut off mid-JSON; the model stops well before this when done.
      maxOutputTokens: 32_768,
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

  const parsed = outputSchemaFor(manifest.id).safeParse(output);
  if (!parsed.success) {
    throw new Error(`모델 응답이 예상한 형식과 다릅니다: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  let final: unknown = parsed.data;

  // Editor pass: a strict reviewer rewrites the weak parts of the draft
  // against the tool's bar. Drafts read fine but generic; this is where
  // they get specific. Best effort — the draft stands if it fails.
  if (getPlaybook(manifest.id)?.revise) {
    try {
      // Same model as the draft, so the editor never writes below it;
      // light thinking, since the draft already did the reasoning.
      const revised = await ai.models.generateContent({
        model: manifest.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: `[입력과 프로필]\n${contextText}${groundingBlock}\n\n[초안]\n${JSON.stringify(parsed.data)}` },
              ...inputImages.map((img) => ({ inlineData: img })),
            ],
          },
        ],
        config: {
          systemInstruction: buildReviseInstruction(manifest),
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          maxOutputTokens: 32_768,
          ...(manifest.model.includes("pro") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          abortSignal,
        },
      });
      usage = addUsage(usage, revised.usageMetadata);
      const again = outputSchemaFor(manifest.id).safeParse(JSON.parse(revised.text ?? ""));
      if (again.success) final = again.data;
    } catch (err) {
      if (abortSignal?.aborted) throw err;
    }
  }

  yield { type: "done", result: { output: final, sources, usage } };
}

export const geminiAdapter: AiAdapter = {
  id: "google",
  supportsWebSearch: true,
  supportsImages: true,
  generateStructured,
  generateImages,
};
