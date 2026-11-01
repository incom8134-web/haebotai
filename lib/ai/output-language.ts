import { AsyncLocalStorage } from "node:async_hooks";

// The language a run's result is written in, chosen on the run page
// before it starts (한국어 / English). The prompts themselves are written
// in Korean, so an English run carries this choice through the run the
// same way the member's API key travels (lib/ai/gemini.ts): every model
// call made inside runWithOutputLanguage("en", …) gets its Korean
// "write in Korean" directives swapped and an explicit English rule
// appended. Korean runs keep their prompts and get one short rule: write
// in plain Korean a small-business owner understands, not marketing jargon
// (PLAIN_KOREAN_RULE) — added only to calls that already have instructions.

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

export const PLAIN_KOREAN_RULE = [
  "[쉬운 우리말]",
  "결과는 소상공인 사장님이 바로 이해하도록 쉬운 우리말로 쓰세요. 포지셔닝·페르소나·세그먼트·오퍼·훅·CTA·MVP·KPI·리드·퍼널·인사이트 같은 영어 외래어나 마케팅 전문 용어 대신 차별점·대표 손님·손님 유형·상품 구성·첫 문장·구매 유도 문구·시험용 첫 상품·성과 지표·알게 된 점 같은 말을 쓰세요.",
  "꼭 필요한 용어는 처음 한 번만 괄호로 짧게 풀어 주세요. 고유명사·브랜드명·플랫폼 이름(인스타그램, 네이버 등)과 JSON 키·값의 형식은 그대로 둡니다.",
].join("\n");

/** A Korean run's system instruction with the plain-Korean rule added (only when there is one). */
function withPlainKorean(system: unknown): unknown {
  if (typeof system === "string" && system.trim()) return `${system}\n\n${PLAIN_KOREAN_RULE}`;
  if (system && typeof system === "object" && Array.isArray((system as Content).parts) && (system as Content).parts!.length) {
    const c = system as Content;
    return { ...c, parts: [...(c.parts ?? []), { text: PLAIN_KOREAN_RULE }] };
  }
  return system;
}

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
  const p = params as { contents?: unknown; config?: { systemInstruction?: unknown } };
  if (lang !== "en") {
    const system = p.config?.systemInstruction;
    const plain = withPlainKorean(system);
    return plain === system ? params : ({ ...params, config: { ...(p.config ?? {}), systemInstruction: plain } } as P);
  }
  return {
    ...params,
    contents: localizeContents(p.contents, lang),
    config: { ...(p.config ?? {}), systemInstruction: withRule(p.config?.systemInstruction, lang) },
  } as P;
}

/** Anthropic messages.create params for the run's language (unchanged for Korean). */
export function applyToAnthropicParams<P extends object>(params: P, lang: OutputLanguage = currentOutputLanguage()): P {
  const q = params as { system?: unknown; messages?: unknown };
  if (lang !== "en") return typeof q.system === "string" && q.system.trim() ? ({ ...params, system: withPlainKorean(q.system) } as P) : params;
  const system = typeof q.system === "string" || q.system === undefined ? (withRule(q.system, lang) as string) : q.system;
  const messages = Array.isArray(q.messages)
    ? q.messages.map((m: { content?: unknown } & Record<string, unknown>) => ({
        ...m,
        content: typeof m.content === "string" ? localizeText(m.content, lang) : Array.isArray(m.content) ? m.content.map((b: Part) => (typeof b?.text === "string" ? { ...b, text: localizeText(b.text, lang) } : b)) : m.content,
      }))
    : q.messages;
  return { ...params, system, messages } as P;
}
