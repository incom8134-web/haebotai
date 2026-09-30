import { Magnet } from "lucide-react";
import type { ToolManifest } from "../types";

// 훅 연구소: the first 3 seconds of short-form content, by hook family.
export const hookLab: ToolManifest = {
  id: "hook-lab",
  category: "campaign",
  name_ko: "훅 연구소",
  name_en: "Hook Lab",
  summary: "짧은 영상·게시물의 첫 3초를 잡는 훅을 유형별로",
  icon: Magnet,
  inputs: [
    { kind: "textarea", id: "topic", label: "무엇에 대한 콘텐츠인가요", rows: 3, required: true, max: 1200 },
    { kind: "text", id: "product", label: "알릴 제품·서비스 (선택)", max: 200 },
    { kind: "text", id: "audience", label: "보는 사람", max: 200 },
    {
      kind: "multiselect",
      id: "platforms",
      label: "올릴 곳",
      options: [
        { value: "reels", label: "인스타 릴스" },
        { value: "shorts", label: "유튜브 쇼츠" },
        { value: "tiktok", label: "틱톡" },
        { value: "threads", label: "스레드" },
        { value: "blog", label: "블로그 첫 문단" },
        { value: "ad", label: "광고 첫 줄" },
      ],
      max: 6,
    },
    {
      kind: "select",
      id: "goal",
      label: "이 콘텐츠의 목표",
      options: [
        { value: "awareness", label: "처음 알리기" },
        { value: "engagement", label: "댓글·저장" },
        { value: "follow", label: "팔로우" },
        { value: "sales", label: "구매·신청" },
      ],
    },
    {
      kind: "select",
      id: "tone",
      label: "말투",
      options: [
        { value: "calm", label: "차분한" },
        { value: "witty", label: "재치 있는" },
        { value: "bold", label: "도발적인" },
        { value: "warm", label: "다정한" },
      ],
    },
    { kind: "chips", id: "proof", label: "쓸 수 있는 사실·숫자 (선택)", max: 5 },
    { kind: "text", id: "avoid", label: "피할 표현", max: 200 },
  ],
  usesProfile: ["brand_name", "industry", "target_customer", "tone"],
  acceptsChainFrom: ["strategy", "brand-dna", "offer-architect"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 25,
  estimatedSeconds: 120,
};
