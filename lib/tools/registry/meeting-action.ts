import { MessagesSquare } from "lucide-react";
import type { ToolManifest } from "../types";

// 회의→실행 보드: meeting notes → decisions, owners, deadlines, open questions.
export const meetingAction: ToolManifest = {
  id: "meeting-action",
  category: "operate",
  name_ko: "회의→실행 보드",
  name_en: "Meeting-to-Action",
  summary: "회의 메모를 결정사항·담당자·마감이 있는 실행 보드로",
  icon: MessagesSquare,
  inputs: [
    { kind: "textarea", id: "notes", label: "회의 메모·녹취 텍스트", rows: 10, required: true, max: 12000 },
    { kind: "text", id: "meeting_date", label: "회의 날짜", placeholder: "YYYY-MM-DD", max: 10 },
    { kind: "chips", id: "participants", label: "참석자", max: 12 },
    {
      kind: "select",
      id: "meeting_type",
      label: "어떤 회의였나요",
      options: [
        { value: "team", label: "팀 정기 회의" },
        { value: "client", label: "고객·거래처 미팅" },
        { value: "planning", label: "기획·아이디어 회의" },
        { value: "review", label: "회고·점검" },
      ],
    },
  ],
  usesProfile: ["brand_name"],
  acceptsChainFrom: [],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 20,
  estimatedSeconds: 100,
};
