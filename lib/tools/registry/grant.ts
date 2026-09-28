import { Landmark } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §5.3 — only honest with real data. Requires live
// K-Startup / 기업마당(bizinfo) listings; every match carries a real
// source_url. If the data source is unavailable, the runner must return
// an explicit "현재 공고 데이터를 불러올 수 없습니다" state — never a
// model-generated program name. Ship as 준비 중 if the API isn't wired.

const outputSchema = z.object({
  matches: z.array(
    z.object({
      program_name: z.string(),
      agency: z.string(),
      deadline: z.string(),
      funding_scale: z.string(),
      eligibility: z.array(z.object({ requirement: z.string(), user_meets: z.boolean(), note: z.string() })),
      document_checklist: z.array(z.string()),
      difficulty: z.number().min(1).max(5),
      source_url: z.string(),
    }),
  ),
  unmatched_reasons: z.array(z.string()),
});

export const grant: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "grant",
  category: "docs",
  name_ko: "해봇 지원사업 매칭",
  name_en: "Grant Matcher",
  summary: "사업 정보에 맞는 정부지원사업 후보와 서류 체크리스트를 찾습니다.",
  icon: Landmark,
  inputs: [
    {
      kind: "select",
      id: "years_in_business",
      label: "업력",
      options: [
        { value: "pre", label: "예비창업" },
        { value: "u1", label: "1년 미만" },
        { value: "1_3", label: "1~3년" },
        { value: "3_7", label: "3~7년" },
        { value: "7+", label: "7년 이상" },
      ],
    },
    {
      kind: "select",
      id: "region",
      label: "지역",
      options: [
        { value: "seoul", label: "서울" },
        { value: "gyeonggi_incheon", label: "경기·인천" },
        { value: "chungcheong", label: "충청" },
        { value: "jeolla", label: "전라" },
        { value: "gyeongsang", label: "경상" },
        { value: "gangwon_jeju", label: "강원·제주" },
      ],
    },
    {
      kind: "select",
      id: "revenue_band",
      label: "연매출 규모",
      options: [
        { value: "u1", label: "1억 미만" },
        { value: "1_10", label: "1~10억" },
        { value: "10_50", label: "10~50억" },
        { value: "50+", label: "50억 이상" },
      ],
    },
    { kind: "number", id: "employee_count", label: "종업원수", min: 0 },
    { kind: "chips", id: "tech_fields", label: "기술분야" },
    {
      kind: "multiselect",
      id: "support_types",
      label: "희망 지원 유형",
      options: [
        { value: "rnd", label: "R&D" },
        { value: "startup", label: "창업" },
        { value: "export", label: "수출" },
        { value: "employment", label: "고용" },
        { value: "facility", label: "시설" },
      ],
    },
  ],
  usesProfile: ["industry"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "table",
  grounding: { requireSources: true, webSearch: true, estimateBadge: false },
  model: "gemini-3.6-flash",
  estimatedCredits: 35,
  estimatedSeconds: 30,
  // No K-Startup / bizinfo integration yet — see the note at the top.
  comingSoon: true,
};
