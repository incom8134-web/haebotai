import { Globe } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.12 — outputs a working single-file site, not
// a prompt to paste elsewhere (biggest capability gap in their catalog).
// GUARD (T7 prompt): no fabricated business facts — every phone number,
// address, price, or testimonial slot renders as [입력 필요], never invented.

const outputSchema = z.object({
  html: z.string(),
  sections: z.array(z.string()),
  preview_url: z.string(),
  zip_asset_id: z.string(),
});

export const homepage: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "homepage",
  category: "sales",
  name_ko: "해봇 홈페이지",
  name_en: "Homepage Generator",
  summary: "업종과 목적에 맞는 배포 가능한 홈페이지를 생성합니다.",
  icon: Globe,
  inputs: [
    {
      kind: "select",
      id: "purpose",
      label: "사이트 목적",
      options: [
        { value: "intro", label: "소개" },
        { value: "booking", label: "예약" },
        { value: "sales", label: "판매" },
        { value: "portfolio", label: "포트폴리오" },
        { value: "landing", label: "랜딩" },
      ],
    },
    {
      kind: "multiselect",
      id: "sections",
      label: "필요 섹션",
      options: [
        { value: "hero", label: "히어로" },
        { value: "about", label: "소개" },
        { value: "services", label: "서비스" },
        { value: "portfolio", label: "포트폴리오" },
        { value: "pricing", label: "가격" },
        { value: "testimonials", label: "후기" },
        { value: "contact", label: "문의" },
        { value: "faq", label: "FAQ" },
      ],
    },
    { kind: "url", id: "reference_site", label: "참고 사이트" },
  ],
  usesProfile: ["industry", "brand_name", "brand_colors"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "code",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.6-flash",
  estimatedCredits: 40,
  estimatedSeconds: 45,
};
