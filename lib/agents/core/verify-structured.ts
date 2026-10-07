import type { TaskContract } from "./contract.ts";
import { numbersOf } from "./verify.ts";

// Contract checks for the structured tools (decks, copy, plans, reports):
// the same idea as the document verifier, on a JSON result. Failures are
// handed to the critic as high-severity issues, so the revision loop acts
// on measured problems, not only on the critic's reading.
//
// Pure logic (tested).

interface StructuredIssue {
  where: string;
  problem: string;
  fix: string;
  severity: "high" | "medium";
}

function slidesOf(output: unknown): { headline?: string; title?: string }[] | null {
  const o = output as { slides?: unknown } | null;
  return o && Array.isArray(o.slides) ? (o.slides as { headline?: string; title?: string }[]) : null;
}

export function verifyStructured(opts: {
  toolId: string;
  contract: TaskContract;
  output: unknown;
  mustInclude: string[];
  /** Everything the facts may come from: input, source text, research. */
  knownText: string;
  sourceSlideCount?: number;
}): StructuredIssue[] {
  const { contract: c, output } = opts;
  const issues: StructuredIssue[] = [];
  const text = JSON.stringify(output ?? {});
  const flat = (t: string) => t.replace(/\s+/g, "").toLowerCase();

  const slides = slidesOf(output);
  if (slides) {
    const want = c.length.unit === "slides" && c.length.target ? c.length.target : c.preserve.order && opts.sourceSlideCount ? opts.sourceSlideCount : null;
    if (want && Math.abs(slides.length - want) > (c.length.strict || c.preserve.order ? 0 : 2))
      issues.push({ where: "슬라이드 수", problem: `요청한 ${want}장과 다른 ${slides.length}장입니다`, fix: `정확히 ${want}장으로 맞추세요${c.preserve.order ? " (원본의 N번째 장이 결과의 N번째 장)" : ""}`, severity: "high" });
  }

  for (const m of opts.mustInclude) {
    const words = m.split(/\s+/).map(flat).filter((w) => w.length >= 2);
    if (words.length && words.filter((w) => flat(text).includes(w)).length < Math.ceil(words.length * 0.6))
      issues.push({ where: "반드시 담을 것", problem: `"${m}"이(가) 결과에 없습니다`, fix: `"${m}"을(를) 결과에 반영하세요`, severity: "high" });
  }

  if (c.mode === "polish" || c.mode === "rewrite") {
    const out = numbersOf(text);
    const lost = [...numbersOf(opts.knownText)].filter((n) => !out.has(n)).slice(0, 6);
    if (lost.length > 2) issues.push({ where: "원본 수치", problem: `원본의 수치 ${lost.join(", ")}가 결과에서 빠졌습니다`, fix: "원본의 사실과 수치를 빠짐없이 유지하세요", severity: "high" });
  }

  if (c.research.need === "required" && !/\[\d{1,2}\]|https?:\/\//.test(text) && /source|출처|sources/.test(JSON.stringify(Object.keys((output as object) ?? {}))) === false) {
    issues.push({ where: "조사", problem: "조사가 필요한 요청인데 결과에 출처 표시가 없습니다", fix: "조사한 사실을 출처 번호와 함께 반영하세요", severity: "medium" });
  }
  return issues;
}
