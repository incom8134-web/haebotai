import type { Bilingual } from "@/lib/tools/content";
import { catalogTool } from "../tools/catalog.ts";

// Onboarding goals and the dashboard's "recommended next" (docs/redesign-
// plan.md §5). Tool references are catalog slugs.

export type GoalId = "start" | "brand" | "sell" | "grow" | "research";

const b = (ko: string, en: string): Bilingual => ({ ko, en });

export const ONBOARDING_GOALS: {
  id: GoalId;
  title: Bilingual;
  body: Bilingual;
  tools: string[];
}[] = [
  {
    id: "start",
    title: b("사업 방향 잡기", "Find a direction"),
    body: b(
      "무엇을, 누구에게, 어떻게 팔지 정해요.",
      "Decide what to sell, to whom, and how it earns.",
    ),
    tools: ["idea-radar", "revenue-mapper", "mvp-blueprint"],
  },
  {
    id: "brand",
    title: b("브랜드 만들기", "Build a brand"),
    body: b(
      "성격·색·서체를 정하고 로고와 사이트로.",
      "Personality, colour and type, then a logo and site.",
    ),
    tools: ["brand-dna", "logo-lab", "web-builder"],
  },
  {
    id: "sell",
    title: b("판매 준비하기", "Get ready to sell"),
    body: b(
      "사고 싶어지는 제안, 상세페이지, 광고.",
      "An offer people want, a sales page and ads.",
    ),
    tools: ["offer-architect", "sales-page", "ad-factory"],
  },
  {
    id: "grow",
    title: b("마케팅 돌리기", "Run marketing"),
    body: b(
      "캠페인 계획과 채널별 콘텐츠.",
      "A campaign plan and content for each channel.",
    ),
    tools: ["campaign-planner", "hook-lab", "content-transformer"],
  },
  {
    id: "research",
    title: b("시장·고객 알아보기", "Understand the market"),
    body: b(
      "시장 규모, 경쟁사, 고객 페르소나.",
      "Market size, competitors and customer personas.",
    ),
    tools: ["market-desk", "competitor-lens", "persona-mapper"],
  },
];

export const DEFAULT_TOOLS = [
  "idea-radar",
  "brand-dna",
  "offer-architect",
  "campaign-planner",
];

export function isGoal(v: unknown): v is GoalId {
  return typeof v === "string" && ONBOARDING_GOALS.some((g) => g.id === v);
}

/**
 * Up to `limit` runnable tools to suggest next: what the latest result
 * naturally hands off to, then the member's goal, then a default spread.
 * Tools already used are skipped unless nothing else is left.
 * `lastTool` and `usedTools` may be engine ids or slugs.
 */
export function recommendTools(opts: {
  lastTool?: string | null;
  usedTools?: string[];
  goal?: GoalId | null;
  limit?: number;
}): string[] {
  const limit = opts.limit ?? 3;
  const used = new Set(
    (opts.usedTools ?? []).map((t) => catalogTool(t)?.slug ?? t),
  );
  const last = opts.lastTool ? catalogTool(opts.lastTool) : undefined;
  const goal = opts.goal
    ? ONBOARDING_GOALS.find((g) => g.id === opts.goal)
    : undefined;
  const pool = [
    ...(last?.next ?? []),
    ...(goal?.tools ?? []),
    ...DEFAULT_TOOLS,
  ];
  const runnable = [...new Set(pool)].filter((slug) => {
    const t = catalogTool(slug);
    return !!t && !!t.engine && !t.hidden;
  });
  const fresh = runnable.filter((s) => !used.has(s));
  return [...fresh, ...runnable.filter((s) => used.has(s))].slice(0, limit);
}
