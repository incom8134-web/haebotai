import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessProfile, ToolManifest } from "./types";
import type { Source } from "./registry/shared";
import type { AiAdapter, ProviderId, TokenUsage } from "@/lib/ai/types";
import { generateProductPhotos, geminiAdapter, runWithApiKey as runWithGeminiKey } from "@/lib/ai/gemini";
import { addPresentationVisuals, fillMissingImages, generateHomepage } from "@/lib/ai/gemini-studio";
import { buildContext, collectInputImages } from "./generate-prompt";
import { anthropicAdapter, runWithApiKey as runWithAnthropicKey } from "@/lib/ai/anthropic";
import { renderSangsepage } from "./render/sangsepage";
import { orderLike } from "./output-order";
import { outputSchemaFor } from "./schemas";

// HAEBOT_A_TOOLS_SPEC.md §3.2 — real generation for all 15 tools. Thin
// dispatcher: provider-specific logic (search grounding, image
// generation, key rotation) lives in lib/ai/<provider>.ts behind the
// AiAdapter contract (lib/ai/types.ts); this file only holds the
// provider-agnostic parts — the `grant` placeholder and sangsepage's
// real image rendering — and picks which adapter and rotation wrapper
// run a given call. The run route resolves `provider` against the
// capability map (lib/ai/capabilities.ts) before ever calling here, so
// in practice only registered/enabled providers reach this dispatcher —
// the errors below are defense in depth, not a normal path.
const ADAPTERS: Partial<Record<ProviderId, AiAdapter>> = {
  google: geminiAdapter,
  anthropic: anthropicAdapter,
};

/** Wraps a generation call with the given provider's own key-rotation policy. */
export async function runWithApiKey<T>(provider: ProviderId, userId: string, apiKeys: string[], fn: () => Promise<T>): Promise<T> {
  if (provider === "google") return runWithGeminiKey(apiKeys, fn);
  if (provider === "anthropic") return runWithAnthropicKey(userId, apiKeys, fn);
  throw new Error(`${provider} 엔진은 아직 지원하지 않습니다`);
}

interface ImageStorageContext {
  supabase: SupabaseClient;
  userId: string;
  runId: string;
}

export async function generateOutput(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
  abortSignal: AbortSignal | undefined,
  storage: ImageStorageContext,
  provider: ProviderId,
): Promise<{ output: unknown; sources: Source[]; usage: TokenUsage }> {
  if (manifest.id === "grant") {
    return {
      output: {
        matches: [],
        unmatched_reasons: ["현재 공고 데이터를 불러올 수 없습니다 — 공공 데이터 연동 준비 중입니다."],
      },
      sources: [],
      usage: { inputTokens: null, outputTokens: null },
    };
  }

  const adapter = ADAPTERS[provider];
  if (!adapter) throw new Error(`${provider} 엔진은 아직 지원하지 않습니다`);

  if (manifest.id === "image" || manifest.id === "brand-model" || manifest.id === "logo") {
    const images = await adapter.generateImages(manifest, input, profile, abortSignal, storage);
    return { ...images, output: orderLike(outputSchemaFor(manifest.id), images.output) };
  }

  // Homepage on Gemini is a full studio pipeline (art direction → Pro
  // model page + Pro image model photos), not one structured call.
  if (manifest.id === "homepage" && provider === "google") {
    const site = await generateHomepage(manifest, input, profile, abortSignal, storage);
    return { ...site, output: orderLike(outputSchemaFor(manifest.id), site.output) };
  }

  let result: { output: unknown; sources: Source[]; usage: TokenUsage } | undefined;
  for await (const event of adapter.generateStructured(manifest, input, profile, abortSignal)) {
    if (event.type === "done") result = event.result;
  }
  if (!result) throw new Error("모델 응답을 받지 못했습니다");

  let output = result.output;
  // Real image rendering, not the model's job — satori/resvg already do
  // this for real (§4.11); the model only supplies the section copy.
  let extraUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  if (manifest.id === "sangsepage") {
    const page = output as {
      pain_points: string[];
      usps: string[];
      sections: { order: number; type?: string; headline: string; body: string; image_instruction?: string }[];
      faq: { q: string; a: string }[];
      shipping_template: string;
    };
    // Photos only on Gemini (Claude has no image API; a Claude run on the
    // user's own key shouldn't spend platform image quota).
    let photos: string[] = [];
    if (provider === "google") {
      const name = String(input.product_name ?? "");
      const shotOf = (i: number) => page.sections[i]?.image_instruction || page.sections[i]?.headline || name;
      const result = await generateProductPhotos(
        [
          { prompt: `Hero shot of "${name}". ${shotOf(0)}`, ratio: "1:1" },
          { prompt: `Detail shot of "${name}". ${shotOf(2)}`, ratio: "4:5" },
          { prompt: `In-use / lifestyle shot of "${name}". ${shotOf(4)}`, ratio: "4:5" },
        ],
        collectInputImages(manifest, input),
        abortSignal,
      );
      photos = result.photos.filter((p): p is string => p !== null);
      extraUsage = result.usage;
    }
    const png = await renderSangsepage({
      productName: String(input.product_name ?? ""),
      price: typeof input.price === "number" ? input.price : null,
      painPoints: page.pain_points ?? [],
      usps: page.usps ?? [],
      sections: page.sections ?? [],
      faq: page.faq ?? [],
      shipping: page.shipping_template ?? "",
      accent: profile?.brand_colors?.[0] ?? "#E84A5F",
      photos,
    });
    // A multi-MB PNG belongs in storage, not in the run row.
    const path = `${storage.userId}/sangsepage/${storage.runId}/page.png`;
    const { error } = await storage.supabase.storage.from("exports").upload(path, png, { contentType: "image/png", upsert: true });
    if (error) throw new Error(`상세페이지 저장 실패: ${error.message}`);
    const { data: signed } = await storage.supabase.storage.from("exports").createSignedUrl(path, 60 * 60 * 24 * 365);
    output = { ...page, rendered_images: signed ? [signed.signedUrl] : [] };
  }

  let usage = {
    inputTokens: (result.usage.inputTokens ?? 0) + (extraUsage.inputTokens ?? 0),
    outputTokens: (result.usage.outputTokens ?? 0) + (extraUsage.outputTokens ?? 0),
  };
  // Homepage from another engine: no photos, so its image slots get a
  // brand-colored gradient instead of broken images.
  if (manifest.id === "homepage") {
    const page = output as { html: string };
    output = { ...page, html: fillMissingImages(page.html) };
  }

  // A written deck gets its cover and slide photos and a brand accent
  // (Gemini only, like every other platform-paid image).
  if (manifest.id === "presentation" && provider === "google") {
    const visuals = await addPresentationVisuals(
      output as Parameters<typeof addPresentationVisuals>[0],
      buildContext(manifest, input, profile),
      abortSignal,
      storage,
    );
    output = visuals.output;
    usage = {
      inputTokens: (usage.inputTokens ?? 0) + (visuals.usage.inputTokens ?? 0),
      outputTokens: (usage.outputTokens ?? 0) + (visuals.usage.outputTokens ?? 0),
    };
  }

  return { output: orderLike(outputSchemaFor(manifest.id), output), sources: result.sources, usage };
}
