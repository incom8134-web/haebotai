import { FileSignature } from "lucide-react";
import { z } from "zod";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §5.1 — export to .docx + .pdf lands with the
// docx skill pattern (real styles, TOC, page numbers), not here.

const outputSchema = z.object({
  cover: z.string(),
  executive_summary: z.string(),
  problem: z.string(),
  solution: z.string(),
  execution_plan: z.array(z.string()),
  timeline: z.array(z.object({ phase: z.string(), weeks: z.number(), deliverable: z.string() })),
  pricing_table: z.array(z.object({ item: z.string(), amount_krw: z.number() })),
  company_intro: z.string(),
});

export const proposal: ToolManifest<z.infer<typeof outputSchema>> = {
  id: "proposal",
  category: "docs",
  name_ko: "해봇 제안서",
  name_en: "Proposal Writer",
  summary: "제안 대상과 내용으로 제안서 초안을 작성합니다.",
  icon: FileSignature,
  inputs: [
    { kind: "text", id: "target", label: "제안 대상", required: true },
    { kind: "textarea", id: "content", label: "제안 내용", rows: 4, required: true },
    { kind: "text", id: "budget", label: "예산 범위" },
    { kind: "text", id: "duration", label: "기간" },
    { kind: "chips", id: "differentiators", label: "차별점" },
    { kind: "image", id: "attachments", label: "첨부 자료", maxFiles: 3 },
  ],
  usesProfile: ["brand_name"],
  acceptsChainFrom: [],
  outputSchema,
  outputRenderer: "document",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.6-flash",
  estimatedCredits: 30,
  estimatedSeconds: 40,
};
