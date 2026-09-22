import { Newspaper } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";
import { sourceSchema } from "./shared";

// HAEBOT_A_TOOLS_SPEC.md §4.5

const outputSchema = z.object({
  titles: z.array(z.string()).length(5),
  meta_description: z.string(),
  body_markdown: z.string(),
  h2_outline: z.array(z.string()),
  image_slots: z.array(z.object({ after_section: z.string(), purpose: z.string(), prompt: z.string() })),
  hashtags: z.array(z.string()),
  char_count: z.number(),
  sources: z.array(sourceSchema),
});

export const blog: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "blog",
  category: "content",
  name_ko: "해봇 블로그 원고",
  name_en: "Blog Draft",
  summary: "플랫폼에 맞는 블로그 원고를 근거와 함께 작성합니다.",
  icon: Newspaper,
  inputs: [
    { kind: "text", id: "topic", label: "주제/키워드", required: true },
    { kind: "text", id: "audience", label: "타겟 독자" },
    {
      kind: "select",
      id: "platform",
      label: "플랫폼",
      options: [
        { value: "naver", label: "네이버" },
        { value: "tistory", label: "티스토리" },
        { value: "brunch", label: "브런치" },
        { value: "wordpress", label: "워드프레스" },
      ],
    },
    {
      kind: "select",
      id: "post_type",
      label: "글 유형",
      options: [
        { value: "info", label: "정보·가이드" },
        { value: "review", label: "후기·리뷰" },
        { value: "story", label: "브랜드 이야기" },
        { value: "list", label: "리스트형" },
      ],
    },
    {
      kind: "select",
      id: "length",
      label: "글자수",
      options: [
        { value: "1000", label: "1000자" },
        { value: "1500", label: "1500자" },
        { value: "2500", label: "2500자" },
        { value: "4000", label: "4000자" },
      ],
    },
    { kind: "textarea", id: "must_include_facts", label: "포함할 사실", rows: 2 },
  ],
  usesProfile: ["tone"],
  acceptsChainFrom: ["keyword"],
  outputSchema,
  outputRenderer: "document",
  grounding: { requireSources: true, webSearch: false, estimateBadge: true },
  model: "gemini-3.6-flash",
  estimatedCredits: 20,
  estimatedSeconds: 30,
};
