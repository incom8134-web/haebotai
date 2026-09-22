import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessProfile, ToolManifest } from "./types";
import type { Source } from "./registry/shared";
import type { AiAdapter, ProviderId, TokenUsage } from "@/lib/ai/types";
import { geminiAdapter, runWithApiKey as runWithGeminiKey } from "@/lib/ai/gemini";
import { anthropicAdapter, runWithApiKey as runWithAnthropicKey } from "@/lib/ai/anthropic";
import { renderSangsepage } from "./render/sangsepage";

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

  if (manifest.id === "image" || manifest.id === "brand-model") {
    return adapter.generateImages(manifest, input, profile, abortSignal, storage);
  }

  let result: { output: unknown; sources: Source[]; usage: TokenUsage } | undefined;
  for await (const event of adapter.generateStructured(manifest, input, profile, abortSignal)) {
    if (event.type === "done") result = event.result;
  }
  if (!result) throw new Error("모델 응답을 받지 못했습니다");

  let output = result.output;
  // Real image rendering, not the model's job — satori/resvg already do
  // this for real (§4.11); the model only supplies the section copy.
  if (manifest.id === "sangsepage") {
    const sections = (output as { sections: { order: number; headline: string; body: string }[] }).sections;
    const rendered = await renderSangsepage(sections);
    output = { ...(output as Record<string, unknown>), rendered_images: [rendered] };
  }

  return { output, sources: result.sources, usage: result.usage };
}
