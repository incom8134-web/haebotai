import type { DesignSystem, LongDocument } from "./document.ts";

// Follow-up instructions on a finished document, routed to the smallest
// change that does what was asked:
//   "keep everything, make the design more premium" → design only (no words change, no model call)
//   "use fewer images but more diagrams"            → the visual strategy only
//   "make section 5 more technical"                 → section 5 only
// Anything else needs a section picked. Pure logic (tested).

type RevisionRoute =
  | { kind: "design"; patch: Partial<DesignSystem>; note: string }
  | { kind: "visuals"; fewerImages: boolean; moreDiagrams: boolean }
  | { kind: "sections"; ids: string[] }
  | { kind: "unknown" };

const DESIGN_WORDS = /(디자인|레이아웃|배치|서식|폰트|글꼴|타이포|색|컬러|여백|고급|프리미엄|세련|모던|심플|미니멀|깔끔|따뜻|차분|격식|premium|luxur|elegant|modern|minimal|clean|warm|formal|technical\s+look|layout|design|font|typograph|colou?r|spacing|whitespace)/i;
const CONTENT_WORDS = /(내용|문장|써|작성|추가|보강|설명|기술적|구체|자세|줄여|늘려|요약|근거|수치|technical(?!\s+look)|rewrite|write|add|expand|shorten|detail|explain|content|wording|section\s+\d)/i;
const FROZEN = /(문구|문장|내용|글|텍스트|wording|words|text|content)[은는을를]?\s*(그대로|바꾸지|유지|건드리지)|(don'?t|do\s+not)\s+change\s+(any\s+)?(wording|words|text|content)|keep\s+everything|모두\s*그대로|다\s*그대로/i;
const FEWER_IMAGES = /((이미지|사진|그림)[은는을를]?\s*(줄이|빼|없이|덜)|fewer\s+(images|photos|pictures)|less\s+(images|photos)|no\s+(images|photos))/i;
const MORE_DIAGRAMS = /((도표|다이어그램|도식|공정도|흐름도|표|차트|그래프)[를을은는]?\s*(더|많이|추가|늘)|more\s+(diagrams|charts|tables|graphs))/i;

const TONES: [RegExp, DesignSystem["tone"]][] = [
  [/(고급|프리미엄|럭셔리|premium|luxur|elegant)/i, "premium"],
  [/(심플|미니멀|깔끔|minimal|clean|simple)/i, "minimal"],
  [/(모던|세련|현대적|modern|sleek)/i, "modern"],
  [/(따뜻|친근|warm|friendly)/i, "warm"],
  [/(기술|테크|technical|tech)/i, "technical"],
  [/(격식|공식|보수적|formal|official|conservative)/i, "formal"],
];

function designPatch(instruction: string): Partial<DesignSystem> {
  const patch: Partial<DesignSystem> = {};
  for (const [rx, tone] of TONES) if (rx.test(instruction)) {
    patch.tone = tone;
    break;
  }
  if (/(여백|시원|넓게|airy|spacious|breathing|whitespace)/i.test(instruction)) patch.density = "airy";
  else if (/(촘촘|빽빽|압축|compact|dense|tight)/i.test(instruction)) patch.density = "compact";
  const hex = /#[0-9a-f]{6}\b/i.exec(instruction);
  if (hex) patch.accent = hex[0];
  if (/(번호\s*(빼|없이)|no\s+numbering)/i.test(instruction)) patch.numbering = false;
  else if (/(번호\s*(붙|넣)|add\s+numbering|numbered)/i.test(instruction)) patch.numbering = true;
  return patch;
}

/** Plan-level chapter n (1-based) → its section and subsections. */
function chapterIds(doc: LongDocument, n: number): string[] {
  const out: string[] = [];
  let chapter = 0;
  for (const s of doc.sections) {
    if (s.level <= 1) chapter++;
    if (chapter === n) out.push(s.id);
    else if (chapter > n) break;
  }
  return out;
}

export function routeRevision(instruction: string, doc: LongDocument): RevisionRoute {
  const t = instruction.trim();
  const fewerImages = FEWER_IMAGES.test(t);
  const moreDiagrams = MORE_DIAGRAMS.test(t);
  if (fewerImages || moreDiagrams) return { kind: "visuals", fewerImages, moreDiagrams };

  const num = /(?:section|섹션|장|챕터|chapter|part)\s*(\d{1,2})\b|(\d{1,2})\s*(?:번째\s*)?(?:섹션|장|챕터|부분)|제\s*(\d{1,2})\s*장/i.exec(t);
  if (num) {
    const n = Number(num[1] ?? num[2] ?? num[3]);
    const ids = chapterIds(doc, n);
    if (ids.length) return { kind: "sections", ids };
  }
  const titled = doc.sections.filter((s) => s.title.trim().length >= 3 && t.includes(s.title.trim()));
  if (titled.length) return { kind: "sections", ids: titled.map((s) => s.id) };

  if ((FROZEN.test(t) && DESIGN_WORDS.test(t)) || (DESIGN_WORDS.test(t) && !CONTENT_WORDS.test(t))) {
    const patch = designPatch(t);
    return { kind: "design", patch, note: Object.keys(patch).length ? "문장은 그대로 두고 디자인만 바꿨어요" : "문장은 그대로 두었어요" };
  }
  return { kind: "unknown" };
}
