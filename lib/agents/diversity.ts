// Diversity memory (docs/ai-architecture-proposal.md §3.6). Each finished
// run records a fingerprint of how it was built — the strategy, the
// creative direction and the blueprint's parts. The strategist sees the
// member's recent fingerprints (to break ties only), and the critic gets a
// sameness note when a draft's structure closely repeats a recent one.
// Advisory only: fit always wins over novelty.

import { signatureSimilarity } from "./skeleton.ts";
import type { Strategy } from "./types.ts";

export interface Fingerprint {
  strategy: string;
  direction: string;
  parts: string[];
  /** Position in the strategy space (lib/agents/space.ts), v2 runs. */
  coords?: string[];
  /** The finished result's skeleton signature (lib/agents/skeleton.ts), v2 runs. */
  shape?: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function fingerprintOf(strategy: Strategy | null, directionId: string | null | undefined, shape?: string[]): Fingerprint | null {
  if (!strategy) return null;
  const coords = strategy.considered.find((c) => c.name === strategy.chosen)?.coords;
  return {
    strategy: strategy.chosen,
    direction: directionId ?? "",
    parts: strategy.blueprint.map((b) => norm(b.part)).filter(Boolean).slice(0, 16),
    ...(coords?.some(Boolean) ? { coords } : {}),
    ...(shape?.length ? { shape } : {}),
  };
}

/** A note for the critic when the draft's own shape repeats a recent result's (the template detector's memory); null otherwise. */
export function shapeNote(shape: string[] | undefined, recent: Fingerprint[], threshold = 0.85): string | null {
  if (!shape?.length) return null;
  const close = recent.filter((r) => r.shape?.length && signatureSimilarity(shape, r.shape) >= threshold);
  if (close.length === 0) return null;
  return "[참고] 이 초안의 형태(부분의 수·순서·레이아웃)가 이 사용자의 최근 결과와 거의 같습니다. 이번 요청이 같은 형태를 요구하는 게 아니라면, 형태가 요청에서 나오지 않고 습관에서 나온 부분을 structure 이슈로 지적하세요.";
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
