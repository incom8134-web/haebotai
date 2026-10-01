// Main colours of a logo, from its RGBA pixels (a canvas read on /brand).
// Pixels are grouped into coarse buckets; transparent ones and the white
// or near-white background are skipped; the most common buckets, averaged
// and kept apart from each other, become the brand colours.

function hex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function distance(a: number[], b: number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function paletteFromPixels(data: ArrayLike<number>, max = 4): string[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    if (r > 240 && g > 240 && b > 240) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n++;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    buckets.set(key, cur);
  }
  const total = [...buckets.values()].reduce((s, x) => s + x.n, 0);
  const ranked = [...buckets.values()]
    .filter((x) => x.n >= total * 0.01)
    .sort((a, b) => b.n - a.n)
    .map((x) => [x.r / x.n, x.g / x.n, x.b / x.n]);
  const picked: number[][] = [];
  for (const c of ranked) {
    if (picked.every((p) => distance(p, c) > 48)) picked.push(c);
    if (picked.length >= max) break;
  }
  return picked.map((c) => hex(c[0], c[1], c[2]));
}
