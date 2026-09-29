// A deck's "big number" is the one figure the audience remembers, so it
// must be real. The playbook forbids inventing business figures, but a
// model filling a big-number slide still reaches for a plausible one
// ("픽업 1분"). This checks every big number (and every chart the model
// says came from the input) against the numbers actually present in
// what the user gave: an unsupported big number becomes a normal slide,
// an unsupported "input" chart is relabeled as an estimate.
//
// Prices go further: any won amount in the deck that the user never gave
// becomes "[확인 필요: 금액]", like the homepage's price guard.
//
// Only possible when all the material is text: numbers the model read
// from an uploaded PDF or image aren't in the text we can check.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** Every number in a text, also scaled by a following 만/억/천 (2,480만 → 2480 and 24800000). */
export function numbersIn(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(억|만|천)?/g)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    out.add(n);
    const mult = m[2] === "억" ? 1e8 : m[2] === "만" ? 1e4 : m[2] === "천" ? 1e3 : 1;
    if (mult > 1) out.add(n * mult);
  }
  return out;
}

// Won amounts, including Korean-unit forms: 6,500원, 3만 원, 3만 6천 원, 7천 원.
const WON = /(\d[\d,]*)\s*(?:(만)\s*(?:(\d[\d,]*)\s*천)?|(천))?\s*원/g;
const wonValue = (m: RegExpMatchArray) => {
  const a = Number(m[1].replace(/,/g, ""));
  if (m[2]) return a * 1e4 + (m[3] ? Number(m[3].replace(/,/g, "")) * 1e3 : 0);
  if (m[4]) return a * 1e3;
  return a;
};
export const wonAmountsIn = (text: string) => new Set([...text.matchAll(WON)].map(wonValue));

/** Replace won amounts the user never gave with a fill-in marker. */
export function redactUnknownWon(text: string, allowed: Set<number>): string {
  return text.replace(WON, (...args) => {
    const m = args as unknown as RegExpMatchArray;
    return allowed.has(wonValue(m)) ? m[0] : "[확인 필요: 금액]";
  });
}

function mapStrings(v: unknown, fn: (s: string) => string): unknown {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "image_url" ? x : mapStrings(x, fn)]));
  return v;
}

const supported = (value: string, allowed: Set<number>) => {
  const nums = [...numbersIn(value)];
  return nums.every((n) => allowed.has(n));
};

export function guardDeckNumbers<T>(deck: T, sourceText: string): T {
  if (!isObj(deck) || !Array.isArray(deck.slides)) return deck;
  const allowed = numbersIn(sourceText);
  const won = wonAmountsIn(sourceText);
  const slides = deck.slides.map((raw) => {
    if (!isObj(raw)) return raw;
    // Prices are what a client would quote back: none the user didn't give.
    const s = mapStrings(raw, (t) => redactUnknownWon(t, won)) as Obj;
    const stat = isObj(s.stat) ? s.stat : null;
    if (s.layout === "big_number" && stat && typeof stat.value === "string" && !supported(stat.value, allowed)) {
      s.layout = "points";
      delete s.stat;
    }
    const chart = isObj(s.chart) ? s.chart : null;
    if (chart && chart.source === "input" && Array.isArray(chart.series)) {
      const values = chart.series.flatMap((x) => (isObj(x) && Array.isArray(x.values) ? x.values : [])).filter((v): v is number => typeof v === "number");
      const known = values.filter((v) => allowed.has(v)).length;
      if (values.length && known < values.length / 2) s.chart = { ...chart, source: "estimate" };
    }
    return s;
  });
  const closing = typeof deck.closing_ask === "string" ? redactUnknownWon(deck.closing_ask, won) : deck.closing_ask;
  return { ...deck, slides, closing_ask: closing } as T;
}
