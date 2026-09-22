// HAEBOT_A_TOOLS_SPEC.md §4.9 / Part 6 T6 — "logo returns valid,
// sanitized, renderable SVG." The model returns SVG as text; this is the
// server-side validation gate before it's ever put in front of a browser
// (SVG can carry <script>, event-handler attributes, javascript: URIs,
// and SMIL-based script gadgets same as HTML — it's real attack
// surface, not a formality).
//
// Allow-list, not block-list. A block-list regex is exactly the shape of
// sanitizer security research keeps finding bypasses for — e.g.
// <animate>/<set> retargeting an href to a javascript: URI at runtime,
// which never contains the literal string a "href=...javascript:" regex
// would catch. This walks real tags and attributes with a small
// tokenizer (tracking quotes, so a `>` inside an attribute value can't
// end a tag early) and rejects anything not explicitly recognized as
// safe, rather than trying to keep enumerating what's dangerous.
// Rejects the whole SVG rather than stripping and repairing it — the
// caller (checkOutputSafety) fails the run and asks the model to try
// again, which is safer than silently serving a modified version of
// what the model returned.

export interface SvgSanitizeResult {
  ok: boolean;
  svg?: string;
  reason?: string;
}

// Shape-only elements a generated logo can plausibly need. Deliberately
// excludes <image> (raster/external embedding a vector logo shouldn't
// need), <a> (no hyperlinks in a logo), <script>, <foreignObject>,
// <style>, and every SMIL animation element (<animate>, <animateMotion>,
// <animateTransform>, <set>, <animateColor>) — the last group is exactly
// the well-known bypass class for regex-based sanitizers.
const ALLOWED_ELEMENTS = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "defs", "clippath", "mask", "lineargradient", "radialgradient",
  "stop", "pattern", "symbol", "use", "title", "desc", "marker",
]);

const ALLOWED_ATTRIBUTES = new Set([
  "id", "class", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "opacity", "fill-opacity",
  "stroke-opacity", "fill-rule", "clip-rule", "transform", "viewbox", "width", "height",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "points", "d", "offset",
  "stop-color", "stop-opacity", "gradientunits", "gradienttransform", "patterntransform",
  "patternunits", "patterncontentunits", "xmlns", "xmlns:xlink", "version",
  "preserveaspectratio", "font-family", "font-size", "font-weight", "font-style",
  "text-anchor", "dominant-baseline", "letter-spacing", "clip-path", "mask", "style",
]);

// href only as a same-document fragment reference (<use href="#id">,
// gradient/pattern targets) — never an external URL, javascript:, or
// data: URI. This is checked on the attribute VALUE, not pattern-matched
// against a "javascript:" blocklist, so there's nothing else to bypass.
const HREF_ATTRIBUTES = new Set(["href", "xlink:href"]);
const SAFE_FRAGMENT_REF = /^#[\w.:-]+$/;
const DANGEROUS_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import/i;

interface Tag {
  type: "open" | "close" | "selfclose";
  name: string;
  attrs: Record<string, string>;
}
type Token = Tag | { type: "text" | "skip" };

// Scans for the tag-ending '>' while tracking quotes, so a literal '>'
// inside a quoted attribute value doesn't end the tag early.
function findTagEnd(svg: string, start: number): number {
  let quote: string | null = null;
  for (let i = start; i < svg.length; i++) {
    const c = svg[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i;
    }
  }
  return -1;
}

function parseAttrs(body: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    attrs[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : (m[3] ?? "");
  }
  return attrs;
}

function tokenize(svg: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < svg.length) {
    if (svg[i] !== "<") {
      const next = svg.indexOf("<", i);
      tokens.push({ type: "text" });
      i = next === -1 ? svg.length : next;
      continue;
    }
    if (svg.startsWith("<!--", i)) {
      const end = svg.indexOf("-->", i + 4);
      tokens.push({ type: "skip" });
      i = end === -1 ? svg.length : end + 3;
      continue;
    }
    if (svg.startsWith("<![CDATA[", i)) {
      const end = svg.indexOf("]]>", i + 9);
      tokens.push({ type: "skip" });
      i = end === -1 ? svg.length : end + 3;
      continue;
    }
    if (svg[i + 1] === "!" || svg[i + 1] === "?") {
      // doctype / processing instruction — no attributes worth checking
      const end = findTagEnd(svg, i);
      tokens.push({ type: "skip" });
      i = end === -1 ? svg.length : end + 1;
      continue;
    }
    const isClose = svg[i + 1] === "/";
    const tagStart = isClose ? i + 2 : i + 1;
    const end = findTagEnd(svg, i);
    if (end === -1) {
      // Unterminated tag — fail closed rather than guess at intent.
      tokens.push({ type: "open", name: "\0malformed", attrs: {} });
      i = svg.length;
      continue;
    }
    const inner = svg.slice(tagStart, end).trim();
    i = end + 1;
    if (isClose) {
      tokens.push({ type: "close", name: inner.toLowerCase(), attrs: {} });
      continue;
    }
    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1).trim() : inner;
    const nameMatch = /^([^\s/>]+)/.exec(body);
    const name = (nameMatch?.[1] ?? "").toLowerCase();
    tokens.push({
      type: selfClosing ? "selfclose" : "open",
      name,
      attrs: parseAttrs(body.slice(nameMatch?.[0]?.length ?? 0)),
    });
  }
  return tokens;
}

function attrsAreSafe(attrs: Record<string, string>): boolean {
  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith("on")) return false; // event handlers — never allowed, allow-list or not
    if (HREF_ATTRIBUTES.has(name)) {
      if (!SAFE_FRAGMENT_REF.test(value.trim())) return false;
      continue;
    }
    if (!ALLOWED_ATTRIBUTES.has(name)) return false;
    if (name === "style" && DANGEROUS_STYLE_VALUE.test(value)) return false;
  }
  return true;
}

export function sanitizeSvg(svg: string): SvgSanitizeResult {
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) {
    return { ok: false, reason: "유효한 SVG가 아닙니다" };
  }

  for (const token of tokenize(trimmed)) {
    if (token.type !== "open" && token.type !== "selfclose") continue;
    if (!ALLOWED_ELEMENTS.has(token.name)) {
      return { ok: false, reason: `허용되지 않는 태그가 포함되어 있습니다: <${token.name}>` };
    }
    if (!attrsAreSafe(token.attrs)) {
      return { ok: false, reason: `허용되지 않는 속성이 포함되어 있습니다 (<${token.name}>)` };
    }
  }

  return { ok: true, svg: trimmed };
}
