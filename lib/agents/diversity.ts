// Diversity memory (docs/ai-architecture-proposal.md §3.6). Each finished
// run records a fingerprint of how it was built — the strategy, the
// creative direction and the blueprint's parts. The strategist sees the
// member's recent fingerprints (to break ties only), and the critic gets a
// sameness note when a draft's structure closely repeats a recent one.
// Advisory only: fit always wins over novelty.

import type { Strategy } from "./types.ts";

export interface Fingerprint {
  strategy: string;
  direction: string;
  parts: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function fingerprintOf(strategy: Strategy | null, directionId: string | null | undefined): Fingerprint | null {
  if (!strategy) return null;
  return { strategy: strategy.chosen, direction: directionId ?? "", parts: strategy.blueprint.map((b) => norm(b.part)).filter(Boolean).slice(0, 16) };
}

/** Jaccard similarity of two blueprints' part words (0…1). */
export function similarity(a: Fingerprint, b: Fingerprint): number {
  const words = (f: Fingerprint) => new Set(f.parts.flatMap((p) => p.split(" ")).filter((w) => w.length > 1));
  const A = words(a);
  const B = words(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/** A note for the critic when this structure repeats a recent run closely; null otherwise. */
export function samenessNote(current: Fingerprint | null, recent: Fingerprint[], threshold = 0.6): string | null {
  if (!current) return null;
  const close = recent.filter((r) => r.strategy === current.strategy && r.direction === current.direction && similarity(current, r) >= threshold);
  if (close.length === 0) return null;
  return "[참고] 이 초안의 전략·스타일·구조가 이 사용자의 최근 결과와 거의 같습니다. 요청에 더 잘 맞는 차별화가 가능한 부분이 있으면 지적하세요. 요청에 맞는 선택이라면 문제 삼지 마세요.";
}

/** One line per recent fingerprint, for the strategist's tie-breaks. */
export function recentLabels(recent: Fingerprint[]): string[] {
  return recent.map((r) => [r.strategy, r.direction].filter(Boolean).join(" · ")).filter(Boolean).slice(0, 4);
}
