// The homepage rule "never invent a price" in code: the page's visible
// text may only show won amounts the user actually typed. Anything else
// becomes [입력 필요] before the page is saved.

/** Won amounts written in a text ("6,500원", "3만 원", "59000 원"), as plain numbers. */
function wonAmounts(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d[\d,]*)\s*(만)?\s*원/g)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(m[2] ? n * 10_000 : n);
  }
  return out;
}

/**
 * Last line of defense for the no-invented-prices rule: any won amount
 * in the page's visible text that the user never typed becomes
 * [입력 필요]. Only text between tags is touched, never CSS or scripts.
 */
export function redactInventedPrices(html: string, inputText: string): string {
  const allowed = new Set(wonAmounts(inputText));
  const [head, body = ""] = html.split(/(?=<body[\s>])/i);
  const cleaned = body.replace(/(<(script|style)[\s\S]*?<\/\2>)|>([^<]+)</gi, (m, block, _tag, text) => {
    if (block) return block;
    const fixed = (text as string).replace(/(\d[\d,]*)\s*(만)?\s*원/g, (amount, digits: string, man: string | undefined) => {
      const n = Number(digits.replace(/,/g, "")) * (man ? 10_000 : 1);
      return allowed.has(n) ? amount : "[입력 필요]";
    });
    return `>${fixed}<`;
  });
  return body ? head + cleaned : html;
}
