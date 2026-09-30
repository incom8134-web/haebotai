import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs } from "./util.ts";

// 아이디어 레이더: the ideas side by side on the same five axes (a radar
// for the top three, a total-score bar for all), then one card per idea
// with its customer, revenue, MVP and the first test to run.

export const IDEA_AXES = [
  { key: "fit", label: "적합도" },
  { key: "demand", label: "수요" },
  { key: "speed", label: "속도" },
  { key: "capital", label: "소자본" },
  { key: "edge", label: "우위" },
] as const;

export const ARCHETYPE_LABELS: Record<string, string> = {
  service: "서비스",
  product: "제품",
  content: "콘텐츠",
  platform: "플랫폼",
  local: "로컬",
  b2b: "B2B",
};

export function readIdeas(o: Record<string, unknown>) {
  return objs(o.ideas)
    .map((i) => {
      const s = obj(i.scores);
      const scores = IDEA_AXES.map((a) => Math.max(0, Math.min(10, num(s[a.key]))));
      const rev = obj(i.revenue);
      const fv = obj(i.first_validation);
      const c = obj(i.customer);
      return {
        name: str(i.name),
        oneLiner: str(i.one_liner),
        archetype: str(i.archetype),
        who: str(c.who),
        situation: str(c.situation),
        problem: str(i.problem),
        value: str(i.value_proposition),
        whyYou: str(i.why_you),
        model: str(rev.model),
        price: str(rev.price_hint),
        potential: str(rev.potential_note),
        mvp: str(i.mvp),
        resources: strs(i.resources),
        test: { action: str(fv.action), signal: str(fv.success_signal), days: num(fv.days) },
        scores,
        total: scores.reduce((a, b) => a + b, 0),
        risks: strs(i.risks),
      };
    })
    .filter((i) => i.name);
}

export function ideaRadarReport(o: Record<string, unknown>): Report {
  const ideas = readIdeas(o);
  const rec = obj(o.recommendation);
  const pick = str(rec.pick);
  const sections: ReportSection[] = [];
  const top = [...ideas].sort((a, b) => b.total - a.total).slice(0, 3);

  sections.push({
    id: "compare",
    kicker: "비교",
    title: "아이디어를 같은 기준으로",
    lead: str(o.summary) || undefined,
    blocks: keep([
      top.length > 0 && {
        type: "chart",
        title: "다섯 축 점수 (상위 3개)",
        half: true,
        chart: { kind: "radar", axes: IDEA_AXES.map((a) => a.label), series: top.map((i) => ({ name: i.name, values: i.scores })), max: 10 },
        estimated: true,
      },
      ideas.length > 0 && {
        type: "chart",
        title: "총점 (50점 만점)",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: ideas.map((i) => i.name), series: [{ name: "총점", values: ideas.map((i) => i.total) }], max: 50, highlight: Math.max(0, ideas.findIndex((i) => i.name === pick)) },
      },
      ideas.length > 0 && {
        type: "table",
        header: ["아이디어", "형태", ...IDEA_AXES.map((a) => a.label), "합계"],
        align: ["l", "l", ...IDEA_AXES.map(() => "r" as const), "r"],
        rows: ideas.map((i) => [i.name, ARCHETYPE_LABELS[i.archetype] ?? i.archetype, ...i.scores.map(String), String(i.total)]),
        caption: "점수는 입력한 조건과 검색 근거를 바탕으로 한 AI의 상대 평가입니다.",
      },
      !!pick && { type: "callout", label: "먼저 해 볼 것", text: `${pick} — ${str(rec.reason)}${str(rec.runner_up) ? `\n다음 후보: ${str(rec.runner_up)}` : ""}` },
    ]),
  });

  ideas.forEach((i, n) => {
    sections.push({
      id: `idea-${n}`,
      kicker: ARCHETYPE_LABELS[i.archetype] ?? "아이디어",
      title: i.name,
      lead: i.oneLiner || undefined,
      blocks: keep([
        {
          type: "cards",
          columns: 2,
          items: [
            { title: "고객과 문제", facts: [{ label: "고객", value: i.who }, { label: "상황", value: i.situation }], lines: [i.problem].filter(Boolean) },
            { title: "수익 방식", facts: [{ label: "모델", value: i.model }, { label: "가격(추정)", value: i.price }], lines: [i.potential].filter(Boolean) },
          ],
        },
        { type: "text", title: "왜 당신인가", text: i.whyYou },
        { type: "text", title: "가치 제안", text: i.value, half: true },
        { type: "text", title: "MVP", text: i.mvp, half: true },
        !!i.test.action && { type: "callout", label: `첫 검증${i.test.days ? ` · ${i.test.days}일` : ""}`, text: `${i.test.action}\n성공 신호: ${i.test.signal}` },
        i.resources.length > 0 && { type: "bullets", title: "갖춰야 할 것", style: "check", items: i.resources, half: true },
        i.risks.length > 0 && { type: "bullets", title: "위험", items: i.risks, half: true },
      ]),
    });
  });

  const best = top[0];
  return {
    palette: PALETTES["idea-radar"],
    hero: {
      eyebrow: "아이디어 레이더",
      title: pick ? `추천: ${pick}` : best ? best.name : "사업 아이디어",
      subtitle: str(o.lens) || undefined,
      kpis: [
        { label: "아이디어", value: `${ideas.length}개` },
        best ? { label: "최고 총점", value: `${best.total}/50`, note: best.name, tone: "up" as const } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
