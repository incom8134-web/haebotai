import type { Report, ReportSection } from "./types.ts";
import { keep, num, obj, objs, PALETTES, str, strs } from "./util.ts";

// 훅 연구소 export: average strength per hook family, then each family's
// hooks with on-screen text, first scene, follow-up line and versions.

const FAMILY_KO: Record<string, string> = {
  question: "질문",
  contrarian: "통념 뒤집기",
  number: "숫자",
  story: "이야기",
  pain: "불편 찌르기",
  curiosity: "호기심 공백",
  before_after: "전후 비교",
  proof: "증거",
};

export function hookLabReport(o: Record<string, unknown>): Report {
  const families = objs(o.families).map((f) => ({ family: str(f.family), why: str(f.why_it_works), hooks: objs(o.hooks).filter((h) => str(h.family) === str(f.family)) }));
  const best = obj(o.best);
  const bestStrength = num(families.flatMap((f) => f.hooks).find((h) => str(h.text) === str(best.text))?.strength);
  const avg = (hs: Record<string, unknown>[]) => (hs.length ? Math.round((hs.reduce((a, h) => a + num(h.strength), 0) / hs.length) * 10) / 10 : 0);
  const sections: ReportSection[] = [
    {
      id: "overview",
      kicker: "개요",
      title: "유형별 훅의 힘",
      lead: str(o.audience_insight) || undefined,
      blocks: keep([
        !!str(best.text) && { type: "callout", label: "먼저 찍어 볼 훅", text: `${str(best.text)}\n${str(best.reason)}` },
        bestStrength > 0 && { type: "chart", title: "추천 훅의 강도", half: true, chart: { kind: "gauge", value: bestStrength, max: 10, label: "강도" }, estimated: true },
        families.length > 0 && {
          type: "chart",
          title: "유형별 평균 강도 (10점)",
          chart: { kind: "bar", horizontal: true, categories: families.map((f) => FAMILY_KO[f.family] ?? f.family), series: [{ name: "강도", values: families.map((f) => avg(f.hooks)) }], max: 10 },
          estimated: true,
        },
        strs(o.avoid).length > 0 && { type: "bullets", title: "피할 첫 문장", items: strs(o.avoid) },
      ]),
    },
    ...families.map((f, i) => ({
      id: `family-${i}`,
      kicker: "유형",
      title: FAMILY_KO[f.family] ?? f.family,
      lead: f.why || undefined,
      blocks: keep([
        {
          type: "table",
          header: ["훅", "화면 글자", "첫 장면", "이어지는 문장", "강도"],
          rows: f.hooks.map((h) => [str(h.text), str(h.on_screen), str(h.first_scene), str(h.follow_line), String(num(h.strength))]),
        },
        {
          type: "bullets",
          title: "플랫폼별 변형",
          items: f.hooks.flatMap((h) => objs(h.variants).map((v) => `[${str(v.platform)}] ${str(v.text)}`)),
        },
      ]),
    })),
  ];
  return {
    palette: PALETTES["hook-lab"],
    hero: { eyebrow: "훅 연구소", title: str(best.text) || "훅 모음", subtitle: str(o.summary) || undefined, kpis: [{ label: "유형", value: `${families.length}개` }, { label: "훅", value: `${families.reduce((a, f) => a + f.hooks.length, 0)}개` }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
