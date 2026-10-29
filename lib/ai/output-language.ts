import { AsyncLocalStorage } from "node:async_hooks";

// The language a run's result is written in, chosen on the run page
// before it starts (한국어 / English). The prompts themselves are written
// in Korean, so an English run carries this choice through the run the
// same way the member's API key travels (lib/ai/gemini.ts): every model
// call made inside runWithOutputLanguage("en", …) gets its Korean
// "write in Korean" directives swapped and an explicit English rule
// appended. Korean runs are left exactly as they were.

export type OutputLanguage = "ko" | "en";

export function parseOutputLanguage(raw: unknown): OutputLanguage {
  return raw === "en" ? "en" : "ko";
}

const store = new AsyncLocalStorage<OutputLanguage>();

export function runWithOutputLanguage<T>(lang: OutputLanguage, fn: () => Promise<T>): Promise<T> {
  return store.run(lang, fn);
}

export function currentOutputLanguage(): OutputLanguage {
  return store.getStore() ?? "ko";
}

export const ENGLISH_RULE = [
  "[OUTPUT LANGUAGE: ENGLISH]",
  "The member chose English for this result. Write every human-readable value — titles, body text, labels, captions, hashtags, scripts, slide text, notes, and any text that appears inside an image or a web page — in natural, fluent English for an English-speaking reader.",
  "These instructions are in Korean; follow them, but do not answer in Korean. Translate Korean input into English where you use it. Keep brand, product and place names as the member wrote them, adding a romanized form only when it helps (e.g. 해운대 → Haeundae).",
  "JSON keys, enum values, ids, numbers, URLs and color codes stay exactly as the schema requires.",
].join("\n");

// "반드시 한국어로 작성하세요." and "…한국어로 정리/요약…" in the prompts.
const KOREAN_DIRECTIVE = /반드시 한국어로 작성하세요\.?/g;
const IN_KOREAN = /한국어로/g;

/** A prompt text with its Korean-output directives pointed at English. */
export function localizeText(text: string, lang: OutputLanguage): string {
  if (lang !== "en") return text;
  return text.replace(KOREAN_DIRECTIVE, "Write everything in English.").replace(IN_KOREAN, "영어로");
}

type Part = { text?: string } & Record<string, unknown>;
type Content = { role?: string; parts?: Part[] } & Record<string, unknown>;

function localizeContents(contents: unknown, lang: OutputLanguage): unknown {
  if (typeof contents === "string") return localizeText(contents, lang);
  if (Array.isArray(contents)) return contents.map((c) => localizeContents(c, lang));
  if (contents && typeof contents === "object") {
    const c = contents as Content & Part;
    if (typeof c.text === "string") return { ...c, text: localizeText(c.text, lang) };
    if (Array.isArray(c.parts)) return { ...c, parts: c.parts.map((p) => (typeof p?.text === "string" ? { ...p, text: localizeText(p.text, lang) } : p)) };
  }
  return contents;
}

function withRule(system: unknown, lang: OutputLanguage): unknown {
  if (system === undefined || system === null || system === "") return ENGLISH_RULE;
  if (typeof system === "string") return `${localizeText(system, lang)}\n\n${ENGLISH_RULE}`;
  if (typeof system === "object" && Array.isArray((system as Content).parts)) {
    const c = localizeContents(system, lang) as Content;
    return { ...c, parts: [...(c.parts ?? []), { text: ENGLISH_RULE }] };
  }
  return system;
}

/** Gemini generateContent params for the run's language (unchanged for Korean). */
export function applyToGeminiParams<P extends object>(params: P, lang: OutputLanguage = currentOutputLanguage()): P {
  if (lang !== "en") return params;
  const p = params as { contents?: unknown; config?: { systemInstruction?: unknown } };
  return {
    ...params,
    contents: localizeContents(p.contents, lang),
    config: { ...(p.config ?? {}), systemInstruction: withRule(p.config?.systemInstruction, lang) },
  } as P;
}

/** Anthropic messages.create params for the run's language (unchanged for Korean). */
export function applyToAnthropicParams<P extends object>(params: P, lang: OutputLanguage = currentOutputLanguage()): P {
  if (lang !== "en") return params;
  const q = params as { system?: unknown; messages?: unknown };
  const system = typeof q.system === "string" || q.system === undefined ? (withRule(q.system, lang) as string) : q.system;
  const messages = Array.isArray(q.messages)
    ? q.messages.map((m: { content?: unknown } & Record<string, unknown>) => ({
        ...m,
        content: typeof m.content === "string" ? localizeText(m.content, lang) : Array.isArray(m.content) ? m.content.map((b: Part) => (typeof b?.text === "string" ? { ...b, text: localizeText(b.text, lang) } : b)) : m.content,
      }))
    : q.messages;
  return { ...params, system, messages } as P;
}
