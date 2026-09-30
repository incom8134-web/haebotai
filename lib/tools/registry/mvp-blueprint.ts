import { Rocket } from "lucide-react";
import type { ToolManifest } from "../types";

// MVP 설계도: the smallest real first version and the order to launch it.
export const mvpBlueprint: ToolManifest = {
  id: "mvp-blueprint",
  category: "discover",
  name_ko: "MVP 설계도",
  name_en: "MVP Blueprint",
  summary: "아이디어를 처음 내놓을 최소한의 제품과 출시 순서로",
  icon: Rocket,
  inputs: [
    { kind: "textarea", id: "idea", label: "만들 제품·서비스", rows: 3, required: true, max: 1200 },
    { kind: "text", id: "target_user", label: "처음 쓸 사람", max: 200 },
    {
      kind: "select",
      id: "product_type",
      label: "형태",
      options: [
        { value: "web", label: "웹 서비스" },
        { value: "app", label: "모바일 앱" },
        { value: "service", label: "사람이 하는 서비스" },
        { value: "physical", label: "실물 제품" },
        { value: "content", label: "콘텐츠·강의" },
      ],
    },
    {
      kind: "select",
      id: "build_skill",
      label: "만드는 사람",
      options: [
        { value: "none", label: "개발을 못 해요 (노코드)" },
        { value: "some", label: "조금 해요" },
        { value: "dev", label: "개발자가 있어요" },
      ],
    },
    { kind: "number", id: "weeks", label: "출시까지 쓸 수 있는 기간", unit: "주", min: 1, max: 52 },
    { kind: "number", id: "budget", label: "예산", unit: "원", min: 0 },
    { kind: "textarea", id: "must_have", label: "꼭 있어야 한다고 생각하는 기능 (선택)", rows: 2, max: 600 },
  ],
  usesProfile: ["brand_name", "industry"],
  acceptsChainFrom: ["idea-radar", "market-gap"],
  outputRenderer: "cards",
  grounding: { requireSources: false, webSearch: false, estimateBadge: false },
  model: "gemini-3.1-pro-preview",
  estimatedCredits: 40,
  estimatedSeconds: 190,
};
