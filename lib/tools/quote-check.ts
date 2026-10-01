// 인사이트 마이너: is a quote really in the pasted text? Compared after
// dropping spaces, punctuation, emoji and star ratings, so line breaks or
// a trailing "ㅠ" don't count as a change — but a reworded sentence does.

const norm = (s: string) =>
  s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[★☆]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

export function quoteFound(quote: string, source: string): boolean {
  const q = norm(quote);
  if (q.length < 4) return false;
  return norm(source).includes(q);
}
