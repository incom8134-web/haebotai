"use client";

import { useBi } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

// Where a finding came from: searched on the web, given by the member, or
// the model's own inference. Shown on every research finding.

const LABEL: Record<string, { ko: string; en: string; cls: string }> = {
  search: { ko: "검색 근거", en: "Searched", cls: "border-grounded/40 text-grounded" },
  user: { ko: "입력 내용", en: "Your input", cls: "border-ai/40 text-ai" },
  hypothesis: { ko: "가설", en: "Hypothesis", cls: "border-dashed border-hairline-str text-fg-subtle" },
};

export function Origin({ origin }: { origin: string }) {
  const L = useBi();
  const o = LABEL[origin];
  if (!o) return null;
  return <span className={cn("inline-block rounded-full border px-1.5 py-px text-[10px] leading-4 whitespace-nowrap", o.cls)}>{L(o)}</span>;
}

export const CONFIDENCE: Record<string, { ko: string; en: string }> = { high: { ko: "신뢰 높음", en: "High confidence" }, medium: { ko: "신뢰 보통", en: "Medium" }, low: { ko: "신뢰 낮음", en: "Low" } };
