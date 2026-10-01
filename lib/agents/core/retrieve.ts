import { sectionText, type SourceDoc, type SourceSection } from "./source.ts";

// Retrieval: the parts of the sources a stage needs, instead of the first
// N characters. Sections are split into passages; passages are scored
// against the query with BM25 over word tokens plus Hangul character
// bigrams (Korean particles glue onto words, so "스마트팜을" must still
// match "스마트팜"); results come back in document order within a
// character budget, the best ones first when the budget is tight.
//
// No embeddings: lexical scoring is free, instant, deterministic and
// strong for documents whose terms the query shares. Pure logic (tested).

export interface Passage {
  docId: string;
  sectionId: string;
  /** Position in the corpus (document order). */
  order: number;
  heading: string;
  text: string;
}

export interface SourceIndex {
  passages: Passage[];
  df: Map<string, number>;
  avgLen: number;
  tokens: string[][];
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "are", "was", "있다", "있는", "하는", "및", "등", "수", "것", "위한", "대한", "통해", "에서", "으로"]);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase();
  for (const w of lower.match(/[a-z0-9][a-z0-9+#.-]*|[가-힣]+/g) ?? []) {
    if (STOP.has(w)) continue;
    if (/^[가-힣]+$/.test(w)) {
      if (w.length === 1) continue;
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
      if (w.length <= 6) out.push(w);
    } else if (w.length > 1) out.push(w);
  }
  return out;
}

const PASSAGE_CHARS = 1400;

function passagesOf(doc: SourceDoc, s: SourceSection): Omit<Passage, "order">[] {
  const heading = `${doc.name} › ${s.number ? `${s.number} ` : ""}${s.title || "(제목 없음)"}`;
  const body = sectionText(s);
  if (body.length <= PASSAGE_CHARS * 1.3) return [{ docId: doc.id, sectionId: s.id, heading, text: body }];
  const paras = body.split("\n");
  const out: Omit<Passage, "order">[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf && buf.length + p.length > PASSAGE_CHARS) {
      out.push({ docId: doc.id, sectionId: s.id, heading, text: buf });
      buf = "";
    }
    buf = buf ? `${buf}\n${p}` : p;
  }
  if (buf) out.push({ docId: doc.id, sectionId: s.id, heading, text: buf });
  return out;
}

export function buildIndex(docs: SourceDoc[]): SourceIndex {
  const passages: Passage[] = [];
  for (const d of docs) for (const s of d.sections) for (const p of passagesOf(d, s)) passages.push({ ...p, order: passages.length });
  const tokens = passages.map((p) => tokenize(`${p.heading} ${p.text}`));
  const df = new Map<string, number>();
  for (const t of tokens) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const avgLen = tokens.reduce((n, t) => n + t.length, 0) / Math.max(1, tokens.length);
  return { passages, df, avgLen, tokens };
}

/** BM25 scores of every passage for the query. */
export function score(index: SourceIndex, query: string): number[] {
  const q = [...new Set(tokenize(query))];
  const N = index.passages.length;
  const k1 = 1.4;
  const b = 0.7;
  return index.tokens.map((toks) => {
    const tf = new Map<string, number>();
    for (const w of toks) tf.set(w, (tf.get(w) ?? 0) + 1);
    let s = 0;
    for (const w of q) {
      const f = tf.get(w);
      if (!f) continue;
      const df = index.df.get(w) ?? 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      s += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * toks.length) / index.avgLen));
    }
    return s;
  });
}

/**
 * The passages most relevant to the query within `budget` characters,
 * returned in document order. `pinned` section ids are always included
 * first (the plan says this section rests on them).
 */
export function retrieve(index: SourceIndex, query: string, budget: number, pinned: string[] = []): Passage[] {
  const scores = score(index, query);
  const chosen = new Set<number>();
  let used = 0;
  const take = (i: number) => {
    const len = index.passages[i].text.length + index.passages[i].heading.length;
    if (chosen.has(i) || used + len > budget) return false;
    chosen.add(i);
    used += len;
    return true;
  };
  for (const id of pinned) index.passages.forEach((p, i) => p.sectionId === id && take(i));
  const ranked = scores.map((s, i) => [s, i] as const).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]);
  for (const [, i] of ranked) take(i);
  return [...chosen].sort((a, b) => a - b).map((i) => index.passages[i]);
}

export function passagesText(passages: Passage[]): string {
  let last = "";
  return passages
    .map((p) => {
      const head = p.heading !== last ? `### ${p.heading} [${p.sectionId}]\n` : "";
      last = p.heading;
      return `${head}${p.text.replace(/^### .*\n?/, "")}`;
    })
    .join("\n\n");
}

/** The whole corpus if it fits the budget, else the passages most relevant to the query. */
export function sourceContext(docs: SourceDoc[], index: SourceIndex | null, query: string, budget: number, pinned: string[] = []): { text: string; complete: boolean } {
  const all = index ?? buildIndex(docs);
  const total = all.passages.reduce((n, p) => n + p.text.length + p.heading.length, 0);
  if (total <= budget) return { text: passagesText(all.passages), complete: true };
  return { text: passagesText(retrieve(all, query, budget, pinned)), complete: false };
}
