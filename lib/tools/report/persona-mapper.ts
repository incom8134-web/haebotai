import type { Report, ReportSection } from "./types.ts";
import { keep, num, objs, PALETTES, str, strs } from "./util.ts";

// 고객 페르소나 지도 export: each persona, their decision factors, then the
// journey with the mood line across stages.

const STAGE_KO: Record<string, string> = { aware: "인지", consider: "고려", decide: "결정", use: "사용", advocate: "추천" };

export function personaMapperReport(o: Record<string, unknown>): Report {
  const personas = objs(o.personas);
  const journey = objs(o.journey);
  const messaging = objs(o.messaging);
  const sections: ReportSection[] = [
    ...personas.map((p, i) => ({
      id: `persona-${i}`,
      kicker: `페르소나 ${i + 1}`,
      title: `${str(p.name)} · ${str(p.age_range)}`,
      lead: str(p.situation) || undefined,
      blocks: keep([
        !!str(p.quote) && { type: "callout", label: "그 사람의 말", text: `“${str(p.quote)}”` },
        { type: "quad", cells: [
          { title: "원하는 것", items: strs(p.goals) },
          { title: "불편한 것", items: strs(p.frustrations) },
          { title: "사게 되는 계기", items: strs(p.triggers) },
          { title: "망설이는 이유", items: strs(p.objections) },
        ] },
        objs(p.decision_factors).length > 0 && {
          type: "chart",
          title: "결정할 때 보는 것 (1~5)",
          half: true,
          chart: { kind: "bar", horizontal: true, categories: objs(p.decision_factors).map((f) => str(f.factor)), series: [{ name: "무게", values: objs(p.decision_factors).map((f) => num(f.weight)) }], max: 5 },
        },
        { type: "bullets", title: "쓰는 채널", items: strs(p.channels), half: true },
      ]),
    })),
    {
      id: "journey",
      kicker: "여정",
      title: "처음 알게 된 순간부터 추천하기까지",
      blocks: keep([
        journey.length > 0 && {
          type: "chart",
          title: "단계별 기분 (−2 ~ +2)",
          chart: { kind: "line", categories: journey.map((j) => STAGE_KO[str(j.stage)] ?? str(j.stage)), series: [{ name: "기분", values: journey.map((j) => Math.max(-2, Math.min(2, num(j.feeling)))) }] },
        },
        {
          type: "table",
          header: ["단계", "하는 일", "생각", "접점", "기회", "할 말"],
          rows: journey.map((j) => [STAGE_KO[str(j.stage)] ?? str(j.stage), str(j.doing), str(j.thinking), strs(j.touchpoints).join(", "), str(j.opportunity), str(messaging.find((m) => str(m.stage) === str(j.stage))?.message)]),
        },
        { type: "text", title: "근거와 추론", text: str(o.data_basis) },
      ]),
    },
  ];
  return {
    palette: PALETTES["persona-mapper"],
    hero: { eyebrow: "고객 페르소나 지도", title: personas.map((p) => str(p.name)).filter(Boolean).join(" · ") || "페르소나", subtitle: str(o.summary) || undefined, kpis: [{ label: "페르소나", value: `${personas.length}명` }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
