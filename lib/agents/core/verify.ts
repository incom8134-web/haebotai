import type { TaskContract } from "./contract.ts";
import type { SourceAnalysis } from "./analysis.ts";
import type { DocumentPlan } from "./plan.ts";
import type { ResearchResult } from "./research.ts";
import { blockText, estimatePages, documentChars, visualCount, type LongDocument, type DocSection } from "./document.ts";
import type { SourceDoc } from "./source.ts";
import type { LintReport } from "./lint.ts";

// The requirement checker. The model saying "done" proves nothing; these
// checks measure the result against the contract: length (from the
// rendered PDF when there is one), order and wording preservation,
// numbers kept, source coverage, requirements answered, research used,
// visuals, numbers nobody can source, and template-like writing. A failed
// check names the sections to fix, so a revision is targeted.
//
// Pure logic (tested).

export interface Check {
  id: string;
  label: string;
  target: string;
  actual: string;
  pass: boolean;
  severity: "high" | "medium" | "info";
  /** What a revision should do, and where. */
  fix?: string;
  sections?: string[];
}

export interface Verification {
  checks: Check[];
  pass: boolean;
  /** Section ids a revision should rework, with the reasons. */
  targets: Record<string, string[]>;
}

const norm = (t: string) => t.replace(/[\s\u00a0.,·:：;!?'"“”‘’()[\]{}<>~\-–—/|*_#•▪◦○●□■※➔→✓✔]/g, "");

/** Numbers that carry meaning (2+ digits, decimals, percentages), normalized ("30,000" → "30000"). */
export function numbersOf(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const n = m[0].replace(/,/g, "").replace(/\.$/, "");
    const v = n.replace(/^0+(?=\d)/, "");
    if ((v.replace(/\D/g, "").length >= 2 || v.includes(".")) && Number(v) !== 0) out.add(v);
  }
  return out;
}

/** Share of the source's sentences found verbatim (spacing and punctuation aside) in the output. */
export function verbatimShare(source: string, output: string): number {
  const out = norm(output);
  const parts = source.split(/\n+|(?<=[.!?。다요])\s+/).map(norm).filter((p) => p.length >= 6);
  if (!parts.length) return 1;
  return parts.filter((p) => out.includes(p)).length / parts.length;
}

function sectionTextOf(s: DocSection): string {
  return [s.title, ...s.blocks.map(blockText)].join("\n");
}

const ASSUMPTION_RX = /(가정|목표|예상|추정|예측|계획|target|assum|estimat|project)/i;

export function verify(opts: {
  contract: TaskContract;
  doc: LongDocument;
  plan: DocumentPlan;
  sources: SourceDoc[];
  analysis: SourceAnalysis | null;
  research: ResearchResult | null;
  inputText: string;
  mustInclude: string[];
  lint: LintReport | null;
  charsPerPage: number;
  renderedPages?: number | null;
}): Verification {
  const { contract: c, doc, plan, sources } = opts;
  const checks: Check[] = [];
  const targets: Record<string, string[]> = {};
  const flag = (ids: string[], why: string) => ids.forEach((id) => (targets[id] ??= []).push(why));
  const sourceSections = sources.flatMap((d) => d.sections);
  const byId = new Map(sourceSections.map((s) => [s.id, s]));

  // 1. Length.
  if (c.length.target && (c.length.unit === "pages" || c.length.unit === "chars" || c.length.unit === "words")) {
    const t = c.length.target;
    const actual = c.length.unit === "pages" ? (opts.renderedPages ?? estimatePages(doc, opts.charsPerPage)) : c.length.unit === "chars" ? documentChars(doc) : Math.round(documentChars(doc) / (opts.charsPerPage > 2000 ? 5 : 2.6));
    const [lo, hi] = c.length.strict ? [0.88, 1.18] : [0.75, 1.35];
    const pass = actual >= t * lo && actual <= t * hi;
    const unit = { pages: "쪽", chars: "자", words: "단어" }[c.length.unit];
    const thin = [...doc.sections].map((s) => ({ s, ratio: sectionTextOf(s).replace(/\s+/g, "").length / Math.max(1, plan.sections.find((p) => p.id === s.id)?.targetChars ?? 1) })).sort((a, b) => a.ratio - b.ratio);
    checks.push({
      id: "length",
      label: "분량",
      target: `${t}${unit}`,
      actual: `${actual}${unit}${opts.renderedPages && c.length.unit === "pages" ? " (실제 렌더링)" : c.length.unit === "pages" ? " (추정)" : ""}`,
      pass,
      severity: c.length.strict ? "high" : "medium",
      fix: actual < t * lo ? "분량이 모자랍니다. 가장 얇은 섹션을 근거·분석·실행 세부로 확장하세요(반복 금지)." : actual > t * hi ? "분량이 넘칩니다. 반복과 덜 중요한 부분을 줄이세요." : undefined,
      sections: pass ? undefined : actual < t * lo ? thin.slice(0, Math.max(2, Math.ceil(thin.length / 3))).map((x) => x.s.id) : thin.slice(-3).map((x) => x.s.id),
    });
    if (!pass) flag(checks[checks.length - 1].sections ?? [], checks[checks.length - 1].fix!);
  }

  // 2. The whole source was analyzed.
  if (sourceSections.length) {
    const analyzed = new Set(opts.analysis?.sections.map((s) => s.id) ?? []);
    const n = sourceSections.filter((s) => analyzed.has(s.id)).length;
    checks.push({ id: "source_analyzed", label: "올린 자료 분석", target: `${sourceSections.length}개 섹션 전부`, actual: opts.analysis ? `${n}/${sourceSections.length}` : "분석 실패", pass: !!opts.analysis && n >= sourceSections.length * 0.85, severity: "medium" });
  }

  // 3. Order preserved.
  if (c.preserve.order && sourceSections.length) {
    const order = doc.sections.map((s) => s.sourceRefs[0]).filter((id) => id && byId.has(id)).map((id) => sourceSections.findIndex((x) => x.id === id));
    let inversions = 0;
    for (let i = 1; i < order.length; i++) if (order[i] < order[i - 1]) inversions++;
    const missing = sourceSections.filter((s) => !doc.sections.some((d) => d.sourceRefs.includes(s.id)));
    checks.push({ id: "order", label: "원본 순서 유지", target: "원본과 같은 순서", actual: inversions ? `${inversions}곳 순서 바뀜` : "유지", pass: inversions === 0, severity: "high" });
    if (plan.derived) {
      checks.push({ id: "sections_kept", label: "원본 섹션 모두 유지", target: `${sourceSections.length}개`, actual: `${sourceSections.length - missing.length}개`, pass: missing.length === 0, severity: "high", fix: missing.length ? "빠진 원본 섹션을 되살리세요" : undefined });
    }
  }

  // 4. Wording / facts preserved.
  if (plan.derived && sourceSections.length) {
    const lostNumbers: string[] = [];
    const lostWords: string[] = [];
    for (const s of doc.sections) {
      const src = s.sourceRefs[0] ? byId.get(s.sourceRefs[0]) : undefined;
      if (!src) continue;
      // The section's own words (not its "[s12]" label).
      const srcText = [src.title, src.text, ...src.tables.map((t) => t.rows.flat().join(" "))].join("\n");
      const outText = sectionTextOf(s);
      if (c.preserve.wording && verbatimShare(`${src.text}\n${src.tables.map((t) => t.rows.flat().join(" ")).join("\n")}`, outText) < 0.98) lostWords.push(s.id);
      const outNums = numbersOf(outText);
      const missingNums = [...numbersOf(srcText)].filter((n) => !outNums.has(n) && !src.number.includes(n));
      if (missingNums.length) lostNumbers.push(s.id);
    }
    if (c.preserve.wording) {
      checks.push({ id: "wording", label: "원문 문장 그대로", target: "모든 문장 유지", actual: lostWords.length ? `${lostWords.length}개 섹션에서 바뀜` : "유지", pass: lostWords.length === 0, severity: "high", fix: "원문 문장을 그대로 되돌리세요(디자인만 바꾸는 작업)", sections: lostWords });
      flag(lostWords, "원문 문장을 그대로 되돌리세요");
    }
    checks.push({ id: "numbers_kept", label: "원본 수치 유지", target: "원본의 모든 수치", actual: lostNumbers.length ? `${lostNumbers.length}개 섹션에서 수치 누락` : "유지", pass: lostNumbers.length === 0, severity: "high", fix: "원문에 있던 수치를 빠짐없이 되살리세요", sections: lostNumbers });
    flag(lostNumbers, "원문에 있던 수치를 빠짐없이 되살리세요");
  }

  // 5. Source coverage (the source is the member's project).
  if (sourceSections.length && c.sourceRole === "primary" && !plan.derived) {
    const meaningful = sourceSections.filter((s) => s.text.replace(/\s+/g, "").length >= 150 || s.tables.length);
    const used = new Set(doc.sections.flatMap((s) => s.sourceRefs));
    const covered = meaningful.filter((s) => used.has(s.id));
    const share = meaningful.length ? covered.length / meaningful.length : 1;
    const need = c.mode === "transform" ? 0.6 : 0.75;
    checks.push({ id: "coverage", label: "올린 자료 활용", target: `${Math.round(need * 100)}% 이상의 섹션`, actual: `${covered.length}/${meaningful.length} (${Math.round(share * 100)}%)`, pass: share >= need, severity: "medium", fix: share < need ? `활용되지 않은 자료: ${meaningful.filter((s) => !used.has(s.id)).slice(0, 6).map((s) => s.title || s.id).join(", ")}` : undefined });
  }

  // 6. Requirements answered.
  if (opts.analysis?.requirements.length && c.mode === "answer_requirements") {
    const mandatory = opts.analysis.requirements.filter((r) => r.mandatory);
    const answered = new Set(plan.sections.filter((p) => doc.sections.some((d) => d.id === p.id)).flatMap((p) => p.requirements));
    const missing = mandatory.filter((r) => !answered.has(r.id));
    checks.push({ id: "requirements", label: "요구사항 대응", target: `필수 ${mandatory.length}개`, actual: `${mandatory.length - missing.length}/${mandatory.length}`, pass: missing.length === 0, severity: "high", fix: missing.length ? `답하지 않은 요구사항: ${missing.map((m) => m.text.slice(0, 40)).join(" / ")}` : undefined });
  }

  // 7. Research used when it was required.
  if (c.research.need === "required") {
    const facts = opts.research?.facts.length ?? 0;
    const cited = doc.sections.filter((s) => /\[\d{1,2}\]/.test(sectionTextOf(s)) || s.claims?.some((cl) => cl.basis === "research")).length;
    checks.push({ id: "research", label: "외부 조사 반영", target: "조사 실행 + 본문에 근거 표시", actual: `사실 ${facts}개, 반영 섹션 ${cited}개`, pass: facts > 0 && cited > 0, severity: "medium", fix: facts > 0 && cited === 0 ? "조사한 사실을 관련 섹션에 출처 번호와 함께 반영하세요" : undefined });
  }

  // 8. Visuals.
  const visuals = visualCount(doc);
  const images = doc.sections.reduce((n, s) => n + s.blocks.filter((b) => b.type === "image").length, 0);
  if (c.visuals.level === "none") checks.push({ id: "visuals", label: "시각 자료", target: "넣지 않음", actual: `${visuals}개`, pass: images === 0, severity: "medium" });
  else if ((c.visuals.level === "balanced" || c.visuals.level === "rich") && doc.sections.length >= 5 && !c.preserve.wording) {
    const need = Math.max(2, Math.round(doc.sections.length * (c.visuals.level === "rich" ? 0.4 : 0.2)));
    checks.push({ id: "visuals", label: "시각 자료", target: `${need}개 이상 (목적이 있는 것)`, actual: `${visuals}개`, pass: visuals >= need, severity: "medium", fix: visuals < need ? "수치·단계·일정·비교가 있는 섹션에 표·차트·공정도·일정표를 넣으세요" : undefined });
  }
  if (c.visuals.avoid.some((a) => /사진|이미지|image|photo/i.test(a))) checks.push({ id: "no_images", label: "이미지 줄이기", target: "사진·이미지 없음", actual: `${images}개`, pass: images === 0, severity: "high" });

  // 9. Numbers nobody can source.
  const known = numbersOf([...sources.map((d) => d.sections.map((x) => [x.number, x.title, x.text, ...x.tables.map((t) => t.rows.flat().join(" "))].join("\n")).join("\n")), opts.inputText, ...(opts.research?.facts.map((f) => f.claim) ?? [])].join("\n"));
  const unsupported: { id: string; n: string }[] = [];
  for (const s of doc.sections) {
    for (const b of s.blocks) {
      if (b.type === "chart" && b.basis === "assumption") continue;
      const text = blockText(b);
      for (const n of numbersOf(text)) {
        if (known.has(n) || /^(19|20)\d{2}$/.test(n)) continue;
        const at = text.indexOf(n);
        if (ASSUMPTION_RX.test(text.slice(Math.max(0, at - 40), at + n.length + 20))) continue;
        unsupported.push({ id: s.id, n });
      }
    }
  }
  const strictFacts = c.preserve.facts && (c.mode === "polish" || c.mode === "rewrite" || c.mode === "beautify");
  checks.push({
    id: "unsupported_numbers",
    label: "근거 없는 수치",
    target: strictFacts ? "0개" : "3개 이하 (가정은 가정으로 표시)",
    actual: `${unsupported.length}개${unsupported.length ? ` (${[...new Set(unsupported.map((u) => u.n))].slice(0, 5).join(", ")})` : ""}`,
    pass: strictFacts ? unsupported.length === 0 : unsupported.length <= 3,
    severity: strictFacts ? "high" : "medium",
    fix: unsupported.length ? "근거 없는 수치는 지우거나 '가정'·'목표'로 밝히거나 [입력 필요]로 바꾸세요" : undefined,
    sections: [...new Set(unsupported.map((u) => u.id))],
  });
  if (unsupported.length > (strictFacts ? 0 : 3)) flag([...new Set(unsupported.map((u) => u.id))], `근거 없는 수치(${[...new Set(unsupported.map((u) => u.n))].slice(0, 4).join(", ")})를 지우거나 가정으로 밝히세요`);

  // 10. The member's must-haves.
  if (opts.mustInclude.length) {
    const all = norm(doc.sections.map(sectionTextOf).join("\n"));
    const miss = opts.mustInclude.filter((m) => {
      const words = m.split(/\s+/).map(norm).filter((w) => w.length >= 2);
      return words.length && words.filter((w) => all.includes(w)).length < Math.ceil(words.length * 0.6);
    });
    checks.push({ id: "must_include", label: "반드시 담을 것", target: `${opts.mustInclude.length}개`, actual: `${opts.mustInclude.length - miss.length}/${opts.mustInclude.length}`, pass: miss.length === 0, severity: "high", fix: miss.length ? `빠진 것: ${miss.join(" / ")}` : undefined });
  }

  // 11. Inspiration means a new structure.
  if (c.mode === "inspire" && sourceSections.length) {
    const words = (titles: string[]) => new Set(titles.flatMap((t) => t.split(/\s+/).map(norm)).filter((w) => w.length >= 2));
    const a = words(sourceSections.map((s) => s.title));
    const b = words(doc.sections.map((s) => s.title));
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    const sim = a.size + b.size ? inter / (a.size + b.size - inter) : 0;
    checks.push({ id: "new_structure", label: "새로운 구성 (영감만 사용)", target: "원본 목차와 다름", actual: `목차 유사도 ${Math.round(sim * 100)}%`, pass: sim < 0.5, severity: "medium" });
  }

  // 12. Template-like writing.
  if (opts.lint && !c.preserve.wording) {
    const ids = doc.sections.filter((s) => opts.lint!.findings.some((f) => f.where === s.title)).map((s) => s.id);
    checks.push({ id: "generic", label: "상투적·반복적 표현", target: "낮음", actual: `${opts.lint.findings.length}건 (점수 ${opts.lint.score})`, pass: opts.lint.score <= 35, severity: "medium", fix: opts.lint.findings.slice(0, 4).map((f) => `${f.where}: ${f.detail}`).join(" / ") || undefined, sections: ids });
    if (opts.lint.score > 35) flag(ids, "상투적 표현과 반복을 이 문서의 구체적 사실로 바꾸세요");
  }

  // 13. What still needs the member (informational).
  const placeholders = doc.sections.reduce((n, s) => n + (sectionTextOf(s).match(/\[(입력|확인) 필요/g) ?? []).length, 0);
  checks.push({ id: "placeholders", label: "직접 채울 곳", target: "표시만", actual: `${placeholders}곳`, pass: true, severity: "info" });

  const pass = checks.every((ch) => ch.pass || ch.severity !== "high");
  return { checks, pass, targets };
}
