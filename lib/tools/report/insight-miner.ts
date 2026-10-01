import type { Report, ReportSection } from "./types.ts";
import { keep, num, objs, PALETTES, str, strs } from "./util.ts";

// 인사이트 마이너 export: theme counts with their sentiment split, quotes
// per theme, opportunities and caveats.

const KIND_KO: Record<string, string> = { complaint: "불만", praise: "칭찬", request: "요청", question: "질문" };

export function insightMinerReport(o: Record<string, unknown>): Report {
  const themes = objs(o.themes).sort((a, b) => num(b.mentions) - num(a.mentions));
  const count = (k: string) => themes.filter((t) => str(t.kind) === k).reduce((a, t) => a + num(t.mentions), 0);
  const sections: ReportSection[] = [
    {
      id: "overview",
      kicker: "개요",
      title: "고객이 반복해서 말한 것",
      lead: str(o.summary) || undefined,
      blocks: keep([
        { type: "chart", chart: { kind: "circles", items: ["complaint", "praise", "request", "question"].map((k) => ({ label: KIND_KO[k], value: `${count(k)}건` })) } },
        themes.length > 0 && {
          type: "chart",
          title: "주제별 감성",
          chart: {
            kind: "bar",
            horizontal: true,
            stacked: true,
            categories: themes.map((t) => str(t.name)),
            series: [
              { name: "긍정", values: themes.map((t) => num(t.positive)) },
              { name: "중립", values: themes.map((t) => num(t.neutral)) },
              { name: "부정", values: themes.map((t) => num(t.negative)) },
            ],
            unit: "건",
          },
        },
      ]),
    },
    {
      id: "themes",
      kicker: "주제",
      title: "주제와 원문 인용",
      blocks: keep([
        { type: "table", header: ["주제", "종류", "언급", "설명", "대표 인용"], rows: themes.map((t) => [str(t.name), KIND_KO[str(t.kind)] ?? str(t.kind), String(num(t.mentions)), str(t.description), strs(t.quotes).map((q) => `“${q}”`).join("\n")]) },
      ]),
    },
    {
      id: "actions",
      kicker: "할 일",
      title: "고칠 일",
      blocks: keep([
        { type: "table", header: ["할 일", "근거", "방법", "노력"], rows: objs(o.opportunities).map((x) => [str(x.title), str(x.based_on), str(x.action), str(x.effort)]) },
        { type: "bullets", title: "해석할 때 주의", items: strs(o.caveats) },
      ]),
    },
  ];
  return {
    palette: PALETTES["insight-miner"],
    hero: { eyebrow: "인사이트 마이너", title: themes[0] ? `가장 많이 나온 이야기: ${str(themes[0].name)}` : "고객 인사이트", subtitle: str(o.summary) || undefined, kpis: [{ label: "읽은 자료", value: `${num(o.items_read)}건` }, { label: "주제", value: `${themes.length}개` }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
