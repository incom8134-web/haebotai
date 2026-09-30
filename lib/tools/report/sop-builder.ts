import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs, sum } from "./util.ts";

// 업무 매뉴얼 빌더 export: the procedure as a printable manual — time per
// step and per role, the steps table, the quality checklist, exceptions.

export function sopBuilderReport(o: Record<string, unknown>): Report {
  const steps = objs(o.steps).map((s, i) => ({ id: str(s.id) || `s${i + 1}`, title: str(s.title), role: str(s.role), type: str(s.type), action: str(s.action), tools: str(s.tools), output: str(s.output), minutes: num(s.minutes), ifNo: str(s.if_no) }));
  const roles = [...new Set(steps.map((s) => s.role).filter(Boolean))];
  const scope = obj(o.scope);
  const total = sum(steps.map((s) => s.minutes));
  const TYPE: Record<string, string> = { task: "작업", decision: "판단", check: "확인", handoff: "넘김" };
  const sections: ReportSection[] = [
    {
      id: "overview",
      kicker: "개요",
      title: str(o.purpose) || "업무 매뉴얼",
      lead: str(o.summary) || undefined,
      blocks: keep([
        { type: "table", header: ["시작", "끝", "다루지 않는 것"], rows: [[str(scope.starts_when), str(scope.ends_when), strs(scope.not_covered).join(", ")]] },
        { type: "table", title: "역할", header: ["역할", "책임"], rows: objs(o.roles).map((r) => [str(r.role), str(r.responsibility)]) },
        steps.some((s) => s.minutes > 0) && {
          type: "chart",
          title: "단계별 소요 시간",
          half: true,
          chart: { kind: "bar", horizontal: true, categories: steps.map((s) => `${s.id} ${s.title}`), series: [{ name: "분", values: steps.map((s) => s.minutes) }], unit: "분" },
        },
        roles.length > 1 &&
          total > 0 && {
            type: "chart",
            title: "역할별 시간 비중",
            half: true,
            chart: { kind: "donut", slices: roles.map((r) => ({ label: r, value: sum(steps.filter((s) => s.role === r).map((s) => s.minutes)) })), unit: "분", center: { value: `${total}분`, label: "총 소요" } },
          },
      ]),
    },
    {
      id: "steps",
      kicker: "절차",
      title: "단계",
      blocks: keep([
        {
          type: "table",
          header: ["단계", "담당", "종류", "할 일", "도구", "결과물", "분"],
          rows: steps.map((s) => [`${s.id} ${s.title}`, s.role, TYPE[s.type] ?? s.type, s.ifNo ? `${s.action}\n아니오: ${s.ifNo}` : s.action, s.tools, s.output, s.minutes ? String(s.minutes) : ""]),
        },
      ]),
    },
    {
      id: "quality",
      kicker: "품질",
      title: "체크리스트와 예외",
      blocks: keep([
        { type: "bullets", title: "품질 체크리스트", style: "check", items: objs(o.quality_checks).map((c) => `[${str(c.step_id)}] ${str(c.check)} — ${str(c.standard)}`) },
        { type: "table", title: "예외 상황", header: ["상황", "대응", "알릴 사람"], rows: objs(o.exceptions).map((e) => [str(e.situation), str(e.response), str(e.escalate_to)]) },
        { type: "table", title: "지표", header: ["지표", "목표", "보는 법"], rows: objs(o.kpis).map((k) => [str(k.metric), str(k.target), str(k.how)]) },
        { type: "bullets", title: "가르칠 때 팁", items: strs(o.training_tips) },
      ]),
    },
  ];
  return {
    palette: PALETTES["sop-builder"],
    hero: { eyebrow: "업무 매뉴얼", title: str(o.purpose) || "업무 매뉴얼", kpis: [{ label: "단계", value: `${steps.length}개` }, ...(total ? [{ label: "총 소요", value: `${total}분` }] : []), { label: "역할", value: `${roles.length}명` }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
