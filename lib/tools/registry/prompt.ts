import { Terminal } from "lucide-react";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.4 — "테스트 실행" runs the generated prompt
// in-app; their version only hands you text to paste elsewhere.

export const prompt: ToolManifest = {
  id: "prompt",
  category: "ideas",
  name_ko: "해봇 프롬프트 빌더",
  name_en: "Prompt Builder",
  summary: "반복 업무를 재사용 가능한 프롬프트로 만듭니다.",
  icon: Terminal,
  inputs: [
    { kind: "textarea", id: "task", label: "반복 업무 설명", rows: 3, required: true },
    {
      kind: "select",
      id: "target_type",
      label: "실행할 AI 종류",
      options: [
        { value: "chat", label: "대화형 AI" },
        { value: "image", label: "이미지 생성 AI" },
        { value: "coding", label: "코딩 에이전트" },
        { value: "video", label: "영상 생성 AI" },
      ],
    },
    {
      kind: "select",
      id: "target_model",
      label: "대상 모델",
      options: [
        { value: "gpt", label: "GPT" },
        { value: "claude", label: "Claude" },
        { value: "gemini", label: "Gemini" },
        { value: "other", label: "기타" },
      ],
    },
    {
      kind: "select",
      id: "output_format",
      label: "출력 형식",
      options: [
        { value: "text", label: "텍스트" },
        { value: "json", label: "JSON" },
        { value: "markdown", label: "마크다운" },
        { value: "code", label: "코드" },
      ],
    },
    {
      kind: "select",
      id: "tone",
      label: "톤",
      options: [
        { value: "neutral", label: "기본" },
        { value: "friendly", label: "친근하게" },
        { value: "expert", label: "전문가처럼" },
        { value: "playful", label: "재치 있게" },
      ],
    },
    { kind: "chips", id: "constraints", label: "제약조건" },
    { kind: "textarea", id: "example_input", label: "예시 입력", rows: 2 },
    { kind: "textarea", id: "style_example", label: "마음에 들었던 프롬프트", rows: 3, max: 2000 },
  ],
  usesProfile: [],
  acceptsChainFrom: [],
  outputRenderer: "code",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 15,
  estimatedSeconds: 65,
};
