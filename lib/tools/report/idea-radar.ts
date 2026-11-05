import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs } from "./util.ts";

// 사업 아이디어 찾기: the ideas side by side on the same five axes (a radar
// and a total-score bar, out of 100), then one card per idea with its
// customer, revenue, MVP and the first test to run.

/** Points per axis; five axes make 100. */
export const AXIS_MAX = 20;

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
  // Runs from before the 100-point scale scored each axis 1–10.
  const factor = o.scoring === "100" ? 1 : 2;
  return objs(o.ideas)
    .map((i) => {
      const s = obj(i.scores);
      const scores = IDEA_AXES.map((a) => Math.max(0, Math.min(AXIS_MAX, Math.round(num(s[a.key]) * factor))));
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
        title: `다섯 축 점수 (축마다 ${AXIS_MAX}점)`,
        half: true,
        chart: { kind: "radar", axes: IDEA_AXES.map((a) => a.label), series: top.map((i) => ({ name: i.name, values: i.scores })), max: AXIS_MAX },
        estimated: true,
      },
      ideas.length > 0 && {
        type: "chart",
        title: "총점 (100점 만점)",
        half: true,
        chart: { kind: "bar", horizontal: true, categories: ideas.map((i) => i.name), series: [{ name: "총점", values: ideas.map((i) => i.total) }], max: 100, highlight: Math.max(0, ideas.findIndex((i) => i.name === pick)) },
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
      eyebrow: "사업 아이디어 찾기",
      title: pick ? `추천: ${pick}` : best ? best.name : "사업 아이디어",
      subtitle: str(o.lens) || undefined,
      kpis: [
        { label: "아이디어", value: `${ideas.length}개` },
        best ? { label: "최고 총점", value: `${best.total}/100`, note: best.name, tone: "up" as const } : null,
      ].filter((k): k is NonNullable<typeof k> => k !== null),
    },
    sections: sections.filter((s) => s.blocks.length),
  };
}

const BUDGET: Record<string, string> = { "0": "0원", "3m": "~300만원", "10m": "~1,000만원", "30m": "~3,000만원", "30m+": "3,000만원 이상" };
const CHANNEL: Record<string, string> = { online: "온라인", offline: "오프라인", hybrid: "온라인·오프라인" };
const RISK: Record<string, string> = { low: "잃지 않는 게 먼저", mid: "적당히", high: "크게 걸어도 됨" };

/**
 * A market-research brief (Markdown) for the recommended idea — or the
 * highest-scoring one — built from the run's own input and output. Prices and
 * potential are the model's estimates and are labelled so; the open questions
 * at the end are what the market-research tool should check next.
 */
export function ideaResearchMarkdown(o: Record<string, unknown>, input: Record<string, unknown> = {}, today = new Date()): string {
  const ideas = readIdeas(o);
  if (!ideas.length) return "";
  const rec = obj(o.recommendation);
  const byScore = [...ideas].sort((a, b) => b.total - a.total);
  const top = ideas.find((i) => i.name === str(rec.pick)) ?? byScore[0];
  const others = byScore.filter((i) => i !== top);
  const date = today.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const line = (label: string, v: string) => (v ? `- **${label}**: ${v}` : "");
  const lines = (...xs: string[]) => xs.filter(Boolean).join("\n");
  const interests = strs(input.interests).join(", ");
  const types = strs(input.business_types).map((t) => ARCHETYPE_LABELS[t] ?? t).join(", ");
  const out = [
    `# 시장 조사: ${top.name}`,
    `> AI 해바 「사업 아이디어 찾기」 결과로 만든 조사 문서 · ${date}\n> 가격·매출·점수는 AI의 추정이에요. 결정 전에 아래 「확인할 질문」으로 검증하세요.`,
    "## 한눈에",
    lines(line("한 줄 소개", top.oneLiner), line("형태", ARCHETYPE_LABELS[top.archetype] ?? top.archetype), line("총점", `${top.total}/100 (AI 평가)`), str(rec.reason) ? line("추천 이유", str(rec.reason)) : ""),
    "| 축 | 점수 |\n|---|---:|\n" + IDEA_AXES.map((a, k) => `| ${a.label} | ${top.scores[k]}/${AXIS_MAX} |`).join("\n"),
    str(input.skills) || interests || types
      ? "## 출발점 (입력한 조건)\n" +
        lines(
          line("할 줄 아는 것·경력", str(input.skills)),
          line("관심 분야", interests),
          line("원하는 사업 형태", types),
          line("채널", CHANNEL[str(input.channel)] ?? str(input.channel)),
          line("초기 자금", BUDGET[str(input.budget)] ?? str(input.budget)),
          num(input.weekly_hours) ? line("주당 시간", `${num(input.weekly_hours)}시간`) : "",
          line("지역", str(input.location)),
          line("위험 감수", RISK[str(input.risk)] ?? str(input.risk)),
        )
      : "",
    "## 고객과 문제\n" + lines(line("고객", top.who), line("상황", top.situation), line("문제", top.problem)),
    top.value ? `## 가치 제안\n${top.value}` : "",
    top.whyYou ? `## 왜 이 사람인가 (경쟁 우위)\n${top.whyYou}` : "",
    "## 수익 구조 (추정)\n" + lines(line("수익 모델", top.model), line("가격대", top.price ? `${top.price} (추정)` : ""), line("매출 가능성", top.potential ? `${top.potential} (추정)` : "")),
    top.mvp ? `## 시험용 첫 상품 (MVP)\n${top.mvp}` : "",
    top.test.action ? `## 첫 검증\n${lines(line("할 일", top.test.action), line("성공 신호", top.test.signal), top.test.days ? line("기간", `${top.test.days}일`) : "")}` : "",
    top.resources.length ? `## 갖춰야 할 것\n${top.resources.map((r) => `- [ ] ${r}`).join("\n")}` : "",
    top.risks.length ? `## 위험\n${top.risks.map((r) => `- ${r}`).join("\n")}` : "",
    "## 확인할 질문 (다음 조사)\n" +
      [
        `${top.who || "이 고객"}은(는) 지금 이 문제를 어떻게 해결하고, 얼마를 쓰고 있나요?`,
        `${top.price || "제시한 가격"}에 실제로 사겠다는 사람이 몇 명인가요? (사전 신청·예약으로 확인)`,
        `${ARCHETYPE_LABELS[top.archetype] ?? "이 형태"}로 이미 하는 국내 업체는 누구이고, 무엇을 놓치고 있나요?`,
        `${str(input.location) ? `${str(input.location)}에서 ` : ""}이 고객은 몇 명이나 되나요? (공식 통계로 규모 확인)`,
      ]
        .map((q, k) => `${k + 1}. ${q}`)
        .join("\n"),
    others.length ? `## 다른 후보\n${others.map((i) => `- **${i.name}** — ${i.total}/100 · ${i.oneLiner}`).join("\n")}` : "",
    "---\n이 문서는 AI 해바(aihaeba.com)에서 만들었어요. 「시장 조사하기」 도구에 이 아이디어를 넘기면 출처가 달린 수요·경쟁 조사로 이어서 확인할 수 있어요.",
  ];
  return out.filter(Boolean).join("\n\n") + "\n";
}
