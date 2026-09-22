// Pure prompt-construction logic, split out of generate.ts so it's
// testable without pulling in GoogleGenAI (which reads a real secret at
// module scope and legitimately needs the "server-only" guard that stays
// in generate.ts). This is the part that decides what the model actually
// sees — a silent bug here degrades every generation's quality without
// ever throwing, which is exactly the kind of thing worth locking down
// with tests rather than trusting manual spot-checks.

import type { BusinessProfile, ToolManifest } from "./types";

// Prompt-level enforcement for the hard guards documented in policy.ts —
// that file's checks are the pre-flight/output-safety backstop; this is
// the primary enforcement now that real generation exists.
export const GUARDS: Partial<Record<string, string>> = {
  place:
    "이 도구는 가짜 리뷰를 생성하거나 고객인 척 리뷰를 쓰지 않습니다. review_response_templates에는 사업자가 실제 리뷰에 답하는 답글만 작성하세요.",
  logo: "실제 존재하는 브랜드의 로고, 워드마크, 마스코트와 유사하게 보일 수 있는 디자인은 생성하지 마세요.",
  "brand-model":
    "이름이 언급되었거나 사진이 첨부된, 실제로 식별 가능한 특정 인물의 얼굴을 닮은 인물은 생성하지 마세요.",
  homepage:
    '실제 전화번호, 주소, 가격, 고객 후기를 절대 지어내지 마세요. 입력값에 없는 정보는 반드시 "[입력 필요]"로 표시하세요.',
  sangsepage:
    "사용자가 입력하지 않은 효능·의료 효과, 또는 근거 없는 최상급 표현(예: 업계 1위, 완치, 최고)은 추가하지 마세요.",
};

export const PROFILE_LABELS: Record<keyof BusinessProfile, string> = {
  brand_name: "브랜드명",
  industry: "업종",
  business_stage: "사업 단계",
  target_customer: "타겟 고객",
  tone: "톤",
  voice_examples: "말투 예시",
  brand_colors: "브랜드 컬러",
  logo_asset_id: "로고",
  region: "지역",
  weekly_hours: "주당 가용시간",
  budget_band: "예산대",
};

export function formatValue(v: unknown): string {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "(없음)";
  if (v === undefined || v === null || v === "") return "(없음)";
  return String(v);
}

// Client-side (tool-runner.tsx) turns uploaded Files into base64 data
// URLs before the value ever reaches here — this just parses that back
// into raw bytes for the request.
export interface ImagePart {
  mimeType: string;
  data: string;
}

export function parseDataUrl(dataUrl: string): ImagePart | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

export function collectInputImages(manifest: ToolManifest, input: Record<string, unknown>): ImagePart[] {
  const images: ImagePart[] = [];
  for (const field of manifest.inputs) {
    if (field.kind !== "image") continue;
    const value = input[field.id];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item !== "string") continue;
      const parsed = parseDataUrl(item);
      if (parsed) images.push(parsed);
    }
  }
  return images;
}

export function buildContext(
  manifest: ToolManifest,
  input: Record<string, unknown>,
  profile: BusinessProfile | null,
): string {
  const lines = manifest.inputs.map((f) => {
    if (f.kind === "image") {
      const count = Array.isArray(input[f.id]) ? (input[f.id] as unknown[]).length : 0;
      return `- ${f.label}: ${count > 0 ? "(첨부된 이미지 참고)" : "(없음)"}`;
    }
    return `- ${f.label}: ${formatValue(input[f.id])}`;
  });
  if (profile) {
    for (const key of manifest.usesProfile) {
      lines.push(`- [비즈니스 프로필] ${PROFILE_LABELS[key]}: ${formatValue(profile[key])}`);
    }
  }
  return lines.join("\n");
}

export function buildBaseInstruction(manifest: ToolManifest): string[] {
  const parts = [
    `당신은 해봇 AI의 "${manifest.name_ko}" 도구입니다. ${manifest.summary}`,
    "이 사용자의 상황에 실제로 맞는 구체적인 내용을 만드세요. 누구에게나 해당하는 뻔하고 일반적인 결과는 피하세요.",
  ];
  const guard = GUARDS[manifest.id];
  if (guard) parts.push(guard);
  return parts;
}

export function buildSystemInstruction(manifest: ToolManifest): string {
  const parts = buildBaseInstruction(manifest);
  parts.splice(1, 0, "반드시 한국어로 작성하세요.");
  parts.push("응답은 오직 지정된 JSON 스키마 구조여야 합니다. 스키마에 없는 필드를 추가하지 마세요.");
  if (manifest.grounding.requireSources) {
    parts.push(
      "사실 주장(통계, 시장 규모, 가격 등)에는 근거가 필요합니다. 아래 [검색 근거]에 있는 내용만 사실 주장에 사용하고, 그 출처 URL만 사용하세요. 검색 근거에 없는 출처를 지어내지 마세요.",
    );
  }
  return parts.join("\n");
}

export function buildImageSystemInstruction(manifest: ToolManifest): string {
  const parts = buildBaseInstruction(manifest);
  parts.push(
    "텍스트로 설명하지 말고, 요청받은 실제 이미지를 생성해서 응답에 포함하세요. 이미지 없이 설명만 반환하는 것은 실패입니다.",
    "정확히 한 장의 완성된 사진만 생성하세요. 여러 컷을 하나의 이미지 안에 콜라주나 그리드로 합치거나, 번호나 라벨을 붙이거나, 분할 화면으로 만들지 마세요.",
  );
  return parts.join("\n");
}
