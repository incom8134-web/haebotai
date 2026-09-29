import type { Report, ReportSection } from "./types.ts";
import { clamp, keep, num, objs, PALETTES, str, strs, sum } from "./util.ts";

// 플레이스 최적화: a listing audit. A score gauge and per-area bars with
// the weakest area called out, then everything ready to paste into the
// 스마트플레이스 admin — name options, the rewritten description, what
// competitors do better, the photo shot list in upload order, reply
// templates, and a weekly 15-minute routine.

export function placeReport(o: Record<string, unknown>, input: Record<string, unknown> = {}): Report {
  const audit = objs(o.audit).map((a) => ({ area: str(a.area), score: clamp(num(a.score), 0, 100), current: str(a.current), fix: str(a.fix) })).filter((a) => a.area);
  const overall = audit.length ? Math.round(sum(audit.map((a) => a.score)) / audit.length) : 0;
  const weakest = [...audit].sort((a, b) => a.score - b.score)[0];
  const ops = objs(o.weekly_ops_checklist).map((c) => ({ day: str(c.day), task: str(c.task), minutes: num(c.minutes) })).filter((c) => c.task);
  const opsStrings = strs(o.weekly_ops_checklist);
  const replies = objs(o.review_response_templates).map((r) => ({ situation: str(r.situation), template: str(r.template) })).filter((r) => r.template);
  const replyStrings = strs(o.review_response_templates);
  const photos = objs(o.photo_checklist).map((p) => ({ shot: str(p.shot), why: str(p.why), priority: num(p.priority) || 99 })).sort((a, b) => a.priority - b.priority);
  const desc = str(o.description_optimized);
  const name = str(input.business_name);

  const sections: ReportSection[] = [];

  sections.push({
    id: "audit",
    kicker: "진단",
    title: weakest ? `가장 먼저 고칠 곳: ${weakest.area}` : "플레이스 진단",
    blocks: keep([
      audit.length > 0 && { type: "chart", half: true, chart: { kind: "gauge", value: overall, max: 100, label: "플레이스 종합 점수", bands: [0.5, 0.75] } },
      audit.length > 0 && {
        type: "chart",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: audit.map((a) => a.area), series: [{ name: "점수", values: audit.map((a) => a.score) }], unit: "점", max: 100, highlight: audit.indexOf(weakest!) },
      },
      audit.length > 0 && {
        type: "table",
        title: "영역별 진단",
        header: ["영역", "점수", "지금 상태", "오늘 바꿀 것"],
        align: ["l", "c", "l", "l"],
        rows: [...audit].sort((a, b) => a.score - b.score).map((a) => [a.area, `${a.score}`, a.current, a.fix]),
      },
    ]),
  });

  sections.push({
    id: "profile",
    kicker: "기본 정보",
    title: "상호와 소개글",
    blocks: keep([
      {
        type: "cards",
        columns: 3,
        items: strs(o.business_name_suggestions).map((n, i) => ({ kicker: `상호 제안 ${i + 1}`, title: n })),
      },
      Boolean(desc) && { type: "callout", label: `소개글 · ${desc.length}자 (첫 두 줄이 모바일 미리보기)`, text: desc },
      { type: "bullets", title: "핵심 키워드", items: strs(o.primary_keywords), half: true },
      { type: "bullets", title: "메뉴·상품 구성 제안", items: strs(o.menu_recommendations), half: true },
    ]),
  });

  sections.push({
    id: "competitors",
    kicker: "경쟁 벤치마크",
    title: "잘되는 가게는 무엇을 하나",
    blocks: keep([
      {
        type: "table",
        header: ["가게", "잘하는 점", "우리가 할 것"],
        rows: objs(o.competitor_benchmark).map((c) => [str(c.name), str(c.what_works), str(c.our_move)]).filter((r) => r[0]),
      },
    ]),
  });

  sections.push({
    id: "photos",
    kicker: "사진",
    title: "대표 사진 올리는 순서",
    blocks: keep([
      {
        type: "table",
        header: ["순서", "찍을 컷", "왜 필요한가"],
        align: ["c", "l", "l"],
        rows: photos.filter((p) => p.shot).map((p, i) => [`${i + 1}`, p.shot, p.why]),
      },
    ]),
  });

  sections.push({
    id: "reviews",
    kicker: "리뷰 답글",
    title: "상황별 답글 템플릿",
    blocks: keep([
      replies.length > 0
        ? { type: "cards", columns: 2, items: replies.map((r) => ({ title: r.situation || "답글", lines: [r.template] })) }
        : { type: "bullets", items: replyStrings },
    ]),
  });

  sections.push({
    id: "ops",
    kicker: "주간 관리",
    title: ops.length ? `매주 ${sum(ops.map((c) => c.minutes))}분이면 됩니다` : "주간 관리 체크리스트",
    blocks: keep([
      ops.length > 0 && ops.some((c) => c.minutes) && {
        type: "chart",
        half: true,
        chart: { kind: "bar", categories: ops.map((c) => c.day), series: [{ name: "분", values: ops.map((c) => c.minutes) }], unit: "분" },
      },
      ops.length > 0
        ? { type: "table", half: true, header: ["요일", "할 일", "시간"], align: ["c", "l", "r"], rows: ops.map((c) => [c.day, c.task, `${c.minutes}분`]) }
        : { type: "bullets", style: "check", items: opsStrings },
    ]),
  });

  return {
    palette: PALETTES.place,
    hero: {
      eyebrow: "네이버 플레이스 최적화",
      title: name || "플레이스 진단",
      subtitle: [str(input.region), weakest ? `가장 약한 영역: ${weakest.area}` : ""].filter(Boolean).join(" · ") || undefined,
      kpis: [
        audit.length ? { label: "종합 점수", value: `${overall}점`, tone: overall >= 75 ? ("up" as const) : overall >= 50 ? ("warn" as const) : ("down" as const) } : null,
        weakest ? { label: "가장 약한 영역", value: weakest.area, note: `${weakest.score}점`, tone: "down" as const } : null,
        { label: "바로 고칠 항목", value: `${audit.length + photos.length}개` },
        ops.length ? { label: "주간 관리 시간", value: `${sum(ops.map((c) => c.minutes))}분` } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
