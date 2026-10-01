// A result's skeleton: its shape without its words (docs/ai-architecture-v2.md
// §7 phase 0). Two results of the same tool can say completely different
// things and still be the same template — same parts, same counts, same
// layouts in the same order. The skeleton captures that shape so the eval
// harness and the diversity memory can measure it:
//
//   - which top-level parts exist and how many items each list has;
//   - for lists of typed items (slides, sections, blocks), the sequence of
//     their kinds (layout / type / data block);
//   - for markdown and HTML bodies, the sequence of headings or sections.
//
// Pure (tested); no model calls.

const META_KEYS = new Set(["agent", "request_brief", "creative_direction", "rendered_images", "_agent"]);
const KIND_KEYS = ["layout", "type", "kind", "data", "style", "format", "channel"] as const;

export interface Skeleton {
  /** Unordered structural facts: parts present, list sizes, item field sets. */
  facts: string[];
  /** Ordered: the kinds of the deliverable's parts, in reading order. */
  sequence: string[];
}

const bucket = (n: number) => (n <= 3 ? String(n) : n <= 6 ? "4-6" : n <= 10 ? "7-10" : "11+");

function kindOf(item: Record<string, unknown>): string | null {
  for (const k of KIND_KEYS) {
    const v = item[k];
    if (typeof v === "string" && v.length > 0 && v.length <= 40) return `${k}=${v.toLowerCase()}`;
  }
  return null;
}

/** The headings of a markdown document, as levels ("h2", "h3"…). */
function markdownSequence(text: string): string[] {
  return [...text.matchAll(/^(#{1,4})\s+\S/gm)].map((m) => `h${m[1].length}`);
}

/** The sections of an HTML page, by tag and first class or id word. */
function htmlSequence(text: string): string[] {
  return [...text.matchAll(/<(section|header|footer|nav|form)\b([^>]*)>/gi)].map((m) => {
    const attr = /(?:class|id)\s*=\s*["']([\w-]+)/i.exec(m[2]);
    return `${m[1].toLowerCase()}${attr ? `.${attr[1].toLowerCase().replace(/\d+/g, "")}` : ""}`;
  });
}

export function skeletonOf(output: unknown): Skeleton {
  const facts: string[] = [];
  const sequence: string[] = [];
  if (!output || typeof output !== "object" || Array.isArray(output)) return { facts, sequence };
  for (const [key, value] of Object.entries(output as Record<string, unknown>)) {
    if (META_KEYS.has(key) || value === null || value === undefined || value === "") continue;
    if (typeof value === "string") {
      facts.push(`has:${key}`);
      if (value.length > 400 && /<section\b/i.test(value)) sequence.push(...htmlSequence(value).map((s) => `${key}:${s}`));
      else if (value.length > 400 && /^#{1,4}\s/m.test(value)) sequence.push(...markdownSequence(value).map((s) => `${key}:${s}`));
      continue;
    }
    if (Array.isArray(value)) {
      facts.push(`list:${key}=${bucket(value.length)}`);
      const objects = value.filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v));
      if (objects.length) {
        const fields = [...new Set(objects.flatMap((o) => Object.keys(o).filter((k) => o[k] !== undefined && o[k] !== null && o[k] !== "")))].sort();
        facts.push(`fields:${key}{${fields.join(",")}}`);
        for (const o of objects) sequence.push(`${key}:${kindOf(o) ?? "item"}`);
      }
      continue;
    }
    if (typeof value === "object") {
      const keys = Object.keys(value as Record<string, unknown>).sort();
      facts.push(`obj:${key}{${keys.join(",")}}`);
      continue;
    }
    facts.push(`has:${key}`);
  }
  return { facts, sequence };
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Longest common subsequence length. */
function lcs(a: string[], b: string[]): number {
  const row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[b.length];
}

/**
 * How alike two skeletons are, 0 (nothing shared) … 1 (same template).
 * Half the unordered facts (Jaccard), half the ordered sequence (common
 * subsequence over the longer sequence), so the same parts in a different
 * order, or the same layouts in different proportions, score below 1.
 */
export function skeletonSimilarity(a: Skeleton, b: Skeleton): number {
  const facts = jaccard(a.facts, b.facts);
  const longest = Math.max(a.sequence.length, b.sequence.length);
  const seq = longest === 0 ? 1 : lcs(a.sequence, b.sequence) / longest;
  return Math.round((facts * 0.5 + seq * 0.5) * 100) / 100;
}

/** A short signature for fingerprints: the sequence's kinds, compressed ("slides:layout=chart×2"). */
export function skeletonSignature(s: Skeleton, max = 16): string[] {
  const out: string[] = [];
  for (const k of s.sequence) {
    const last = out[out.length - 1];
    const m = last ? /^(.*)×(\d+)$/.exec(last) : null;
    if (last === k) out[out.length - 1] = `${k}×2`;
    else if (m && m[1] === k) out[out.length - 1] = `${k}×${Number(m[2]) + 1}`;
    else out.push(k);
  }
  return out.slice(0, max);
}
