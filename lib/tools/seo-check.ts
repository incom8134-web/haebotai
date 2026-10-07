// Live SEO checks for the SEO Content Composer's editor. Pure functions
// over the draft, so the sidebar re-scores as the member edits. The
// thresholds are common Korean-blog guidance (Naver/Google), stated on
// each check rather than hidden in a single score.

interface SeoCheck {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

const plain = (md: string) =>
  md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export const charCount = (md: string) => plain(md).replace(/\s/g, "").length;

function occurrences(text: string, keyword: string): number {
  const k = keyword.trim().toLowerCase();
  if (!k) return 0;
  let n = 0;
  let i = text.toLowerCase().indexOf(k);
  while (i !== -1) {
    n++;
    i = text.toLowerCase().indexOf(k, i + k.length);
  }
  return n;
}

export function seoChecks(input: { markdown: string; keyword: string; titles: string[]; meta: string; targetChars: number; imageSlots: number }): SeoCheck[] {
  const { markdown, titles, meta, targetChars, imageSlots } = input;
  // The main keyword is the first comma-separated term of the topic.
  const keyword = input.keyword.split(/[,/·]/)[0].trim();
  const text = plain(markdown);
  const chars = charCount(markdown);
  const paragraphs = markdown.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !p.startsWith("#") && !/^[-*\d]/.test(p));
  const first = paragraphs[0] ?? "";
  const h2 = (markdown.match(/^##\s+/gm) ?? []).length;
  const hits = occurrences(text, keyword);
  const per1k = chars ? (hits / chars) * 1000 : 0;
  const sentences = text.split(/(?<=[.!?。]|다\.|요\.)\s+/).map((s) => s.trim()).filter(Boolean);
  const avgSentence = sentences.length ? Math.round(sentences.reduce((a, s) => a + s.replace(/\s/g, "").length, 0) / sentences.length) : 0;
  const longParas = paragraphs.filter((p) => p.replace(/\s/g, "").length > 400).length;
  const low = Math.round(targetChars * 0.8);
  const high = Math.round(targetChars * 1.3);
  const metaLen = meta.trim().length;

  return [
    { id: "title", label: "제목에 키워드", pass: !!keyword && titles.some((t) => occurrences(t, keyword) > 0), detail: keyword ? `'${keyword}'` : "키워드 없음" },
    { id: "intro", label: "첫 문단에 키워드", pass: !!keyword && occurrences(first, keyword) > 0, detail: "검색 결과 미리보기에 쓰이는 부분" },
    { id: "length", label: "분량", pass: targetChars ? chars >= low && chars <= high : chars >= 1000, detail: targetChars ? `${chars.toLocaleString()}자 / 목표 ${targetChars.toLocaleString()}자` : `${chars.toLocaleString()}자` },
    { id: "density", label: "키워드 반복", pass: hits > 0 && per1k >= 1 && per1k <= 8, detail: `${hits}회 (1,000자당 ${per1k.toFixed(1)}회, 권장 1~8)` },
    { id: "headings", label: "소제목 3개 이상", pass: h2 >= 3, detail: `소제목 ${h2}개` },
    { id: "meta", label: "검색 설명 80~160자", pass: metaLen >= 80 && metaLen <= 160, detail: `${metaLen}자` },
    { id: "images", label: "사진 2장 이상", pass: imageSlots >= 2, detail: `${imageSlots}장` },
    { id: "sentences", label: "문장 길이", pass: avgSentence > 0 && avgSentence <= 60, detail: `평균 ${avgSentence}자 (60자 이하 권장)` },
    { id: "paragraphs", label: "긴 문단 없음", pass: longParas === 0, detail: longParas ? `400자 넘는 문단 ${longParas}개` : "모두 400자 이하" },
  ];
}
