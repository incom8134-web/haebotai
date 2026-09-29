import { fmt } from "./charts.ts";
import type { Report, ReportSection } from "./types.ts";
import { clamp, keep, num, objs, PALETTES, str, strs } from "./util.ts";

// 지원사업 매칭: a funding shortlist. How well each program fits (share
// of requirements met), deadlines with a D-day, then one card per
// program with its requirement checklist and documents.

function dday(date: string, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** `today` is only for tests; the tool input passed as the second argument never carries it. */
export function grantReport(o: Record<string, unknown>, opts: { today?: unknown } = {}): Report {
  const today = opts.today instanceof Date ? opts.today : new Date();
  const matches = objs(o.matches)
    .map((m) => {
      const req = objs(m.eligibility).map((e) => ({ requirement: str(e.requirement), meets: e.user_meets === true, note: str(e.note) })).filter((e) => e.requirement);
      const fit = req.length ? req.filter((e) => e.meets).length / req.length : 0;
      const date = str(m.deadline_date);
      return {
        name: str(m.program_name),
        agency: str(m.agency),
        deadline: str(m.deadline),
        dday: dday(date, today),
        scale: str(m.funding_scale),
        amount: num(m.max_amount_krw),
        req,
        fit,
        docs: strs(m.document_checklist),
        difficulty: clamp(num(m.difficulty), 0, 5),
        url: str(m.source_url),
      };
    })
    .filter((m) => m.name)
    .sort((a, b) => b.fit - a.fit);
  const soonest = matches.filter((m) => m.dday !== null && m.dday >= 0).sort((a, b) => a.dday! - b.dday!)[0];
  const biggest = [...matches].sort((a, b) => b.amount - a.amount)[0];

  const sections: ReportSection[] = [];
  sections.push({
    id: "fit",
    kicker: "적합도",
    title: "조건이 맞는 순서",
    blocks: keep([
      matches.length > 0 && {
        type: "chart",
        chart: { kind: "bar", horizontal: true, categories: matches.map((m) => m.name), series: [{ name: "충족 요건", values: matches.map((m) => Math.round(m.fit * 100)) }], unit: "%", max: 100, highlight: 0 },
        caption: "공고의 자격 요건 중 입력한 조건으로 충족하는 비율입니다.",
      },
      matches.length > 0 && {
        type: "table",
        title: "마감 일정",
        header: ["사업", "주관", "마감", "D-day", "지원 규모"],
        align: ["l", "l", "c", "c", "r"],
        rows: [...matches]
          .sort((a, b) => (a.dday ?? 9999) - (b.dday ?? 9999))
          .map((m) => [m.name, m.agency, m.deadline || "—", m.dday === null ? "—" : m.dday < 0 ? "마감" : m.dday === 0 ? "오늘" : `D-${m.dday}`, m.amount ? `최대 ${fmt(m.amount, "원")}` : m.scale]),
      },
    ]),
  });
  sections.push({
    id: "programs",
    kicker: "사업별 체크리스트",
    title: "신청 전에 확인할 것",
    blocks: keep([
      {
        type: "cards",
        columns: 2,
        items: matches.map((m) => ({
          kicker: m.agency,
          title: m.name,
          badge: m.dday !== null && m.dday >= 0 ? `D-${m.dday}` : undefined,
          meter: { value: m.fit, label: `요건 ${m.req.filter((e) => e.meets).length}/${m.req.length} 충족` },
          facts: [
            { label: "지원 규모", value: m.amount ? `최대 ${fmt(m.amount, "원")}` : m.scale || "—" },
            { label: "마감", value: m.deadline || "—" },
            { label: "준비 난이도", value: "●".repeat(Math.round(m.difficulty)) + "○".repeat(5 - Math.round(m.difficulty)) },
          ],
          lines: [...m.req.map((e) => `${e.meets ? "✓" : "✗"} ${e.requirement}${e.note ? ` — ${e.note}` : ""}`), ...(m.docs.length ? [`서류: ${m.docs.join(", ")}`] : []), ...(m.url ? [`공고: ${m.url}`] : [])],
        })),
      },
    ]),
  });
  sections.push({
    id: "unmatched",
    kicker: "참고",
    title: "맞지 않았던 이유",
    blocks: keep([{ type: "bullets", items: strs(o.unmatched_reasons) }]),
  });
  const sources = matches.filter((m) => /^https?:\/\//.test(m.url)).map((m) => ({ url: m.url, title: m.name }));
  if (sources.length) sections.push({ id: "sources", title: "출처", blocks: [{ type: "sources", items: sources }] });

  return {
    palette: PALETTES.grant,
    hero: {
      eyebrow: "지원사업 매칭",
      title: matches.length ? `${matches.length}개 사업이 후보입니다` : "맞는 사업을 찾지 못했습니다",
      subtitle: matches[0] ? `가장 잘 맞는 사업: ${matches[0].name}` : undefined,
      kpis: [
        matches[0] ? { label: "최고 적합도", value: `${Math.round(matches[0].fit * 100)}%`, tone: "up" as const } : null,
        soonest ? { label: "가장 가까운 마감", value: `D-${soonest.dday}`, note: soonest.name, tone: "warn" as const } : null,
        biggest?.amount ? { label: "최대 지원 규모", value: fmt(biggest.amount, "원"), note: biggest.name } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}
