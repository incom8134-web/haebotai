import { MessageSquareText } from "lucide-react";
import type { ToolManifest } from "../types";

// HAEBOT_A_TOOLS_SPEC.md §4.4, laid out like hyeoksinai.com/tools/prompt:
// 1. which kind of AI runs the prompt, 2. purpose / audience / tone /
// output format (each defaults to "let the AI decide"), 3. the goal, plus
// an optional prompt the member liked. Reference files go through the
// reference panel every tool has. "테스트 실행" runs the result in-app.

const AUTO = { value: "auto", label: "기본 (AI 판단)" };

export const prompt: ToolManifest = {
  id: "prompt",
  category: "operate",
  name_ko: "프롬프트 만들기",
  name_en: "Make a prompt",
  summary: "ChatGPT·이미지 AI 등에 시킬 말을 전문가처럼 대신 써 드려요.",
  icon: MessageSquareText,
  inputs: [
    {
      kind: "select",
      id: "target_type",
      label: "시킬 AI",
      required: true,
      options: [
        { value: "chat", label: "대화형 AI" },
        { value: "image", label: "이미지 만드는 AI" },
        { value: "coding", label: "코딩 AI" },
        { value: "video", label: "영상 만드는 AI" },
      ],
    },
    {
      kind: "select",
      id: "purpose",
      label: "쓰는 곳",
      options: [
        AUTO,
        { value: "blog", label: "블로그·글쓰기" },
        { value: "sns", label: "SNS·짧은 영상 대본" },
        { value: "business", label: "업무 문서·이메일" },
        { value: "work", label: "일 빨리 끝내기" },
        { value: "ideas", label: "아이디어 내기" },
        { value: "coding", label: "코딩·개발" },
      ],
    },
    {
      kind: "select",
      id: "audience",
      label: "누가 읽나요",
      options: [
        AUTO,
        { value: "everyone", label: "누구나" },
        { value: "beginner", label: "처음 하는 사람" },
        { value: "expert", label: "전문가·실무자" },
        { value: "boss", label: "윗사람·대표" },
        { value: "customer", label: "손님·거래처" },
        { value: "me", label: "나 혼자 씀" },
      ],
    },
    {
      kind: "select",
      id: "tone",
      label: "말투",
      options: [
        AUTO,
        { value: "logical", label: "꼼꼼하고 논리적으로" },
        { value: "friendly", label: "친절하고 부드럽게" },
        { value: "witty", label: "재치 있게" },
        { value: "factual", label: "사실만 담백하게" },
        { value: "warm", label: "따뜻하게, 공감하며" },
        { value: "persuasive", label: "강하게, 설득력 있게" },
      ],
    },
    {
      kind: "select",
      id: "output_format",
      label: "결과 모양",
      options: [
        AUTO,
        { value: "paragraphs", label: "자세한 줄글" },
        { value: "bullets", label: "핵심만 요약 (글머리표)" },
        { value: "steps", label: "단계별 안내" },
        { value: "table", label: "비교 표" },
        { value: "markdown", label: "깔끔한 문서 (마크다운)" },
        { value: "code", label: "코드" },
      ],
    },
    { kind: "textarea", id: "task", label: "원하는 목표나 결과물", rows: 4, max: 2000, required: true },
    { kind: "textarea", id: "style_example", label: "마음에 들었던 프롬프트 (선택)", rows: 3, max: 2000 },
  ],
  usesProfile: [],
  acceptsChainFrom: [],
  outputRenderer: "code",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 20,
  estimatedSeconds: 140,
};
