import { GitFork } from "lucide-react";
import type { ToolManifest } from "../types";

// 콘텐츠 변환기: one piece of content, re-shaped for each platform.
export const contentTransformer: ToolManifest = {
  id: "content-transformer",
  category: "campaign",
  name_ko: "콘텐츠 변환기",
  name_en: "Content Transformer",
  summary: "글 하나를 인스타·링크드인·쇼츠·뉴스레터용으로 각각 다시",
  icon: GitFork,
  inputs: [
    { kind: "textarea", id: "source", label: "원본 콘텐츠 (글, 대본, 메모)", rows: 8, required: true, max: 8000 },
    {
      kind: "select",
      id: "source_type",
      label: "원본의 종류",
      options: [
        { value: "blog", label: "블로그·칼럼" },
        { value: "newsletter", label: "뉴스레터" },
        { value: "video_script", label: "영상 대본" },
        { value: "notes", label: "메모·강의 노트" },
        { value: "product_page", label: "상품 소개" },
      ],
    },
    {
      kind: "multiselect",
      id: "targets",
      label: "만들 버전",
      options: [
        { value: "instagram_carousel", label: "인스타 카드뉴스" },
        { value: "instagram_caption", label: "인스타 캡션" },
        { value: "threads", label: "스레드 연재" },
        { value: "linkedin", label: "링크드인" },
        { value: "shorts_script", label: "쇼츠·릴스 대본" },
        { value: "newsletter", label: "뉴스레터" },
        { value: "naver_blog", label: "네이버 블로그" },
        { value: "kakao", label: "카카오톡 채널" },
      ],
      max: 8,
    },
    { kind: "text", id: "audience", label: "읽을 사람", max: 200 },
    { kind: "text", id: "cta", label: "마지막에 하게 할 행동", max: 120 },
  ],
  usesProfile: ["brand_name", "industry", "tone", "voice_examples"],
  acceptsChainFrom: ["blog", "strategy"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 30,
  estimatedSeconds: 150,
};
