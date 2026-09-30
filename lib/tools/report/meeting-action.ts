import type { Report, ReportSection } from "./types.ts";
import { keep, objs, PALETTES, str, strs } from "./util.ts";

// 회의→실행 보드 export: the meeting's minutes — counts, decisions, actions
// by owner with due dates, open questions and the next agenda.

export function meetingActionReport(o: Record<string, unknown>): Report {
  const actions = objs(o.actions).map((a) => ({ task: str(a.task), owner: str(a.owner) || "[미정]", due: str(a.due), note: str(a.due_note), priority: str(a.priority), doneWhen: str(a.done_when) }));
  const owners = [...new Set(actions.map((a) => a.owner))];
  const P: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };
  const decisions = objs(o.decisions);
  const questions = objs(o.open_questions);
  const sections: ReportSection[] = [
    {
      id: "summary",
      kicker: "요약",
      title: str(o.title) || "회의 정리",
      lead: str(o.summary) || undefined,
      blocks: keep([
        {
          type: "chart",
          chart: {
            kind: "circles",
            items: [
              { label: "결정", value: `${decisions.length}` },
              { label: "할 일", value: `${actions.length}` },
              { label: "열린 질문", value: `${questions.length}` },
            ],
          },
        },
        owners.length > 0 && {
          type: "chart",
          title: "담당자별 할 일",
          half: true,
          chart: { kind: "donut", slices: owners.map((w) => ({ label: w, value: actions.filter((a) => a.owner === w).length })), unit: "개" },
        },
        { type: "table", title: "결정", header: ["결정", "이유", "담당"], rows: decisions.map((d) => [str(d.decision), str(d.rationale), str(d.owner)]), half: true },
      ]),
    },
    {
      id: "actions",
      kicker: "실행",
      title: "할 일",
      blocks: keep([
        { type: "table", header: ["할 일", "담당", "마감", "우선순위", "완료 기준"], rows: actions.map((a) => [a.task, a.owner, a.due || a.note || "미정", P[a.priority] ?? a.priority, a.doneWhen]) },
      ]),
    },
    {
      id: "next",
      kicker: "다음",
      title: "열린 질문과 다음 안건",
      blocks: keep([
        { type: "table", header: ["질문", "답할 사람"], rows: questions.map((q) => [str(q.question), str(q.who_answers)]) },
        { type: "bullets", title: "다음 회의 안건", style: "num", items: strs(o.next_agenda) },
        { type: "bullets", title: "위험", items: strs(o.risks) },
        { type: "text", title: "보낼 정리 메시지", text: str(o.follow_up_message) },
      ]),
    },
  ];
  return {
    palette: PALETTES["meeting-action"],
    hero: { eyebrow: "회의→실행 보드", title: str(o.title) || "회의 정리", subtitle: str(o.summary) || undefined, kpis: [{ label: "할 일", value: `${actions.length}개` }, { label: "담당 미정", value: `${actions.filter((a) => a.owner === "[미정]").length}개`, tone: "warn" as const }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
