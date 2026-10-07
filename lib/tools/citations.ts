// Inline citations: grounded tools mark a sentence with the number of the
// source it rests on — "[2]" or "[1, 3]" — numbered as the run's sources
// are listed. These split text into plain parts and citation numbers, and
// drop numbers that point at no source (a model can't cite what it wasn't
// given).

type CitedPart = { text: string } | { cite: number };

const MARK = /\s?\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g;

export function splitCitations(text: string, sourceCount: number): CitedPart[] {
  const parts: CitedPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MARK)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at) });
    for (const n of m[1].split(",").map((x) => Number(x.trim()))) {
      if (n >= 1 && n <= sourceCount) parts.push({ cite: n });
    }
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

/** The text without citation marks (copy buttons, places that can't link). */
export function stripCitations(text: string): string {
  return text.replace(MARK, "");
}
