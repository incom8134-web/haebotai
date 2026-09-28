import { FileSignature } from "lucide-react";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §5.1 — export to .docx + .pdf lands with the
// docx skill pattern (real styles, TOC, page numbers), not here.

export const proposal: ToolManifest = {
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
  outputRenderer: "document",
  grounding: { requireSources: false, webSearch: true, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 45,
  estimatedSeconds: 95,
};
