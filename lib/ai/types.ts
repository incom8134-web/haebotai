import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessProfile, ToolManifest } from "@/lib/tools/types";
import type { Source } from "@/lib/tools/registry/shared";

// Provider-neutral contract every engine (Gemini today; Claude/OpenAI in
// later phases) implements. generate.ts dispatches to whichever adapter
// a run resolved to; nothing above that layer knows which provider ran.

export type ProviderId = "google" | "anthropic" | "openai";

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  google: "Gemini",
  anthropic: "Claude",
  openai: "ChatGPT",
};

export interface TokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface ImageStorageContext {
  supabase: SupabaseClient;
  userId: string;
  runId: string;
}

export interface GenerationResult {
  output: unknown;
  sources: Source[];
  usage: TokenUsage;
}

// Streaming decision (fixed for every provider, not just Gemini): call
// the model non-streaming, validate the full structured output, then let
// route.ts replay it as the client-facing typing effect exactly as
// today. No adapter — Gemini, Anthropic, or OpenAI — does real
// token-by-token streaming from its provider; `generateStructured`
// always emits the complete text as a single `chunk` before `done`.
// Consequence for key rotation: the entire generation (the whole
// `generateStructured`/`generateImages` call) resolves before route.ts
// forwards anything to the client, so `runWithRotation` never has a
// mid-stream failure to handle — a quota error always surfaces before
// the first byte reaches the browser, and rotating to the next key never
// means splicing together two keys' partial output.
export type AiStreamEvent = { type: "chunk"; text: string } | { type: "done"; result: GenerationResult };

export interface AiAdapter {
  id: ProviderId;
  supportsWebSearch: boolean;
  supportsImages: boolean;

  /** Text tools: structured JSON validated against the manifest's own outputSchema. */
  generateStructured(
    manifest: ToolManifest,
    input: Record<string, unknown>,
    profile: BusinessProfile | null,
    abortSignal: AbortSignal | undefined,
  ): AsyncGenerator<AiStreamEvent, void, void>;

  /** Image tools (`image`, `brand-model`). Not meaningfully streamable — resolves with final asset URLs. */
  generateImages(
    manifest: ToolManifest,
    input: Record<string, unknown>,
    profile: BusinessProfile | null,
    abortSignal: AbortSignal | undefined,
    storage: ImageStorageContext,
  ): Promise<GenerationResult>;
}
