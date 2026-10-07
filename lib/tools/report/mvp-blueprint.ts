import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs } from "./util.ts";

// MVP 설계도: must/should/later features, the journey, the tool stack,
// the stages on a timeline (gantt) and the launch checklist.

const PRIORITY_LABELS: Record<string, string> = { must: "Must · 꼭", should: "Should · 있으면 좋음", later: "Later · 다음에" };
export const MOMENT_LABELS: Record<string, string> = { discover: "발견", try: "체험", value: "가치", pay: "결제", return: "재방문" };
export const CHECK_LABELS: Record<string, string> = { product: "제품", legal: "법·신고", payment: "결제", marketing: "마케팅", support: "고객 지원" };

export function readMvp(o: Record<string, unknown>) {
  let start = 0;
  const stages = objs(o.stages)
    .map((s) => {
      const weeks = Math.max(0, num(s.weeks));
      const row = { name: str(s.name), weeks, start, end: start + weeks, goal: str(s.goal), deliverables: strs(s.deliverables), exit: str(s.exit_criteria) };
      start += weeks;
      return row;
    })
    .filter((s) => s.name);
  return {
    features: objs(o.features).map((f) => ({ name: str(f.name), description: str(f.description), priority: str(f.priority), effort: str(f.effort), reason: str(f.reason) })).filter((f) => f.name),
    journey: objs(o.journey).map((j) => ({ moment: str(j.moment), user: str(j.user_action), product: str(j.product_response) })).filter((j) => j.user),
    stack: objs(o.stack).map((s) => ({ layer: str(s.layer), choice: str(s.choice), why: str(s.why), alternative: str(s.alternative), cost: str(s.cost_note) })).filter((s) => s.choice),
    stages,
    totalWeeks: start,
    checklist: objs(o.launch_checklist).map((c) => ({ item: str(c.item), category: str(c.category) })).filter((c) => c.item),
  };
}

export function mvpBlueprintReport(o: Record<string, unknown>): Report {
  const { features, journey, stack, stages, totalWeeks, checklist } = readMvp(o);
  const v = obj(o.validation);
  const sections: ReportSection[] = [];
  const count = (p: string) => features.filter((f) => f.priority === p).length;

  sections.push({
    id: "scope",
    kicker: "범위",
    title: "첫 버전에 넣을 것과 뺄 것",
    lead: str(o.product_one_liner) || undefined,
    blocks: keep([
      { type: "callout", label: "핵심 일", text: `${str(o.core_job)}${str(o.target_user) ? `\n처음 쓸 사람: ${str(o.target_user)}` : ""}` },
      features.length > 0 && {
        type: "chart",
        title: "기능 우선순위",
        half: true,
        chart: { kind: "donut", slices: (["must", "should", "later"] as const).map((p) => ({ label: PRIORITY_LABELS[p], value: count(p) })).filter((s) => s.value > 0), center: { value: String(count("must")), label: "Must" } },
      },
      {
        type: "quad",
        cells: (["must", "should", "later"] as const).map((p) => ({ title: PRIORITY_LABELS[p], items: features.filter((f) => f.priority === p).map((f) => `${f.name} (${f.effort}) — ${f.reason}`) })),
      },
      strs(o.out_of_scope).length > 0 && { type: "bullets", title: "이번에 뺀 것", items: strs(o.out_of_scope) },
    ]),
  });

  sections.push({
    id: "journey",
    kicker: "여정",
    title: "사용자가 겪는 순서",
    blocks: keep([journey.length > 0 && { type: "table", header: ["순간", "사용자", "제품"], rows: journey.map((j) => [MOMENT_LABELS[j.moment] ?? j.moment, j.user, j.product]) }]),
  });

  sections.push({
    id: "build",
    kicker: "만들기",
    title: "도구와 단계",
    blocks: keep([
      stack.length > 0 && { type: "table", title: "도구 조합", header: ["층", "선택", "이유", "대안", "비용"], rows: stack.map((s) => [s.layer, s.choice, s.why, s.alternative, s.cost]) },
      stages.length > 0 &&
        totalWeeks > 0 && {
          type: "chart",
          title: `단계 (총 ${totalWeeks}주)`,
          chart: { kind: "gantt", scale: Array.from({ length: totalWeeks }, (_, i) => `${i + 1}주`), rows: stages.map((s) => ({ label: s.name, start: s.start, end: s.end, note: s.goal })) },
        },
      stages.length > 0 && {
        type: "cards",
        columns: stages.length >= 3 ? 3 : 2,
        items: stages.map((s) => ({ title: s.name, badge: `${s.weeks}주`, lines: [s.goal, ...s.deliverables.map((d) => `· ${d}`), `넘어가는 기준: ${s.exit}`] })),
      },
    ]),
  });

  sections.push({
    id: "launch",
    kicker: "출시",
    title: "가설과 체크리스트",
    blocks: keep([
      !!str(v.hypothesis) && { type: "callout", label: "증명할 가설", text: `${str(v.hypothesis)}\n지표: ${str(v.metric)} · 목표: ${str(v.target)}\n방법: ${str(v.method)}` },
      checklist.length > 0 && { type: "bullets", title: "출시 체크리스트", style: "check", items: checklist.map((c) => `[${CHECK_LABELS[c.category] ?? c.category}] ${c.item}`) },
    ]),
  });

  return {
    palette: PALETTES["mvp-blueprint"],
    hero: {
      eyebrow: "MVP 설계도",
      title: str(o.product_one_liner) || "MVP",
      subtitle: str(o.core_job) || undefined,
      kpis: [
        { label: "Must 기능", value: `${count("must")}개` },
        totalWeeks > 0 ? { label: "출시까지", value: `${totalWeeks}주` } : null,
        { label: "체크리스트", value: `${checklist.length}개` },
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
