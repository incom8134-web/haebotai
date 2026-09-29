import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { clamp, keep, num, obj, objs, PALETTES, str, sum, WEEKDAYS } from "./util.ts";

// 90일 실행 계획: a project board, not a list. The roadmap (phases as a
// Gantt), the north-star line it aims at, how many hours each week takes
// and on what kind of work, a day × week rhythm heatmap, then each
// week as a card with its dates, tasks and done-criteria.

const CATEGORY_ORDER = ["기획·준비", "콘텐츠·홍보", "영업·판매", "제작·운영", "학습", "점검·회고"];

function dateOf(start: string, offsetDays: number): Date | null {
  const d = new Date(`${start}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + offsetDays);
  return d;
}
const md = (d: Date | null) => (d ? `${d.getMonth() + 1}/${d.getDate()}` : "");

export function calendarReport(o: Record<string, unknown>, input: Record<string, unknown> = {}): Report {
  const start = str(input.start_date);
  const weeks = objs(o.weeks).map((w, i) => {
    const no = num(w.week_no) || i + 1;
    const tasks = objs(w.tasks).map((t) => ({
      day: clamp(Math.round(num(t.day)) || 1, 1, 7),
      title: str(t.title),
      category: str(t.category) || "기타",
      minutes: num(t.est_minutes),
      done: str(t.done_criteria),
      depends: str(t.depends_on),
    })).filter((t) => t.title);
    return { no, milestone: str(w.milestone), tasks, minutes: sum(tasks.map((t) => t.minutes)) };
  });
  const categories = [...CATEGORY_ORDER.filter((c) => weeks.some((w) => w.tasks.some((t) => t.category === c))), ...[...new Set(weeks.flatMap((w) => w.tasks.map((t) => t.category)))].filter((c) => !CATEGORY_ORDER.includes(c))];
  const totalMin = sum(weeks.map((w) => w.minutes));
  const taskCount = sum(weeks.map((w) => w.tasks.length));
  const ns = obj(o.north_star);
  const unit = str(ns.unit);
  const phases = objs(o.phases).map((p) => ({ name: str(p.name), from: num(p.week_from), to: num(p.week_to), focus: str(p.focus) })).filter((p) => p.name && p.from);
  const checkpoints = objs(o.checkpoints).map((c) => ({ week: num(c.week), target: num(c.target), review: str(c.review) })).filter((c) => c.week).sort((a, b) => a.week - b.week);
  const scale = weeks.map((w) => `W${w.no}`);
  const endDate = dateOf(start, weeks.length * 7 - 1);

  const sections: ReportSection[] = [];

  sections.push({
    id: "roadmap",
    kicker: "로드맵",
    title: "13주를 어떻게 나눴나",
    blocks: keep([
      {
        type: "chart",
        chart: {
          kind: "gantt",
          scale,
          rows: phases.length
            ? phases.map((p) => ({ label: p.name, start: p.from - 1, end: p.to - 1, group: p.name, note: p.focus }))
            : weeks.map((w, i) => ({ label: w.milestone || `W${w.no}`, start: i, end: i, group: "" })),
        },
      },
      phases.length > 0 && {
        type: "table",
        header: ["단계", "기간", "집중할 것"],
        rows: phases.map((p) => [p.name, `${p.from}~${p.to}주 (${md(dateOf(start, (p.from - 1) * 7))}~${md(dateOf(start, p.to * 7 - 1))})`.replace(" (~)", ""), p.focus]),
      },
    ]),
  });

  if (str(ns.metric)) {
    const pts = [{ week: 0, target: num(ns.baseline) }, ...checkpoints];
    sections.push({
      id: "target",
      kicker: "목표 궤적",
      title: `${str(ns.metric)}: ${fmt(num(ns.baseline), unit)} → ${fmt(num(ns.target), unit)}`,
      blocks: keep([
        pts.length >= 2 && {
          type: "chart",
          half: true,
          chart: { kind: "line", categories: pts.map((p) => (p.week ? `${p.week}주 차` : "시작")), series: [{ name: str(ns.metric), values: pts.map((p) => p.target) }], unit },
        },
        checkpoints.length > 0 && {
          type: "table",
          title: "점검 시점",
          half: true,
          header: ["주차", "목표", "점검할 것"],
          align: ["c", "r", "l"],
          rows: checkpoints.map((c) => [`${c.week}주 차${start ? ` (${md(dateOf(start, c.week * 7 - 1))})` : ""}`, fmt(c.target, unit), c.review]),
        },
      ]),
    });
  }

  sections.push({
    id: "workload",
    kicker: "작업량",
    title: "매주 몇 시간, 어떤 일에",
    blocks: keep([
      totalMin > 0 && {
        type: "chart",
        title: "주차별 시간 (일의 종류별)",
        chart: {
          kind: "bar",
          stacked: true,
          categories: scale,
          series: categories.map((c) => ({ name: c, values: weeks.map((w) => Math.round((sum(w.tasks.filter((t) => t.category === c).map((t) => t.minutes)) / 60) * 10) / 10) })),
          unit: "시간",
        },
      },
      totalMin > 0 && categories.length > 1 && {
        type: "chart",
        title: "전체 시간 배분",
        half: true,
        chart: {
          kind: "donut",
          slices: categories.map((c) => ({ label: c, value: Math.round(sum(weeks.flatMap((w) => w.tasks.filter((t) => t.category === c).map((t) => t.minutes))) / 60) })),
          unit: "시간",
          center: { value: `${Math.round(totalMin / 60)}시간`, label: "13주 합계" },
        },
      },
      totalMin > 0 && {
        type: "chart",
        title: "요일 × 주차 리듬 (분)",
        half: true,
        chart: {
          kind: "heatmap",
          rows: WEEKDAYS,
          cols: scale,
          values: WEEKDAYS.map((_, d) => weeks.map((w) => sum(w.tasks.filter((t) => t.day === d + 1).map((t) => t.minutes)))),
          max: Math.max(1, ...weeks.flatMap((w) => WEEKDAYS.map((_, d) => sum(w.tasks.filter((t) => t.day === d + 1).map((t) => t.minutes))))),
        },
      },
    ]),
  });

  sections.push({
    id: "weeks",
    kicker: "주차별 계획",
    title: "이번 주에 할 일",
    blocks: keep([
      {
        type: "cards",
        columns: 2,
        items: weeks.map((w, i) => {
          const phase = phases.find((p) => w.no >= p.from && w.no <= p.to);
          const range = start ? `${md(dateOf(start, i * 7))}~${md(dateOf(start, i * 7 + 6))}` : "";
          return {
            kicker: [`W${w.no}`, range, phase?.name].filter(Boolean).join(" · "),
            title: w.milestone || `${w.no}주 차`,
            badge: `${Math.round((w.minutes / 60) * 10) / 10}시간`,
            lines: w.tasks
              .sort((a, b) => a.day - b.day)
              .map((t) => `${WEEKDAYS[t.day - 1]} · ${t.title} (${t.minutes}분)${t.done ? ` → ${t.done}` : ""}${t.depends ? ` [선행: ${t.depends}]` : ""}`),
          };
        }),
      },
    ]),
  });

  return {
    palette: PALETTES.calendar,
    hero: {
      eyebrow: "90일 실행 계획",
      title: str(o.goal) || weeks[weeks.length - 1]?.milestone || "90일 실행 계획",
      subtitle: start ? `${start} 시작 · ${endDate ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}` : ""} 종료`.replace(" ·  종료", "") : undefined,
      kpis: [
        { label: "과제", value: `${taskCount}개` },
        { label: "총 시간", value: `${Math.round(totalMin / 60)}시간` },
        { label: "주 평균", value: `${weeks.length ? Math.round((totalMin / 60 / weeks.length) * 10) / 10 : 0}시간` },
        str(ns.metric) ? { label: str(ns.metric), value: `${fmt(num(ns.baseline), unit)} → ${fmt(num(ns.target), unit)}`, tone: "up" as const } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
