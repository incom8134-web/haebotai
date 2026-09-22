import { MessageSquareText } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// From the aimarketingstudio prototype's "Campaign Copy AI": one idea,
// adapted per channel and per audience motivation — real angles, not
// word swaps. Text-only, no web search; profile tone drives the voice.

const outputSchema = z.object({
  core_message: z.string(),
  angles: z.array(
    z.object({
      motivation: z.string(),
      headline: z.string(),
      body: z.string(),
      cta: z.string(),
    }),
  ),
  channel_versions: z.array(z.object({ channel: z.string(), copy: z.string(), note: z.string() })),
  words_to_avoid: z.array(z.string()),
});

export const copy: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "copy",
  category: "content",
  name_ko: "해봇 캠페인 카피",
  name_en: "Campaign Copy",
  summary: "하나의 메시지를 채널과 고객 동기별 카피로 나눠 씁니다.",
  icon: MessageSquareText,
  inputs: [
    { kind: "textarea", id: "offer", label: "알리고 싶은 것", rows: 3, required: true, max: 600 },
    { kind: "text", id: "audience", label: "대상 고객" },
    {
      kind: "select",
      id: "goal",
      label: "카피의 목표",
      options: [
        { value: "awareness", label: "알리기" },
        { value: "conversion", label: "구매·신청" },
        { value: "retention", label: "다시 오게" },
      ],
    },
    {
      kind: "multiselect",
      id: "channels",
      label: "채널",
      options: [
        { value: "instagram", label: "인스타그램" },
        { value: "paid_social", label: "SNS 광고" },
        { value: "email", label: "이메일" },
        { value: "landing", label: "랜딩 페이지" },
        { value: "sms", label: "문자·알림톡" },
      ],
    },
    { kind: "number", id: "variants", label: "동기별 변형 수", min: 1, max: 5 },
    { kind: "chips", id: "must_include", label: "꼭 넣을 사실", max: 6 },
  ],
  usesProfile: ["brand_name", "tone", "voice_examples", "target_customer"],
  acceptsChainFrom: ["strategy", "keyword"],
  outputSchema,
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: true },
  model: "gemini-3.6-flash",
  estimatedCredits: 15,
  estimatedSeconds: 20,
};
