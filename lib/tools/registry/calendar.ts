import { CalendarDays } from "lucide-react";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.3 — chains from `money`/`trend` automatically,
// no file export/upload (their documented failure mode).

export const calendar: ToolManifest = {
  id: "calendar",
  category: "ideas",
  name_ko: "해봇 90일 실행 캘린더",
  name_en: "90-Day Execution Calendar",
  summary: "실행할 모델을 13주 실행 계획으로 쪼갭니다.",
  icon: CalendarDays,
  inputs: [
    { kind: "textarea", id: "model", label: "실행할 모델", rows: 2, required: true },
    { kind: "text", id: "start_date", label: "시작일", placeholder: "YYYY-MM-DD", required: true },
    { kind: "chips", id: "milestones", label: "주요 마일스톤" },
    {
      kind: "select",
      id: "pace",
      label: "진행 속도",
      options: [
        { value: "steady", label: "꾸준히 (주 5~8시간)" },
        { value: "sprint", label: "집중 (주 15시간+)" },
      ],
    },
  ],
  usesProfile: ["weekly_hours"],
  acceptsChainFrom: ["money", "trend"],
  outputRenderer: "calendar",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 35,
  estimatedSeconds: 80,
};
