// Server errors (lib/ai/resolve-provider.ts, anthropic-response.ts,
// generate.ts, policy.ts, route.ts) are plain Korean strings — the run
// route's error shape is `{ error: string }`, not `{ ko, en }`, and
// giving every one of those call sites a bilingual return type would be
// a sprawling refactor for what's still a single client-facing surface.
// Instead: recognize the known substrings here and translate for
// display; anything unrecognized (a message this list hasn't caught up
// to yet) falls back to showing the original Korean in both locales
// rather than hiding the error.

export interface MappedError {
  ko: string;
  en: string;
  /** Present when the error is solvable from the API key screen. */
  link?: string;
}

const PATTERNS: { test: (msg: string) => boolean; map: (msg: string) => MappedError }[] = [
  {
    test: (m) => m.includes("API 키를 먼저 등록해주세요"),
    map: (m) => {
      const provider = /^(.+?) API 키를 먼저/.exec(m)?.[1] ?? "";
      return {
        ko: `${provider} API 키를 먼저 등록해주세요.`,
        en: `Please register a ${provider} API key first.`,
        link: "/account/api-key",
      };
    },
  },
  {
    test: (m) => m.includes("모두 사용할 수 없습니다"),
    map: (m) => {
      const provider = /^등록된 (.+?) 키를/.exec(m)?.[1] ?? "";
      return {
        ko: `등록된 ${provider} 키를 모두 사용할 수 없습니다 (한도 초과 또는 인증 실패) — API 키 화면에서 확인해주세요.`,
        en: `None of your registered ${provider} keys are usable right now (quota exceeded or authentication failed) — check the API key screen.`,
        link: "/account/api-key",
      };
    },
  },
  {
    test: (m) => m.includes("모델 접근 권한이 없습니다"),
    map: () => ({
      ko: "이 Claude API 키에 모델 접근 권한이 없습니다 — Anthropic 콘솔에서 권한을 확인해주세요.",
      en: "This Claude API key doesn't have access to the model — check its permissions in the Anthropic console.",
      link: "/account/api-key",
    }),
  },
  {
    test: (m) => m.includes("웹 검색이 꺼져"),
    map: () => ({
      ko: "이 Anthropic 계정에서는 웹 검색이 꺼져 있습니다 — Claude 콘솔의 웹 검색 설정을 확인해주세요.",
      en: "Web search is disabled for this Anthropic account — check the web search setting in the Claude console.",
      link: "/account/api-key",
    }),
  },
  {
    test: (m) => m.includes("최대 토큰 한도"),
    map: () => ({
      ko: "응답이 최대 토큰 한도에 도달해 완성되지 못했습니다 — 다시 시도해주세요.",
      en: "The response hit the max token limit before finishing — please try again.",
    }),
  },
  {
    test: (m) => m.includes("AI 엔진 사용 한도를 초과했습니다"),
    map: () => ({
      ko: "AI 엔진 사용 한도를 초과했습니다 — 잠시 후 다시 시도해주세요. 크레딧은 차감되지 않았습니다.",
      en: "The AI engine's usage limit was reached — please try again shortly. No credits were charged.",
    }),
  },
  {
    test: (m) => m.includes("AI 엔진 요청이 많아"),
    map: () => ({
      ko: "AI 엔진 요청이 많아 지금은 응답할 수 없습니다 — 잠시 후 다시 시도해주세요. 크레딧은 차감되지 않았습니다.",
      en: "The AI engine is busy right now — please try again shortly. No credits were charged.",
    }),
  },
  {
    test: (m) => m.includes("크레딧이 부족합니다"),
    map: () => ({ ko: "크레딧이 부족합니다.", en: "Not enough credits." }),
  },
  {
    test: (m) => m.includes("요청이 너무 잦습니다"),
    map: () => ({
      ko: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.",
      en: "Too many requests — please try again in a moment.",
    }),
  },
  {
    test: (m) => m.includes("엔진을 지원하지 않습니다") || m.includes("알 수 없는 엔진입니다"),
    map: (m) => ({ ko: m, en: "This tool doesn't support the selected engine." }),
  },
  {
    test: (m) => m.includes("로그인이 필요합니다"),
    map: () => ({ ko: "로그인이 필요합니다.", en: "Please sign in." }),
  },
];

export function mapRunError(message: string): MappedError {
  for (const { test, map } of PATTERNS) {
    if (test(message)) return map(message);
  }
  return { ko: message, en: message };
}
