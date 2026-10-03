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
  /** Where the user can fix it (the API key screen unless linkLabel says otherwise). */
  link?: string;
  linkLabel?: { ko: string; en: string };
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
    test: (m) => m.includes("출처 없이 사실 주장을 생성할 수 없습니다"),
    map: () => ({
      ko: "이 도구는 웹 검색 출처가 꼭 필요한데, 이번에는 검색 결과를 받지 못했어요. 잠시 후 다시 시도해 주세요. 무료 키는 하루 검색 한도가 있어서, 자주 막히면 내일 다시 하거나 결제를 켠 키를 쓰세요.",
      en: "This tool needs web sources, and no search results came back this time. Please try again shortly. Free keys have a daily search limit; if it keeps happening, try tomorrow or use a key with billing turned on.",
      link: "/account/api-key",
      linkLabel: { ko: "내 API 키 확인", en: "Check my API key" },
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
    test: (m) => m.includes("무료 Gemini 키로는"),
    map: () => ({
      ko: "무료 Gemini 키로는 이미지를 만들 수 없습니다 — Google AI Studio에서 결제를 켠 키를 등록해주세요. 글 위주의 도구는 무료 키로도 쓸 수 있어요.",
      en: "A free Gemini key can't make images — register a key with billing turned on in Google AI Studio. Text tools work on a free key.",
      link: "/account/api-key",
      linkLabel: { ko: "내 API 키 확인", en: "Check my API key" },
    }),
  },
  {
    test: (m) => m.includes("AI 엔진 사용 한도를 초과했습니다"),
    map: () => ({
      ko: "AI 엔진 사용 한도를 초과했습니다 — 잠시 후 다시 시도해주세요.",
      en: "The AI engine's usage limit was reached — please try again shortly.",
    }),
  },
  {
    test: (m) => m.includes("AI 엔진 요청이 많아"),
    map: () => ({
      ko: "AI 엔진 요청이 많아 지금은 응답할 수 없습니다 — 잠시 후 다시 시도해주세요.",
      en: "The AI engine is busy right now — please try again shortly.",
    }),
  },
  {
    test: (m) => m.includes("AI 엔진을 지금 사용할 수 없습니다"),
    map: () => ({
      ko: "AI 엔진을 지금 사용할 수 없습니다 — 운영팀에 알렸어요. 잠시 후 다시 시도해주세요.",
      en: "The AI engine is unavailable right now — we've alerted the team. Please try again later.",
    }),
  },
  {
    test: (m) => m.includes("등록한 API 키가 거부되었습니다"),
    map: () => ({
      ko: "등록한 API 키가 거부되었습니다 — 키와 Google 결제 상태를 확인해주세요.",
      en: "Your API key was refused — check the key and its Google billing.",
      link: "/account/api-key",
      linkLabel: { ko: "내 API 키 확인", en: "Check my API key" },
    }),
  },
  {
    test: (m) => m.includes("AI 엔진에서 오류가 발생했습니다"),
    map: () => ({
      ko: "AI 엔진에서 오류가 발생했습니다 — 잠시 후 다시 시도해주세요.",
      en: "The AI engine returned an error — please try again shortly.",
    }),
  },
  {
    test: (m) => m.includes("크레딧이 부족합니다"),
    map: () => ({ ko: "크레딧이 부족합니다.", en: "Not enough credits.", link: "/account/membership", linkLabel: { ko: "크레딧 충전하기", en: "Top up credits" } }),
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
    map: () => ({ ko: "로그인이 필요합니다.", en: "Please sign in.", link: "/auth", linkLabel: { ko: "로그인하기", en: "Sign in" } }),
  },
  {
    test: (m) => m.includes("서비스 이용 동의가 필요합니다"),
    map: () => ({ ko: "서비스 이용 동의가 필요해요.", en: "Please accept the terms to continue.", link: "/auth/consent", linkLabel: { ko: "동의하러 가기", en: "Review and accept" } }),
  },
];

export function mapRunError(message: string): MappedError {
  for (const { test, map } of PATTERNS) {
    if (test(message)) return map(message);
  }
  return { ko: message, en: message };
}
