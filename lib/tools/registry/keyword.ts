import { Hash } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.6 — v1 estimates MUST render with a 추정
// badge; v1.1 swaps in 네이버 검색광고 API without a refactor.

const keywordSchema = z.object({
  term: z.string(),
  volume_band: z.string(),
  competition: z.string(),
  best_use: z.string(),
  data_source: z.enum(["measured", "estimated"]),
});

const outputSchema = z.object({
  tiers: z.object({
    mega: z.array(keywordSchema),
    mid: z.array(keywordSchema),
    micro: z.array(keywordSchema),
  }),
  combinations: z.array(z.string()),
  content_gaps: z.array(z.object({ gap: z.string(), suggested_topic: z.string() })),
});

export const keyword: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "keyword",
  category: "content",
  name_ko: "해봇 키워드 전략",
  name_en: "Keyword Strategy",
  summary: "메가·미드·마이크로 키워드 티어와 콘텐츠 공백을 찾습니다.",
  icon: Hash,
  inputs: [
    { kind: "text", id: "primary_keyword", label: "주력 키워드", required: true },
    { kind: "text", id: "region", label: "지역" },
    {
      kind: "select",
      id: "intent",
      label: "찾는 사람의 의도",
      options: [
        { value: "buy", label: "사려는 사람" },
        { value: "learn", label: "알아보는 사람" },
        { value: "local", label: "근처를 찾는 사람" },
      ],
    },
    {
      kind: "multiselect",
      id: "platforms",
      label: "플랫폼",
      options: [
        { value: "naver", label: "네이버" },
        { value: "google", label: "구글" },
        { value: "youtube", label: "유튜브" },
        { value: "instagram", label: "인스타" },
      ],
    },
  ],
  usesProfile: ["industry"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "table",
  grounding: { requireSources: false, webSearch: false, estimateBadge: true },
  model: "gemini-3.6-flash",
  estimatedCredits: 12,
  estimatedSeconds: 20,
};
