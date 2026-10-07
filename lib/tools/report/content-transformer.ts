import type { Report, ReportSection } from "./types.ts";
import { keep, objs, PALETTES, str, strs } from "./util.ts";

// 콘텐츠 변환기 export: the core message, how long each version runs, then
// every version in its own shape (slides, script, posts or body).

const TARGET_KO: Record<string, string> = {
  instagram_carousel: "인스타 카드뉴스",
  instagram_caption: "인스타 캡션",
  threads: "스레드",
  linkedin: "링크드인",
  shorts_script: "쇼츠 대본",
  newsletter: "뉴스레터",
  naver_blog: "네이버 블로그",
  kakao: "카카오톡 채널",
};

export function contentTransformerReport(o: Record<string, unknown>): Report {
  const versions = objs(o.versions);
  const length = (v: Record<string, unknown>) =>
    (str(v.body) + strs(v.posts).join("") + objs(v.slides).map((s) => str(s.heading) + str(s.text)).join("") + objs(v.script).map((s) => str(s.voice)).join("")).replace(/\s/g, "").length;
  const sections: ReportSection[] = [
    {
      id: "core",
      kicker: "원본",
      title: str(o.core_message) || "핵심 메시지",
      blocks: keep([
        { type: "bullets", title: "살린 요점", items: strs(o.key_points) },
        versions.length > 0 && {
          type: "chart",
          title: "버전별 분량 (글자)",
          chart: { kind: "donut", slices: versions.map((v) => ({ label: TARGET_KO[str(v.platform)] ?? str(v.platform), value: length(v) })).filter((s) => s.value > 0), unit: "자" },
        },
        strs(o.dropped).length > 0 && { type: "bullets", title: "원본에서 뺀 내용", items: strs(o.dropped) },
      ]),
    },
    ...versions.map((v, i) => ({
      id: `v-${i}`,
      kicker: TARGET_KO[str(v.platform)] ?? str(v.platform),
      title: str(v.title) || str(v.angle) || (TARGET_KO[str(v.platform)] ?? ""),
      lead: str(v.angle) || undefined,
      blocks: keep([
        objs(v.slides).length > 0 && { type: "table", header: ["장", "제목", "내용"], rows: objs(v.slides).map((s, k) => [String(k + 1), str(s.heading), str(s.text)]) },
        objs(v.script).length > 0 && { type: "table", header: ["시간", "화면", "말·자막"], rows: objs(v.script).map((s) => [str(s.time), str(s.visual), str(s.voice)]) },
        strs(v.posts).length > 0 && { type: "bullets", style: "num", items: strs(v.posts) },
        { type: "text", text: str(v.body) },
        { type: "text", text: [str(v.cta) && `→ ${str(v.cta)}`, strs(v.hashtags).join(" ")].filter(Boolean).join("\n") },
      ]),
    })),
  ];
  return {
    palette: PALETTES["content-transformer"],
    hero: { eyebrow: "콘텐츠 변환기", title: str(o.core_message) || "플랫폼별 버전", kpis: [{ label: "버전", value: `${versions.length}개` }] },
    sections: sections.filter((s) => s.blocks.length),
  };
}
