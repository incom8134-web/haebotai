// HAEBOT_A_TOOLS_SPEC.md §4.7 / Part 6 T5 — hard guard: `place` must
// never generate fake reviews, write reviews in a customer's voice, or
// advise on review manipulation. The real enforcement is the system
// prompt once real generation lands; this is the pre-flight layer that
// works today and stays in place as defense in depth afterward — catch
// the blatant case before a single token (real or mock) gets generated.
//
// §4.10 / T6 — brand-model's other hard guard ("refuse a real person's
// likeness, named or uploaded") needs face detection on the uploaded
// photo to enforce for real; brand-model has no free-text field to
// pattern-match today, so that guard stays a documented dependency on
// real vision generation rather than a fabricated check here — see T6
// notes in registry/brand-model.ts. checkOutputSafety below covers what
// *is* checkable now: the logo SVG the (mock or real) model hands back.
//
// §4.12 / T7 — homepage's hard guard: no fabricated phone number,
// address, price, or testimonial. Its manifest has no input field for
// any of those, so a real, invented-looking value in the HTML can only
// mean the model made it up — scan for that shape and reject.

import { sanitizeSvg } from "./svg.ts";

export interface PolicyResult {
  ok: boolean;
  reason?: string;
}

const FAKE_REVIEW_PATTERNS = [
  /가짜\s*리뷰/,
  /허위\s*(리뷰|후기)/,
  /리뷰\s*(써|작성해|만들어)/,
  /후기\s*(써|작성해|만들어)/,
  /고객인\s*척/,
  /fake review/i,
  /write.*review.*as.*(customer|user)/i,
];

function checkPlacePolicy(input: Record<string, unknown>): PolicyResult {
  const text = Object.values(input)
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === "string")
    .join(" ");

  if (FAKE_REVIEW_PATTERNS.some((p) => p.test(text))) {
    return { ok: false, reason: "가짜 리뷰 생성은 지원하지 않습니다. 리뷰 응답 템플릿만 제공합니다." };
  }
  return { ok: true };
}

export function checkToolPolicy(toolId: string, input: Record<string, unknown>): PolicyResult {
  if (toolId === "place") return checkPlacePolicy(input);
  return { ok: true };
}

const INVENTED_PHONE_PATTERN = /\b0\d{1,2}-\d{3,4}-\d{4}\b/;
const INVENTED_ADDRESS_PATTERN = /(서울|경기|부산|대구|인천|광주|대전|울산)[가-힣0-9\s]{2,}(로|길|동)\s?\d+/;

function checkHomepageSafety(output: unknown): PolicyResult {
  const html = (output as { html?: string }).html ?? "";
  if (INVENTED_PHONE_PATTERN.test(html)) {
    return { ok: false, reason: "실제 전화번호는 생성할 수 없습니다. [입력 필요]로 표시하세요." };
  }
  if (INVENTED_ADDRESS_PATTERN.test(html)) {
    return { ok: false, reason: "실제 주소는 생성할 수 없습니다. [입력 필요]로 표시하세요." };
  }
  return { ok: true };
}

export function checkOutputSafety(toolId: string, output: unknown): PolicyResult {
  if (toolId === "logo") {
    const concepts = (output as { concepts?: { svg: string }[] }).concepts ?? [];
    for (const concept of concepts) {
      const result = sanitizeSvg(concept.svg);
      if (!result.ok) return { ok: false, reason: `로고 SVG 검증 실패: ${result.reason}` };
    }
  }
  if (toolId === "homepage") return checkHomepageSafety(output);
  return { ok: true };
}
