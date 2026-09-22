import type { Source } from "./registry/shared";
import type { ToolManifest } from "./types";

// HAEBOT_A_TOOLS_SPEC.md §3.2 / Part 6 T3 — the grounding guard. Runs
// after generation, before a result is accepted: a tool with
// `grounding.requireSources` can never emit a result with no sources.
// This is the enforcement step; the 출처 panel and 추정 badge (rendered
// in ToolRunner) are just this rule made visible.

export interface GroundingResult {
  ok: boolean;
  reason?: string;
}

export function checkGrounding(manifest: ToolManifest, sources: Source[]): GroundingResult {
  if (!manifest.grounding.requireSources) return { ok: true };

  if (sources.length === 0) {
    return { ok: false, reason: "출처 없이 사실 주장을 생성할 수 없습니다" };
  }

  const invalid = sources.find((s) => !s.url.trim() || !s.title.trim());
  if (invalid) {
    return { ok: false, reason: "출처에 URL 또는 제목이 없습니다" };
  }

  return { ok: true };
}
