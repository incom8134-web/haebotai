import type { Report, ReportSection } from "./types.ts";
import { keep, obj, objs, PALETTES, sourcesOf, str, strs } from "./util.ts";

// 시장 리서치 데스크 export: where the evidence came from, how many of the
// assumptions are verified, then each question with its evidence.

export const ORIGIN_KO: Record<string, string> = { search: "검색 근거", user: "입력 내용", hypothesis: "가설" };
const STATUS_KO: Record<string, string> = { verified: "확인됨", partly: "일부 확인", unverified: "확인 안 됨" };
const CONF_KO: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };

export function marketDeskReport(o: Record<string, unknown>): Report {
  const evidence = objs(o.evidence);
  const assumptions = objs(o.assumptions);
  const size = obj(o.market_size);
  const verified = assumptions.filter((a) => str(a.status) === "verified").length;
  const byOrigin = ["search", "user", "hypothesis"].map((k) => ({ label: ORIGIN_KO[k], value: evidence.filter((e) => str(e.origin) === k).length })).filter((s) => s.value > 0);
  const sections: ReportSection[] = [
    {
      id: "overview",
      kicker: "개요",
      title: str(o.decision) || "시장 조사",
      lead: str(o.summary) || undefined,
      blocks: keep([
        byOrigin.length > 0 && { type: "chart", title: "근거의 출처", half: true, chart: { kind: "donut", slices: byOrigin, unit: "개" } },
        assumptions.length > 0 && { type: "chart", title: "확인된 가정", half: true, chart: { kind: "gauge", value: verified, max: assumptions.length, label: `${assumptions.length}개 중 확인` } },
        !!str(size.estimate) && { type: "callout", label: `시장 규모 · ${ORIGIN_KO[str(size.origin)] ?? ""}`, text: `${str(size.estimate)}\n계산 방법: ${str(size.method)}` },
        { type: "bullets", title: "의미", items: strs(o.implications) },
      ]),
    },
    ...objs(o.questions).map((q, i) => ({
      id: `q-${i}`,
      kicker: str(q.id) || `q${i + 1}`,
      title: str(q.question),
      lead: str(q.why) || undefined,
      blocks: keep([
        {
          type: "table",
          header: ["근거", "수치", "출처", "신뢰도", "자료"],
          rows: evidence.filter((e) => str(e.question_id) === str(q.id)).map((e) => [str(e.finding), str(e.figure), ORIGIN_KO[str(e.origin)] ?? str(e.origin), CONF_KO[str(e.confidence)] ?? str(e.confidence), str(e.source_title)]),
        },
      ]),
    })),
    {
      id: "checks",
      kicker: "검증",
      title: "가정과 다음 확인",
      blocks: keep([
        { type: "table", title: "가정", header: ["가정", "상태", "틀리면"], rows: assumptions.map((a) => [str(a.assumption), STATUS_KO[str(a.status)] ?? str(a.status), str(a.risk_if_wrong)]) },
        { type: "table", title: "다음에 확인할 것", header: ["확인", "방법", "비용"], rows: objs(o.next_checks).map((c) => [str(c.check), str(c.how), str(c.cost)]) },
        { type: "sources", items: sourcesOf(o.sources) },
      ]),
    },
  ];
  return {
    palette: PALETTES["market-desk"],
    hero: { eyebrow: "시장 리서치 데스크", title: str(o.decision) || "시장 조사", subtitle: str(o.summary) || undefined, kpis: [{ label: "근거", value: `${evidence.length}개` }, { label: "확인된 가정", value: `${verified}/${assumptions.length}` }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
