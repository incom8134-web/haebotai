import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, sourcesOf, str, strs } from "./util.ts";
import { ORIGIN_KO } from "./market-desk.ts";

// 경쟁사 렌즈 export: total score per company, the positioning map, the
// matrix, each competitor and the openings.

export function competitorLensReport(o: Record<string, unknown>): Report {
  const axes = obj(o.axes);
  const us = obj(o.us);
  const comps = objs(o.competitors);
  const matrix = objs(o.matrix);
  const names = [...new Set(matrix.flatMap((m) => objs(m.scores).map((s) => str(s.name))))];
  const total = (n: string) => matrix.reduce((a, m) => a + num(objs(m.scores).find((s) => str(s.name) === n)?.score), 0);
  const sections: ReportSection[] = [
    {
      id: "map",
      kicker: "위치",
      title: "포지셔닝 맵과 합계",
      lead: str(o.summary) || undefined,
      blocks: keep([
        comps.length > 0 && {
          type: "chart",
          title: `${str(axes.x)} × ${str(axes.y)}`,
          half: true,
          chart: { kind: "scatter", xLabel: str(axes.x), yLabel: str(axes.y), xMax: 10, yMax: 10, points: [...comps.map((c) => ({ label: str(c.name), x: num(c.x), y: num(c.y) })), { label: "우리", x: num(us.x), y: num(us.y), highlight: true }] },
        },
        names.length > 0 && { type: "chart", title: "기준별 점수 합계", half: true, chart: { kind: "bar", horizontal: true, categories: names, series: [{ name: "합계", values: names.map(total) }], highlight: Math.max(0, names.indexOf("우리")) } },
        { type: "text", title: "우리의 자리", text: str(us.position) },
      ]),
    },
    {
      id: "matrix",
      kicker: "비교",
      title: "기준별 비교",
      blocks: keep([{ type: "table", header: ["기준", ...names], rows: matrix.map((m) => [str(m.criterion), ...names.map((n) => String(num(objs(m.scores).find((s) => str(s.name) === n)?.score) || "—"))]) }]),
    },
    {
      id: "competitors",
      kicker: "경쟁사",
      title: "경쟁사별 정리",
      blocks: keep([
        {
          type: "table",
          header: ["경쟁사", "포지션", "가격", "강점", "약점", "출처"],
          rows: comps.map((c) => [str(c.name), str(c.positioning), str(c.price), strs(c.strengths).join(", "), strs(c.weaknesses).join(", "), ORIGIN_KO[str(c.origin)] ?? str(c.origin)]),
        },
      ]),
    },
    {
      id: "openings",
      kicker: "기회",
      title: "비어 있는 자리",
      blocks: keep([
        { type: "cards", columns: 2, items: objs(o.opportunities).map((x) => ({ title: str(x.title), lines: [`빈자리: ${str(x.gap)}`, `할 일: ${str(x.move)}`, `위험: ${str(x.risk)}`] })) },
        { type: "sources", items: sourcesOf(o.sources) },
      ]),
    },
  ];
  return {
    palette: PALETTES["competitor-lens"],
    hero: { eyebrow: "경쟁사 렌즈", title: str(us.position) || "경쟁 비교", subtitle: str(o.summary) || undefined, kpis: [{ label: "경쟁사", value: `${comps.length}곳` }, { label: "비교 기준", value: `${matrix.length}개` }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
